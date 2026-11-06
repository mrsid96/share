import { z } from 'zod';
import type { TransferMessage } from '../types/webrtc';

export const FileMetadataSchema = z.object({
  fileId: z.string().min(1),
  name: z.string().min(1).max(512),
  size: z.number().nonnegative(),
  mimeType: z.string().min(1),
});

export const TransferMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('transfer-request'),
    version: z.string(),
    transferId: z.string(),
    files: z.array(FileMetadataSchema).min(1).max(100),
  }),
  z.object({
    type: z.literal('transfer-accepted'),
    version: z.string(),
    transferId: z.string(),
  }),
  z.object({
    type: z.literal('transfer-rejected'),
    version: z.string(),
    transferId: z.string(),
  }),
  z.object({
    type: z.literal('file-start'),
    version: z.string(),
    transferId: z.string(),
    fileId: z.string(),
    name: z.string().min(1).max(512),
    size: z.number().nonnegative(),
    mimeType: z.string().min(1),
  }),
  z.object({
    type: z.literal('file-end'),
    version: z.string(),
    transferId: z.string(),
    fileId: z.string(),
    checksum: z.string().optional(),
  }),
  z.object({
    type: z.literal('transfer-complete'),
    version: z.string(),
    transferId: z.string(),
  }),
  z.object({
    type: z.literal('transfer-cancelled'),
    version: z.string(),
    transferId: z.string(),
  }),
]);

/**
 * Validates and parses a transfer protocol message.
 */
export function parseTransferMessage(raw: unknown): TransferMessage | null {
  try {
    return TransferMessageSchema.parse(raw) as TransferMessage;
  } catch {
    return null;
  }
}

/**
 * Sanitizes a filename to prevent directory traversal and other exploits.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/^\.+/, '_')
    .trim()
    .slice(0, 255);
}

/**
 * Validates that a room ID is a URL-safe base64 string of expected length.
 */
export function isValidRoomId(roomId: string): boolean {
  return /^[A-Za-z0-9_-]{20,30}$/.test(roomId);
}
