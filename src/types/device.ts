export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface Device {
  uid: string;
  deviceName: string;
  deviceType: DeviceType;
  joinedAt: number;
  lastSeen: number;
  status: 'online' | 'offline' | 'stale';
}

export interface DeviceState {
  currentDevice: Device | null;
  peers: Device[];
}
