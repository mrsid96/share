export interface RTCSignalingConnection {
  connectionId: string;
  initiatorUid: string;
  recipientUid: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  status: 'pending' | 'active' | 'closed' | 'rejected';
  files?: import('./transfer').FileMetadata[];
  totalSize?: number;
  createdAt: number;
  expiresAt: number;
}

export interface ICECandidate {
  candidateId: string;
  candidate: RTCIceCandidateInit;
  createdAt: number;
}

export type ConnectionRole = 'initiator' | 'recipient';

export const PROTOCOL_VERSION = '1.0';

export type TransferMessage =
  | {
      type: 'transfer-request';
      version: string;
      transferId: string;
      files: import('./transfer').FileMetadata[];
    }
  | {
      type: 'transfer-accepted';
      version: string;
      transferId: string;
    }
  | {
      type: 'transfer-rejected';
      version: string;
      transferId: string;
    }
  | {
      type: 'file-start';
      version: string;
      transferId: string;
      fileId: string;
      name: string;
      size: number;
      mimeType: string;
    }
  | {
      type: 'file-end';
      version: string;
      transferId: string;
      fileId: string;
      checksum?: string;
    }
  | {
      type: 'transfer-complete';
      version: string;
      transferId: string;
    }
  | {
      type: 'transfer-cancelled';
      version: string;
      transferId: string;
    };
