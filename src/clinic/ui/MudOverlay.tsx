// The mud on a dirty plushie: splat sprites at the dirt damages, with the soap's erase strokes cut
// out (BlendMode.Clear) and everything clipped to the dirty parts' masks (dstIn), so mud never
// spills off the plushie. Pure drawing (no hooks), so the visual check can render it.
import { BlendMode, Circle, Group, Image, Path, Skia, type SkImage, type SkPaint, type SkPath } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { PlushAssets } from '../../plush/assets';
import type { BodySet } from '../../plush/types';
import type { Damage } from '../visit';
import { spriteRect } from './Sprite';

let dstIn: SkPaint | null = null;
/** A layer paint that keeps what's under it only where the layer is drawn (the clip to the masks). */
export function dstInPaint(): SkPaint {
  if (dstIn === null) {
    dstIn = Skia.Paint();
    dstIn.setBlendMode(BlendMode.DstIn);
  }
  return dstIn;
}

/** Erase brush radius (1024 units). */
export const SOAP_RADIUS = 62;

/** Mud splats for the dirt damages, clipped to their parts' masks, with the erase strokes cut out. */
export default function MudOverlay({ dirt, assets, set, erase, opacity, splats }: {
  dirt: readonly Damage[];
  assets: PlushAssets;
  set: BodySet;
  erase: SharedValue<SkPath> | SkPath;
  opacity: SharedValue<number> | number;
  splats: readonly (SkImage | null)[];
}) {
  const masks = [...new Set(dirt.map((d) => d.part))]
    .map((part) => set.parts.find((p) => p.id === part))
    .flatMap((p) => (p ? [assets.layers.get(p.layers.mask)] : []))
    .filter((m): m is NonNullable<typeof m> => !!m);
  return (
    <Group opacity={opacity}>
      <Group layer>
        {dirt.map((d, i) => {
          const img = splats[i % splats.length];
          const size = (d.radius ?? 100) * 2.3;
          if (!img) return <Circle key={d.id} cx={d.xy[0]} cy={d.xy[1]} r={d.radius ?? 100} color="rgba(122,90,60,0.75)" />;
          const r = spriteRect(img, d.xy[0], d.xy[1], size);
          return <Image key={d.id} image={img} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />;
        })}
        <Path path={erase} style="stroke" strokeWidth={SOAP_RADIUS * 2} strokeCap="round" strokeJoin="round" color="#000" blendMode="clear" />
        {masks.length > 0 ? (
          // A layer composited with DstIn: the mud survives only inside the masks (their union).
          <Group layer={dstInPaint()}>
            {masks.map((m, i) => (
              <Image key={i} image={m.image} x={m.rect.x} y={m.rect.y} width={m.rect.width} height={m.rect.height} fit="fill" />
            ))}
          </Group>
        ) : null}
      </Group>
    </Group>
  );
}
