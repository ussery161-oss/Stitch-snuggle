// Parental gate rules (Kids Category). Pure TypeScript, unit-tested.
//
// The gate shows three large two-digit numerals in a random order. The adult taps them from
// smallest to largest, then holds the "open" button for HOLD_MS. A tap out of order quietly
// starts over with three new numbers (no sound, no "wrong"). Nothing is stored and no age is asked.
import type { Rng } from '../logic/rng';

export const GATE_HOLD_MS = 1000;
export const GATE_MIN = 12;
export const GATE_MAX = 97;

export interface GateState {
  /** The three numerals in screen order. */
  numbers: readonly number[];
  /** Indexes tapped so far, in order. */
  tapped: readonly number[];
  /** 'order': tapping the numbers; 'hold': all three right, hold to open; 'open': passed. */
  phase: 'order' | 'hold' | 'open';
}

/** Three distinct numerals, at least 5 apart, in a random screen order. */
export function makeGateNumbers(rng: Rng): number[] {
  const out: number[] = [];
  while (out.length < 3) {
    const n = rng.int(GATE_MIN, GATE_MAX);
    if (out.every((m) => Math.abs(m - n) >= 5)) out.push(n);
  }
  return out;
}

export function startGate(rng: Rng): GateState {
  return { numbers: makeGateNumbers(rng), tapped: [], phase: 'order' };
}

/** The screen index the adult must tap next (the smallest number not yet tapped). */
export function expectedIndex(state: GateState): number {
  const order = state.numbers.map((n, i) => ({ n, i })).sort((a, b) => a.n - b.n);
  return order[state.tapped.length]?.i ?? -1;
}

/** One tap on numeral `index`. Right: it lights up. Out of order: quietly start over. */
export function tapNumber(state: GateState, index: number, rng: Rng): GateState {
  if (state.phase !== 'order' || state.tapped.includes(index)) return state;
  if (index !== expectedIndex(state)) return startGate(rng);
  const tapped = [...state.tapped, index];
  return { ...state, tapped, phase: tapped.length === 3 ? 'hold' : 'order' };
}

/** The hold finished (GATE_HOLD_MS held). Only opens after the three right taps. */
export function holdDone(state: GateState): GateState {
  return state.phase === 'hold' ? { ...state, phase: 'open' } : state;
}

export function isOpen(state: GateState): boolean {
  return state.phase === 'open';
}
