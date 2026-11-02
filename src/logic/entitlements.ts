// What the free demo includes, and what "Unlock Everything" (one $5.99 purchase, which also covers
// every future plushie) opens. Pure TypeScript. The child flow only ever shows a padlock: never a
// price, a buy button or a nag.
import { PALETTE } from '../plush/spec';
import type { AccessoryId, BaseId, EyeStyle, PatternId } from '../plush/types';

export type LockKind = 'base' | 'color' | 'pattern' | 'eyes' | 'accessory' | 'preset' | 'stickerPage' | 'seasonal';

/** Exactly what the demo gives (the test pins this list). */
export const DEMO: Readonly<{
  bases: readonly BaseId[];
  colors: readonly string[];
  patterns: readonly PatternId[];
  eyes: readonly EyeStyle[];
  accessories: readonly AccessoryId[];
  presets: readonly string[];
  stickerPages: readonly string[];
}> = {
  bases: ['bear', 'bunny'],
  colors: PALETTE.slice(0, 4),
  patterns: ['solid', 'gingham', 'dots', 'stars'],
  eyes: ['button', 'round_shiny'],
  accessories: ['bow_1', 'hat_party', 'glasses_round'],
  presets: ['bear', 'bunny'],
  stickerPages: ['bear'],
};

/** Is this item locked? Everything is open once unlocked; seasonal items are included in the unlock. */
export function isLocked(kind: LockKind, id: string, unlocked: boolean): boolean {
  if (unlocked) return false;
  switch (kind) {
    case 'base':
      return !(DEMO.bases as readonly string[]).includes(id);
    case 'color':
      return !DEMO.colors.includes(id);
    case 'pattern':
      return !(DEMO.patterns as readonly string[]).includes(id);
    case 'eyes':
      return !(DEMO.eyes as readonly string[]).includes(id);
    case 'accessory':
      return !(DEMO.accessories as readonly string[]).includes(id);
    case 'preset':
      return !DEMO.presets.includes(id);
    case 'stickerPage':
      return !DEMO.stickerPages.includes(id);
    case 'seasonal':
      return true;
  }
}
