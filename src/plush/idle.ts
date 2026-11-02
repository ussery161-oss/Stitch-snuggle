import type { Transforms3d } from '@shopify/react-native-skia';

// Idle animation maths. The transform helpers run on the UI thread (animated derived values), so
// each one is a 'worklet' (the workletPurity test enforces it).

export const BREATH_PERIOD_MS = 2400;
export const BREATH_SCALE = 0.02;
export const BLINK_MIN_MS = 3000;
export const BLINK_MAX_MS = 6000;
/** The plush stands on its feet: breathing scales from here (1024 space). */
export const FOOT_Y = 960;

/** Breathing scale for a phase 0..1 (1 → 1.02). */
export function breathScale(phase: number): number {
  'worklet';
  const p = Math.min(1, Math.max(0, phase));
  return 1 + BREATH_SCALE * p;
}

/** Places the 1024 canvas at (x, y) at `size` pt, breathing from the feet. */
export function plushTransform(x: number, y: number, size: number, phase: number): Transforms3d {
  'worklet';
  const s = breathScale(phase);
  return [
    { translateX: x },
    { translateY: y },
    { scale: size / 1024 },
    { translateX: 512 },
    { translateY: FOOT_Y },
    { scaleX: 1 + (s - 1) * 0.5 },
    { scaleY: s },
    { translateX: -512 },
    { translateY: -FOOT_Y },
  ];
}

/** The blink squashes the eyes around their line (open = 1). */
export function blinkTransform(eyeY: number, open: number): Transforms3d {
  'worklet';
  return [{ translateY: eyeY }, { scaleY: Math.max(0.08, Math.min(1, open)) }, { translateY: -eyeY }];
}

/** Next blink delay in ms (3–6 s), from a 0..1 random. */
export function nextBlinkDelay(r: number): number {
  return BLINK_MIN_MS + Math.floor(r * (BLINK_MAX_MS - BLINK_MIN_MS));
}
