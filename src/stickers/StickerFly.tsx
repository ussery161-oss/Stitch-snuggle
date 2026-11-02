// A newly earned sticker flies from the middle of the screen into the sticker book (top right).
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import StudioIcon from '../studio/StudioIcons';
import { useLayout } from '../ui/theme';
import { StickerPicture } from './StickerBookScreen';

export const FLY_MS = 1300;

export default function StickerFly({ ids }: { ids: readonly string[] }) {
  const { width, height } = useLayout();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(400, withTiming(1, { duration: reduce ? 1 : FLY_MS, easing: Easing.inOut(Easing.cubic) })));
  }, [t, reduce]);
  const size = 150;
  const from = { x: width / 2, y: height * 0.42 };
  const to = { x: width - 70, y: 60 };
  const style = useAnimatedStyle(() => {
    const p = t.value;
    const arc = -Math.sin(p * Math.PI) * 80;
    return {
      transform: [{ translateX: from.x + (to.x - from.x) * p - size / 2 }, { translateY: from.y + (to.y - from.y) * p + arc - size / 2 }, { scale: 1.2 - 0.85 * p }, { rotate: `${0.4 * p}rad` }],
      opacity: p >= 1 ? 0 : 1,
    };
  });
  if (ids.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="sticker-fly">
      <View style={[styles.book, { left: to.x - 36, top: to.y - 36 }]}>
        <StudioIcon name="shelf" size={72} />
      </View>
      <Animated.View style={[styles.fly, style]}>
        <StickerPicture id={ids[0]} size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fly: { position: 'absolute', left: 0, top: 0 },
  book: { position: 'absolute' },
});
