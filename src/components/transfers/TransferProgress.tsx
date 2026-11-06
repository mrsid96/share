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
        <div className="flex items-center gap-2.5">
          {isSender ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowUpCircle className="h-6 w-6 animate-pulse" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowDownCircle className="h-6 w-6 animate-pulse" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-bold text-foreground">
              {isSender ? 'Sending Files...' : 'Receiving Files...'}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-xs">
              {progress.currentFileName || 'Direct WebRTC Stream'}
            </span>
          </div>
        </div>

        <span className="text-2xl font-black text-primary font-mono">
          {overallPercent}%
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Overall Progress</span>
          <span>
            {formatBytes(progress.totalBytesTransferred)} / {formatBytes(progress.totalBytes)}
          </span>
        </div>
        <Progress value={overallPercent} className="h-3 rounded-full" />
      </div>

      {/* Current File Sub-Progress */}
      {progress.currentFileSize > 0 && (
        <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span className="truncate max-w-[200px] text-foreground font-semibold">
              {progress.currentFileName}
            </span>
            <span className="text-muted-foreground">{currentFilePercent}%</span>
          </div>
          <Progress value={currentFilePercent} className="h-1.5" />
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border/80">
          <Gauge className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Speed</span>
            <span className="font-bold text-foreground font-mono">
              {formatSpeed(progress.speedBps || 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border/80">
          <Clock className="h-4 w-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Remaining</span>
            <span className="font-bold text-foreground font-mono">
              {progress.estimatedSecondsRemaining != null && progress.estimatedSecondsRemaining > 0
                ? formatDuration(progress.estimatedSecondsRemaining)
                : 'Calculating...'}
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
        className="w-full text-muted-foreground hover:text-error hover:bg-error/10"
      >
        <X className="h-4 w-4 mr-1.5" />
        Cancel Transfer
      </Button>
    </div>
  );
}
