// PlushSpec helpers: the palette, patterns, eyes and accessories, plus random and validated specs.
// Pure TypeScript.
import type { Rng } from '../logic/rng';
import { baseDef, BASE_IDS } from './registry';
import type { AccessoryId, AccessorySlot, BaseId, BodyType, DollStyle, EyeStyle, Fill, PatternId, PlushSpec, Region } from './types';
import { REGIONS } from './types';

/** The 12-swatch palette (warm pastels to match the r03 art). */
export const PALETTE: readonly string[] = [
  '#E2B26A', // honey
  '#F4A7B9', // pink
  '#A9CDEE', // sky
  '#C8B6E8', // lavender
  '#A8DCC8', // mint
  '#F7D97C', // butter
  '#F6C6A8', // peach
  '#E88F7A', // coral
  '#B9D98B', // leaf
  '#FDF3E2', // cream
  '#B08968', // cocoa
  '#9AA5B1', // stone
];

/** Skin tones for the doll (the 4 approved tints). */
export const SKIN_TONES: readonly string[] = ['#F6D3B8', '#E3B08A', '#B9805A', '#7A4E35'];
/** Hair colours for the doll and the unicorn's mane. */
export const HAIR_COLORS: readonly string[] = ['#5B3A29', '#2F2420', '#E9C46A', '#C8553D', '#C8B6E8', '#F4A7B9'];
export const NOSE_COLOR = '#6E483C';

export const PATTERNS: readonly PatternId[] = ['solid', 'felt', 'gingham', 'dots', 'stripes', 'stars', 'hearts', 'plaid', 'fleece', 'denim', 'floral', 'rainbow', 'patchwork'];

/** The fabric tile for each pattern (null: a flat colour). */
export const PATTERN_TILE: Readonly<Record<PatternId, string | null>> = {
  solid: null,
  felt: 'fabrics/felt_solid',
  gingham: 'fabrics/gingham',
  dots: 'fabrics/polka_dot',
  stripes: 'fabrics/stripes',
  stars: 'fabrics/stars',
  hearts: 'fabrics/hearts',
  plaid: 'fabrics/plaid_flannel',
  fleece: 'fabrics/fleece',
  denim: 'fabrics/denim',
  floral: 'fabrics/floral',
  rainbow: 'fabrics/rainbow',
  patchwork: 'fabrics/patchwork',
};

/** Rainbow is full colour: drawn as is, never tinted. */
export function isTinted(p: PatternId): boolean {
  return p !== 'rainbow';
}

export const EYE_STYLES: readonly EyeStyle[] = ['button', 'round_shiny', 'sleepy', 'star', 'heart', 'wink', 'big_sparkly', 'happy_closed'];

export const ACCESSORIES: readonly AccessoryId[] = [
  'bow_1', 'bow_2', 'bow_3', 'hat_party', 'hat_sun', 'hat_crown', 'hat_beanie', 'glasses_round', 'glasses_heart',
  'scarf_1', 'scarf_2', 'flower', 'bandana', 'heart_patch', 'cape_small', 'tutu', 'bow_tie',
];

/** Where each accessory sits, and its registration point on its 512 px sprite (accessories.json). */
export const ACCESSORY_INFO: Readonly<Record<AccessoryId, { slot: AccessorySlot; reg: readonly [number, number] }>> = {
  bow_1: { slot: 'bow_ear', reg: [256, 256] },
  bow_2: { slot: 'bow_ear', reg: [256, 256] },
  bow_3: { slot: 'bow_ear', reg: [256, 256] },
  hat_party: { slot: 'hat_top', reg: [256, 430] },
  hat_sun: { slot: 'hat_top', reg: [256, 390] },
  hat_crown: { slot: 'hat_top', reg: [256, 404] },
  hat_beanie: { slot: 'hat_top', reg: [256, 425] },
  glasses_round: { slot: 'glasses', reg: [256, 256] },
  glasses_heart: { slot: 'glasses', reg: [256, 256] },
  scarf_1: { slot: 'neckwear', reg: [256, 190] },
  scarf_2: { slot: 'neckwear', reg: [256, 190] },
  flower: { slot: 'bow_ear', reg: [256, 256] },
  bandana: { slot: 'neckwear', reg: [256, 165] },
  heart_patch: { slot: 'chest', reg: [256, 256] },
  cape_small: { slot: 'cape', reg: [256, 100] },
  tutu: { slot: 'waist', reg: [256, 203] },
  bow_tie: { slot: 'neckwear', reg: [256, 256] },
};

