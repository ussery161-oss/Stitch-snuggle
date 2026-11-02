// A small UI-thread fps readout for the Dev screen. Frames are counted in a frame callback
// (a worklet) and reported to React twice a second.
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export const FPS_WINDOW_MS = 500;

/** One frame: returns the new window state and, when a window closes, its fps (else -1). */
export function fpsStep(frames: number, windowStart: number, now: number): { frames: number; windowStart: number; fps: number } {
  'worklet';
  if (windowStart <= 0) return { frames: 0, windowStart: now, fps: -1 };
  const n = frames + 1;
  const elapsed = now - windowStart;
  if (elapsed >= FPS_WINDOW_MS) return { frames: 0, windowStart: now, fps: Math.round((n * 1000) / elapsed) };
  return { frames: n, windowStart, fps: -1 };
}

export default function FpsMeter() {
  const [fps, setFps] = useState(0);
  const frames = useSharedValue(0);
  const start = useSharedValue(0);
  useFrameCallback((info) => {
    const step = fpsStep(frames.value, start.value, info.timestamp);
    frames.value = step.frames;
    start.value = step.windowStart;
    if (step.fps >= 0) scheduleOnRN(setFps, step.fps);
  });
  return (
    <Text style={styles.text} testID="fps-meter">
      {fps} fps
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 18, fontWeight: '700', color: '#4A3A3A', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
