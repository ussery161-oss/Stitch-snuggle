// The one tiny heart-and-cross charm on the recovery-room wall (approved by Mike). Gentle decor,
// never the focal point: 28 pt on iPad and 22 pt on iPhone, soft gold #F2C94C at 60 % opacity.
// It takes no touches, never moves and is never voiced.
import { Canvas, ColorMatrix, Group, Image, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useArtImage } from '../ui/useArtImage';

export const CHARM_ID = 'ui/decor/wall_charm_heart_cross';
export const CHARM_COLOR = '#F2C94C';
export const CHARM_OPACITY = 0.6;
export const CHARM_PT_IPAD = 28;
export const CHARM_PT_IPHONE = 22;
/** scenes.json → scene_recovery.wall_charm.pos (scene pixels). */
export const CHARM_SCENE_POS: readonly [number, number] = [1420, 330];

/**
 * Recolours the charm art to soft gold while keeping its transparency and its light/dark detail:
 * each pixel becomes gold × (0.4 + 0.6 × its brightness); alpha is unchanged.
 */
export function goldMatrix(hex: string = CHARM_COLOR): number[] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const row = (c: number) => [c * 0.6 * 0.299, c * 0.6 * 0.587, c * 0.6 * 0.114, 0, c * 0.4];
  return [...row(r), ...row(g), ...row(b), 0, 0, 0, 1, 0];
}

export function charmSize(isPhone: boolean): number {
  return isPhone ? CHARM_PT_IPHONE : CHARM_PT_IPAD;
}

/** Placeholder in a 100×100 box: a heart with a small cross above it. */
const HEART = 'M50 92 C22 72 8 58 8 42 C8 30 18 22 29 22 C38 22 45 27 50 34 C55 27 62 22 71 22 C82 22 92 30 92 42 C92 58 78 72 50 92 Z';
const CROSS = 'M46 0 H54 V8 H62 V15 H54 V24 H46 V15 H38 V8 H46 Z';

export default function WallCharm({ x, y, isPhone }: { x: number; y: number; isPhone: boolean }) {
  const size = charmSize(isPhone);
  const img = useArtImage(CHARM_ID);
  const heart = useMemo(() => Skia.Path.MakeFromSVGString(HEART), []);
  const cross = useMemo(() => Skia.Path.MakeFromSVGString(CROSS), []);
  return (
    <View pointerEvents="none" style={[styles.wrap, { left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: CHARM_OPACITY }]} testID="wall-charm" accessible={false} importantForAccessibility="no-hide-descendants">
      <Canvas style={{ width: size, height: size }}>
        {img ? (
          <Image image={img} x={0} y={0} width={size} height={size} fit="contain">
            <ColorMatrix matrix={goldMatrix()} />
          </Image>
        ) : (
          <Group transform={[{ scale: size / 100 }]}>
            {heart ? <Path path={heart} color={CHARM_COLOR} /> : null}
            {cross ? <Path path={cross} color={CHARM_COLOR} /> : null}
          </Group>
        )}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});
