// Everything one plushie needs loaded before it's drawn: its part layers (cropped), the pattern
// tiles its fills use, its eye and mouth sprites and its accessories.
import type { SkImage } from '@shopify/react-native-skia';

import { art } from '../art';
import { loadImage, loadLayer, type LayerImage } from './imageCache';
import { PATTERN_TILE } from './spec';
import type { AccessoryId, BodySet, MouthStyle, PatternId, PlushSpec } from './types';

export interface PlushAssets {
  /** Part layers by art id. A missing id means no art: draw the placeholder. */
  layers: ReadonlyMap<string, LayerImage>;
  tiles: ReadonlyMap<PatternId, SkImage>;
  eyes: { fill: SkImage | null; line: SkImage | null };
  mouth: { fill: SkImage | null; line: SkImage | null };
  accessories: ReadonlyMap<AccessoryId, SkImage>;
}

export const EMPTY_ASSETS: PlushAssets = {
  layers: new Map(),
  tiles: new Map(),
  eyes: { fill: null, line: null },
  mouth: { fill: null, line: null },
  accessories: new Map(),
};

/** The layer ids of a set that have art (others are placeholders). */
export function layerIds(set: BodySet): { id: string; bounds: BodySet['parts'][number]['bounds'] }[] {
  return set.parts.flatMap((p) =>
    [p.layers.mask, p.layers.line, p.layers.shade, p.layers.highlight]
      .filter((id): id is string => id !== undefined && art(id) !== null)
      .map((id) => ({ id, bounds: p.bounds })),
  );
}

export function patternsUsed(spec: PlushSpec, set: BodySet): PatternId[] {
  const regions = new Set(set.parts.map((p) => p.region));
  return [...new Set([...regions].map((r) => spec.fills[r].pattern))].filter((p) => PATTERN_TILE[p] !== null);
}

/** A stable key: two specs with the same key draw from the same assets. */
export function assetKey(spec: PlushSpec, set: BodySet, quality: number, mouth: MouthStyle | null): string {
  return [set.key, quality, patternsUsed(spec, set).join(','), spec.eyes, mouth ?? '-', spec.accessories.join(',')].join('|');
}

export async function loadPlushAssets(spec: PlushSpec, set: BodySet, quality: number, mouth: MouthStyle | null): Promise<PlushAssets> {
  const layerList = layerIds(set);
  const layers = await Promise.all(layerList.map((l) => loadLayer(l.id, l.bounds, quality)));
  const pats = patternsUsed(spec, set);
  const tiles = await Promise.all(pats.map((p) => loadImage(PATTERN_TILE[p]!)));
  const [eyeFill, eyeLine, mouthFill, mouthLine] = await Promise.all([
    loadImage(`faces/eyes/${spec.eyes}_fill`),
    loadImage(`faces/eyes/${spec.eyes}_line`),
    mouth ? loadImage(`faces/mouths/${mouth}_fill`) : Promise.resolve(null),
    mouth ? loadImage(`faces/mouths/${mouth}_line`) : Promise.resolve(null),
  ]);
  const acc = await Promise.all(spec.accessories.map((a) => loadImage(`accessories/${a}`)));
  return {
    layers: new Map(layerList.flatMap((l, i) => (layers[i] ? [[l.id, layers[i]!] as const] : []))),
    tiles: new Map(pats.flatMap((p, i) => (tiles[i] ? [[p, tiles[i]!] as const] : []))),
    eyes: { fill: eyeFill, line: eyeLine },
    mouth: { fill: mouthFill, line: mouthLine },
    accessories: new Map(spec.accessories.flatMap((a, i) => (acc[i] ? [[a, acc[i]!] as const] : []))),
  };
}