/** Capes sit behind the plush; everything else in front. */
export function accessoryBehind(id: AccessoryId): boolean {
  return ACCESSORY_INFO[id].slot === 'cape';
}

/** At most one accessory per slot: adding one replaces the one in its slot. */
export function wearAccessory(list: readonly AccessoryId[], id: AccessoryId): AccessoryId[] {
  const slot = ACCESSORY_INFO[id].slot;
  return [...list.filter((a) => ACCESSORY_INFO[a].slot !== slot), id];
}

export const NAME_IDS: readonly string[] = ['teddy', 'bunbun', 'honey', 'pip', 'mochi', 'button', 'clover', 'sunny'];

function fill(color: string, pattern: PatternId = 'solid'): Fill {
  return { color, pattern };
}

/** Fills for every region (bases ignore the regions they don't have). */
export function defaultFills(body: string, belly = '#FDF3E2'): Record<Region, Fill> {
  return {
    body: fill(body),
    belly: fill(belly),
    muzzle: fill(belly),
    nose: fill(NOSE_COLOR),
    hair: fill(HAIR_COLORS[0]),
    accent: fill('#F7D97C'),
    skin: fill(SKIN_TONES[0]),
  };
}

/** The demo presets (P1 plays Bear and Bunny). */
export const PRESETS: Readonly<Record<'bear' | 'bunny', PlushSpec>> = {
  bear: { base: 'bear', body: 'round', fills: { ...defaultFills('#E2B26A'), belly: fill('#FDF3E2'), muzzle: fill('#FDF3E2') }, eyes: 'button', accessories: [], nameId: 'teddy' },
  bunny: { base: 'bunny', body: 'round', fills: { ...defaultFills('#F4A7B9', '#FDF3E2'), body: fill('#F4A7B9', 'felt') }, eyes: 'round_shiny', accessories: [], nameId: 'bunbun' },
};

/** A random valid spec (for the dev grid and "Surprise me"). */
export function randomSpec(rng: Rng, base?: BaseId, body?: BodyType): PlushSpec {
  const b = base ?? rng.pick(BASE_IDS);
  const def = baseDef(b);
  const bt = body ?? rng.pick(def.bodyTypes);
  const pat = (): PatternId => (rng.chance(0.35) ? 'solid' : rng.pick(PATTERNS));
  const fills = defaultFills(rng.pick(PALETTE));
  fills.body = fill(rng.pick(PALETTE), pat());
  fills.belly = fill(rng.pick(PALETTE), rng.chance(0.6) ? 'solid' : pat());
  fills.muzzle = fill(rng.chance(0.5) ? fills.belly.color : rng.pick(PALETTE));
  fills.hair = fill(rng.pick(HAIR_COLORS));
  fills.accent = fill(rng.pick(PALETTE));
  fills.skin = fill(rng.pick(SKIN_TONES));
  const style: DollStyle | undefined = def.styles ? rng.pick(def.styles) : undefined;
  const accessories: AccessoryId[] = rng.chance(0.4) ? [rng.pick(ACCESSORIES)] : [];
  return { base: b, body: bt, ...(style ? { style } : {}), fills, eyes: rng.pick(EYE_STYLES), accessories, nameId: rng.pick(NAME_IDS) };
}

/** Problems with a spec ([] = valid). */
export function specProblems(spec: PlushSpec): string[] {
  const out: string[] = [];
  if (!BASE_IDS.includes(spec.base)) return [`unknown base ${spec.base}`];
  const def = baseDef(spec.base);
  if (!def.bodyTypes.includes(spec.body)) out.push(`bad body ${spec.body}`);
  if (def.styles ? !spec.style || !def.styles.includes(spec.style) : spec.style !== undefined) out.push('bad doll style');
  for (const r of REGIONS) {
    const f = spec.fills[r];
    if (!f) out.push(`missing fill ${r}`);
    else {
      if (!/^#[0-9A-Fa-f]{6}$/.test(f.color)) out.push(`bad colour ${r}`);
      if (!PATTERNS.includes(f.pattern)) out.push(`bad pattern ${r}`);
    }
  }
  if (!EYE_STYLES.includes(spec.eyes)) out.push('bad eyes');
  const slots = new Set<string>();
  for (const a of spec.accessories) {
    if (!ACCESSORIES.includes(a)) out.push(`bad accessory ${a}`);
    else if (slots.has(ACCESSORY_INFO[a].slot)) out.push(`two accessories in ${ACCESSORY_INFO[a].slot}`);
    else slots.add(ACCESSORY_INFO[a].slot);
  }
  return out;
}

export function isValidSpec(spec: PlushSpec): boolean {
  return specProblems(spec).length === 0;
}
