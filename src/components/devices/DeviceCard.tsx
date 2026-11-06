import { Smartphone, Tablet, Monitor, Laptop, Check } from 'lucide-react';
import { cn } from '../ui/cn';
import { Badge } from '../ui/Badge';
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
  onSelect,
}: DeviceCardProps) {
  const Icon = getDeviceIcon(device.deviceType);
  const isOnline = device.status === 'online';
  const isClickable = !isCurrentDevice && !!onSelect;

  return (
    <div
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
        'group relative flex flex-col items-center justify-between p-4 rounded-2xl border text-center transition-all duration-200 select-none',
        isClickable && 'cursor-pointer hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 active:scale-[0.97]',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/40 shadow-lg shadow-primary/10'
          : 'border-border/80 bg-surface hover:bg-surface-elevated',
        isCurrentDevice && 'bg-muted/40 border-dashed border-border'
      )}
    >
      {/* Selected checkmark pill */}
      {selected && (
        <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-xs">
          <Check className="h-3 w-3 stroke-[3]" />
        </div>
      )}

      {/* Device Icon Avatar with pulse halo */}
      <div className="relative mt-2 mb-3">
        {isOnline && !isCurrentDevice && (
          <span
            className="absolute -inset-1 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity bg-primary"
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105',
            selected
              ? 'bg-primary text-white shadow-md shadow-primary/30'
              : isCurrentDevice
              ? 'bg-muted text-foreground'
              : 'bg-muted/70 text-foreground group-hover:text-primary group-hover:bg-primary/10'
          )}
        >
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>

        {/* Live beacon */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface',
            isOnline ? 'bg-emerald-500' : 'bg-muted-foreground'
          )}
        />
      </div>

      {/* Device details */}
      <div className="flex flex-col items-center gap-1 w-full min-w-0">
        <p className="text-sm font-bold text-foreground truncate w-full px-1">
          {device.deviceName}
        </p>

        <div className="flex items-center gap-1.5 mt-0.5">
          {isCurrentDevice ? (
            <Badge variant="muted" className="text-[10px] uppercase font-bold tracking-wider">
              You
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground capitalize">
              {device.deviceType}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
