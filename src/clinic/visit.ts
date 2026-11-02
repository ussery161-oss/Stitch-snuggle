// createVisit(spec, seed): what's wrong with the plushie today. Pure and seeded: the same spec and
// seed always give the same visit. Care steps always run in the same order, only the ones the
// visit needs, capped by the age setting (3 for ages 3–5, 4 for ages 6–7).
import { createRng } from '../logic/rng';
import { bodySet } from '../plush/registry';
import type { BodySet, DamageKind, PlushSpec, Vec } from '../plush/types';

export type StepKind = 'stitch' | 'patch' | 'stuff' | 'wash' | 'brush' | 'dress';
export type AgeBand = '3-5' | '6-7';

/** The fixed care order. */
export const STEP_ORDER: readonly StepKind[] = ['stitch', 'patch', 'stuff', 'wash', 'brush', 'dress'];

export const STEP_FOR: Readonly<Record<DamageKind, StepKind>> = {
  rip: 'stitch',
  hole: 'patch',
  flat: 'stuff',
  dirt: 'wash',
  tangle: 'brush',
  outfit: 'dress',
};

export function stepCap(age: AgeBand): number {
  return age === '6-7' ? 4 : 3;
}

/** Every damage kind createVisit can make. */
export const ALL_DAMAGE: readonly DamageKind[] = ['rip', 'hole', 'flat', 'dirt', 'tangle', 'outfit'];

export interface Damage {
  id: string;
  kind: DamageKind;
  /** The part it's on ('' for a missing outfit). */
  part: string;
  /** Centre on the 1024 canvas. */
  xy: Vec;
  /** Rip: the stitch path (1024 space), start to end. */
  path?: readonly Vec[];
  /** Hole / dirt / tangle: radius of the area (1024 units). */
  radius?: number;
}

export interface Visit {
  plush: PlushSpec;
  damages: Damage[];
  storyId: string;
  /** The care steps, in STEP_ORDER. */
  steps: StepKind[];
  seed: number;
}

/** Story lines per base (the rest use the generic line). */
const STORIES: Partial<Record<string, string[]>> = {
  bear: ['story-bear-1', 'story-bear-2'],
  bunny: ['story-bunny-1', 'story-bunny-2'],
};

const LIMBS = ['armL', 'armR', 'legL', 'legR'];

/** A gentle S-shaped rip path through `c`, sized to the part. */
export function ripPath(c: Vec, partBounds: readonly number[], tilt: number): Vec[] {
  const len = Math.max(110, Math.min(230, Math.max(partBounds[2], partBounds[3]) * 0.55));
  const n = 7;
  const out: Vec[] = [];
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const along = t * len;
    const side = Math.sin(t * Math.PI * 2) * len * 0.08;
    out.push([Math.round(c[0] + along * cos - side * sin), Math.round(c[1] + along * sin + side * cos)]);
  }
  return out;
}

function spotsFor(set: BodySet, kind: DamageKind) {
  return set.damageSpots.filter((s) => s.types.includes(kind));
}

/**
 * The visit. `kinds` limits which damage kinds may appear (every kind by default). At least one
 * step, at most stepCap(age); each chosen step gets one or two damages.
 */
export function createVisit(spec: PlushSpec, seed: number, opts: { age?: AgeBand; kinds?: readonly DamageKind[]; stories?: readonly string[] } = {}): Visit {
  const rng = createRng(seed);
  const set = bodySet(spec.base, spec.body, spec.style);
  const kinds = (opts.kinds ?? ALL_DAMAGE).filter((k) => {
    if (k === 'flat') return set.parts.some((p) => LIMBS.includes(p.id));
    if (k === 'outfit') return true;
    return spotsFor(set, k).length > 0;
  });
  const cap = stepCap(opts.age ?? '3-5');
  const count = Math.max(1, Math.min(cap, kinds.length, rng.int(2, cap)));
  const chosen = rng.shuffle(kinds).slice(0, count);
  const damages: Damage[] = [];
  const partBounds = (part: string) => set.parts.find((p) => p.id === part)?.bounds ?? [0, 0, 200, 200];
  const used = new Set<string>();
  for (const kind of chosen) {
    if (kind === 'outfit') {
      damages.push({ id: 'outfit', kind, part: '', xy: set.anchors.chest });
      continue;
    }
    if (kind === 'flat') {
      const limb = rng.pick(LIMBS.filter((l) => set.parts.some((p) => p.id === l)));
      const b = partBounds(limb);
      damages.push({ id: `flat_${limb}`, kind, part: limb, xy: [b[0] + b[2] / 2, b[1] + b[3] / 2] });
      continue;
    }
    // Prefer spots not already used by another damage.
    const spots = rng.shuffle(spotsFor(set, kind));
    const fresh = spots.filter((s) => !used.has(s.id));
    const pool = fresh.length > 0 ? fresh : spots;
    const n = kind === 'dirt' && pool.length > 1 && rng.chance(0.5) ? 2 : 1;
    for (const spot of pool.slice(0, n)) {
      used.add(spot.id);
      const b = partBounds(spot.part);
      const d: Damage = { id: `${kind}_${spot.id}`, kind, part: spot.part, xy: spot.xy };
      if (kind === 'rip') d.path = ripPath(spot.xy, b, rng.pick([-1.2, -0.9, 0.9, 1.2, 1.5]));
      if (kind === 'hole') d.radius = 62;
      if (kind === 'dirt') d.radius = Math.round(Math.max(90, Math.min(150, Math.min(b[2], b[3]) * 0.45)));
      if (kind === 'tangle') d.radius = Math.round(Math.max(80, Math.min(140, Math.min(b[2], b[3]) * 0.45)));
      damages.push(d);
    }
  }
  const steps = STEP_ORDER.filter((s) => damages.some((d) => STEP_FOR[d.kind] === s));
  const stories = opts.stories && opts.stories.length > 0 ? opts.stories : STORIES[spec.base] ?? ['story-generic'];
  return { plush: spec, damages, storyId: rng.pick(stories), steps, seed };
}

/** The damages one step fixes. */
export function damagesFor(visit: Visit, step: StepKind): Damage[] {
  return visit.damages.filter((d) => STEP_FOR[d.kind] === step);
}

/** The spots tapped in triage (one glow per damage; a missing outfit has none). */
export function triageSpots(visit: Visit): Damage[] {
  return visit.damages.filter((d) => d.kind !== 'outfit');
}
