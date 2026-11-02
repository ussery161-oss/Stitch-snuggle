// The one entry point screens use to say a line: through AudioService (queued FIFO; a clip when
// recorded, expo-speech otherwise).
import { audio } from './audio';
import type { SayOptions } from './AudioService';
import type { LineId } from './lines';

export function say(id: LineId, opts?: SayOptions): void {
  audio().say(id, opts);
}

/** Stop the voice and clear the queue (leaving a screen). */
export function hush(): void {
  audio().stop();
}
