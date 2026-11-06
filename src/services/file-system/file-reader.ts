export const CHUNK_SIZE = 64 * 1024; // 64 KiB

/**
 * Reads a file slice as an ArrayBuffer.
 */
export async function readFileChunk(
  file: File,
  offset: number,
  size: number
): Promise<ArrayBuffer> {
  const slice = file.slice(offset, offset + size);
  return slice.arrayBuffer();
}

/**
 * Returns the number of chunks needed to transfer a file.
 */
export function getChunkCount(fileSize: number, chunkSize = CHUNK_SIZE): number {
  return Math.ceil(fileSize / chunkSize);
}

/**
 * Incrementally computes SHA-256 for integrity checking.
 * Note: SubtleCrypto only allows one-shot hash — we use accumulation here.
 * For streaming, we accumulate and hash at the end (acceptable for MVP).
 */
export async function computeSha256(data: ArrayBuffer[]): Promise<string> {
  const concatenated = concatenateBuffers(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', concatenated);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function concatenateBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}
