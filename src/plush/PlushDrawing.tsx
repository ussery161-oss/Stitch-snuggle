// The plush compositor: draws one plushie on the 1024×1024 canvas, inside whatever transform the
// caller sets up. No hooks besides useMemo, so the visual check renders it headless.
//
// For each part, back to front (the set's z_order, so ears sit under the head):
//   fill   the mask, tinted with the region colour (flat), or the pattern tile tinted by the
//          colour (multiply; rainbow untinted), clipped to the mask (srcIn in a layer);
//   shade  overlay (mid-grey = no change, as the art was made; multiply would halve the colour);
//   highlight  screen;   line  normal, never tinted.
// When a part has no art, its code placeholder path is filled and outlined instead.
// Then the mouth, the eyes (each eye of the r02 pair sprite on its own r03 anchor, scaled by
// fit.scale, blinking around the eye line) and the accessories (registration point on the slot).
import { BlendColor, Group, Image, ImageShader, Path, Rect, Skia, type SkImage, type Transforms3d } from '@shopify/react-native-skia';
import { Fragment, useMemo, type ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { PlushAssets } from './assets';
import { ACCESSORY_INFO, accessoryBehind, isTinted } from './spec';
import type { AccessoryId, BodySet, PartDef, PlushSpec } from './types';

export const LINE_COLOR = '#4A3A3A';
/** Pattern tiles (256 px) are drawn at this scale on the 1024 canvas. */
export const PATTERN_SCALE = 0.7;
/** Each eye's centre inside the r02 eye pair sprite (512×256). */
export const EYE_L_SPRITE: readonly [number, number] = [160, 128];
export const EYE_R_SPRITE: readonly [number, number] = [352, 128];
/** The mouth's centre inside its sprite (256×128). */
export const MOUTH_SPRITE: readonly [number, number] = [128, 64];

type Transform = Transforms3d | SharedValue<Transforms3d>;

export interface PlushDrawingProps {
  set: BodySet;
  spec: PlushSpec;
  assets: PlushAssets;
  /** Per-part transforms (Re-stuff droop), in 1024 space. */
  partTransforms?: Readonly<Record<string, Transform>>;
  /** Eye transform (the blink), in 1024 space. */
  eyeTransform?: Transform;
  /** Hide accessories (e.g. while the Dress step shows its own). */
  hideAccessories?: boolean;
  /** Drawn over the parts, under the face (damage overlays, patches). A function gets the loaded assets (to clip to part masks). */
  overlay?: ReactNode | ((assets: PlushAssets, set: BodySet) => ReactNode);
}

function PartFill({ part, spec, assets }: { part: PartDef; spec: PlushSpec; assets: PlushAssets }) {
  const fill = spec.fills[part.region];
  const mask = assets.layers.get(part.layers.mask);
  const tile = fill.pattern !== 'solid' ? assets.tiles.get(fill.pattern) ?? null : null;
  const placeholderPath = useMemo(() => (part.placeholder ? Skia.Path.MakeFromSVGString(part.placeholder) : null), [part.placeholder]);
  const shader = tile ? (
    <ImageShader image={tile} tx="repeat" ty="repeat" fit="none" rect={{ x: 0, y: 0, width: tile.width(), height: tile.height() }} transform={[{ scale: PATTERN_SCALE }]} />
  ) : null;
  const tint = tile && isTinted(fill.pattern) ? <BlendColor color={fill.color} mode="multiply" /> : null;

  if (!mask) {
    if (!placeholderPath) return null;
    return (
      <Group>
        {tile ? (
          <Path path={placeholderPath}>
            {shader}
            {tint}
          </Path>
        ) : (
          <Path path={placeholderPath} color={fill.color} />
        )}
        <Path path={placeholderPath} color={LINE_COLOR} style="stroke" strokeWidth={14} strokeJoin="round" />
      </Group>
    );
  }
  const r = mask.rect;
  const shade = part.layers.shade ? assets.layers.get(part.layers.shade) : undefined;
  const highlight = part.layers.highlight ? assets.layers.get(part.layers.highlight) : undefined;
  const line = assets.layers.get(part.layers.line);
  return (
    <Group>
      {tile ? (
        <Group layer>
          <Image image={mask.image} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />
          <Rect x={r.x} y={r.y} width={r.width} height={r.height} blendMode="srcIn">
            {shader}
            {tint}
          </Rect>
        </Group>
      ) : (
        <Image image={mask.image} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill">
          <BlendColor color={fill.color} mode="srcIn" />
        </Image>
      )}
      {shade ? <Image image={shade.image} x={shade.rect.x} y={shade.rect.y} width={shade.rect.width} height={shade.rect.height} fit="fill" blendMode="overlay" /> : null}
      {highlight ? (
        <Image image={highlight.image} x={highlight.rect.x} y={highlight.rect.y} width={highlight.rect.width} height={highlight.rect.height} fit="fill" blendMode="screen" />
      ) : null}
      {line ? <Image image={line.image} x={line.rect.x} y={line.rect.y} width={line.rect.width} height={line.rect.height} fit="fill" /> : null}
    </Group>
  );
}

/** One sprite placed so that its point `reg` lands on `at`, scaled by `s`. */
function Sprite({ image, at, reg, s, clip }: { image: SkImage | null; at: readonly [number, number]; reg: readonly [number, number]; s: number; clip?: { x: number; y: number; width: number; height: number } }) {
  if (!image) return null;
  return (
    <Group transform={[{ translateX: at[0] - reg[0] * s }, { translateY: at[1] - reg[1] * s }, { scale: s }]} clip={clip}>
      <Image image={image} x={0} y={0} width={image.width()} height={image.height()} fit="fill" />
    </Group>
  );
}

function Eyes({ set, assets }: { set: BodySet; assets: PlushAssets }) {
  const s = set.fitScale;
  const { eyeL, eyeR } = set.anchors;
  const left = { x: 0, y: 0, width: 256, height: 256 };
  const right = { x: 256, y: 0, width: 256, height: 256 };
  if (!assets.eyes.fill && !assets.eyes.line) {
    // Placeholder: two dark button eyes with a shine.
    const r = 34 * s;
    const path = Skia.Path.Make();
    path.addCircle(eyeL[0], eyeL[1], r);
    path.addCircle(eyeR[0], eyeR[1], r);
    const shine = Skia.Path.Make();
    shine.addCircle(eyeL[0] - r * 0.35, eyeL[1] - r * 0.35, r * 0.3);
    shine.addCircle(eyeR[0] - r * 0.35, eyeR[1] - r * 0.35, r * 0.3);
    return (
      <Group>
        <Path path={path} color={LINE_COLOR} />
        <Path path={shine} color="#FFFFFF" />
      </Group>
    );
  }
  return (
    <Group>
      {[assets.eyes.fill, assets.eyes.line].map((img, i) => (
        <Fragment key={i}>
          <Sprite image={img} at={eyeL} reg={EYE_L_SPRITE} s={s} clip={left} />
          <Sprite image={img} at={eyeR} reg={EYE_R_SPRITE} s={s} clip={right} />
        </Fragment>
      ))}
    </Group>
  );
}

function Accessory({ id, set, image }: { id: AccessoryId; set: BodySet; image: SkImage | undefined }) {
  const info = ACCESSORY_INFO[id];
  const at = set.accessorySlots[info.slot];
  if (!at) return null;
  if (!image) {
    // Placeholder: a small coloured badge on the slot.
    const p = Skia.Path.Make();
    p.addCircle(at[0], at[1], 40 * set.fitScale);
    return <Path path={p} color="#F4A7B9" />;
  }
  return <Sprite image={image} at={at} reg={info.reg} s={set.fitScale} />;
}

export default function PlushDrawing({ set, spec, assets, partTransforms, eyeTransform, hideAccessories, overlay }: PlushDrawingProps) {
  const acc = hideAccessories ? [] : spec.accessories;
  return (
    <Group>
      {acc.filter(accessoryBehind).map((a) => (
        <Accessory key={a} id={a} set={set} image={assets.accessories.get(a)} />
      ))}
      {set.parts.map((part) => {
        const t = partTransforms?.[part.id];
        return t ? (
          <Group key={part.id} transform={t}>
            <PartFill part={part} spec={spec} assets={assets} />
          </Group>
        ) : (
          <PartFill key={part.id} part={part} spec={spec} assets={assets} />
        );
      })}
      {typeof overlay === 'function' ? overlay(assets, set) : overlay}
      {assets.mouth.fill || assets.mouth.line ? (
        <Group>
          <Sprite image={assets.mouth.fill} at={set.anchors.mouth} reg={MOUTH_SPRITE} s={set.fitScale} />
          <Sprite image={assets.mouth.line} at={set.anchors.mouth} reg={MOUTH_SPRITE} s={set.fitScale} />
        </Group>
      ) : null}
      <Group transform={eyeTransform}>
        <Eyes set={set} assets={assets} />
      </Group>
      {acc
        .filter((a) => !accessoryBehind(a))
        .map((a) => (
          <Accessory key={a} id={a} set={set} image={assets.accessories.get(a)} />
        ))}
    </Group>
  );
}
