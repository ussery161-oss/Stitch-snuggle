import type { Transforms3d } from '@shopify/react-native-skia';

// Small pure helpers shared by the clinic: stall timers, the scene layout, wash bubbles and the
// towel wiggle. No React, no Skia.

/** A hand hint appears after this long with no progress… */
export const HINT_AFTER_MS = 8000;
/** …and a big "done" heart after this long in a step, so a child can always move on. */
export const DONE_HEART_AFTER_MS = 20000;

export function hintDue(lastProgressMs: number, nowMs: number): boolean {
  return nowMs - lastProgressMs >= HINT_AFTER_MS;
}

export function doneHeartDue(stepStartMs: number, nowMs: number): boolean {
  return nowMs - stepStartMs >= DONE_HEART_AFTER_MS;
}

// ---------- Scene layout ----------

/** The scenes are 2048×1536. */
export const SCENE_W = 2048;
export const SCENE_H = 1536;

/** scenes.json → scene_clinic.plush_rect and scene_recovery.plush_rect. */
export const CLINIC_PLUSH_RECT = { x: 354, y: 0, size: 1340 };
export const RECOVERY_PLUSH_RECT = { x: 444, y: 250, size: 1160 };

export interface SceneRect {
  x: number;
  y: number;
  size: number;
}

export interface SceneLayout {
  /** Scene → screen: screen = offset + scene * scale (the scene covers the screen). */
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Where the 1024 plush canvas goes on screen. */
  plush: SceneRect;
}

/**
 * Covers the screen with the scene and places the plush at its scene rect. On wide phones the
 * cover crops the top and bottom, so the plush is shrunk to fit and kept standing on the floor.
 */
export function sceneLayout(width: number, height: number, plushRect: SceneRect, footY = 0.93): SceneLayout {
  const scale = Math.max(width / SCENE_W, height / SCENE_H);
  const offsetX = (width - SCENE_W * scale) / 2;
  const offsetY = (height - SCENE_H * scale) / 2;
  let size = plushRect.size * scale;
  let x = offsetX + plushRect.x * scale;
  let y = offsetY + plushRect.y * scale;
  const maxSize = height * 0.94;
  if (size > maxSize || y < 0) {
    // Keep the feet where the scene puts them (or on screen), and the centre x.
    const feet = Math.min(height * 0.985, y + size * footY);
    const cx = x + size / 2;
    size = Math.min(size, maxSize, feet / footY);
    x = cx - size / 2;
    y = feet - size * footY;
  }
  return { scale, offsetX, offsetY, plush: { x, y, size } };
}

/** A scene point (2048×1536 space) on screen. */
export function scenePoint(l: SceneLayout, p: readonly [number, number]): { x: number; y: number } {
  return { x: l.offsetX + p[0] * l.scale, y: l.offsetY + p[1] * l.scale };
}

/** A point on the 1024 plush canvas on screen, and back. */
export function plushToScreen(rect: SceneRect, p: readonly [number, number]): { x: number; y: number } {
  'worklet';
  return { x: rect.x + (p[0] * rect.size) / 1024, y: rect.y + (p[1] * rect.size) / 1024 };
}

export function screenToPlush(rect: SceneRect, x: number, y: number): { x: number; y: number } {
  'worklet';
  return { x: ((x - rect.x) * 1024) / rect.size, y: ((y - rect.y) * 1024) / rect.size };
}

// ---------- Wash ----------

export const MAX_SUDS = 40;

export interface Sud {
  id: number;
  x: number;
  y: number;
  r: number;
  variant: number;
}

/** Adds a bubble unless the cap is reached (the oldest stays: no bubble vanishes while soaping). */
export function addSud(suds: readonly Sud[], sud: Sud): Sud[] {
  return suds.length >= MAX_SUDS ? [...suds] : [...suds, sud];
}

/** The bubbles left after the shower passes over (x, y) with radius r. */
export function popSuds(suds: readonly Sud[], x: number, y: number, r: number): Sud[] {
  return suds.filter((s) => (s.x - x) ** 2 + (s.y - y) ** 2 > (r + s.r) ** 2);
}

/** Towel drying: wiggle time adds up while the towel moves; gaps over 250 ms don't count. */
export const DRY_MS = 3000;

export function addWiggle(totalMs: number, lastMoveMs: number, nowMs: number): number {
  const gap = nowMs - lastMoveMs;
  return gap > 0 && gap <= 250 ? totalMs + gap : totalMs;
}

// ---------- Arrival and go-home motion (UI thread) ----------

/** How small the plushie sits in the arrival basket. */
export const BASKET_SCALE = 0.42;

/**
 * Arrival: `slide` 0→1 brings the basket in from the left; `hop` 0→1 moves the plushie from the
 * basket (small) to its exam spot (full size). Applied around the plushie's feet.
 */
export function arrivalTransform(slide: number, hop: number, foot: { x: number; y: number }, basket: { x: number; y: number }, width: number): Transforms3d {
  'worklet';
  const k = BASKET_SCALE + (1 - BASKET_SCALE) * hop;
  const bx = basket.x - width * (1 - slide);
  const tx = (bx - foot.x) * (1 - hop);
  const ty = (basket.y - foot.y) * (1 - hop);
  return [{ translateX: foot.x + tx }, { translateY: foot.y + ty }, { scale: k }, { translateX: -foot.x }, { translateY: -foot.y }];
}

/** The basket's offset while it slides in. */
export function basketTransform(slide: number, width: number): Transforms3d {
  'worklet';
  return [{ translateX: -width * (1 - slide) }];
}

/** Go home: the owner walks in (0→1) and the hug squeezes both (0→1→0). */
export function hugTransform(hug: number, foot: { x: number; y: number }): Transforms3d {
  'worklet';
  const s = 1 + 0.06 * hug;
  return [{ translateX: foot.x }, { translateY: foot.y }, { scaleX: s }, { scaleY: 2 - s }, { translateX: -foot.x }, { translateY: -foot.y }];
}
