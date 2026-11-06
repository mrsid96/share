import { describe, it, expect } from 'vitest';
import { formatBytes, formatSpeed, formatDuration } from '../../src/utils/format-bytes';

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('respects decimal places', () => {
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
  });
});

describe('formatSpeed', () => {
  it('formats bytes per second', () => {
    expect(formatSpeed(1024)).toBe('1 KB/s');
  });

  it('formats megabytes per second', () => {
    expect(formatSpeed(5 * 1024 * 1024)).toBe('5 MB/s');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats minutes', () => {
    expect(formatDuration(90)).toBe('2m');
  });

  it('formats hours', () => {
    expect(formatDuration(7200)).toBe('2h');
  });
});
