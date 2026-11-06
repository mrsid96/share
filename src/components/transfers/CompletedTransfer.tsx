import { CheckCircle2, Download, ArrowLeft, Send, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatBytes } from '../../utils/format-bytes';
import { triggerDownload } from '../../services/file-system/file-writer';
import type { ReceivedFile } from '../../types/transfer';

export interface CompletedTransferProps {
  role: 'sender' | 'receiver';
  files: ReceivedFile[];
  onSendAnother: () => void;
  onReturnToRoom: () => void;
}

export function CompletedTransfer({
  role,
  files,
  onSendAnother,
  onReturnToRoom,
}: CompletedTransferProps) {
  const isSender = role === 'sender';
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleDownload = (file: ReceivedFile) => {
    if (file.url) {
      triggerDownload(file.url, file.name);
    } else if (file.blob) {
      const url = URL.createObjectURL(file.blob);
      triggerDownload(url, file.name);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const handleDownloadAll = () => {
    files.forEach((file) => handleDownload(file));
  };

  return (
    <div data-testid="transfer-complete" className="flex flex-col gap-6 py-2">
      {/* Celebration Header */}
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="relative flex items-center justify-center">
          <span className="absolute h-20 w-20 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/35">
            <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Transfer Success
          </span>
          <h2 className="text-2xl font-black font-heading text-foreground">
            {isSender ? 'Files Sent Successfully!' : 'Files Received!'}
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            {files.length} file{files.length !== 1 ? 's' : ''} ({formatBytes(totalSize)}) streamed directly through WebRTC.
          </p>
        </div>
      </div>

      {/* Received Files List (Receiver mode) */}
      {!isSender && files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="text-muted-foreground">Received Items</span>
            {files.length > 1 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="text-primary hover:underline font-extrabold cursor-pointer"
              >
                Download All ({files.length})
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-surface text-xs shadow-xs"
              >
                <div className="flex flex-col min-w-0 mr-3">
                  <span className="font-bold text-foreground truncate">{file.name}</span>
                  <span className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  className="shrink-0 h-9 px-3.5 text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Save
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={onSendAnother}
          className="flex-1 font-extrabold shadow-lg shadow-primary/25"
        >
          <Send className="h-4 w-4 mr-1.5" />
          Send More Files
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onReturnToRoom}
          className="sm:w-36 font-bold"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Room
        </Button>
      </div>
    </div>
  );
}
