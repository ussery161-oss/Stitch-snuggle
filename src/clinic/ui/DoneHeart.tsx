// The big "done" heart: appears when a step has run 20 s (or always, for Dress), so a child can
// always move on. Tapping it finishes the step. Never a "skip" or a failure: it's a heart.
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { HeartIcon } from '../../ui/Icons';
import { colors, touchSize, useLayout } from '../../ui/theme';

export default function DoneHeart({ onPress, right = 24, bottom = 24 }: { onPress: () => void; right?: number; bottom?: number }) {
  const { scale } = useLayout();
  const size = touchSize(120, scale);
  const pop = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    pop.value = withSpring(1, { damping: 9 });
    if (!reduce) pop.value = withSequence(withSpring(1, { damping: 9 }), withRepeat(withSequence(withTiming(1.08, { duration: 500 }), withTiming(1, { duration: 500 })), -1, false));
  }, [pop, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View style={[styles.wrap, { right, bottom }, style]}>
      <Pressable testID="done-heart" accessibilityRole="button" accessibilityLabel="All done" onPress={onPress} style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]}>
        <HeartIcon size={size * 0.7} color={colors.rose} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  btn: { backgroundColor: colors.white, borderWidth: 4, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
});
