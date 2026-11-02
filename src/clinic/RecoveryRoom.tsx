// The recovery room: for 3 seconds between Go home and the title, the plushie stands on the rug and
// waves. The tiny heart-and-cross charm hangs on the wall.
import type { Transforms3d } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { PlushSpec } from '../plush/types';
import { bodySet } from '../plush/registry';
import { useLayout } from '../ui/theme';
import { RECOVERY_PLUSH_RECT, sceneLayout, scenePoint } from './helpers';
import type { Repair } from './snap';
import ClinicStage from './ui/ClinicStage';
import WallCharm, { CHARM_SCENE_POS } from './WallCharm';
import StickerFly from '../stickers/StickerFly';

export const RECOVERY_MS = 3000;

/** The waving arm's rotation (radians) for a phase -1..1, around its shoulder. */
export function waveTransform(anchor: { x: number; y: number }, phase: number): Transforms3d {
  'worklet';
  return [{ translateX: anchor.x }, { translateY: anchor.y }, { rotate: -0.55 - 0.35 * phase }, { translateX: -anchor.x }, { translateY: -anchor.y }];
}

export default function RecoveryRoom({ spec, repairs, onDone, earned = [] }: { spec: PlushSpec; repairs: readonly Repair[]; onDone: () => void; earned?: readonly string[] }) {
  const { width, height, isPhone } = useLayout();
  const layout = useMemo(() => sceneLayout(width, height, RECOVERY_PLUSH_RECT, { floorY: 1480 }), [width, height]);
  const reduce = useReducedMotion();
  const wave = useSharedValue(0);
  const set = bodySet(spec.base, spec.body, spec.style);
  const arm = set.parts.find((p) => p.id === 'armR');
  const anchor = useMemo(() => ({ x: arm?.anchor[0] ?? 700, y: arm?.anchor[1] ?? 600 }), [arm]);

  useEffect(() => {
    if (!reduce) wave.set(withRepeat(withTiming(1, { duration: 380, easing: Easing.inOut(Easing.sin) }), -1, true));
    const t = setTimeout(onDone, RECOVERY_MS);
    return () => clearTimeout(t);
  }, [onDone, reduce, wave]);

  const armT = useDerivedValue(() => waveTransform(anchor, wave.value));
  const partTransforms = useMemo(() => (arm && !reduce ? { [arm.id]: armT } : undefined), [arm, armT, reduce]);
  const charm = scenePoint(layout, CHARM_SCENE_POS);
  return (
    <View style={StyleSheet.absoluteFill} testID="recovery-room">
      <ClinicStage scene="scene_recovery" layout={layout} spec={spec} repairs={repairs} plush={{ mouth: 'big_happy', partTransforms }} background="#E9E1F5" />
      <WallCharm x={charm.x} y={charm.y} isPhone={isPhone} />
      <StickerFly ids={earned} />
    </View>
  );
}
