import { FileIcon, ArrowDownToLine, Smartphone, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatBytes } from '../../utils/format-bytes';

interface FileInfo {
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface IncomingTransferSheetProps {
  open: boolean;
  senderName: string;
  files: FileInfo[];
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingTransferSheet({
  open,
  senderName,
  files,
  onAccept,
  onDecline,
}: IncomingTransferSheetProps) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <Modal open={open} onClose={onDecline} title="Incoming File Transfer">
      <div data-testid="incoming-transfer" className="flex flex-col gap-5 py-1">
        {/* Sender Header */}
        <div className="flex items-center gap-3.5 p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shrink-0 shadow-md shadow-primary/25">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-primary font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Incoming Drop From
            </span>
            <span className="text-base font-extrabold font-heading text-foreground truncate">
              {senderName}
            </span>
          </div>
        </div>

        {/* File summary */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="text-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''} staged
            </span>
            <span className="text-primary font-extrabold">{formatBytes(totalSize)}</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-surface text-xs shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-primary shrink-0">
                    <FileIcon className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-foreground truncate">{file.name}</span>
                </div>
                <span className="text-muted-foreground text-[11px] shrink-0 font-medium">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={onAccept}
            className="flex-1 font-extrabold shadow-lg shadow-primary/25"
            aria-label="Accept & Receive"
          >
            <ArrowDownToLine className="h-5 w-5 mr-1.5" />
            Accept & Receive
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onDecline}
            className="sm:w-32 text-muted-foreground hover:text-foreground font-bold"
          >
            Decline
          </Button>
        </div>
      </div>
    </Modal>
  );
}
