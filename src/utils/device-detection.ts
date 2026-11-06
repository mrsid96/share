import type { DeviceType } from '../types/device';

/**
 * Detects the device type from the user agent.
 */
export function detectDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  if (/windows|macintosh|linux/i.test(ua)) return 'desktop';
  return 'unknown';
}

/**
 * Checks if the File System Access API is available.
 */
export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/**
 * Checks if WebRTC is available.
 */
export function supportsWebRTC(): boolean {
  return typeof window !== 'undefined' &&
    'RTCPeerConnection' in window &&
    'RTCDataChannel' in window;
}

/**
 * Checks if the browser is Safari.
 */
export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Returns a string identifying the browser.
 */
export function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/firefox/i.test(ua)) return 'Firefox';
  return 'Unknown';
}
