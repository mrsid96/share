import { supportsFileSystemAccess } from '../../utils/device-detection';

const SAFE_FALLBACK_SIZE = 250 * 1024 * 1024; // 250 MB

export interface FileWriteHandle {
  write(chunk: ArrayBuffer): Promise<void>;
  finish(): Promise<{ blob?: Blob; url?: string; fileHandle?: FileSystemFileHandle }>;
  cancel(): void;
}

/**
 * Creates a progressive file write handle.
 * Uses File System Access API if available, otherwise buffers in memory.
 */
export async function createFileWriteHandle(
  filename: string,
  mimeType: string,
  expectedSize: number
): Promise<FileWriteHandle> {
  if (supportsFileSystemAccess() && expectedSize <= 2 * 1024 * 1024 * 1024) {
    try {
      const fileHandle = await (window as Window & typeof globalThis & {
        showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'File', accept: { [mimeType || 'application/octet-stream']: [] } }],
      });
      const writable = await fileHandle.createWritable();
      return {
        async write(chunk) {
          await writable.write(chunk);
        },
        async finish() {
          await writable.close();
          return { fileHandle };
        },
        cancel() {
          writable.abort().catch(() => {});
        },
      };
    } catch (err: unknown) {
      // User cancelled picker or API failed — fall back to memory buffer
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (!isAbort) {
        console.warn('File System Access API failed, falling back to in-memory buffer');
      } else {
        throw err; // Re-throw user abort
      }
    }
  }

  if (expectedSize > SAFE_FALLBACK_SIZE) {
    console.warn(
      `Large file (${expectedSize} bytes) will be buffered in memory. This may fail on mobile browsers.`
    );
  }

  // In-memory accumulator fallback
  const chunks: ArrayBuffer[] = [];
  return {
    async write(chunk) {
      chunks.push(chunk);
    },
    async finish() {
      const blob = new Blob(chunks, { type: mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      return { blob, url };
    },
    cancel() {
      chunks.length = 0;
    },
  };
}

/**
 * Triggers a browser download for a given URL.
 */
export function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Revokes an object URL after a short delay.
 */
export function revokeObjectUrl(url: string, delayMs = 60_000): void {
  setTimeout(() => URL.revokeObjectURL(url), delayMs);
}
