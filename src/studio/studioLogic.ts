// The Design Studio's edits, as a reducer with a 20-step undo. Every edit keeps the spec valid.
// Pure TypeScript.
import type { Rng } from '../logic/rng';
import { baseDef } from '../plush/registry';
import { ACCESSORIES, HAIR_COLORS, randomSpec, SKIN_TONES, wearAccessory } from '../plush/spec';
import type { AccessoryId, BaseId, BodyType, BodySet, DollStyle, EyeStyle, PatternId, PlushSpec, Region } from '../plush/types';

export const UNDO_LIMIT = 20;

export type Tab = 'base' | 'body' | 'colors' | 'patterns' | 'eyes' | 'accessories' | 'name';
export const TABS: readonly Tab[] = ['base', 'body', 'colors', 'patterns', 'eyes', 'accessories', 'name'];

export interface StudioState {
  spec: PlushSpec;
  /** Earlier specs, newest last (at most UNDO_LIMIT). */
  past: PlushSpec[];
  /** The id of the creation being edited (null: a new one). */
  editingId: string | null;
}

export type StudioAction =
  | { type: 'base'; base: BaseId }
  | { type: 'body'; body: BodyType }
  | { type: 'style'; style: DollStyle }
  | { type: 'paint'; region: Region; color: string }
  | { type: 'pattern'; region: Region; pattern: PatternId }
  | { type: 'eyes'; eyes: EyeStyle }
  | { type: 'accessory'; id: AccessoryId }
  | { type: 'name'; nameId: string }
  | { type: 'surprise'; spec: PlushSpec }
  | { type: 'undo' }
  | { type: 'load'; spec: PlushSpec; editingId: string | null };

export function startStudio(spec: PlushSpec, editingId: string | null = null): StudioState {
  return { spec, past: [], editingId };
}

/** The spec with a new base: same colours and patterns; a body/style the base has. */
export function withBase(spec: PlushSpec, base: BaseId): PlushSpec {
  const def = baseDef(base);
  const body = def.bodyTypes.includes(spec.body) ? spec.body : def.bodyTypes[0];
  const next: PlushSpec = { ...spec, base, body };
  if (def.styles) next.style = spec.style && def.styles.includes(spec.style) ? spec.style : def.styles[0];
  else delete next.style;
  return next;
}

function apply(spec: PlushSpec, a: StudioAction): PlushSpec {
  switch (a.type) {
    case 'base':
      return withBase(spec, a.base);
    case 'body':
      return baseDef(spec.base).bodyTypes.includes(a.body) ? { ...spec, body: a.body } : spec;
    case 'style':
      return baseDef(spec.base).styles?.includes(a.style) ? { ...spec, style: a.style } : spec;
    case 'paint':
      return { ...spec, fills: { ...spec.fills, [a.region]: { ...spec.fills[a.region], color: a.color } } };
    case 'pattern':
      return { ...spec, fills: { ...spec.fills, [a.region]: { ...spec.fills[a.region], pattern: a.pattern } } };
    case 'eyes':
      return { ...spec, eyes: a.eyes };
    case 'accessory':
      // Tapping a worn accessory takes it off; otherwise it's worn (replacing its slot).
      return spec.accessories.includes(a.id) ? { ...spec, accessories: spec.accessories.filter((x) => x !== a.id) } : { ...spec, accessories: wearAccessory(spec.accessories, a.id) };
    case 'name':
      return { ...spec, nameId: a.nameId };
    case 'surprise':
      return a.spec;
    default:
      return spec;
  }
}

export function studioReducer(s: StudioState, a: StudioAction): StudioState {
  if (a.type === 'undo') {
    if (s.past.length === 0) return s;
    return { ...s, spec: s.past[s.past.length - 1], past: s.past.slice(0, -1) };
  }
  if (a.type === 'load') return startStudio(a.spec, a.editingId);
  const spec = apply(s.spec, a);
  if (spec === s.spec || JSON.stringify(spec) === JSON.stringify(s.spec)) return s;
  return { ...s, spec, past: [...s.past, s.spec].slice(-UNDO_LIMIT) };
}

/** "Surprise me": a random plushie from what's open (locked bases fall back to the demo ones). */
export function surpriseSpec(rng: Rng, allowedBases: readonly BaseId[], keepName?: string): PlushSpec {
  const spec = randomSpec(rng, rng.pick(allowedBases));
  return keepName ? { ...spec, nameId: keepName } : spec;
}

/** Which colours a region offers: the palette, or skin tones / hair colours for those regions. */
export function swatchesFor(region: Region, palette: readonly string[]): readonly string[] {
  if (region === 'skin') return SKIN_TONES;
  if (region === 'hair') return [...HAIR_COLORS, ...palette.slice(0, 6)];
  return palette;
}

/** The region on the plushie at (x, y) on its 1024 canvas: the top-most part whose box holds it. */
export function regionAt(set: BodySet, x: number, y: number): Region | null {
  for (let i = set.parts.length - 1; i >= 0; i--) {
    const p = set.parts[i];
    const [bx, by, bw, bh] = p.bounds;
    // A small inset, so a tap on the edge of a box picks the part under it.
    const inset = Math.min(bw, bh) * 0.12;
    if (x >= bx + inset && x <= bx + bw - inset && y >= by + inset && y <= by + bh - inset) return p.region;
  }
  return null;
}

export const ALL_ACCESSORIES: readonly AccessoryId[] = ACCESSORIES;
