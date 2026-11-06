import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { PeerConnectionManager } from '../services/webrtc/peer-connection';
import { FileTransferManager } from '../services/webrtc/file-transfer';
import { subscribeToIncomingConnections } from '../services/firebase/firestore.service';
import type { TransferProgress, ReceivedFile } from '../types/transfer';
import type { TransferStatus } from '../types/transfer';

export type TransferRole = 'sender' | 'receiver' | null;

interface UseTransferReturn {
  initiateTransfer: (files: File[], recipientUid: string) => Promise<void>;
  acceptIncoming: () => void;
  declineIncoming: () => void;
  cancelTransfer: () => void;
  outgoingProgress: TransferProgress | null;
  incomingProgress: TransferProgress | null;
  outgoingStatus: TransferStatus | null;
  completedFiles: ReceivedFile[];
  role: TransferRole;
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
      // Don't handle if already in a transfer
      if (peerConnectionRef.current) return;

      setIncomingConnectionId(conn.connectionId);
      setIncomingInitiatorUid(conn.initiatorUid);
      setIncomingOffer(conn.offer ?? null);
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
    setRole('sender');
    setIsConnecting(true);
    setError(null);

    try {
      const pc = new PeerConnectionManager({
        roomId,
        role: 'initiator',
        localUid: user.uid,
        remoteUid: recipientUid,
        onConnectionStateChange: (state) => {
          if (state === 'failed' || state === 'closed') {
            setError('Connection failed. The devices could not connect directly.');
            setIsConnecting(false);
            setOutgoingStatus('failed');
          }
        },
      });
      peerConnectionRef.current = pc;

      const { channel } = await pc.startAsInitiator();
      
      channel.onopen = () => {
        setIsConnecting(false);
        setOutgoingStatus('transferring');
        setupFileTransfer(channel, 'sender');
        const manager = fileTransferRef.current!;
        const transferId = manager.requestTransfer(files);
        currentTransferIdRef.current = transferId;
        setOutgoingStatus('pending');
      };
    } catch {
      setError('Failed to initiate connection. Please try again.');
      setIsConnecting(false);
      setRole(null);
    }
  }, [user, roomId, setupFileTransfer]);

  const acceptIncoming = useCallback(async () => {
    if (!user || !incomingConnectionId || !incomingOffer) return;
    setRole('receiver');
    setIsConnecting(true);
    setHasIncoming(false);

    try {
      const pc = new PeerConnectionManager({
        roomId,
        connectionId: incomingConnectionId,
        role: 'recipient',
        localUid: user.uid,
        remoteUid: incomingInitiatorUid ?? '',
        onDataChannel: (channel) => {
          setIsConnecting(false);
          setupFileTransfer(channel, 'receiver');
          // Accept happens after file-start is received via protocol
          // The FileTransferManager handles the transfer-request and we tell it to accept
        },
        onConnectionStateChange: (state) => {
          if (state === 'failed' || state === 'closed') {
            setError('Connection failed.');
            setIsConnecting(false);
          }
        },
      });
      peerConnectionRef.current = pc;
      await pc.startAsRecipient(incomingOffer);
    } catch {
      setError('Failed to accept connection.');
      setIsConnecting(false);
      setRole(null);
    }
  }, [user, roomId, incomingConnectionId, incomingInitiatorUid, incomingOffer, setupFileTransfer]);

  const declineIncoming = useCallback(() => {
    setHasIncoming(false);
    setIncomingConnectionId(null);
    setIncomingInitiatorUid(null);
    setIncomingOffer(null);
    // We don't have a channel yet to send rejection, so just dismiss
  }, []);

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
    outgoingProgress,
    incomingProgress,
    outgoingStatus,
    completedFiles,
    role,
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
