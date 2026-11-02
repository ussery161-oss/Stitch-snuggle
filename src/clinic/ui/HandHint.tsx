// The animated hand hint: shows a child what to do (tap here, or drag from here to there) with no
// words. Pure decoration: it never takes touches.
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { colors } from '../../ui/theme';

/** A pointing hand in a 100×100 box; the fingertip is at (36, 12). */
export const HAND_SVG =
  'M40 96 C25 96 17 84 17 72 L17 54 C17 47 26 45 30 51 L30 20 C30 10 42 10 42 20 L42 47 C42 40 54 40 54 48 C54 41 66 41 66 50 C66 44 78 44 78 52 L78 73 C78 87 68 96 55 96 Z';
export const HAND_TIP = { x: 36, y: 12 };

interface Props {
  /** Where the fingertip taps or starts (screen points). */
  at: { x: number; y: number };
  /** Drag hint: where the fingertip goes. */
  to?: { x: number; y: number };
  size?: number;
}

export default function HandHint({ at, to, size = 96 }: Props) {
  const path = useMemo(() => Skia.Path.MakeFromSVGString(HAND_SVG) ?? Skia.Path.Make(), []);
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      t.value = 0.5;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withSequence(withTiming(1, { duration: to ? 1100 : 450, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: to ? 300 : 450 })), -1, false);
    return () => cancelAnimation(t);
  }, [reduce, t, to]);
  const s = size / 100;
  const ax = at.x;
  const ay = at.y;
  const bx = to ? to.x : at.x;
  const by = to ? to.y : at.y;
  const drag = !!to;
  const style = useAnimatedStyle(() => {
    const p = t.value;
    const x = ax + (bx - ax) * p;
    const y = ay + (by - ay) * p;
    const tap = drag ? 1 : 1 - 0.12 * p;
    return { transform: [{ translateX: x - HAND_TIP.x * s }, { translateY: y - HAND_TIP.y * s + (drag ? 0 : 10 * p) }, { scale: tap }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.hand, { width: size, height: size }, style]} testID="hand-hint">
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale: s }]}>
          <Path path={path} color={colors.peach} />
          <Path path={path} color={colors.line} style="stroke" strokeWidth={5} strokeJoin="round" />
        </Group>
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hand: { position: 'absolute', left: 0, top: 0 },
});
