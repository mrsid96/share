import * as React from 'react';
import {
  Upload,
  X,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File as GenericFileIcon,
  Plus,
} from 'lucide-react';
import { cn } from '../ui/cn';
import { Button } from '../ui/Button';
import { formatBytes } from '../../utils/format-bytes';

export interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
}

function getFileIcon(mime: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'heic'].includes(ext)) {
    return FileImage;
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) {
    return FileVideo;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return FileAudio;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z', 'dmg', 'pkg'].includes(ext)) {
    return FileArchive;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'rs', 'go', 'sql'].includes(ext)) {
    return FileCode;
  }
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text') || ['txt', 'md', 'pdf', 'doc', 'docx'].includes(ext)) {
    return FileText;
  }
  return GenericFileIcon;
}

export function FileDropZone({
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
}: FileDropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const newFiles = Array.from(fileList);
      onFilesSelected(newFiles);
    },
    [onFilesSelected]
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const totalSize = React.useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [selectedFiles]);

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden file picker input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Drag & Drop Area */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'group relative flex flex-col items-center justify-center p-6 sm:p-7 rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border/90 bg-muted/20 hover:bg-muted/40 hover:border-primary/50'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2.5 transition-transform group-hover:scale-110 shadow-xs">
          <Upload className="h-6 w-6" />
        </div>

        <p className="text-sm font-bold font-heading text-foreground">
          Tap to choose files, or <span className="text-primary underline underline-offset-2">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">
          Photos, videos, documents &bull; Unlimited file size via WebRTC
        </p>
      </div>

      {/* Selected file queue */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-semibold">
            <span>
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} staged
            </span>
            <span className="font-extrabold text-foreground">{formatBytes(totalSize)}</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
            {selectedFiles.map((file, idx) => {
              const FileTypeIcon = getFileIcon(file.type, file.name);
              return (
                <div
                  key={`${file.name}-${file.size}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-border/80 bg-surface text-xs shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileTypeIcon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-foreground truncate">{file.name}</span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(idx);
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="w-full mt-1 border-dashed text-xs text-muted-foreground hover:text-foreground font-bold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add more files
          </Button>
        </div>
      )}
    </div>
  );
}
