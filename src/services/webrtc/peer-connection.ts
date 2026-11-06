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

// Multi-provider STUN pool with candidate pre-fetching for instant NAT discovery
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ],
  iceCandidatePoolSize: 10,
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
  onAnswerReceived?: () => void;
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
  private answerReceivedCallback?: () => void;

  // Buffer local candidates generated before connectionId is resolved in Firestore
  private pendingLocalCandidates: RTCIceCandidateInit[] = [];

  // Buffer remote candidates received before remoteDescription is applied
  private pendingRemoteCandidates: RTCIceCandidateInit[] = [];

  constructor(options: PeerConnectionOptions) {
    this.roomId = options.roomId;
    this.connectionId = options.connectionId ?? '';
    this.role = options.role;
    this.localUid = options.localUid;
    this.remoteUid = options.remoteUid;
    this.dataChannelCallback = options.onDataChannel;
    this.connectionStateCallback = options.onConnectionStateChange;
    this.iceStateCallback = options.onIceConnectionStateChange;
    this.answerReceivedCallback = options.onAnswerReceived;

    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pc.onicecandidate = async (event) => {
      // Ignore null candidates or end-of-candidate markers
      if (!event.candidate || !event.candidate.candidate || event.candidate.candidate.trim() === '') {
        return;
      }

      const candidateInit = event.candidate.toJSON();
      const sanitized: RTCIceCandidateInit = {
        candidate: candidateInit.candidate ?? '',
        sdpMid: candidateInit.sdpMid ?? null,
        sdpMLineIndex: candidateInit.sdpMLineIndex ?? null,
      };

      if (!this.connectionId) {
        this.pendingLocalCandidates.push(sanitized);
        return;
      }

      await this.uploadCandidate(sanitized);
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

  private async uploadCandidate(candidateInit: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.role === 'initiator') {
        await addInitiatorCandidate(this.roomId, this.connectionId, candidateInit);
      } else {
        await addRecipientCandidate(this.roomId, this.connectionId, candidateInit);
      }
    } catch {
      // ICE candidate upload failure is non-fatal
    }
  }

  private async flushPendingLocalCandidates(): Promise<void> {
    if (!this.connectionId || this.pendingLocalCandidates.length === 0) return;
    const candidates = [...this.pendingLocalCandidates];
    this.pendingLocalCandidates = [];
    for (const cand of candidates) {
      await this.uploadCandidate(cand);
    }
  }

  private async addRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    // If remote description is not yet set, queue the candidate!
    if (!this.pc.remoteDescription) {
      this.pendingRemoteCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Non-fatal
    }
  }

  private async flushPendingRemoteCandidates(): Promise<void> {
    if (!this.pc.remoteDescription || this.pendingRemoteCandidates.length === 0) return;
    const queued = [...this.pendingRemoteCandidates];
    this.pendingRemoteCandidates = [];
    for (const cand of queued) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {
        // Non-fatal
      }
    }
  }

  /**
   * Initiator: creates data channel, generates offer, sets local description, and initiates signaling.
   */
  async startAsInitiator(
    filesMetadata?: Array<{ fileId: string; name: string; size: number; mimeType: string }>,
    totalSize?: number
  ): Promise<{ channel: RTCDataChannel; connectionId: string }> {
    const channel = this.pc.createDataChannel('file-transfer', { ordered: true });
    channel.binaryType = 'arraybuffer';

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const plainOffer: RTCSessionDescriptionInit = {
      type: offer.type,
      sdp: offer.sdp,
    };

    this.connectionId = await createSignalingConnection(
      this.roomId,
      this.localUid,
      this.remoteUid,
      plainOffer,
      filesMetadata,
      totalSize
    );

    // Flush local candidates gathered while waiting for connectionId
    await this.flushPendingLocalCandidates();

    // Subscribe to remote recipient candidates
    const unsubRecipient = subscribeToRecipientCandidates(
      this.roomId,
      this.connectionId,
      (candidate) => this.addRemoteCandidate(candidate)
    );
    this.unsubscribers.push(unsubRecipient);

    // Subscribe to recipient's answer
    const unsubAnswer = subscribeToAnswer(this.roomId, this.connectionId, async (answer) => {
      if (this.pc.signalingState === 'have-local-offer') {
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
          this.answerReceivedCallback?.();
          await this.flushPendingRemoteCandidates();
        } catch {
          // Handled via connection state
        }
      }
    });
    this.unsubscribers.push(unsubAnswer);

    return { channel, connectionId: this.connectionId };
  }

  /**
   * Recipient: processes offer, generates answer, sets local description, and begins signaling.
   */
  async startAsRecipient(offer: RTCSessionDescriptionInit): Promise<void> {
    // 1. Set remote description from offer
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

    // 2. Immediately subscribe to initiator candidates and flush any already received
    const unsubInitiator = subscribeToInitiatorCandidates(
      this.roomId,
      this.connectionId,
      (candidate) => this.addRemoteCandidate(candidate)
    );
    this.unsubscribers.push(unsubInitiator);
    await this.flushPendingRemoteCandidates();

    // 3. Create and set local answer
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    const plainAnswer: RTCSessionDescriptionInit = {
      type: answer.type,
      sdp: answer.sdp,
    };

    await submitAnswer(this.roomId, this.connectionId, plainAnswer);

    // 4. Flush any local candidates gathered during answer generation
    await this.flushPendingLocalCandidates();
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
    if (this.connectionId) {
      cleanupConnection(this.roomId, this.connectionId).catch(() => {});
    }
  }
}
