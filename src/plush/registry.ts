// The base registry: all 27 base/body sets from the r03 art (Bear, Bunny, Kitty, Puppy, Unicorn,
// Dino, Owl in round/tall/tiny; Doll girl/boy in round/tall/tiny), built from each set's
// anchors.json and the generated layer bounds. A set with no art falls back to code placeholders.
import { art, artData } from '../art';
import { ART_BOUNDS } from '../art/bounds.generated';
import { placeholderAnchors, placeholderBounds, placeholderShapes } from './placeholder';
import type { AccessorySlot, AnchorName, BaseDef, BaseId, BodySet, BodyType, DamageKind, DollStyle, PartDef, Region, Vec } from './types';

export const BASES: readonly BaseDef[] = [
  { id: 'bear', bodyTypes: ['round', 'tall', 'tiny'], regions: ['body', 'belly', 'muzzle', 'nose'] },
  { id: 'bunny', bodyTypes: ['round', 'tall', 'tiny'], regions: ['body', 'belly', 'muzzle', 'nose'] },
  { id: 'kitty', bodyTypes: ['round', 'tall', 'tiny'], regions: ['body', 'belly', 'muzzle', 'nose'] },
  { id: 'puppy', bodyTypes: ['round', 'tall', 'tiny'], regions: ['body', 'belly', 'muzzle', 'nose'] },
  { id: 'unicorn', bodyTypes: ['round', 'tall', 'tiny'], regions: ['body', 'belly', 'muzzle', 'nose', 'hair', 'accent'] },
  { id: 'dino', bodyTypes: ['round', 'tall', 'tiny'], regions: ['body', 'belly', 'muzzle', 'nose', 'accent'] },
  { id: 'owl', bodyTypes: ['round', 'tall', 'tiny'], regions: ['body', 'belly', 'nose'] },
  { id: 'doll', bodyTypes: ['round', 'tall', 'tiny'], styles: ['girl', 'boy'], regions: ['body', 'belly', 'skin', 'hair', 'nose'] },
];

export const BASE_IDS: readonly BaseId[] = BASES.map((b) => b.id);

export function baseDef(id: BaseId): BaseDef {
  const b = BASES.find((x) => x.id === id);
  if (!b) throw new Error(`unknown base ${id}`);
  return b;
}

/** Which colour region a part belongs to. */
export function regionOf(base: BaseId, part: string): Region {
  if (base === 'doll') {
    if (['head', 'face', 'earL', 'earR', 'armL', 'armR'].includes(part)) return 'skin';
    if (part === 'hair_back' || part === 'hair_front') return 'hair';
    if (part === 'belly') return 'belly';
    if (part === 'nose') return 'nose';
    return 'body';
  }
  if (part === 'belly' || part.startsWith('earInner') || part === 'faceDisc') return 'belly';
  if (part === 'muzzle') return 'muzzle';
  if (part === 'nose') return 'nose';
  if (part === 'mane' || part === 'tailHair') return 'hair';
  if (part === 'horn' || part === 'spikes') return 'accent';
  return 'body';
}

/** The art folder for a set: 'round', or 'girl_round' for the doll. */
export function setFolder(base: BaseId, body: BodyType, style?: DollStyle): string {
  return base === 'doll' ? `${style ?? 'girl'}_${body}` : body;
}

export function setKey(base: BaseId, body: BodyType, style?: DollStyle): string {
  return `${base}/${setFolder(base, body, style)}`;
}

interface AnchorsJson {
  z_order: string[];
  head: Vec;
  neck: Vec;
  chest: Vec;
  eyeL: Vec;
  eyeR: Vec;
  mouth: Vec;
  handL: Vec;
  handR: Vec;
  footL: Vec;
  footR: Vec;
  accessory: Record<string, Vec>;
  damage_spots: { id: string; part: string; xy: Vec; types: DamageKind[] }[];
  fit: { scale: number };
}

const ANCHOR_NAMES: readonly AnchorName[] = ['head', 'neck', 'chest', 'eyeL', 'eyeR', 'mouth', 'handL', 'handR', 'footL', 'footR'];

/** The anchor a part hangs from (droop pivots around it). */
function partAnchor(part: string, a: Record<AnchorName, Vec>, bounds: readonly number[]): Vec {
  if (part === 'armL') return [bounds[0] + bounds[2] * 0.7, bounds[1] + bounds[3] * 0.15];
  if (part === 'armR') return [bounds[0] + bounds[2] * 0.3, bounds[1] + bounds[3] * 0.15];
  if (part.startsWith('leg')) return [bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] * 0.1];
  if (part === 'head') return a.neck;
  if (part === 'body' || part === 'belly') return [a.chest[0], bounds[1] + bounds[3]];
  return [bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2];
}

