import { describe, it, expect } from 'vitest';
import { generateRoomId, generateTransferId, generateFileId } from '../../src/utils/random-id';

describe('generateRoomId', () => {
  it('generates a string with the correct character set', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRoomId()));
    expect(ids.size).toBe(100);
  });

  it('has sufficient length for 128 bits of entropy', () => {
    const id = generateRoomId();
    // 16 bytes base64url encoded ≈ 22 characters
    expect(id.length).toBeGreaterThanOrEqual(21);
  });
});

describe('generateTransferId', () => {
  it('generates a hex string', () => {
    const id = generateTransferId();
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateTransferId()));
    expect(ids.size).toBe(50);
  });
});

describe('generateFileId', () => {
  it('generates a hex string of expected length', () => {
    const id = generateFileId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });
});
