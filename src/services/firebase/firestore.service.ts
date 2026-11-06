import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  Timestamp,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Room, RoomMember } from '../../types/room';
import type { RTCSignalingConnection } from '../../types/webrtc';
import { generateRoomId, generateConnectionId } from '../../utils/random-id';
import { detectDeviceType } from '../../utils/device-detection';
import { log } from '../../utils/logger';

const ROOM_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 hours
const HEARTBEAT_INTERVAL_MS = 45_000;
const STALE_THRESHOLD_MS = 120_000;

// ─── Room operations ────────────────────────────────────────────────────────

export async function createRoom(hostUid: string): Promise<Room> {
  const roomId = generateRoomId();
  const now = Date.now();
  const roomData: Room = {
    roomId,
    hostUid,
    createdAt: now,
    expiresAt: now + ROOM_LIFETIME_MS,
    status: 'active',
  };

  await setDoc(doc(db, 'rooms', roomId), {
    hostUid: roomData.hostUid,
    createdAt: Timestamp.fromMillis(roomData.createdAt),
    expiresAt: Timestamp.fromMillis(roomData.expiresAt),
    status: roomData.status,
  });

  return roomData;
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const snap = await getDoc(doc(db, 'rooms', roomId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    roomId: snap.id,
    hostUid: data.hostUid,
    createdAt: (data.createdAt as Timestamp).toMillis(),
    expiresAt: (data.expiresAt as Timestamp).toMillis(),
    status: data.status,
  };
}

export function isRoomExpired(room: Room): boolean {
  return Date.now() > room.expiresAt || room.status !== 'active';
}

export async function closeRoom(roomId: string): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomId), { status: 'closed' });
}

// ─── Member operations ───────────────────────────────────────────────────────

export async function joinRoom(
  roomId: string,
  uid: string,
  deviceName: string
): Promise<void> {
  const deviceType = detectDeviceType();
  const now = Date.now();
  await setDoc(doc(db, 'rooms', roomId, 'members', uid), {
    uid,
    deviceName,
    deviceType,
    joinedAt: Timestamp.fromMillis(now),
    lastSeen: Timestamp.fromMillis(now),
    status: 'online',
  });
}

export async function leaveRoom(roomId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'rooms', roomId, 'members', uid));
  // Check if room is now empty; if so, close it
  const membersSnap = await getDocs(collection(db, 'rooms', roomId, 'members'));
  if (membersSnap.empty) {
    await closeRoom(roomId).catch(() => {}); // Best-effort
  }
}

export function subscribeToMembers(
  roomId: string,
  callback: (members: RoomMember[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'rooms', roomId, 'members'),
    (snap) => {
      const now = Date.now();
      const members: RoomMember[] = snap.docs.map((d) => {
        const data = d.data();
        const lastSeen = (data.lastSeen as Timestamp).toMillis();
        const isStale = now - lastSeen > STALE_THRESHOLD_MS;
        return {
          uid: data.uid,
          deviceName: data.deviceName,
          deviceType: data.deviceType,
          joinedAt: (data.joinedAt as Timestamp).toMillis(),
          lastSeen,
          status: isStale ? 'stale' : data.status,
        };
      });
      callback(members);
    },
    (err) => {
      console.warn('subscribeToMembers warning:', err.message);
    }
  );
}

export function startHeartbeat(roomId: string, uid: string): () => void {
  const interval = setInterval(async () => {
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'members', uid), {
        lastSeen: Timestamp.fromMillis(Date.now()),
      });
    } catch {
      // Best-effort
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(interval);
}

// ─── Signaling operations ────────────────────────────────────────────────────

export async function createSignalingConnection(
  roomId: string,
  initiatorUid: string,
  recipientUid: string,
  offer: RTCSessionDescriptionInit,
  files?: Array<{ fileId: string; name: string; size: number; mimeType: string }>,
  totalSize?: number
): Promise<string> {
  const connectionId = generateConnectionId();
  const now = Date.now();
  const plainOffer = {
    type: offer.type,
    sdp: offer.sdp,
  };
  log.signaling(`Creating connection ${connectionId} for room ${roomId}`, {
    initiatorUid,
    recipientUid,
    filesCount: files?.length ?? 0,
    totalSize,
  });
  await setDoc(doc(db, 'rooms', roomId, 'connections', connectionId), {
    initiatorUid,
    recipientUid,
    offer: plainOffer,
    answer: null,
    status: 'pending',
    files: files ?? [],
    totalSize: totalSize ?? 0,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + 10 * 60 * 1000), // 10 min signaling TTL
  });
  log.signaling(`Connection ${connectionId} document written to Firestore`);
  return connectionId;
}

export async function submitAnswer(
  roomId: string,
  connectionId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  const plainAnswer = {
    type: answer.type,
    sdp: answer.sdp,
  };
  log.signaling(`Submitting answer for connection ${connectionId} in room ${roomId}`);
  await updateDoc(doc(db, 'rooms', roomId, 'connections', connectionId), {
    answer: plainAnswer,
    status: 'active',
  });
  log.signaling(`Answer submitted successfully for connection ${connectionId}`);
}

