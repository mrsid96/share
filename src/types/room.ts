export interface Room {
  roomId: string;
  hostUid: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'closed' | 'expired';
}

export interface RoomMember {
  uid: string;
  deviceName: string;
  deviceType: string;
  joinedAt: number;
  lastSeen: number;
  status: 'online' | 'offline' | 'stale';
}
