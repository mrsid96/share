import { describe, it, expect, beforeEach } from 'vitest';
import { useTransferStore } from '../../src/store/transfer.store';
import type { ReceivedFile, TransferProgress } from '../../src/types/transfer';

describe('Transfer Store Integration', () => {
  beforeEach(() => {
    useTransferStore.getState().reset();
  });

  it('selects files and recipient', () => {
    const dummyFile = new File(['content'], 'sample.txt', { type: 'text/plain' });
    useTransferStore.getState().setSelectedFiles([dummyFile]);
    useTransferStore.getState().setSelectedRecipientUid('peer-456');

    const state = useTransferStore.getState();
    expect(state.selectedFiles).toHaveLength(1);
    expect(state.selectedRecipientUid).toBe('peer-456');
  });

  it('tracks progress and completed files', () => {
    const progress: TransferProgress = {
      transferId: 't-1',
      currentFileId: 'f-1',
      currentFileName: 'test.png',
      currentFileSize: 2048,
      currentFileBytesTransferred: 1024,
      totalBytesTransferred: 1024,
      totalBytes: 2048,
      speedBps: 512,
      estimatedSecondsRemaining: 2,
      status: 'transferring',
    };

    useTransferStore.getState().setOutgoingProgress(progress);
    expect(useTransferStore.getState().outgoingProgress?.currentFileBytesTransferred).toBe(1024);

    const received: ReceivedFile = {
      fileId: 'f-1',
      name: 'test.png',
      size: 2048,
      mimeType: 'image/png',
      url: 'blob:http://localhost/test',
    };

    useTransferStore.getState().addReceivedFiles([received]);
    expect(useTransferStore.getState().receivedFiles).toHaveLength(1);
  });

  it('resets state on transfer finish', () => {
    useTransferStore.getState().setSelectedRecipientUid('peer-123');
    useTransferStore.getState().reset();
    expect(useTransferStore.getState().selectedRecipientUid).toBeNull();
  });
});
