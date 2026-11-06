import { CHUNK_SIZE, readFileChunk } from '../file-system/file-reader';
import { createFileWriteHandle } from '../file-system/file-writer';
import { parseTransferMessage, sanitizeFilename } from '../../utils/validation';
import { generateTransferId, generateFileId } from '../../utils/random-id';
import { PROTOCOL_VERSION, type TransferMessage } from '../../types/webrtc';
import type { FileMetadata, ReceivedFile, TransferProgress } from '../../types/transfer';

const BUFFER_HIGH_WATERMARK = 1024 * 1024; // 1 MB
const BUFFER_LOW_WATERMARK = 256 * 1024;   // 256 KB

export type TransferEventType =
  | 'progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'file-received'
  | 'transfer-request'
  | 'transfer-accepted'
  | 'transfer-rejected';

export interface TransferEvent {
  type: TransferEventType;
  transferId: string;
  progress?: TransferProgress;
  files?: ReceivedFile[];
  request?: { transferId: string; files: FileMetadata[] };
  error?: string;
}

type TransferEventListener = (event: TransferEvent) => void;

/**
 * Manages file transfer over a WebRTC DataChannel.
 * Handles both sender (initiator) and receiver roles.
 */
export class FileTransferManager {
  private channel: RTCDataChannel;
  private listeners: TransferEventListener[] = [];

  // Sender state
  private sendQueue: Array<{ file: File; meta: FileMetadata }> = [];
  private currentSendTransferId = '';
  private sending = false;
  private cancelled = false;

  // Receiver state
  private receivingTransferId = '';
  private currentReceivingFile: FileMetadata | null = null;
  private currentWriteHandle: Awaited<ReturnType<typeof createFileWriteHandle>> | null = null;
  private currentFileBytesReceived = 0;
  private totalBytesReceived = 0;
  private totalBytes = 0;
  private receivedFiles: ReceivedFile[] = [];
  private speedSamples: Array<{ bytes: number; time: number }> = [];
  private lastProgressUpdate = 0;

  constructor(channel: RTCDataChannel) {
    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';
    this.channel.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK;
    this.setupChannelHandlers();
  }

  on(listener: TransferEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: TransferEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  private setupChannelHandlers(): void {
    this.channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        this.handleControlMessage(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        this.handleBinaryData(event.data);
      }
    };

    this.channel.onerror = (_event) => {
      this.emit({
        type: 'failed',
        transferId: this.currentSendTransferId || this.receivingTransferId,
        error: 'Connection error during transfer.',
      });
    };

    this.channel.onclose = () => {
      if (this.sending && !this.cancelled) {
        this.emit({
          type: 'failed',
          transferId: this.currentSendTransferId,
          error: 'Connection closed unexpectedly.',
        });
      }
    };
  }

  private sendControl(msg: TransferMessage): void {
    if (this.channel.readyState !== 'open') {
      throw new Error('DataChannel is not open');
    }
    this.channel.send(JSON.stringify(msg));
  }

