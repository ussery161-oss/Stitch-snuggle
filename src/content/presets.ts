// The 8 preset plushies (v1). Pure data. Look-alike avoidance (Art Director): the Unicorn preset
// uses round-shiny or button eyes, never big-sparkly; the Owl preset never has a bow tie, a leaf
// or a green tint. ("Surprise me" may still make those on a child's own creations.)
import { defaultFills, NOSE_COLOR, SKIN_TONES } from '../plush/spec';
import type { BaseId, DamageKind, Fill, PlushSpec } from '../plush/types';

const f = (color: string, pattern: Fill['pattern'] = 'solid'): Fill => ({ color, pattern });

export const PRESET_SPECS: Readonly<Record<BaseId, PlushSpec>> = {
  bear: { base: 'bear', body: 'round', fills: { ...defaultFills('#E2B26A'), belly: f('#FDF3E2'), muzzle: f('#FDF3E2') }, eyes: 'button', accessories: [], nameId: 'teddy' },
  bunny: { base: 'bunny', body: 'round', fills: { ...defaultFills('#F4A7B9', '#FDF3E2'), body: f('#F4A7B9', 'felt') }, eyes: 'round_shiny', accessories: [], nameId: 'bunbun' },
  kitty: { base: 'kitty', body: 'round', fills: { ...defaultFills('#C8B6E8', '#FDF3E2'), body: f('#C8B6E8', 'hearts') }, eyes: 'happy_closed', accessories: ['bow_2'], nameId: 'mochi' },
  puppy: { base: 'puppy', body: 'tall', fills: { ...defaultFills('#E2B26A', '#FDF3E2'), body: f('#E2B26A', 'fleece') }, eyes: 'button', accessories: ['bandana'], nameId: 'biscuit' },
  unicorn: { base: 'unicorn', body: 'round', fills: { ...defaultFills('#F4A7B9', '#FDF3E2'), hair: f('#C8B6E8'), accent: f('#F7D97C') }, eyes: 'round_shiny', accessories: [], nameId: 'sunny' },
  dino: { base: 'dino', body: 'round', fills: { ...defaultFills('#F6C6A8', '#FDF3E2'), body: f('#F6C6A8', 'dots'), accent: f('#E88F7A') }, eyes: 'round_shiny', accessories: ['scarf_1'], nameId: 'pebble' },
  owl: { base: 'owl', body: 'round', fills: { ...defaultFills('#A9CDEE', '#FDF3E2'), nose: f('#F7D97C') }, eyes: 'sleepy', accessories: ['glasses_round'], nameId: 'hazel' },
  doll: { base: 'doll', body: 'round', style: 'girl', fills: { ...defaultFills('#F7D97C', '#FDF3E2'), body: f('#F7D97C', 'gingham'), skin: f(SKIN_TONES[1]), hair: f('#5B3A29'), nose: f(NOSE_COLOR) }, eyes: 'heart', accessories: ['flower'], nameId: 'rosie' },
};

export function presetSpec(base: BaseId): PlushSpec {
  return PRESET_SPECS[base];
}

/** Greens are reserved away from the Owl preset (look-alike avoidance). */
export function isGreen(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return g > r + 15 && g > b + 15;
}

// ---------- The v1 preset roster ----------

export type OwnerId = 'kid_ada' | 'kid_jojo' | 'kid_lin' | 'kid_mo';
export const OWNERS: readonly OwnerId[] = ['kid_ada', 'kid_jojo', 'kid_lin', 'kid_mo'];

export interface Preset {
  base: BaseId;
  spec: PlushSpec;
  /** Arrival story lines (one is picked per visit). */
  stories: readonly string[];
  /** The damage kinds this plushie can arrive with. */
  damage: readonly DamageKind[];
  /** Who brings it and takes it home (4 original kids, varied skin tones). */
  owner: OwnerId;
}

const ALL: readonly DamageKind[] = ['rip', 'hole', 'flat', 'dirt', 'tangle', 'outfit'];

export const PRESETS_V1: readonly Preset[] = [
  { base: 'bear', spec: PRESET_SPECS.bear, stories: ['story-bear-1', 'story-bear-2'], damage: ALL, owner: 'kid_ada' },
  { base: 'bunny', spec: PRESET_SPECS.bunny, stories: ['story-bunny-1', 'story-bunny-2'], damage: ALL, owner: 'kid_lin' },
  { base: 'kitty', spec: PRESET_SPECS.kitty, stories: ['story-kitty-1', 'story-kitty-2'], damage: ['rip', 'hole', 'tangle', 'dirt', 'outfit'], owner: 'kid_mo' },
  { base: 'puppy', spec: PRESET_SPECS.puppy, stories: ['story-puppy-1', 'story-puppy-2'], damage: ['rip', 'flat', 'dirt', 'tangle', 'outfit'], owner: 'kid_jojo' },
  { base: 'unicorn', spec: PRESET_SPECS.unicorn, stories: ['story-unicorn-1', 'story-unicorn-2'], damage: ['dirt', 'tangle', 'rip', 'hole', 'outfit'], owner: 'kid_lin' },
  { base: 'dino', spec: PRESET_SPECS.dino, stories: ['story-dino-1', 'story-dino-2'], damage: ['dirt', 'rip', 'flat', 'hole', 'outfit'], owner: 'kid_mo' },
  { base: 'owl', spec: PRESET_SPECS.owl, stories: ['story-owl-1', 'story-owl-2'], damage: ['rip', 'tangle', 'dirt', 'hole', 'outfit'], owner: 'kid_ada' },
  { base: 'doll', spec: PRESET_SPECS.doll, stories: ['story-doll-1', 'story-doll-2'], damage: ['rip', 'dirt', 'hole', 'flat', 'outfit'], owner: 'kid_jojo' },
];

export function presetFor(base: BaseId): Preset {
  return PRESETS_V1.find((p) => p.base === base)!;
}

// ---------- Seasonal presets (free updates) ----------

export interface SeasonalSlot {
  id: string;
  /** The art folder it will use once it lands (plush/seasonal/<id>/...). */
  artBase: string;
  season: 'fall' | 'winter' | 'spring' | 'summer';
}

/** Registry slots for the seasonal plushies. Inert until their art lands; included in the unlock. */
export const SEASONAL: readonly SeasonalSlot[] = [
  { id: 'pumpkin_kitty', artBase: 'plush/seasonal/pumpkin_kitty', season: 'fall' },
  { id: 'snow_bear', artBase: 'plush/seasonal/snow_bear', season: 'winter' },
  { id: 'spring_lamb', artBase: 'plush/seasonal/spring_lamb', season: 'spring' },
  { id: 'beach_turtle', artBase: 'plush/seasonal/beach_turtle', season: 'summer' },
];

/** A seasonal slot is playable once its art (anchors.json) is in the app. */
export function seasonalReady(slot: SeasonalSlot, hasArt: (id: string) => boolean): boolean {
  return hasArt(`${slot.artBase}/round/anchors`);
}

/** Which presets the child can pick from on Play (demo: Bear and Bunny; unlocked: all 8). */
export function playablePresets(unlocked: boolean, demoPresets: readonly string[]): Preset[] {
  return PRESETS_V1.filter((p) => unlocked || demoPresets.includes(p.base));
}
