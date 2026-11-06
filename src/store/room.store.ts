import { create } from 'zustand';
import type { Room } from '../types/room';
import type { Device } from '../types/device';

interface RoomState {
  room: Room | null;
  peers: Device[];
  currentDevice: Device | null;
  isJoining: boolean;
  error: string | null;
  setRoom: (room: Room | null) => void;
  setPeers: (peers: Device[]) => void;
  setCurrentDevice: (device: Device | null) => void;
  setJoining: (joining: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  peers: [],
  currentDevice: null,
  isJoining: false,
  error: null,
  setRoom: (room) => set({ room }),
  setPeers: (peers) => set({ peers }),
  setCurrentDevice: (currentDevice) => set({ currentDevice }),
  setJoining: (isJoining) => set({ isJoining }),
  setError: (error) => set({ error }),
  reset: () => set({ room: null, peers: [], currentDevice: null, isJoining: false, error: null }),
}));
