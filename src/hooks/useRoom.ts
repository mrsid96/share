import { useCallback, useEffect, useRef } from 'react';
import { useRoomStore } from '../store/room.store';
import { useAuthStore } from '../store/auth.store';
import {
  createRoom,
  getRoomById,
  joinRoom,
  leaveRoom,
  isRoomExpired,
  subscribeToMembers,
  startHeartbeat,
} from '../services/firebase/firestore.service';
import { getCurrentUser, signInAnonymous } from '../services/firebase/auth.service';
import type { Device } from '../types/device';
import { detectDeviceType } from '../utils/device-detection';
import { isValidRoomId } from '../utils/validation';

export function useRoom() {
  const {
    room,
    peers,
    currentDevice,
    isJoining,
    error,
    setRoom,
    setPeers,
    setCurrentDevice,
    setJoining,
    setError,
    reset,
  } = useRoomStore();

  const { user, deviceName } = useAuthStore();
  const unsubscribersRef = useRef<Array<() => void>>([]);

  const cleanup = useCallback(() => {
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];
  }, []);

  const handleCreate = useCallback(async () => {
    setJoining(true);
    setError(null);

    let activeUser = user || getCurrentUser();
    if (!activeUser) {
      try {
        activeUser = await signInAnonymous();
        useAuthStore.getState().setUser(activeUser);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Authentication failed';
        setError(msg);
        setJoining(false);
        return;
      }
    }

    try {
      const roomData = await createRoom(activeUser.uid);
      const activeDeviceName = deviceName || useAuthStore.getState().deviceName;
      const device: Device = {
        uid: activeUser.uid,
        deviceName: activeDeviceName,
        deviceType: detectDeviceType(),
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'online',
      };
      setCurrentDevice(device);
      setRoom(roomData);

      await joinRoom(roomData.roomId, activeUser.uid, activeDeviceName);

      // Subscribe to peers
      const unsubMembers = subscribeToMembers(roomData.roomId, (members) => {
        const otherMembers = members.filter((m) => m.uid !== activeUser.uid);
        const devices: Device[] = otherMembers.map((m) => ({
          uid: m.uid,
          deviceName: m.deviceName,
          deviceType: m.deviceType as Device['deviceType'],
          joinedAt: m.joinedAt,
          lastSeen: m.lastSeen,
          status: m.status as Device['status'],
        }));
        setPeers(devices);
      });
      const stopHeartbeat = startHeartbeat(roomData.roomId, activeUser.uid);
      unsubscribersRef.current.push(unsubMembers, stopHeartbeat);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create room. Please try again.';
      setError(msg);
    } finally {
      setJoining(false);
    }
  }, [user, deviceName, setRoom, setCurrentDevice, setPeers, setJoining, setError]);

  const handleJoin = useCallback(
    async (roomId: string) => {
      if (!isValidRoomId(roomId)) {
        setError('Invalid room link.');
        return;
      }

      setJoining(true);
      setError(null);

      let activeUser = user || getCurrentUser();
      if (!activeUser) {
        try {
          activeUser = await signInAnonymous();
          useAuthStore.getState().setUser(activeUser);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Authentication failed';
          setError(msg);
          setJoining(false);
          return;
        }
      }

      try {
        const roomData = await getRoomById(roomId);
        if (!roomData) {
          setError('Room not found.');
          setJoining(false);
          return;
        }
        if (isRoomExpired(roomData)) {
          setError('This room has expired.');
          setJoining(false);
          return;
        }

        const activeDeviceName = deviceName || useAuthStore.getState().deviceName;
        const device: Device = {
          uid: activeUser.uid,
          deviceName: activeDeviceName,
          deviceType: detectDeviceType(),
          joinedAt: Date.now(),
          lastSeen: Date.now(),
          status: 'online',
        };
        setCurrentDevice(device);
        setRoom(roomData);
        await joinRoom(roomData.roomId, activeUser.uid, activeDeviceName);

        // Subscribe to peers
        const unsubMembers = subscribeToMembers(roomData.roomId, (members) => {
          const otherMembers = members.filter((m) => m.uid !== activeUser.uid);
          const devices: Device[] = otherMembers.map((m) => ({
            uid: m.uid,
            deviceName: m.deviceName,
            deviceType: m.deviceType as Device['deviceType'],
            joinedAt: m.joinedAt,
            lastSeen: m.lastSeen,
            status: m.status as Device['status'],
          }));
          setPeers(devices);
        });
        const stopHeartbeat = startHeartbeat(roomData.roomId, activeUser.uid);
        unsubscribersRef.current.push(unsubMembers, stopHeartbeat);
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : 'Failed to join room. Please check the link and try again.';
        setError(msg);
      } finally {
        setJoining(false);
      }
    },
    [user, deviceName, setRoom, setCurrentDevice, setPeers, setJoining, setError]
  );

  const handleLeave = useCallback(async () => {
    if (!user || !room) return;
    cleanup();
    try {
      await leaveRoom(room.roomId, user.uid);
    } catch {
      // Best-effort
    }
    reset();
  }, [user, room, cleanup, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handle pagehide for best-effort cleanup
  useEffect(() => {
    if (!user || !room) return;
    const handlePageHide = () => {
      leaveRoom(room.roomId, user.uid).catch(() => {});
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [user, room]);

  return {
    room,
    peers,
    currentDevice,
    isJoining,
    error,
    createRoom: handleCreate,
    joinRoom: handleJoin,
    leaveRoom: handleLeave,
  };
}
