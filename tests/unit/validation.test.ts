import { describe, it, expect } from 'vitest';
import { sanitizeFilename, isValidRoomId, parseTransferMessage } from '../../src/utils/validation';
import { PROTOCOL_VERSION } from '../../src/types/webrtc';

describe('sanitizeFilename', () => {
  it('removes directory traversal characters', () => {
    const result = sanitizeFilename('../../../etc/passwd');
    // Forward slashes (directory separators) must be removed
    expect(result).not.toContain('/');
    // Leading dots (hidden files / traversal) should be replaced
    expect(result).not.toMatch(/^\./);
  });

  it('replaces dangerous characters', () => {
    const result = sanitizeFilename('file<name>.txt');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('preserves safe characters', () => {
    expect(sanitizeFilename('my-file_name.txt')).toBe('my-file_name.txt');
  });

  it('limits filename length', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255);
  });
});

describe('isValidRoomId', () => {
  it('accepts valid base64url IDs', () => {
    expect(isValidRoomId('ABCdef123_-ABCdef123_-')).toBe(true);
  });

  it('rejects too-short IDs', () => {
    expect(isValidRoomId('short')).toBe(false);
  });

  it('rejects IDs with invalid characters', () => {
    expect(isValidRoomId('invalid/room+id====')).toBe(false);
  });
});

describe('parseTransferMessage', () => {
  it('parses a valid transfer-request', () => {
    const msg = {
      type: 'transfer-request',
      version: PROTOCOL_VERSION,
      transferId: 'abc123',
      files: [{ fileId: 'f1', name: 'test.txt', size: 1024, mimeType: 'text/plain' }],
    };
    expect(parseTransferMessage(msg)).not.toBeNull();
  });

  it('returns null for missing required fields', () => {
    const msg = { type: 'transfer-request', version: PROTOCOL_VERSION }; // missing transferId, files
    expect(parseTransferMessage(msg)).toBeNull();
  });

  it('returns null for unknown message type', () => {
    const msg = { type: 'unknown-type', version: PROTOCOL_VERSION, transferId: 'abc' };
    expect(parseTransferMessage(msg)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(parseTransferMessage('not an object')).toBeNull();
    expect(parseTransferMessage(null)).toBeNull();
    expect(parseTransferMessage(42)).toBeNull();
  });

  it('validates file count limits', () => {
    const files = Array.from({ length: 101 }, (_, i) => ({
      fileId: `f${i}`,
      name: `file${i}.txt`,
      size: 100,
      mimeType: 'text/plain',
    }));
    const msg = { type: 'transfer-request', version: PROTOCOL_VERSION, transferId: 'abc', files };
    expect(parseTransferMessage(msg)).toBeNull();
  });
});
