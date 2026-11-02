// Stitch tracing maths. These run in the stitch gesture on the UI thread, so each one is a
// 'worklet'. Progress is the furthest arc length reached while the finger stays within the
// tolerance of the path ahead; going off the path only pauses (progress never goes back).

/** Cumulative arc lengths of a polyline given as flat [x0, y0, x1, y1, …]. */
export function cumulativeLengths(pts: readonly number[]): number[] {
  'worklet';
  const out = [0];
  for (let i = 2; i < pts.length; i += 2) {
    const dx = pts[i] - pts[i - 2];
    const dy = pts[i + 1] - pts[i - 1];
    out.push(out[out.length - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return out;
}

/**
 * The nearest point to (x, y) on the part of the path between arc lengths `from` and `to`:
 * its arc length `s` and distance `d`.
 */
export function projectOnPath(pts: readonly number[], cum: readonly number[], x: number, y: number, from: number, to: number): { s: number; d: number } {
  'worklet';
  let bestS = from;
  let bestD = Infinity;
  for (let i = 0; i + 1 < cum.length; i++) {
    const s0 = cum[i];
    const s1 = cum[i + 1];
    if (s1 < from || s0 > to) continue;
    const ax = pts[i * 2];
    const ay = pts[i * 2 + 1];
    const bx = pts[i * 2 + 2];
    const by = pts[i * 2 + 3];
    const len = s1 - s0;
    if (len <= 0) continue;
    let t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len);
    // Stay inside the window [from, to].
    const tMin = Math.max(0, (from - s0) / len);
    const tMax = Math.min(1, (to - s0) / len);
    t = Math.max(tMin, Math.min(tMax, t));
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    const d = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
    if (d < bestD) {
      bestD = d;
      bestS = s0 + len * t;
    }
  }
  return { s: bestS, d: bestD };
}

/**
 * New progress after the finger moves to (x, y): the path ahead (from progress to
 * progress + lookahead) is searched; within `tolerance` the progress moves to the nearest point
 * if that is further along. Off the path, or behind, it stays where it is.
 */
export function advanceStitch(pts: readonly number[], cum: readonly number[], x: number, y: number, progress: number, tolerance: number, lookahead: number): number {
  'worklet';
  const total = cum[cum.length - 1];
  const hit = projectOnPath(pts, cum, x, y, Math.max(0, progress - 2), Math.min(total, progress + lookahead));
  if (hit.d <= tolerance && hit.s > progress) return Math.min(total, hit.s);
  return progress;
}

/** The point at arc length s (for the needle and the X-stitches). */
export function pointAt(pts: readonly number[], cum: readonly number[], s: number): { x: number; y: number } {
  'worklet';
  const total = cum[cum.length - 1];
  const target = Math.max(0, Math.min(total, s));
  for (let i = 0; i + 1 < cum.length; i++) {
    if (target <= cum[i + 1] || i + 2 === cum.length) {
      const len = cum[i + 1] - cum[i];
      const t = len > 0 ? (target - cum[i]) / len : 0;
      return { x: pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * t, y: pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * t };
    }
  }
  return { x: pts[0], y: pts[1] };
}

/** Done once the needle reaches this fraction of the path. */
export const STITCH_DONE_FRACTION = 0.95;

export function stitchDone(progress: number, total: number): boolean {
  'worklet';
  return total > 0 && progress >= total * STITCH_DONE_FRACTION;
}
