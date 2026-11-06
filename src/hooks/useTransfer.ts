import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { PeerConnectionManager } from '../services/webrtc/peer-connection';
import { FileTransferManager } from '../services/webrtc/file-transfer';
import {
  subscribeToIncomingConnections,
  subscribeToConnection,
  rejectConnection,
} from '../services/firebase/firestore.service';
import { generateFileId } from '../utils/random-id';
import { log } from '../utils/logger';
import type { TransferProgress, ReceivedFile } from '../types/transfer';
import type { TransferStatus } from '../types/transfer';

export type TransferRole = 'sender' | 'receiver' | null;
export type ConnectionPhase = 'idle' | 'waiting-for-accept' | 'connecting-webrtc';

interface UseTransferReturn {
  initiateTransfer: (files: File[], recipientUid: string) => Promise<void>;
  acceptIncoming: () => void;
  declineIncoming: () => void;
  cancelTransfer: () => void;
  cancelConnecting: () => void;
  outgoingProgress: TransferProgress | null;
  incomingProgress: TransferProgress | null;
  outgoingStatus: TransferStatus | null;
  completedFiles: ReceivedFile[];
  role: TransferRole;
  connectionPhase: ConnectionPhase;
  incomingConnectionId: string | null;
  incomingInitiatorUid: string | null;
  incomingOffer: RTCSessionDescriptionInit | null;
  incomingTransferId: string | null;
  incomingFiles: Array<{ fileId: string; name: string; size: number; mimeType: string }>;
  hasIncoming: boolean;
  error: string | null;
  isConnecting: boolean;
  isCompleted: boolean;
  resetTransfer: () => void;
}

