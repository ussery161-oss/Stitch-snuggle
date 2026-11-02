// A Skia image for an art id (null while loading or when the art is missing).
import type { SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';

import { loadImage } from '../plush/imageCache';

const ready = new Map<string, SkImage>();

export function useArtImage(id: string | null): SkImage | null {
  const [loaded, setLoaded] = useState<{ id: string; img: SkImage | null } | null>(null);
  const hit = id ? ready.get(id) : undefined;
  useEffect(() => {
    if (!id || ready.has(id)) return;
    let live = true;
    loadImage(id).then((img) => {
      if (img) ready.set(id, img);
      if (live) setLoaded({ id, img });
    });
    return () => {
      live = false;
    };
  }, [id]);
  if (!id) return null;
  return hit ?? (loaded?.id === id ? loaded.img : null);
}
