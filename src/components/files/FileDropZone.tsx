import * as React from 'react';
import {
  Upload,
  FolderOpen,
  X,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File as GenericFileIcon,
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
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return FileImage;
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv'].includes(ext)) {
    return FileVideo;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return FileAudio;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return FileArchive;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'rs', 'go'].includes(ext)) {
    return FileCode;
  }
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text') || ['txt', 'md', 'pdf'].includes(ext)) {
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
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center select-none',
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-primary/50'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 transition-transform group-hover:scale-110">
          <Upload className="h-6 w-6" />
        </div>

        <p className="text-sm font-semibold text-foreground">
          Drop files here, or <span className="text-primary hover:underline">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports any file format &bull; Unlimited sizes via chunked WebRTC
        </p>
      </div>

      {/* Selected file queue */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-medium">
            <span>
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} staged
            </span>
            <span className="font-semibold text-foreground">{formatBytes(totalSize)}</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
            {selectedFiles.map((file, idx) => {
              const FileTypeIcon = getFileIcon(file.type, file.name);
              return (
                <div
                  key={`${file.name}-${file.size}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-surface text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                      <FileTypeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">{file.name}</span>
                      <span className="text-[11px] text-muted-foreground">
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
                    className="p-1 rounded-lg text-muted-foreground hover:text-error hover:bg-error/10 transition-colors"
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
            className="w-full mt-1 border-dashed text-xs text-muted-foreground hover:text-foreground"
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            Add more files
          </Button>
        </div>
      )}
    </div>
  );
}
