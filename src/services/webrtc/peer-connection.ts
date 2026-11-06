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
import { log } from '../../utils/logger';

export type ConnectionRole = 'initiator' | 'recipient';

// Multi-provider STUN pool with candidate pre-fetching for instant NAT discovery
function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ];

  // Optional custom or free Metered/Cloudflare TURN server from env
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl.split(',').map((u: string) => u.trim()),
      username: turnUsername,
      credential: turnCredential,
    });
    log.webrtc('Configured custom TURN relay server for NAT traversal');
  }

  return servers;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
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

    log.webrtc(`Initializing RTCPeerConnection: role=${this.role}, room=${this.roomId}, localUid=${this.localUid}, remoteUid=${this.remoteUid}`);
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pc.onicecandidate = async (event) => {
      // Ignore null candidates or end-of-candidate markers
      if (!event.candidate || !event.candidate.candidate || event.candidate.candidate.trim() === '') {
        log.webrtc(`ICE gathering completed or empty candidate emitted`);
        return;
      }

      const candidateInit = event.candidate.toJSON();
      const sanitized: RTCIceCandidateInit = {
        candidate: candidateInit.candidate ?? '',
        sdpMid: candidateInit.sdpMid ?? null,
        sdpMLineIndex: candidateInit.sdpMLineIndex ?? null,
      };

      log.webrtc(`Local ICE candidate gathered: ${sanitized.candidate.slice(0, 50)}... (buffered=${!this.connectionId})`);

      if (!this.connectionId) {
        this.pendingLocalCandidates.push(sanitized);
        return;
      }

      await this.uploadCandidate(sanitized);
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      log.webrtc(`PeerConnection state changed: %c${state.toUpperCase()}`, state === 'connected' ? 'color: #10b981; font-weight: bold;' : 'color: #f59e0b;');
      this.connectionStateCallback?.(state);
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      log.webrtc(`ICE connection state changed: %c${state.toUpperCase()}`, state === 'connected' || state === 'completed' ? 'color: #10b981; font-weight: bold;' : 'color: #f59e0b;');
      this.iceStateCallback?.(state);
    };

    this.pc.ondatachannel = (event) => {
      log.webrtc(`DataChannel received on recipient: label="${event.channel.label}", readyState="${event.channel.readyState}"`);
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
    } catch (err) {
      log.error('WebRTC', `Failed to upload ${this.role} candidate:`, err);
    }
  }

  private async flushPendingLocalCandidates(): Promise<void> {
    if (!this.connectionId || this.pendingLocalCandidates.length === 0) return;
    const candidates = [...this.pendingLocalCandidates];
    this.pendingLocalCandidates = [];
    log.webrtc(`Flushing ${candidates.length} queued local candidates to Firestore`);
    for (const cand of candidates) {
      await this.uploadCandidate(cand);
    }
  }

  private async addRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    // If remote description is not yet set, queue the candidate!
    if (!this.pc.remoteDescription) {
      log.webrtc(`Remote description not set yet; queuing remote candidate (${candidate.candidate.slice(0, 35)}...)`);
      this.pendingRemoteCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      log.webrtc(`Applied remote ICE candidate successfully`);
    } catch (err) {
      log.warn('WebRTC', `addIceCandidate non-fatal error:`, err);
    }
  }

  private async flushPendingRemoteCandidates(): Promise<void> {
    if (!this.pc.remoteDescription || this.pendingRemoteCandidates.length === 0) return;
    const queued = [...this.pendingRemoteCandidates];
    this.pendingRemoteCandidates = [];
    log.webrtc(`Flushing ${queued.length} queued remote candidates after remoteDescription applied`);
    for (const cand of queued) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        log.warn('WebRTC', `Failed to apply queued remote candidate:`, err);
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
    log.webrtc(`[Initiator] Creating DataChannel 'file-transfer'`);
    const channel = this.pc.createDataChannel('file-transfer', { ordered: true });
    channel.binaryType = 'arraybuffer';

    log.webrtc(`[Initiator] Creating SDP offer`);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    log.webrtc(`[Initiator] Set local description (offer SDP length: ${offer.sdp?.length})`);

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
    log.webrtc(`[Initiator] Signaling connection created: ${this.connectionId}`);

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
      log.webrtc(`[Initiator] Received SDP answer from signaling: signalingState=${this.pc.signalingState}`);
      if (this.pc.signalingState === 'have-local-offer') {
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
          log.webrtc(`[Initiator] Set remote description (answer) successfully!`);
          this.answerReceivedCallback?.();
          await this.flushPendingRemoteCandidates();
        } catch (err) {
          log.error('WebRTC', `[Initiator] Failed to set remote description (answer):`, err);
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
    log.webrtc(`[Recipient] Applying remote offer SDP (length: ${offer.sdp?.length})`);
    // 1. Set remote description from offer
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    log.webrtc(`[Recipient] Remote description set successfully!`);

    // 2. Immediately subscribe to initiator candidates and flush any already received
    const unsubInitiator = subscribeToInitiatorCandidates(
      this.roomId,
      this.connectionId,
      (candidate) => this.addRemoteCandidate(candidate)
    );
    this.unsubscribers.push(unsubInitiator);
    await this.flushPendingRemoteCandidates();

    // 3. Create and set local answer
    log.webrtc(`[Recipient] Creating SDP answer`);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    log.webrtc(`[Recipient] Set local description (answer)`);

    const plainAnswer: RTCSessionDescriptionInit = {
      type: answer.type,
      sdp: answer.sdp,
    };

    await submitAnswer(this.roomId, this.connectionId, plainAnswer);
    log.webrtc(`[Recipient] Submitted answer to signaling for connection ${this.connectionId}`);

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
    log.webrtc(`Closing PeerConnection for conn ${this.connectionId}`);
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.pc.close();
    if (this.connectionId) {
      cleanupConnection(this.roomId, this.connectionId).catch(() => {});
    }
  }
}
