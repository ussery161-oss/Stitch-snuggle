// A round button that must be held: a ring fills over `holdMs`, and onComplete runs when it's
// full. Letting go early empties the ring and calls onShortRelease (the Home button says
// "Hold to go home" and pulses the ring as a hint).
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Easing, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { colors } from './theme';

interface Props {
  size: number;
  holdMs: number;
  onComplete: () => void;
  onShortRelease?: () => void;
  ringColor?: string;
  accessibilityLabel: string;
  children: ReactNode;
  testID?: string;
}

export default function HoldButton({ size, holdMs, onComplete, onShortRelease, ringColor = colors.rose, accessibilityLabel, children, testID }: Props) {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);
  const stroke = Math.max(5, size * 0.08);
  const ring = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(size / 2, size / 2, size / 2 - stroke / 2);
    // Start the fill at 12 o'clock.
    p.transform(Skia.Matrix().translate(size / 2, size / 2).rotate(-Math.PI / 2).translate(-size / 2, -size / 2));
    return p;
  }, [size, stroke]);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  const onPressIn = () => {
    completed.current = false;
    progress.value = withTiming(1, { duration: holdMs, easing: Easing.linear });
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      completed.current = true;
      onComplete();
    }, holdMs);
  };

  const onPressOut = () => {
    if (completed.current) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    // The hint: the ring empties with a little pulse, showing what holding would do.
    progress.value = withSequence(withTiming(0.3, { duration: 180 }), withTiming(0, { duration: 420 }));
    onShortRelease?.();
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: size, height: size }}
    >
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path path={ring} style="stroke" strokeWidth={stroke} strokeCap="round" color={ringColor} start={0} end={progress} />
      </Canvas>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
