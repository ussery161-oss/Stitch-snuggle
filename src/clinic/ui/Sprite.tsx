// A Skia sprite from the art manifest, centred on (x, y) at `size` (its longer side). Draws the
// given placeholder while the art is missing.
import { Group, Image, type SkImage } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';

import { useArtImage } from '../../ui/useArtImage';

interface Props {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity?: number;
  placeholder?: ReactNode;
}

export function spriteRect(img: SkImage, x: number, y: number, size: number) {
  const w = img.width();
  const h = img.height();
  const s = size / Math.max(w, h);
  return { x: x - (w * s) / 2, y: y - (h * s) / 2, width: w * s, height: h * s };
}

export default function Sprite({ id, x, y, size, opacity, placeholder = null }: Props) {
  const img = useArtImage(id);
  if (!img) return <>{placeholder}</>;
  const r = spriteRect(img, x, y, size);
  return (
    <Group opacity={opacity}>
      <Image image={img} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />
    </Group>
  );
}
