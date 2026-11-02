// The clinic visit as a reducer: arrival → triage → the care steps → go home → recovery room →
// back to the title. Nothing can fail and every phase can be finished. Pure TypeScript.
import { triageSpots, type Visit } from './visit';

export type Phase = 'arrival' | 'triage' | 'care' | 'gohome' | 'recovery' | 'finished';

export interface FlowState {
  phase: Phase;
  /** Index into visit.steps during 'care'. */
  step: number;
  /** Damage ids found in triage. */
  found: string[];
  /** Steps finished (for the progress icons). */
  done: number;
}

export type FlowEvent =
  | { type: 'arrived' }
  | { type: 'spotTapped'; id: string }
  | { type: 'triageDone' }
  | { type: 'stepDone' }
  | { type: 'homeDone' }
  | { type: 'recoveryDone' };

export const initialFlow: FlowState = { phase: 'arrival', step: 0, found: [], done: 0 };

function afterTriage(visit: Visit, s: FlowState): FlowState {
  return visit.steps.length > 0 ? { ...s, phase: 'care', step: 0 } : { ...s, phase: 'gohome' };
}

export function flowReducer(visit: Visit, s: FlowState, e: FlowEvent): FlowState {
  switch (e.type) {
    case 'arrived':
      return s.phase === 'arrival' ? { ...s, phase: 'triage' } : s;
    case 'spotTapped': {
      if (s.phase !== 'triage' || s.found.includes(e.id)) return s;
      if (!triageSpots(visit).some((d) => d.id === e.id)) return s;
      return { ...s, found: [...s.found, e.id] };
    }
    case 'triageDone':
      return s.phase === 'triage' ? afterTriage(visit, s) : s;
    case 'stepDone': {
      if (s.phase !== 'care') return s;
      const next = s.step + 1;
      return next < visit.steps.length ? { ...s, step: next, done: s.done + 1 } : { ...s, phase: 'gohome', done: s.done + 1 };
    }
    case 'homeDone':
      return s.phase === 'gohome' ? { ...s, phase: 'recovery' } : s;
    case 'recoveryDone':
      return s.phase === 'recovery' ? { ...s, phase: 'finished' } : s;
  }
}

/** All triage spots found. */
export function triageComplete(visit: Visit, s: FlowState): boolean {
  return triageSpots(visit).every((d) => s.found.includes(d.id));
}
