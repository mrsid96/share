import { Smartphone, Tablet, Monitor, Laptop, Check, Send } from 'lucide-react';
import { cn } from '../ui/cn';
import type { DeviceType } from '../../types/device';

interface DeviceInfo {
  uid: string;
  deviceName: string;
  deviceType: string;
  status: string;
}

export interface DeviceCardProps {
  device: DeviceInfo;
  isCurrentDevice?: boolean;
  selected?: boolean;
  hasStagedFiles?: boolean;
  onSelect?: () => void;
}

function getDeviceIcon(type: string) {
  const norm = type.toLowerCase() as DeviceType;
  switch (norm) {
    case 'mobile':
      return Smartphone;
    case 'tablet':
      return Tablet;
    case 'desktop':
      return Monitor;
    default:
      return Laptop;
  }
}

export function DeviceCard({
  device,
  isCurrentDevice = false,
  selected = false,
  hasStagedFiles = false,
  onSelect,
}: DeviceCardProps) {
  const Icon = getDeviceIcon(device.deviceType);
  const isOnline = device.status === 'online';
  const isClickable = !isCurrentDevice && !!onSelect;

  return (
    <div
      data-testid="device-card"
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onSelect : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={cn(
        'group relative flex flex-col items-center justify-between p-4 sm:p-5 rounded-3xl border text-center transition-all duration-200 select-none min-h-[140px]',
        isClickable && 'cursor-pointer hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.97]',
        selected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xl shadow-primary/15'
          : 'border-border/80 bg-surface hover:bg-surface-elevated',
        isCurrentDevice && 'bg-muted/30 border-dashed border-border/90'
      )}
      aria-label={`${device.deviceName} (${isCurrentDevice ? 'You' : device.deviceType})`}
    >
      {/* Selected badge */}
      {selected && (
        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30 animate-in zoom-in-75 duration-150">
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </div>
      )}

      {/* Device Icon Avatar with colorful glow */}
      <div className="relative mt-1 mb-2">
        {isOnline && !isCurrentDevice && (
          <span
            className="absolute -inset-1.5 rounded-3xl opacity-20 group-hover:opacity-40 transition-opacity bg-primary blur-xs"
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            'relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl transition-transform duration-200 group-hover:scale-105',
            selected
              ? 'bg-primary text-white shadow-lg shadow-primary/35'
              : isCurrentDevice
              ? 'bg-muted text-foreground/80'
              : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
          )}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} />
        </div>

        {/* Live beacon */}
        <span
          className={cn(
            'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-surface',
            isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-muted-foreground'
          )}
          title={isOnline ? 'Online' : 'Offline'}
        />
      </div>

      {/* Device Labels */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        <span className="text-sm font-bold font-heading text-foreground truncate max-w-full">
          {device.deviceName}
        </span>

        {isCurrentDevice ? (
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            You (This Device)
          </span>
        ) : hasStagedFiles ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
            <Send className="h-3 w-3" /> Tap to send
          </span>
        ) : (
          <span className="text-xs text-muted-foreground capitalize">
            {device.deviceType} &bull; {isOnline ? 'Ready' : 'Offline'}
          </span>
        )}
      </div>
    </div>
  );
}
