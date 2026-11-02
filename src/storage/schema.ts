// The save file (everything kept on the device; nothing leaves it). Pure TypeScript: defaults,
// validation, migrations and the corruption guard.
//
// v1 (P2-A): creations, stickers, sticker placements, settings, entitlement.
// v2 (P2-G): adds the Showcase Room placements.
// "v0" is P1's settings-only key (the age band), folded in by the v0 → v1 migration.
import { isValidSpec } from '../plush/spec';
import type { PlushSpec } from '../plush/types';

export const SAVE_VERSION = 2;
export const MAX_CREATIONS = 24;
export const SHOWCASE_SPOTS = 8;

export type AgeBand = '3-5' | '6-7';

/** A saved creation. The spec is the plushie; the id lets the shelf and showcase point at it. */
export interface Creation {
  id: string;
  spec: PlushSpec;
  /** ISO date it was first saved. */
  createdAt: string;
}

export interface StickerPlacement {
  /** This placement (a sticker can be placed more than once). */
  id: string;
  stickerId: string;
  page: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Settings {
  age: AgeBand;
  /** 0..1 */
  music: number;
  /** 0..1 */
  sfx: number;
  captions: boolean;
  /** Which side the tool trays sit on (left-handed friendly). */
  traySide: 'right' | 'left';
}

export interface Showcase {
  spots: (string | null)[];
  podium: string | null;
}

export interface SaveV1 {
  version: 1;
  creations: Creation[];
  stickers: Record<string, string>;
  placements: StickerPlacement[];
  settings: Settings;
  entitlement: { unlocked: boolean };
}

export interface SaveV2 extends Omit<SaveV1, 'version'> {
  version: 2;
  showcase: Showcase;
}

export type Save = SaveV2;

export const DEFAULT_SETTINGS: Settings = { age: '3-5', music: 0.6, sfx: 0.8, captions: false, traySide: 'right' };

export function emptyShowcase(): Showcase {
  return { spots: Array.from({ length: SHOWCASE_SPOTS }, () => null), podium: null };
}

export function defaultSave(): Save {
  return { version: 2, creations: [], stickers: {}, placements: [], settings: { ...DEFAULT_SETTINGS }, entitlement: { unlocked: false }, showcase: emptyShowcase() };
}

// ---------- validation ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp01 = (v: unknown, d: number) => (isNum(v) ? Math.max(0, Math.min(1, v)) : d);

function cleanSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  return {
    age: s.age === '6-7' ? '6-7' : '3-5',
    music: clamp01(s.music, DEFAULT_SETTINGS.music),
    sfx: clamp01(s.sfx, DEFAULT_SETTINGS.sfx),
    captions: s.captions === true,
    traySide: s.traySide === 'left' ? 'left' : 'right',
  };
}

function cleanCreations(v: unknown): Creation[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: Creation[] = [];
  for (const c of v) {
    if (!isObj(c) || typeof c.id !== 'string' || seen.has(c.id) || !isObj(c.spec)) continue;
    const spec = c.spec as unknown as PlushSpec;
    if (!isValidSpec(spec)) continue;
    seen.add(c.id);
    out.push({ id: c.id, spec, createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date(0).toISOString() });
    if (out.length >= MAX_CREATIONS) break;
  }
  return out;
}

function cleanPlacements(v: unknown): StickerPlacement[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((p) =>
    isObj(p) && typeof p.id === 'string' && typeof p.stickerId === 'string' && typeof p.page === 'string' && isNum(p.x) && isNum(p.y)
      ? [{ id: p.id, stickerId: p.stickerId, page: p.page, x: p.x, y: p.y, scale: isNum(p.scale) ? Math.max(0.3, Math.min(3, p.scale)) : 1, rotation: isNum(p.rotation) ? p.rotation : 0 }]
      : [],
  );
}

function cleanStickers(v: unknown): Record<string, string> {
  if (!isObj(v)) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

function cleanShowcase(v: unknown, ids: Set<string>): Showcase {
  const s = isObj(v) ? v : {};
  const spots = Array.isArray(s.spots) ? s.spots : [];
  const keep = (x: unknown) => (typeof x === 'string' && ids.has(x) ? x : null);
  return { spots: Array.from({ length: SHOWCASE_SPOTS }, (_, i) => keep(spots[i])), podium: keep(s.podium) };
}

// ---------- migrations ----------

/** P1 stored only the settings, under its own key, as { age }. */
export function migrateV0toV1(v0Settings: unknown): SaveV1 {
  return { version: 1, creations: [], stickers: {}, placements: [], settings: cleanSettings(v0Settings), entitlement: { unlocked: false } };
}

export function migrateV1toV2(v1: SaveV1): SaveV2 {
  return { ...v1, version: 2, showcase: emptyShowcase() };
}

/**
 * Any stored value → a valid current save. No save (null) → defaults, or v0 settings carried over.
 * Anything unreadable, from the future, or broken → defaults (the corruption guard; never throws).
 */
export function loadFrom(raw: string | null, v0Raw: string | null = null): { save: Save; reset: boolean } {
  if (raw === null) {
    let v0: unknown = null;
    try {
      v0 = v0Raw ? JSON.parse(v0Raw) : null;
    } catch {
      v0 = null;
    }
    return { save: v0 ? migrateV1toV2(migrateV0toV1(v0)) : defaultSave(), reset: false };
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (!isObj(v) || !isNum(v.version)) return { save: defaultSave(), reset: true };
    let data: Record<string, unknown> = v;
    if (v.version === 1) data = migrateV1toV2(v as unknown as SaveV1) as unknown as Record<string, unknown>;
    else if (v.version !== 2) return { save: defaultSave(), reset: true };
    const creations = cleanCreations(data.creations);
    const ids = new Set(creations.map((c) => c.id));
    return {
      save: {
        version: 2,
        creations,
        stickers: cleanStickers(data.stickers),
        placements: cleanPlacements(data.placements),
        settings: cleanSettings(data.settings),
        entitlement: { unlocked: isObj(data.entitlement) && data.entitlement.unlocked === true },
        showcase: cleanShowcase(data.showcase, ids),
      },
      reset: false,
    };
  } catch {
    return { save: defaultSave(), reset: true };
  }
}

// ---------- creations and showcase edits (pure) ----------

export function shelfFull(save: Save): boolean {
  return save.creations.length >= MAX_CREATIONS;
}

/** Adds (or updates, by id) a creation. A full shelf refuses a new one (returns null). */
export function putCreation(save: Save, c: Creation): Save | null {
  const i = save.creations.findIndex((x) => x.id === c.id);
  if (i >= 0) return { ...save, creations: save.creations.map((x, k) => (k === i ? c : x)) };
  if (shelfFull(save)) return null;
  return { ...save, creations: [...save.creations, c] };
}

/** Deletes a creation (behind the gate) and clears it from the showcase. */
export function deleteCreation(save: Save, id: string): Save {
  return {
    ...save,
    creations: save.creations.filter((c) => c.id !== id),
    showcase: { spots: save.showcase.spots.map((s) => (s === id ? null : s)), podium: save.showcase.podium === id ? null : save.showcase.podium },
  };
}
