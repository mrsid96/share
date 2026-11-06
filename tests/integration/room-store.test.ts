import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from '../../src/store/room.store';
import type { Device } from '../../src/types/device';
import type { Room } from '../../src/types/room';

describe('Room Store Integration', () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
  });

  it('initializes with default values', () => {
    const state = useRoomStore.getState();
    expect(state.room).toBeNull();
    expect(state.peers).toEqual([]);
    expect(state.currentDevice).toBeNull();
    expect(state.isJoining).toBe(false);
    expect(state.error).toBeNull();
  });

  it('updates room and current device', () => {
    const mockRoom: Room = {
      roomId: 'test-room-1234567890123456',
      hostUid: 'user-1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7200000,
      status: 'active',
    };

    const mockDevice: Device = {
      uid: 'user-1',
      deviceName: 'Swift Falcon',
      deviceType: 'desktop',
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      status: 'online',
    };

    useRoomStore.getState().setRoom(mockRoom);
    useRoomStore.getState().setCurrentDevice(mockDevice);

    const updated = useRoomStore.getState();
    expect(updated.room?.roomId).toBe('test-room-1234567890123456');
    expect(updated.currentDevice?.deviceName).toBe('Swift Falcon');
  });

  it('updates peers list dynamically', () => {
    const peer1: Device = {
      uid: 'user-2',
      deviceName: 'Brave Panda',
      deviceType: 'mobile',
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      status: 'online',
    };

    useRoomStore.getState().setPeers([peer1]);
    expect(useRoomStore.getState().peers).toHaveLength(1);
    expect(useRoomStore.getState().peers[0].deviceName).toBe('Brave Panda');

    useRoomStore.getState().setPeers([]);
    expect(useRoomStore.getState().peers).toHaveLength(0);
  });

  it('resets state completely on leave', () => {
    useRoomStore.getState().setError('Some error');
    useRoomStore.getState().setJoining(true);
    useRoomStore.getState().reset();

    const state = useRoomStore.getState();
    expect(state.error).toBeNull();
    expect(state.isJoining).toBe(false);
    expect(state.room).toBeNull();
  });
});
