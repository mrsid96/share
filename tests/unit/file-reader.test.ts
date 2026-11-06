import { describe, it, expect } from 'vitest';
import { getChunkCount, CHUNK_SIZE } from '../../src/services/file-system/file-reader';

describe('getChunkCount', () => {
  it('returns 1 for a file smaller than chunk size', () => {
    expect(getChunkCount(1024)).toBe(1);
  });

  it('returns exact count for even division', () => {
    expect(getChunkCount(CHUNK_SIZE * 4)).toBe(4);
  });

  it('rounds up for uneven division', () => {
    expect(getChunkCount(CHUNK_SIZE * 4 + 1)).toBe(5);
  });

  it('returns 0 for empty file', () => {
    expect(getChunkCount(0)).toBe(0);
  });

  it('uses custom chunk size', () => {
    expect(getChunkCount(1000, 100)).toBe(10);
    expect(getChunkCount(1001, 100)).toBe(11);
  });
});