export function useTransfer(roomId: string): UseTransferReturn {
  const { user } = useAuthStore();

  const peerConnectionRef = useRef<PeerConnectionManager | null>(null);
  const fileTransferRef = useRef<FileTransferManager | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const currentTransferIdRef = useRef<string>('');

  const [outgoingProgress, setOutgoingProgress] = useState<TransferProgress | null>(null);
  const [incomingProgress, setIncomingProgress] = useState<TransferProgress | null>(null);
  const [outgoingStatus, setOutgoingStatus] = useState<TransferStatus | null>(null);
  const [completedFiles, setCompletedFiles] = useState<ReceivedFile[]>([]);
  const [role, setRole] = useState<TransferRole>(null);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Incoming connection state
  const [incomingConnectionId, setIncomingConnectionId] = useState<string | null>(null);
  const [incomingInitiatorUid, setIncomingInitiatorUid] = useState<string | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [incomingTransferId, setIncomingTransferId] = useState<string | null>(null);
  const [incomingFiles, setIncomingFiles] = useState<Array<{ fileId: string; name: string; size: number; mimeType: string }>>([]);
  const [hasIncoming, setHasIncoming] = useState(false);

  const cleanup = useCallback(() => {
    unsubscribersRef.current.forEach((u) => u());
    unsubscribersRef.current = [];
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    fileTransferRef.current?.close();
    fileTransferRef.current = null;
  }, []);

  const resetTransfer = useCallback(() => {
    cleanup();
    setOutgoingProgress(null);
    setIncomingProgress(null);
    setOutgoingStatus(null);
    setCompletedFiles([]);
    setRole(null);
    setConnectionPhase('idle');
    setError(null);
    setIsConnecting(false);
    setIsCompleted(false);
    setIncomingConnectionId(null);
    setIncomingInitiatorUid(null);
    setIncomingOffer(null);
    setIncomingTransferId(null);
    setIncomingFiles([]);
    setHasIncoming(false);
  }, [cleanup]);

  // Subscribe to incoming connection signals
  useEffect(() => {
    if (!user || !roomId) return;

    const unsub = subscribeToIncomingConnections(roomId, user.uid, (conn) => {
      // Don't handle if already in an active transfer
      if (peerConnectionRef.current || conn.status === 'rejected') return;

      setIncomingConnectionId(conn.connectionId);
      setIncomingInitiatorUid(conn.initiatorUid);
      setIncomingOffer(conn.offer ?? null);
      if (conn.files && conn.files.length > 0) {
        setIncomingFiles(conn.files);
      }
      setHasIncoming(true);
    });
    unsubscribersRef.current.push(unsub);

    return () => {
      unsub();
    };
  }, [user, roomId]);

  const setupFileTransfer = useCallback((channel: RTCDataChannel, transferRole: TransferRole) => {
    const manager = new FileTransferManager(channel);
    fileTransferRef.current = manager;

    const unsub = manager.on((event) => {
      switch (event.type) {
        case 'transfer-request':
          if (event.request) {
            setIncomingTransferId(event.request.transferId);
            setIncomingFiles(event.request.files);
          }
          break;
        case 'transfer-accepted':
          setOutgoingStatus('accepted');
          break;
        case 'transfer-rejected':
          setOutgoingStatus('rejected');
          setError('Transfer was declined by the other device.');
          setIsCompleted(true);
          break;
        case 'progress':
          if (event.progress) {
            if (transferRole === 'sender') {
              setOutgoingProgress(event.progress);
            } else {
              setIncomingProgress(event.progress);
            }
          }
          break;
        case 'completed':
          setIsCompleted(true);
          setOutgoingStatus('completed');
          break;
        case 'cancelled':
          setOutgoingStatus('cancelled');
          setIsCompleted(true);
          break;
        case 'failed':
          setOutgoingStatus('failed');
          setError(event.error ?? 'Transfer failed.');
          setIsCompleted(true);
          break;
        case 'file-received':
          if (event.files) {
            setCompletedFiles((prev) => [...prev, ...event.files!]);
          }
          break;
      }
    });
    unsubscribersRef.current.push(unsub);
  }, []);

  const initiateTransfer = useCallback(async (files: File[], recipientUid: string) => {
    if (!user) return;
    log.transfer(`Initiating transfer of ${files.length} file(s) to ${recipientUid}`);
    setRole('sender');
    setIsConnecting(true);
    setConnectionPhase('waiting-for-accept');
    setError(null);

    let webrtcTimer: number | null = null;
    let acceptTimer: number | null = null;

    try {
      const pc = new PeerConnectionManager({
        roomId,
        role: 'initiator',
        localUid: user.uid,
        remoteUid: recipientUid,
        onAnswerReceived: () => {
          log.transfer(`Recipient clicked Accept! Transitioning to WebRTC direct connection phase`);
          if (acceptTimer) {
            window.clearTimeout(acceptTimer);
            acceptTimer = null;
          }
          setConnectionPhase('connecting-webrtc');

          // Direct P2P connection timer
          webrtcTimer = window.setTimeout(() => {
            log.error('Transfer', 'WebRTC direct connection phase timed out after 35s');
            setError('Direct peer-to-peer connection could not be established. Please check network connectivity.');
            setIsConnecting(false);
            setOutgoingStatus('failed');
            cleanup();
          }, 35000);
        },
        onConnectionStateChange: (state) => {
          if (state === 'failed' || state === 'closed') {
            log.error('Transfer', `PeerConnection state became '${state}' during transfer initiation`);
            if (acceptTimer) window.clearTimeout(acceptTimer);
            if (webrtcTimer) window.clearTimeout(webrtcTimer);
            setError('Connection failed. The devices could not connect directly.');
            setIsConnecting(false);
            setOutgoingStatus('failed');
          }
        },
      });
      peerConnectionRef.current = pc;

      const filesMetadata = files.map((f) => ({
        fileId: generateFileId(),
        name: f.name,
        size: f.size,
        mimeType: f.type || 'application/octet-stream',
      }));
      const totalSize = files.reduce((s, f) => s + f.size, 0);

      const { channel, connectionId } = await pc.startAsInitiator(filesMetadata, totalSize);
      log.transfer(`Signaling started: connectionId=${connectionId}, waiting for recipient to accept...`);

      // Recipient response timeout (60 seconds to tap Accept on their screen)
      acceptTimer = window.setTimeout(() => {
        log.warn('Transfer', `Recipient did not respond within 60 seconds (conn=${connectionId})`);
        setError('Transfer request timed out. The recipient did not respond in time.');
        setIsConnecting(false);
        setOutgoingStatus('failed');
        cleanup();
      }, 60000);

      unsubscribersRef.current.push(() => {
        if (acceptTimer) window.clearTimeout(acceptTimer);
        if (webrtcTimer) window.clearTimeout(webrtcTimer);
      });

      // Listen for rejection by recipient
      const unsubStatus = subscribeToConnection(roomId, connectionId, (conn) => {
        if (conn?.status === 'rejected') {
          log.transfer(`Recipient declined transfer ${connectionId}`);
          if (acceptTimer) window.clearTimeout(acceptTimer);
          if (webrtcTimer) window.clearTimeout(webrtcTimer);
          setError('Transfer was declined by the other device.');
          setIsConnecting(false);
          setOutgoingStatus('rejected');
          setIsCompleted(true);
        }
      });
      unsubscribersRef.current.push(unsubStatus);

      const handleChannelOpen = () => {
        log.transfer(`DataChannel opened on sender! Ready to stream files.`);
        if (acceptTimer) window.clearTimeout(acceptTimer);
        if (webrtcTimer) window.clearTimeout(webrtcTimer);
        setConnectionPhase('idle');
        setIsConnecting(false);
        setOutgoingStatus('transferring');
        setupFileTransfer(channel, 'sender');
        const manager = fileTransferRef.current!;
        const transferId = manager.requestTransfer(files);
        currentTransferIdRef.current = transferId;
        setOutgoingStatus('pending');
      };

      if (channel.readyState === 'open') {
        handleChannelOpen();
      } else {
        channel.onopen = handleChannelOpen;
      }
    } catch (err) {
      log.error('Transfer', 'Failed to initiate transfer:', err);
      if (acceptTimer) window.clearTimeout(acceptTimer);
      if (webrtcTimer) window.clearTimeout(webrtcTimer);
      setError('Failed to initiate connection. Please try again.');
      setIsConnecting(false);
      setConnectionPhase('idle');
      setRole(null);
    }
  }, [user, roomId, setupFileTransfer, cleanup]);

  const acceptIncoming = useCallback(async () => {
    if (!user || !incomingConnectionId || !incomingOffer) return;
    log.transfer(`User clicked Accept for incoming conn ${incomingConnectionId} from ${incomingInitiatorUid}`);
    setRole('receiver');
    setIsConnecting(true);
    setConnectionPhase('connecting-webrtc');
    setHasIncoming(false);

    let receiverTimer: number | null = window.setTimeout(() => {
      log.error('Transfer', `Receiver WebRTC connection timed out after 35s`);
      setError('Direct peer-to-peer connection could not be established.');
      setIsConnecting(false);
      setConnectionPhase('idle');
      cleanup();
    }, 35000);

    unsubscribersRef.current.push(() => {
      if (receiverTimer) window.clearTimeout(receiverTimer);
    });

    try {
      const pc = new PeerConnectionManager({
        roomId,
        connectionId: incomingConnectionId,
        role: 'recipient',
        localUid: user.uid,
        remoteUid: incomingInitiatorUid ?? '',
        onDataChannel: (channel) => {
          log.transfer(`Receiver DataChannel established! (readyState: ${channel.readyState})`);
          if (receiverTimer) {
            window.clearTimeout(receiverTimer);
            receiverTimer = null;
          }
          setIsConnecting(false);
          setConnectionPhase('idle');
          setupFileTransfer(channel, 'receiver');
        },
        onConnectionStateChange: (state) => {
          if (state === 'failed' || state === 'closed') {
            log.error('Transfer', `Receiver PeerConnection state became '${state}'`);
            if (receiverTimer) window.clearTimeout(receiverTimer);
            setError('Connection failed. Could not establish direct P2P connection.');
            setIsConnecting(false);
            setConnectionPhase('idle');
          }
        },
      });
      peerConnectionRef.current = pc;
      await pc.startAsRecipient(incomingOffer);
    } catch (err) {
      log.error('Transfer', `Failed to accept incoming transfer:`, err);
      if (receiverTimer) window.clearTimeout(receiverTimer);
      setError('Failed to accept connection.');
      setIsConnecting(false);
      setConnectionPhase('idle');
      setRole(null);
    }
  }, [user, roomId, incomingConnectionId, incomingInitiatorUid, incomingOffer, setupFileTransfer, cleanup]);

  const declineIncoming = useCallback(async () => {
    log.transfer(`User clicked Decline for incoming conn ${incomingConnectionId}`);
    if (roomId && incomingConnectionId) {
      await rejectConnection(roomId, incomingConnectionId);
    }
    setHasIncoming(false);
    setIncomingConnectionId(null);
    setIncomingInitiatorUid(null);
    setIncomingOffer(null);
    setIncomingFiles([]);
  }, [roomId, incomingConnectionId]);

  const cancelConnecting = useCallback(() => {
    cleanup();
    resetTransfer();
  }, [cleanup, resetTransfer]);

  const cancelTransfer = useCallback(() => {
    const manager = fileTransferRef.current;
    const transferId = currentTransferIdRef.current;
    if (manager && transferId) {
      manager.cancelTransfer(transferId);
    }
    setIsCompleted(true);
    setOutgoingStatus('cancelled');
  }, []);

  // Accept incoming request via protocol after channel is established
  useEffect(() => {
    if (role === 'receiver' && incomingTransferId && fileTransferRef.current) {
      fileTransferRef.current.acceptTransfer(incomingTransferId);
    }
  }, [role, incomingTransferId]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    initiateTransfer,
    acceptIncoming,
    declineIncoming,
    cancelTransfer,
    cancelConnecting,
    outgoingProgress,
    incomingProgress,
    outgoingStatus,
    completedFiles,
    role,
    connectionPhase,
    incomingConnectionId,
    incomingInitiatorUid,
    incomingOffer,
    incomingTransferId,
    incomingFiles,
    hasIncoming,
    error,
    isConnecting,
    isCompleted,
    resetTransfer,
  };
}