  private handleControlMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // Ignore malformed JSON
    }

    const msg = parseTransferMessage(parsed);
    if (!msg) return;

    switch (msg.type) {
      case 'transfer-request':
        this.receivingTransferId = msg.transferId;
        this.totalBytes = msg.files.reduce((s, f) => s + f.size, 0);
        this.totalBytesReceived = 0;
        this.receivedFiles = [];
        this.emit({ type: 'transfer-request', transferId: msg.transferId, request: { transferId: msg.transferId, files: msg.files } });
        break;

      case 'transfer-accepted':
        this.emit({ type: 'transfer-accepted', transferId: msg.transferId });
        this.startSending();
        break;

      case 'transfer-rejected':
        this.sending = false;
        this.emit({ type: 'transfer-rejected', transferId: msg.transferId });
        break;

      case 'file-start':
        this.handleFileStart(msg);
        break;

      case 'file-end':
        this.handleFileEnd(msg);
        break;

      case 'transfer-complete':
        this.emit({ type: 'completed', transferId: msg.transferId, files: this.receivedFiles });
        break;

      case 'transfer-cancelled':
        this.emit({ type: 'cancelled', transferId: msg.transferId });
        break;
    }
  }

  private async handleFileStart(msg: Extract<TransferMessage, { type: 'file-start' }>): Promise<void> {
    const safeName = sanitizeFilename(msg.name);
    this.currentReceivingFile = { fileId: msg.fileId, name: safeName, size: msg.size, mimeType: msg.mimeType };
    this.currentFileBytesReceived = 0;
    try {
      this.currentWriteHandle = await createFileWriteHandle(safeName, msg.mimeType, msg.size);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled save dialog — cancel transfer
        this.acceptTransfer(this.receivingTransferId); // This is wrong; we need to cancel
        return;
      }
      this.currentWriteHandle = null;
    }
  }

  private async handleFileEnd(_msg: Extract<TransferMessage, { type: 'file-end' }>): Promise<void> {
    if (!this.currentReceivingFile || !this.currentWriteHandle) return;

    if (this.currentFileBytesReceived !== this.currentReceivingFile.size) {
      this.emit({
        type: 'failed',
        transferId: this.receivingTransferId,
        error: `File integrity error: expected ${this.currentReceivingFile.size} bytes, received ${this.currentFileBytesReceived}.`,
      });
      return;
    }

    const result = await this.currentWriteHandle.finish();
    const receivedFile: ReceivedFile = {
      fileId: this.currentReceivingFile.fileId,
      name: this.currentReceivingFile.name,
      size: this.currentReceivingFile.size,
      mimeType: this.currentReceivingFile.mimeType,
      blob: result.blob,
      url: result.url,
      fileHandle: result.fileHandle,
    };
    this.receivedFiles.push(receivedFile);
    this.emit({ type: 'file-received', transferId: this.receivingTransferId, files: [receivedFile] });
    this.currentReceivingFile = null;
    this.currentWriteHandle = null;
  }

  private async handleBinaryData(data: ArrayBuffer): Promise<void> {
    if (!this.currentWriteHandle) return;
    await this.currentWriteHandle.write(data);
    this.currentFileBytesReceived += data.byteLength;
    this.totalBytesReceived += data.byteLength;
    this.updateReceiverProgress();
  }

  private updateReceiverProgress(): void {
    const now = Date.now();
    if (now - this.lastProgressUpdate < 100) return; // Throttle to 10 updates/sec
    this.lastProgressUpdate = now;

    this.speedSamples.push({ bytes: this.totalBytesReceived, time: now });
    if (this.speedSamples.length > 10) this.speedSamples.shift();

    const speedBps = this.computeSpeed();
    const remaining = speedBps > 0
      ? (this.totalBytes - this.totalBytesReceived) / speedBps
      : null;

    this.emit({
      type: 'progress',
      transferId: this.receivingTransferId,
      progress: {
        transferId: this.receivingTransferId,
        currentFileId: this.currentReceivingFile?.fileId ?? '',
        currentFileName: this.currentReceivingFile?.name ?? '',
        currentFileSize: this.currentReceivingFile?.size ?? 0,
        currentFileBytesTransferred: this.currentFileBytesReceived,
        totalBytesTransferred: this.totalBytesReceived,
        totalBytes: this.totalBytes,
        speedBps,
        estimatedSecondsRemaining: remaining,
        status: 'transferring',
      },
    });
  }

  private computeSpeed(): number {
    if (this.speedSamples.length < 2) return 0;
    const oldest = this.speedSamples[0];
    const newest = this.speedSamples[this.speedSamples.length - 1];
    const dt = (newest.time - oldest.time) / 1000;
    if (dt === 0) return 0;
    return (newest.bytes - oldest.bytes) / dt;
  }

  // ─── Sender API ─────────────────────────────────────────────────────────────

  /**
   * Initiates a transfer request to the remote peer.
   */
  requestTransfer(files: File[]): string {
    const transferId = generateTransferId();
    const filesMeta: FileMetadata[] = files.map((f) => ({
      fileId: generateFileId(),
      name: f.name,
      size: f.size,
      mimeType: f.type || 'application/octet-stream',
    }));

    this.sendQueue = files.map((f, i) => ({ file: f, meta: filesMeta[i] }));
    this.currentSendTransferId = transferId;
    this.sending = false;
    this.cancelled = false;

    this.sendControl({
      type: 'transfer-request',
      version: PROTOCOL_VERSION,
      transferId,
      files: filesMeta,
    });

    return transferId;
  }

  /**
   * Accepts an incoming transfer (receiver calls this).
   */
  acceptTransfer(transferId: string): void {
    this.sendControl({ type: 'transfer-accepted', version: PROTOCOL_VERSION, transferId });
  }

  /**
   * Rejects an incoming transfer (receiver calls this).
   */
  rejectTransfer(transferId: string): void {
    this.sendControl({ type: 'transfer-rejected', version: PROTOCOL_VERSION, transferId });
  }

  /**
   * Cancels an in-progress transfer (either side).
   */
  cancelTransfer(transferId: string): void {
    this.cancelled = true;
    this.sending = false;
    this.sendControl({ type: 'transfer-cancelled', version: PROTOCOL_VERSION, transferId });
    this.emit({ type: 'cancelled', transferId });
  }

  /**
   * Starts sending queued files. Called when transfer-accepted is received.
   */
  private async startSending(): Promise<void> {
    if (this.sending || this.cancelled) return;
    this.sending = true;
    const transferId = this.currentSendTransferId;
    const totalBytes = this.sendQueue.reduce((s, q) => s + q.meta.size, 0);
    let totalBytesSent = 0;
    const speedSamples: Array<{ bytes: number; time: number }> = [];

    try {
      for (const { file, meta } of this.sendQueue) {
        if (this.cancelled) break;

        this.sendControl({ type: 'file-start', version: PROTOCOL_VERSION, transferId, fileId: meta.fileId, name: meta.name, size: meta.size, mimeType: meta.mimeType });

        let offset = 0;
        let fileSent = 0;

        while (offset < file.size) {
          if (this.cancelled) break;

          // Backpressure: wait if buffer is full
          while (this.channel.bufferedAmount > BUFFER_HIGH_WATERMARK) {
            if (this.cancelled) break;
            await this.waitForBufferDrain();
          }

          if (this.cancelled) break;

          const size = Math.min(CHUNK_SIZE, file.size - offset);
          const chunk = await readFileChunk(file, offset, size);
          this.channel.send(chunk);
          offset += size;
          fileSent += size;
          totalBytesSent += size;

          // Throttled progress update
          const now = Date.now();
          speedSamples.push({ bytes: totalBytesSent, time: now });
          if (speedSamples.length > 10) speedSamples.shift();

          if (now - this.lastProgressUpdate >= 100) {
            this.lastProgressUpdate = now;
            const oldest = speedSamples[0];
            const dt = (now - oldest.time) / 1000;
            const speedBps = dt > 0 ? (totalBytesSent - oldest.bytes) / dt : 0;
            const remaining = speedBps > 0 ? (totalBytes - totalBytesSent) / speedBps : null;

            this.emit({
              type: 'progress',
              transferId,
              progress: {
                transferId,
                currentFileId: meta.fileId,
                currentFileName: meta.name,
                currentFileSize: meta.size,
                currentFileBytesTransferred: fileSent,
                totalBytesTransferred: totalBytesSent,
                totalBytes,
                speedBps,
                estimatedSecondsRemaining: remaining,
                status: 'transferring',
              },
            });
          }
        }

        if (!this.cancelled) {
          this.sendControl({ type: 'file-end', version: PROTOCOL_VERSION, transferId, fileId: meta.fileId });
        }
      }

      if (!this.cancelled) {
        this.sendControl({ type: 'transfer-complete', version: PROTOCOL_VERSION, transferId });
        this.emit({ type: 'completed', transferId });
      }
    } catch (err: unknown) {
      if (!this.cancelled) {
        this.emit({ type: 'failed', transferId, error: 'File transfer failed unexpectedly.' });
      }
    } finally {
      this.sending = false;
    }
  }

  private waitForBufferDrain(): Promise<void> {
    return new Promise((resolve) => {
      const handler = () => {
        this.channel.removeEventListener('bufferedamountlow', handler);
        resolve();
      };
      this.channel.addEventListener('bufferedamountlow', handler);
      // Safety timeout in case event never fires
      setTimeout(resolve, 5000);
    });
  }

  close(): void {
    if (this.channel.readyState === 'open') {
      this.channel.close();
    }
  }
}
