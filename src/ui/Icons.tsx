// Code-drawn icons (Skia) for buttons that have no art file.
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { colors } from './theme';

/** A heart in a 100×100 box. */
export const HEART_SVG = 'M50 88 C20 66 6 50 6 32 C6 17 18 7 31 7 C40 7 46 12 50 19 C54 12 60 7 69 7 C82 7 94 17 94 32 C94 50 80 66 50 88 Z';

function useSvg(svg: string) {
  return useMemo(() => Skia.Path.MakeFromSVGString(svg) ?? Skia.Path.Make(), [svg]);
}

export function HeartIcon({ size, color = colors.rose }: { size: number; color?: string }) {
  const heart = useSvg(HEART_SVG);
  const s = size / 100;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: s }]}>
        <Path path={heart} color={color} />
        <Path path={heart} color={colors.line} style="stroke" strokeWidth={5} strokeJoin="round" />
        <Circle cx={32} cy={30} r={8} color="rgba(255,255,255,0.55)" />
      </Group>
    </Canvas>
  );
}

const PALETTE_SVG = 'M50 8 C76 8 94 26 94 48 C94 62 84 68 74 66 C64 64 58 70 62 80 C66 90 58 94 48 94 C24 94 6 74 6 50 C6 26 24 8 50 8 Z';

/** The Studio icon: a painter's palette with a pair of scissors across it. */
export function StudioIcon({ size }: { size: number }) {
  const palette = useSvg(PALETTE_SVG);
  const blade = useSvg('M58 30 L92 84');
  const blade2 = useSvg('M92 30 L58 84');
  const s = size / 100;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: s }]}>
        <Path path={palette} color={colors.peach} />
        <Path path={palette} color={colors.line} style="stroke" strokeWidth={5} strokeJoin="round" />
        <Circle cx={30} cy={34} r={8} color={colors.rose} />
        <Circle cx={50} cy={24} r={8} color={colors.butter} />
        <Circle cx={26} cy={58} r={8} color={colors.sky} />
        <Circle cx={42} cy={76} r={8} color={colors.mint} />
        <Path path={blade} color={colors.line} style="stroke" strokeWidth={6} strokeCap="round" />
        <Path path={blade2} color={colors.line} style="stroke" strokeWidth={6} strokeCap="round" />
        <Circle cx={60} cy={88} r={7} color={colors.lavender} />
        <Circle cx={90} cy={88} r={7} color={colors.lavender} />
      </Group>
    </Canvas>
  );
}

/** A padlock placeholder (when ui/icons/parent_lock is missing). */
export function LockIcon({ size }: { size: number }) {
  const shackle = useSvg('M32 46 L32 32 C32 20 40 12 50 12 C60 12 68 20 68 32 L68 46');
  const body = useMemo(() => Skia.RRectXY(Skia.XYWHRect(22, 44, 56, 44), 10, 10), []);
  const s = size / 100;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: s }]}>
        <Path path={shackle} color={colors.line} style="stroke" strokeWidth={8} strokeCap="round" />
        <Path path={Skia.Path.Make().addRRect(body)} color={colors.butter} />
        <Path path={Skia.Path.Make().addRRect(body)} color={colors.line} style="stroke" strokeWidth={5} />
      </Group>
    </Canvas>
  );
}
