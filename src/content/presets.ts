// The 8 preset plushies (v1). Pure data. Look-alike avoidance (Art Director): the Unicorn preset
// uses round-shiny or button eyes, never big-sparkly; the Owl preset never has a bow tie, a leaf
// or a green tint. ("Surprise me" may still make those on a child's own creations.)
import { defaultFills, NOSE_COLOR, SKIN_TONES } from '../plush/spec';
import type { BaseId, Fill, PlushSpec } from '../plush/types';

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
