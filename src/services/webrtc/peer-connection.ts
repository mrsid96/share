import {
  createSignalingConnection,
  submitAnswer,
  addInitiatorCandidate,
  addRecipientCandidate,
  subscribeToAnswer,
  subscribeToInitiatorCandidates,
  subscribeToRecipientCandidates,
  cleanupConnection,
} from '../firebase/firestore.service';

export type ConnectionRole = 'initiator' | 'recipient';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceTransportPolicy: 'all',
};

export interface PeerConnectionOptions {
  roomId: string;
  connectionId?: string;
  role: ConnectionRole;
  localUid: string;
  remoteUid: string;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}

export class PeerConnectionManager {
  private pc: RTCPeerConnection;
  private roomId: string;
  private connectionId: string;
  private role: ConnectionRole;
  private localUid: string;
  private remoteUid: string;
  private unsubscribers: Array<() => void> = [];
  private dataChannelCallback?: (channel: RTCDataChannel) => void;
  private connectionStateCallback?: (state: RTCPeerConnectionState) => void;
  private iceStateCallback?: (state: RTCIceConnectionState) => void;

  constructor(options: PeerConnectionOptions) {
    this.roomId = options.roomId;
    this.connectionId = options.connectionId ?? '';
    this.role = options.role;
    this.localUid = options.localUid;
    this.remoteUid = options.remoteUid;
    this.dataChannelCallback = options.onDataChannel;
    this.connectionStateCallback = options.onConnectionStateChange;
    this.iceStateCallback = options.onIceConnectionStateChange;

    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      const candidateInit = event.candidate.toJSON();
      try {
        if (this.role === 'initiator') {
          await addInitiatorCandidate(this.roomId, this.connectionId, candidateInit);
        } else {
          await addRecipientCandidate(this.roomId, this.connectionId, candidateInit);
        }
      } catch {
        // ICE candidate upload failure is non-fatal; connection may still work
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.connectionStateCallback?.(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      this.iceStateCallback?.(this.pc.iceConnectionState);
    };

    this.pc.ondatachannel = (event) => {
      this.dataChannelCallback?.(event.channel);
    };
  }

  /**
   * Initiator: creates the data channel, generates an offer, and begins signaling.
   */
  async startAsInitiator(): Promise<{ channel: RTCDataChannel; connectionId: string }> {
    const channel = this.pc.createDataChannel('file-transfer', { ordered: true });
    channel.binaryType = 'arraybuffer';

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.connectionId = await createSignalingConnection(
      this.roomId,
      this.localUid,
      this.remoteUid,
      offer
    );

    // Subscribe to remote candidates
    const unsubRecipient = subscribeToRecipientCandidates(
      this.roomId,
      this.connectionId,
      (candidate) => this.addRemoteCandidate(candidate)
    );
    this.unsubscribers.push(unsubRecipient);

    // Subscribe to answer
    const unsubAnswer = subscribeToAnswer(this.roomId, this.connectionId, async (answer) => {
      if (this.pc.signalingState === 'have-local-offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });
    this.unsubscribers.push(unsubAnswer);

    return { channel, connectionId: this.connectionId };
  }

  /**
   * Recipient: processes the offer, generates an answer, and begins signaling.
   */
  async startAsRecipient(offer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await submitAnswer(this.roomId, this.connectionId, answer);

    // Subscribe to initiator candidates
    const unsubInitiator = subscribeToInitiatorCandidates(
      this.roomId,
      this.connectionId,
      (candidate) => this.addRemoteCandidate(candidate)
    );
    this.unsubscribers.push(unsubInitiator);
  }

  private async addRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Non-fatal
    }
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  close(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.pc.close();
    cleanupConnection(this.roomId, this.connectionId).catch(() => {});
  }
}
