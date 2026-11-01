// Hold-to-confirm rules shared by the Home button (2 s) and the gate's open button (1 s).
// Pure TypeScript.

export const HOME_HOLD_MS = 2000;
/** A short tap says "Hold to go home" at most this often. */
export const HOLD_HINT_GAP_MS = 2500;

/** How a press ended: held long enough, or let go early (a tap). */
export function releaseKind(heldMs: number, holdMs: number): 'complete' | 'short' {
  return heldMs >= holdMs ? 'complete' : 'short';
}

/** Whether a short tap may speak the hint now. */
export function hintAllowed(lastHintMs: number, nowMs: number): boolean {
  return nowMs - lastHintMs >= HOLD_HINT_GAP_MS;
}
