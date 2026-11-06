/**
 * ShareWave Diagnostic Logger
 * Emits categorized, styled console logs for debugging WebRTC, Signaling, and File Transfers.
 */

const PREFIX = '[ShareWave]';

export const log = {
  webrtc: (message: string, ...args: unknown[]): void => {
    console.log(
      `%c${PREFIX}[WebRTC]%c ${message}`,
      'color: #38bdf8; font-weight: bold; background: #0c4a6e; padding: 2px 4px; border-radius: 4px;',
      'color: inherit;',
      ...args
    );
  },

  signaling: (message: string, ...args: unknown[]): void => {
    console.log(
      `%c${PREFIX}[Signaling]%c ${message}`,
      'color: #c084fc; font-weight: bold; background: #3b0764; padding: 2px 4px; border-radius: 4px;',
      'color: inherit;',
      ...args
    );
  },

  transfer: (message: string, ...args: unknown[]): void => {
    console.log(
      `%c${PREFIX}[Transfer]%c ${message}`,
      'color: #34d399; font-weight: bold; background: #064e3b; padding: 2px 4px; border-radius: 4px;',
      'color: inherit;',
      ...args
    );
  },

  warn: (category: string, message: string, ...args: unknown[]): void => {
    console.warn(
      `%c${PREFIX}[${category}:WARN]%c ${message}`,
      'color: #fbbf24; font-weight: bold; background: #451a03; padding: 2px 4px; border-radius: 4px;',
      'color: inherit;',
      ...args
    );
  },

  error: (category: string, message: string, ...args: unknown[]): void => {
    console.error(
      `%c${PREFIX}[${category}:ERROR]%c ${message}`,
      'color: #f87171; font-weight: bold; background: #450a0a; padding: 2px 4px; border-radius: 4px;',
      'color: inherit;',
      ...args
    );
  },
};
