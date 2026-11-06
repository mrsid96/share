import { Radio, QrCode, Copy, Check, Sparkles } from 'lucide-react';
import { DeviceCard } from './DeviceCard';
import { Button } from '../ui/Button';

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
  hasStagedFiles?: boolean;
  onSelect?: (uid: string) => void;
  onShowQr?: () => void;
  onCopyLink?: () => void;
  copiedLink?: boolean;
}

function RadarEmptyState({
  onShowQr,
  onCopyLink,
  copiedLink,
}: {
  onShowQr?: () => void;
  onCopyLink?: () => void;
  copiedLink?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center overflow-hidden">
      {/* Concentric radar waves with smooth pulse */}
      <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 my-2">
        <div className="absolute inset-0 rounded-full border border-primary/25 animate-pulse-ring" />
        <div className="absolute inset-4 rounded-full border border-primary/30 animate-pulse-ring [animation-delay:0.8s]" />
        <div className="absolute inset-9 rounded-full border border-primary/35 animate-pulse-ring [animation-delay:1.6s]" />

        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/30 shadow-xl shadow-primary/15">
          <Radio className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-3 max-w-sm">
        <h3 className="text-base sm:text-lg font-bold font-heading text-foreground flex items-center justify-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent" />
          Scanning for nearby devices&hellip;
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Open this room on your phone, tablet, or another laptop to start beaming files.
        </p>
      </div>

      {/* Quick Invite Actions directly inside radar */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
        {onShowQr && (
          <Button
            variant="default"
            size="sm"
            onClick={onShowQr}
            className="font-bold shadow-md shadow-primary/20"
          >
            <QrCode className="h-4 w-4 mr-1.5" />
            Show QR Code
          </Button>
        )}
        {onCopyLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyLink}
            className="font-bold"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-emerald-500" />
                Copied Link!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy Room Link
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function DeviceList({
  devices,
  currentDeviceUid,
  selectedUid,
  hasStagedFiles = false,
  onSelect,
  onShowQr,
  onCopyLink,
  copiedLink,
}: DeviceListProps) {
  const peers = devices.filter((d) => d.uid !== currentDeviceUid);
  const currentDevice = devices.find((d) => d.uid === currentDeviceUid);

  return (
    <div className="flex flex-col gap-5">
      {peers.length === 0 ? (
        <RadarEmptyState
          onShowQr={onShowQr}
          onCopyLink={onCopyLink}
          copiedLink={copiedLink}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          {/* Current device */}
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
              hasStagedFiles={hasStagedFiles}
              onSelect={onSelect ? () => onSelect(device.uid) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
