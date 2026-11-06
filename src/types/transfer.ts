export type TransferStatus =
  | 'pending'
  | 'accepted'
  | 'connecting'
  | 'transferring'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export interface FileMetadata {
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface TransferRequest {
  transferId: string;
  connectionId: string;
  initiatorUid: string;
  recipientUid: string;
  files: FileMetadata[];
  totalSize: number;
  status: TransferStatus;
  createdAt: number;
}

export interface TransferProgress {
  transferId: string;
  currentFileId: string;
  currentFileName: string;
  currentFileSize: number;
  currentFileBytesTransferred: number;
  totalBytesTransferred: number;
  totalBytes: number;
  speedBps: number;
  estimatedSecondsRemaining: number | null;
  status: TransferStatus;
}

export interface ReceivedFile {
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
  blob?: Blob;
  url?: string;
  fileHandle?: FileSystemFileHandle;
}