export async function rejectConnection(
  roomId: string,
  connectionId: string
): Promise<void> {
  log.signaling(`Rejecting connection ${connectionId} in room ${roomId}`);
  try {
    await updateDoc(doc(db, 'rooms', roomId, 'connections', connectionId), {
      status: 'rejected',
    });
  } catch (err) {
    log.error('Signaling', `Failed to reject connection ${connectionId}:`, err);
  }
}

export async function addInitiatorCandidate(
  roomId: string,
  connectionId: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  log.signaling(`Uploading initiator ICE candidate for conn ${connectionId}:`, candidate.candidate?.slice(0, 40));
  await addDoc(
    collection(db, 'rooms', roomId, 'connections', connectionId, 'initiatorCandidates'),
    { candidate, createdAt: Timestamp.fromMillis(Date.now()) }
  );
}

export async function addRecipientCandidate(
  roomId: string,
  connectionId: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  log.signaling(`Uploading recipient ICE candidate for conn ${connectionId}:`, candidate.candidate?.slice(0, 40));
  await addDoc(
    collection(db, 'rooms', roomId, 'connections', connectionId, 'recipientCandidates'),
    { candidate, createdAt: Timestamp.fromMillis(Date.now()) }
  );
}

export function subscribeToAnswer(
  roomId: string,
  connectionId: string,
  callback: (answer: RTCSessionDescriptionInit) => void
): () => void {
  log.signaling(`Subscribing to answer for connection ${connectionId}`);
  return onSnapshot(
    doc(db, 'rooms', roomId, 'connections', connectionId),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.answer) {
        log.signaling(`Received answer from recipient for connection ${connectionId}`);
        callback(data.answer as RTCSessionDescriptionInit);
      }
    },
    (err) => {
      log.warn('Signaling', `subscribeToAnswer warning: ${err.message}`);
    }
  );
}

export function subscribeToRecipientCandidates(
  roomId: string,
  connectionId: string,
  callback: (candidate: RTCIceCandidateInit) => void
): () => void {
  log.signaling(`Subscribing to recipient candidates for connection ${connectionId}`);
  return onSnapshot(
    collection(db, 'rooms', roomId, 'connections', connectionId, 'recipientCandidates'),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const cand = change.doc.data().candidate as RTCIceCandidateInit;
          log.signaling(`Received remote recipient candidate for ${connectionId}:`, cand.candidate?.slice(0, 40));
          callback(cand);
        }
      });
    },
    (err) => {
      log.warn('Signaling', `subscribeToRecipientCandidates warning: ${err.message}`);
    }
  );
}

export function subscribeToInitiatorCandidates(
  roomId: string,
  connectionId: string,
  callback: (candidate: RTCIceCandidateInit) => void
): () => void {
  log.signaling(`Subscribing to initiator candidates for connection ${connectionId}`);
  return onSnapshot(
    collection(db, 'rooms', roomId, 'connections', connectionId, 'initiatorCandidates'),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const cand = change.doc.data().candidate as RTCIceCandidateInit;
          log.signaling(`Received remote initiator candidate for ${connectionId}:`, cand.candidate?.slice(0, 40));
          callback(cand);
        }
      });
    },
    (err) => {
      log.warn('Signaling', `subscribeToInitiatorCandidates warning: ${err.message}`);
    }
  );
}

export function subscribeToConnection(
  roomId: string,
  connectionId: string,
  callback: (conn: RTCSignalingConnection | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'rooms', roomId, 'connections', connectionId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      log.signaling(`Connection status update for ${connectionId}: status=${data.status}`);
      callback({
        connectionId: snap.id,
        initiatorUid: data.initiatorUid,
        recipientUid: data.recipientUid,
        offer: data.offer,
        answer: data.answer,
        status: data.status,
        files: data.files || [],
        totalSize: data.totalSize || 0,
        createdAt: (data.createdAt as Timestamp).toMillis(),
        expiresAt: (data.expiresAt as Timestamp).toMillis(),
      });
    },
    (err) => {
      log.warn('Signaling', `subscribeToConnection warning: ${err.message}`);
    }
  );
}

export function subscribeToIncomingConnections(
  roomId: string,
  uid: string,
  callback: (conn: RTCSignalingConnection) => void
): () => void {
  log.signaling(`Subscribing to incoming connections for user ${uid} in room ${roomId}`);
  const connectionsRef = collection(db, 'rooms', roomId, 'connections');
  const q = query(connectionsRef, where('recipientUid', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(
    q,
    (snap) => {
      log.signaling(`Incoming connections snapshot: ${snap.docChanges().length} change(s)`);
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          log.signaling(`Incoming transfer detected: conn=${change.doc.id}, from=${data.initiatorUid}, files=${data.files?.length ?? 0}`);
          callback({
            connectionId: change.doc.id,
            initiatorUid: data.initiatorUid,
            recipientUid: data.recipientUid,
            offer: data.offer,
            answer: data.answer,
            status: data.status,
            files: data.files || [],
            totalSize: data.totalSize || 0,
            createdAt: (data.createdAt as Timestamp).toMillis(),
            expiresAt: (data.expiresAt as Timestamp).toMillis(),
          });
        }
      });
    },
    (err) => {
      log.warn('Signaling', `subscribeToIncomingConnections notice: ${err.message}`);
    }
  );
}

export async function cleanupConnection(
  roomId: string,
  connectionId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'rooms', roomId, 'connections', connectionId));
    await batch.commit();
  } catch {
    // Best-effort cleanup
  }
}
