import { ArrowUpCircle, ArrowDownCircle, Gauge, Clock, X } from 'lucide-react';
import { Progress } from '../ui/Progress';
import { Button } from '../ui/Button';
import { formatBytes, formatSpeed, formatDuration } from '../../utils/format-bytes';
import type { TransferProgress as TransferProgressType } from '../../types/transfer';

export interface TransferProgressProps {
  progress: TransferProgressType;
  onCancel: () => void;
  role: 'sender' | 'receiver';
}

export function TransferProgress({ progress, onCancel, role }: TransferProgressProps) {
  const overallPercent =
    progress.totalBytes > 0
      ? Math.round((progress.totalBytesTransferred / progress.totalBytes) * 100)
      : 0;

  const currentFilePercent =
    progress.currentFileSize > 0
      ? Math.round((progress.currentFileBytesTransferred / progress.currentFileSize) * 100)
      : 0;

  const isSender = role === 'sender';

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSender ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ArrowUpCircle className="h-6 w-6 animate-pulse" />
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ArrowDownCircle className="h-6 w-6 animate-pulse" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-bold font-heading text-foreground">
              {isSender ? 'Streaming Files...' : 'Receiving Stream...'}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs font-medium">
              {progress.currentFileName || 'Direct P2P DataChannel'}
            </span>
          </div>
        </div>

        <span className="text-3xl font-black text-primary font-heading">
          {overallPercent}%
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Overall Progress</span>
          <span className="font-extrabold text-foreground">
            {formatBytes(progress.totalBytesTransferred)} / {formatBytes(progress.totalBytes)}
          </span>
        </div>
        <Progress value={overallPercent} className="h-3.5 rounded-full" />
      </div>

      {/* Current File Sub-Progress */}
      {progress.currentFileSize > 0 && (
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-muted/30 border border-border/80 text-xs">
          <div className="flex items-center justify-between font-semibold">
            <span className="truncate max-w-[220px] text-foreground">
              {progress.currentFileName}
            </span>
            <span className="text-muted-foreground font-mono">{currentFilePercent}%</span>
          </div>
          <Progress value={currentFilePercent} className="h-1.5" />
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-surface border border-border/80 shadow-xs">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Gauge className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Speed</span>
            <span className="font-extrabold text-foreground font-mono text-sm">
              {formatSpeed(progress.speedBps || 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-surface border border-border/80 shadow-xs">
          <div className="p-2 rounded-xl bg-accent/15 text-accent">
            <Clock className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Remaining</span>
            <span className="font-extrabold text-foreground font-mono text-sm">
              {progress.estimatedSecondsRemaining != null && progress.estimatedSecondsRemaining > 0
                ? formatDuration(progress.estimatedSecondsRemaining)
                : 'Streaming...'}
            </span>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={onCancel}
        className="text-error hover:bg-error/10 hover:text-error font-bold mt-1"
      >
        <X className="h-4 w-4 mr-1.5" />
        Cancel Transfer
      </Button>
    </div>
  );
}