function buildFromArt(base: BaseId, body: BodyType, style: DollStyle | undefined, json: AnchorsJson): BodySet {
  const folder = setFolder(base, body, style);
  const prefix = `plush/${base}/${folder}/`;
  const anchors = Object.fromEntries(ANCHOR_NAMES.map((n) => [n, json[n]])) as Record<AnchorName, Vec>;
  const ph = placeholderShapes(base, body);
  const parts: PartDef[] = json.z_order.map((id, z) => {
    const has = (layer: string) => art(prefix + `${id}_${layer}`) !== null;
    const bounds = ART_BOUNDS[prefix + `${id}_line`] ?? ART_BOUNDS[prefix + `${id}_mask`] ?? [0, 0, 1024, 1024];
    const shape = ph.find((s) => s.part === id);
    return {
      id,
      region: regionOf(base, id),
      z,
      layers: {
        mask: prefix + `${id}_mask`,
        line: prefix + `${id}_line`,
        ...(has('shade') ? { shade: prefix + `${id}_shade` } : {}),
        ...(has('highlight') ? { highlight: prefix + `${id}_highlight` } : {}),
      },
      bounds,
      anchor: partAnchor(id, anchors, bounds),
      placeholder: shape?.d ?? '',
    };
  });
  const slots = { ...json.accessory, chest: json.chest } as Record<AccessorySlot, Vec>;
  return {
    key: `${base}/${folder}`,
    base,
    body,
    ...(base === 'doll' ? { style: style ?? 'girl' } : {}),
    parts,
    anchors,
    accessorySlots: slots,
    damageSpots: json.damage_spots.map((d) => ({ id: d.id, part: d.part, xy: d.xy, types: d.types })),
    fitScale: json.fit?.scale ?? 1,
    placeholder: false,
  };
}

/** A set drawn entirely from code placeholders (no art landed). */
export function buildPlaceholderSet(base: BaseId, body: BodyType, style?: DollStyle): BodySet {
  const shapes = placeholderShapes(base, body);
  const { anchors, slots } = placeholderAnchors(base, body);
  const parts: PartDef[] = shapes.map((s, z) => {
    const bounds = placeholderBounds(s.d);
    return {
      id: s.part,
      region: regionOf(base, s.part),
      z,
      layers: { mask: `placeholder/${s.part}_mask`, line: `placeholder/${s.part}_line` },
      bounds,
      anchor: partAnchor(s.part, anchors, bounds),
      placeholder: s.d,
    };
  });
  // Damage spots computed from the part geometry: the centre of each damageable part.
  const at = (p: string) => shapes.find((s) => s.part === p)!.c;
  const damageSpots = [
    { id: 'rip_armL', part: 'armL', xy: at('armL'), types: ['rip', 'dirt'] as DamageKind[] },
    { id: 'rip_legR', part: 'legR', xy: at('legR'), types: ['rip', 'dirt'] as DamageKind[] },
    { id: 'hole_belly', part: 'belly', xy: at('belly'), types: ['hole', 'dirt'] as DamageKind[] },
    { id: 'rip_head', part: 'head', xy: [at('head')[0] + 90, at('head')[1] - 60] as Vec, types: ['rip', 'tangle'] as DamageKind[] },
    { id: 'dirt_body', part: 'body', xy: [at('body')[0] - 110, at('body')[1] + 80] as Vec, types: ['dirt', 'tangle'] as DamageKind[] },
    { id: 'tangle_tail', part: 'tail', xy: at('tail'), types: ['tangle', 'dirt'] as DamageKind[] },
  ];
  return {
    key: `${base}/${setFolder(base, body, style)}`,
    base,
    body,
    ...(base === 'doll' ? { style: style ?? 'girl' } : {}),
    parts,
    anchors,
    accessorySlots: slots,
    damageSpots,
    fitScale: 1,
    placeholder: true,
  };
}

const cache = new Map<string, BodySet>();

/** The set for a base/body (real art when its anchors.json exists, else placeholders). */
export function bodySet(base: BaseId, body: BodyType, style?: DollStyle): BodySet {
  const key = setKey(base, body, style);
  let s = cache.get(key);
  if (!s) {
    const json = artData<AnchorsJson>(`plush/${key}/anchors`);
    s = json ? buildFromArt(base, body, style, json) : buildPlaceholderSet(base, body, style);
    cache.set(key, s);
  }
  return s;
}

/** Tests only: forget built sets (after swapping the art manifest). */
export function clearBodySetCache(): void {
  cache.clear();
}

/** Every registered set (27 with the r03 art). */
export function allSets(): BodySet[] {
  return BASES.flatMap((b) =>
    b.bodyTypes.flatMap((body) => (b.styles ? b.styles.map((st) => bodySet(b.id, body, st)) : [bodySet(b.id, body)])),
  );
}
