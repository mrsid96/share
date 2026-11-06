import { Radio } from 'lucide-react';
import { DeviceCard } from './DeviceCard';

interface DeviceInfo {
  uid: string;
  deviceName: string;
  deviceType: string;
  status: string;
}

export interface DeviceListProps {
  devices: DeviceInfo[];
  currentDeviceUid?: string;
  selectedUid?: string | null;
  onSelect?: (uid: string) => void;
}

function RadarEmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center py-12 px-4 text-center overflow-hidden">
      {/* Concentric radar waves */}
      <div className="relative flex items-center justify-center w-48 h-48 my-2">
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse-ring" />
        <div className="absolute inset-4 rounded-full border border-primary/25 animate-pulse-ring [animation-delay:0.8s]" />
        <div className="absolute inset-10 rounded-full border border-primary/30 animate-pulse-ring [animation-delay:1.6s]" />

        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10">
          <Radio className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-4 max-w-sm">
        <p className="text-base font-bold text-foreground">
          Scanning for nearby devices&hellip;
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Open this room on an iPhone, Android, or PC to see them pop up here in real time.
        </p>
      </div>
    </div>
  );
}

export function DeviceList({
  devices,
  currentDeviceUid,
  selectedUid,
  onSelect,
}: DeviceListProps) {
  const peers = devices.filter((d) => d.uid !== currentDeviceUid);
  const currentDevice = devices.find((d) => d.uid === currentDeviceUid);

  return (
    <div className="flex flex-col gap-5">
      {peers.length === 0 && <RadarEmptyState />}

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        {/* Current device always visible */}
        {currentDevice && (
          <DeviceCard
            device={currentDevice}
            isCurrentDevice
            selected={false}
          />
        )}

        {/* Remote Peers */}
        {peers.map((device) => (
          <DeviceCard
            key={device.uid}
            device={device}
            isCurrentDevice={false}
            selected={selectedUid === device.uid}
            onSelect={onSelect ? () => onSelect(device.uid) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
