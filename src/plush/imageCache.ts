// Loads art into Skia images. Plush layers are 1024×1024 PNGs that are mostly empty, so each one is
// cropped to its visible bounds (precomputed by gen:art) and scaled to the resolution it's shown
// at before it's kept. A whole set then costs a few MB instead of ~230 MB.
//
// The byte source is swappable: the app reads bundled assets; the visual check reads files.
import { Skia, type SkData, type SkImage } from '@shopify/react-native-skia';
import { Image as RNImage } from 'react-native';

import { art } from '../art';
import type { Bounds } from './types';

export interface LayerImage {
  image: SkImage;
  /** Where the image goes on the 1024 canvas. */
  rect: { x: number; y: number; width: number; height: number };
}

/** Loads the encoded image for an art id: Skia data, raw bytes, or null when there's no such art. */
export type ByteSource = (id: string) => Promise<SkData | Uint8Array | null>;

const bundledSource: ByteSource = async (id) => {
  const mod = art(id);
  if (mod === null) return null;
  const uri = RNImage.resolveAssetSource(mod)?.uri;
  if (!uri) return null;
  return Skia.Data.fromURI(uri);
};

let source: ByteSource = bundledSource;

/** Visual check / tests: read art bytes from somewhere else. */
export function setByteSource(next: ByteSource | null): void {
  source = next ?? bundledSource;
  cache.clear();
}

/** Resolution buckets, so a plush shown at a similar size shares cached layers. */
export function qualityFor(displayPx: number): number {
  if (displayPx <= 420) return 0.4;
  if (displayPx <= 640) return 0.6;
  if (displayPx <= 860) return 0.8;
  return 1;
}

const MAX_ENTRIES = 260;
const cache = new Map<string, Promise<LayerImage | null>>();

function remember(key: string, p: Promise<LayerImage | null>): Promise<LayerImage | null> {
  cache.set(key, p);
  if (cache.size > MAX_ENTRIES) {
    // Oldest first (Map keeps insertion order).
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  return p;
}

async function decode(id: string): Promise<SkImage | null> {
  const bytes = await source(id);
  if (bytes === null) return null;
  const data = bytes instanceof Uint8Array ? Skia.Data.fromBytes(bytes) : bytes;
  return Skia.Image.MakeImageFromEncoded(data);
}

/**
 * The layer `id`, cropped to `bounds` (1024 space) and scaled by `quality`. Null when the art is
 * missing or can't be decoded (the caller draws the placeholder).
 */
export function loadLayer(id: string, bounds: Bounds, quality: number): Promise<LayerImage | null> {
  const key = `${id}@${quality}`;
  const hit = cache.get(key);
  if (hit) {
    // Refresh its place in the LRU order.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const p = (async () => {
    try {
      const full = await decode(id);
      if (full === null) return null;
      const [bx, by, bw, bh] = bounds[2] > 0 ? bounds : [0, 0, full.width(), full.height()];
      const w = Math.max(1, Math.round(bw * quality));
      const h = Math.max(1, Math.round(bh * quality));
      const surface = Skia.Surface.Make(w, h);
      if (!surface) return { image: full, rect: { x: 0, y: 0, width: full.width(), height: full.height() } };
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      surface.getCanvas().drawImageRect(full, Skia.XYWHRect(bx, by, bw, bh), Skia.XYWHRect(0, 0, w, h), paint, true);
      surface.flush();
      const image = surface.makeImageSnapshot();
      full.dispose?.();
      return { image, rect: { x: bx, y: by, width: bw, height: bh } };
    } catch {
      return null;
    }
  })();
  return remember(key, p);
}

/** A whole image (pattern tiles, eyes, accessories), uncropped. */
export function loadImage(id: string): Promise<SkImage | null> {
  const key = `${id}@full`;
  const hit = cache.get(key);
  if (hit) return hit.then((l) => l?.image ?? null);
  const p = (async () => {
    try {
      const img = await decode(id);
      return img ? { image: img, rect: { x: 0, y: 0, width: img.width(), height: img.height() } } : null;
    } catch {
      return null;
    }
  })();
  remember(key, p);
  return p.then((l) => l?.image ?? null);
}
