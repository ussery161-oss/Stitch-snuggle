// Stickers: what exists, how they are earned, and their placements on the book's pages. Pure.
//
// Earned (never bought, never random): one for each preset plushie healed, one for the first heal
// of each creation, and one for the first use of each care tool. Seasonal stickers have slots and
// arrive with free updates.
import type { StepKind } from '../clinic/visit';
import { BASE_IDS } from '../plush/registry';
import type { BaseId } from '../plush/types';
import type { StickerPlacement } from '../storage/schema';

export type StickerKind = 'preset' | 'creation' | 'tool' | 'seasonal';

export interface StickerDef {
  id: string;
  kind: StickerKind;
  /** preset/creation: what to snapshot; tool/seasonal: the art id. */
  base?: BaseId;
  creationId?: string;
  art?: string;
}

/** Pages: one per base, then My Creations, then Seasonal. */
export const PAGES: readonly string[] = [...BASE_IDS, 'creations', 'seasonal'];
export const PAGE_BACKGROUNDS = ['ui/stickers/page_clouds', 'ui/stickers/page_dots', 'ui/stickers/page_stars', 'ui/stickers/page_stripes'] as const;

export function pageBackground(page: string): string {
  return PAGE_BACKGROUNDS[Math.max(0, PAGES.indexOf(page)) % PAGE_BACKGROUNDS.length];
}

export const TOOL_ART: Readonly<Record<StepKind, string>> = {
  stitch: 'tools/needle_spool',
  patch: 'fabrics/patch_swatch_pink_dots',
  stuff: 'tools/cotton_bag',
  wash: 'tools/soap_bar',
  brush: 'tools/brush',
  dress: 'accessories/bow_1',
};

export const SEASONAL_SLOTS = ['pumpkin_kitty', 'snow_bear', 'spring_lamb', 'beach_turtle'] as const;

export const presetStickerId = (base: BaseId) => `preset-${base}`;
export const creationStickerId = (id: string) => `creation-${id}`;
export const toolStickerId = (step: StepKind) => `tool-${step}`;

/** The fixed stickers (creation stickers are added per creation). */
export const FIXED_STICKERS: readonly StickerDef[] = [
  ...BASE_IDS.map((b) => ({ id: presetStickerId(b), kind: 'preset' as const, base: b })),
  ...(Object.keys(TOOL_ART) as StepKind[]).map((s) => ({ id: toolStickerId(s), kind: 'tool' as const, art: TOOL_ART[s] })),
  ...SEASONAL_SLOTS.map((s) => ({ id: `seasonal-${s}`, kind: 'seasonal' as const, art: `ui/stickers/seasonal_${s}` })),
];

export function stickerDef(id: string): StickerDef | null {
  const fixed = FIXED_STICKERS.find((s) => s.id === id);
  if (fixed) return fixed;
  if (id.startsWith('creation-')) return { id, kind: 'creation', creationId: id.slice('creation-'.length) };
  return null;
}

export interface VisitResult {
  /** A preset plushie healed. */
  presetBase?: BaseId;
  /** A creation healed. */
  creationId?: string;
  /** The care steps used this visit. */
  steps: readonly StepKind[];
}

/** Stickers newly earned by a finished visit (none twice). */
export function stickersFor(earned: Readonly<Record<string, string>>, v: VisitResult): string[] {
  const ids = [
    ...(v.presetBase ? [presetStickerId(v.presetBase)] : []),
    ...(v.creationId ? [creationStickerId(v.creationId)] : []),
    ...v.steps.map(toolStickerId),
  ];
  return [...new Set(ids)].filter((id) => !(id in earned));
}

export function earn(earned: Readonly<Record<string, string>>, v: VisitResult, nowISO: string): { stickers: Record<string, string>; added: string[] } {
  const added = stickersFor(earned, v);
  return { stickers: { ...earned, ...Object.fromEntries(added.map((id) => [id, nowISO])) }, added };
}

// ---------- placements ----------

export function addPlacement(list: readonly StickerPlacement[], p: StickerPlacement): StickerPlacement[] {
  return [...list, p];
}

export function updatePlacement(list: readonly StickerPlacement[], id: string, change: Partial<Omit<StickerPlacement, 'id'>>): StickerPlacement[] {
  return list.map((p) => (p.id === id ? { ...p, ...change, scale: Math.max(0.3, Math.min(3, change.scale ?? p.scale)) } : p));
}

export function removePlacement(list: readonly StickerPlacement[], id: string): StickerPlacement[] {
  return list.filter((p) => p.id !== id);
}

/** A sticker dropped into the tray area (below `trayTop`) comes off the page. */
export function droppedInTray(y: number, trayTop: number): boolean {
  return y >= trayTop;
}
