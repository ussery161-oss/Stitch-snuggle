// A gentle side-to-side wiggle when `trigger` changes (a locked item, a full shelf). No sound, no
// nag. Still with Reduce Motion.
import { useEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export default function Wiggle({ trigger, children }: { trigger: number; children: ReactNode }) {
  const r = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (trigger === 0 || reduce) return;
    r.set(withSequence(withTiming(-0.12, { duration: 70 }), withTiming(0.12, { duration: 110 }), withTiming(-0.08, { duration: 90 }), withTiming(0, { duration: 80 })));
  }, [trigger, r, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}rad` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
