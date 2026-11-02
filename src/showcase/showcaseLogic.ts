// The Showcase Room's placements: 8 shelf spots and the hero podium. Pure TypeScript.
import { SHOWCASE_SPOTS, type Showcase } from '../storage/schema';

export type Spot = number | 'podium';

/** Where a creation is shown now (null: not shown). */
export function positionOf(s: Showcase, id: string): Spot | null {
  if (s.podium === id) return 'podium';
  const i = s.spots.indexOf(id);
  return i >= 0 ? i : null;
}

export function occupant(s: Showcase, spot: Spot): string | null {
  return spot === 'podium' ? s.podium : s.spots[spot] ?? null;
}

function set(s: Showcase, spot: Spot, id: string | null): Showcase {
  if (spot === 'podium') return { ...s, podium: id };
  const spots = [...s.spots];
  spots[spot] = id;
  return { ...s, spots };
}

/**
 * Puts a creation on a spot. From the tray it simply goes there (anyone there goes back to the
 * tray). From another spot it moves, swapping with whoever was on the target.
 */
export function placeAt(s: Showcase, id: string, target: Spot): Showcase {
  const from = positionOf(s, id);
  if (from === target) return s;
  const there = occupant(s, target);
  // Moving between spots swaps with whoever is there; from the tray, they go back to the tray.
  const next = from !== null ? set(s, from, there) : s;
  return set(next, target, id);
}

/** Takes a creation off the showcase (back to the tray). Free; deleting needs the gate. */
export function removeFrom(s: Showcase, id: string): Showcase {
  const from = positionOf(s, id);
  return from === null ? s : set(s, from, null);
}

/** The newest creation goes to the podium; the old hero moves to the first empty shelf. */
export function withNewest(s: Showcase, newestId: string): Showcase {
  if (s.podium === newestId) return s;
  const old = s.podium;
  let next = removeFrom(s, newestId);
  next = { ...next, podium: newestId };
  if (old) {
    const empty = next.spots.indexOf(null);
    if (empty >= 0) next = set(next, empty, old);
  }
  return next;
}

export function spotCount(): number {
  return SHOWCASE_SPOTS;
}
