// Sticker pictures. Tool stickers use their tool art. Plushie stickers (presets and creations) are
// snapshots: the plushie is drawn offscreen with Skia (drawAsImage), encoded as PNG and cached in
// the app's documents folder, so the book shows plain images instead of live plushies.
import { drawAsImage, Group } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { art } from '../art';
import { presetSpec } from '../content/presets';
import { loadPlushAssets } from '../plush/assets';
import PlushDrawing from '../plush/PlushDrawing';
import { bodySet } from '../plush/registry';
import type { PlushSpec } from '../plush/types';
import type { Save } from '../storage/schema';
import { stickerDef } from './stickers';

export const SNAPSHOT_PX = 256;

const memory = new Map<string, string>();

/** Draws a plushie offscreen and caches the PNG; returns its file URI (null if it can't). */
export async function snapshotPlush(spec: PlushSpec, key: string): Promise<string | null> {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const dir = new Directory(Paths.document, 'stickers');
    const file = new File(dir, `${key}.png`);
    if (!file.exists) {
      const set = bodySet(spec.base, spec.body, spec.style);
      const assets = await loadPlushAssets(spec, set, 0.4, 'smile');
      const s = SNAPSHOT_PX / 1024;
      const img = await drawAsImage(
        <Group transform={[{ scale: s }]}>
          <PlushDrawing set={set} spec={spec} assets={assets} />
        </Group>,
        { width: SNAPSHOT_PX, height: SNAPSHOT_PX },
      );
      if (!img) return null;
      if (!dir.exists) dir.create({ intermediates: true });
      file.write(img.encodeToBytes());
    }
    memory.set(key, file.uri);
    return file.uri;
  } catch {
    return null;
  }
}

/** The picture source for a sticker (null while it's being made, or when it has no art). */
export function useStickerSource(id: string, save: Save): ImageSourcePropType | null {
  const def = stickerDef(id);
  const creation = def?.kind === 'creation' ? save.creations.find((c) => c.id === def.creationId) : undefined;
  const [uri, setUri] = useState<string | null>(() => memory.get(id) ?? null);
  const creationSpec = creation?.spec;
  useEffect(() => {
    const d = stickerDef(id);
    if (!d || d.kind === 'tool' || d.kind === 'seasonal') return;
    const spec = d.kind === 'preset' && d.base ? presetSpec(d.base) : creationSpec;
    if (!spec) return;
    let live = true;
    snapshotPlush(spec, id).then((u) => {
      if (live) setUri(u);
    });
    return () => {
      live = false;
    };
  }, [id, creationSpec]);
  if (!def) return null;
  if (def.kind === 'tool' || def.kind === 'seasonal') {
    const mod = def.art ? art(def.art) : null;
    return mod;
  }
  return uri ? { uri } : null;
}
