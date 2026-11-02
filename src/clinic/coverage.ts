// The shared coverage grid (Wash and Brush): the 1024 canvas as a 32×32 grid. The cells inside the
// damaged areas are "eligible"; rubbing marks cells covered. At 85 % the rest clears by itself.
// Measured on the JS thread (about 10 times a second), so these are plain functions.

export const GRID = 32;
export const CELL = 1024 / GRID;
export const AUTO_FINISH = 0.85;

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface CoverageGrid {
  /** 1 = eligible (part of a damaged area). */
  eligible: Uint8Array;
  covered: Uint8Array;
  eligibleCount: number;
  coveredCount: number;
}

/** A grid whose eligible cells are those with their centre inside any of the areas. */
export function makeGrid(areas: readonly Circle[]): CoverageGrid {
  const eligible = new Uint8Array(GRID * GRID);
  let n = 0;
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const cx = (gx + 0.5) * CELL;
      const cy = (gy + 0.5) * CELL;
      if (areas.some((a) => (cx - a.x) ** 2 + (cy - a.y) ** 2 <= a.r * a.r)) {
        eligible[gy * GRID + gx] = 1;
        n++;
      }
    }
  }
  return { eligible, covered: new Uint8Array(GRID * GRID), eligibleCount: n, coveredCount: 0 };
}

/** Marks the eligible cells within `r` of (x, y) as covered. Returns how many were newly covered. */
export function stamp(grid: CoverageGrid, x: number, y: number, r: number): number {
  let added = 0;
  const g0x = Math.max(0, Math.floor((x - r) / CELL));
  const g1x = Math.min(GRID - 1, Math.floor((x + r) / CELL));
  const g0y = Math.max(0, Math.floor((y - r) / CELL));
  const g1y = Math.min(GRID - 1, Math.floor((y + r) / CELL));
  for (let gy = g0y; gy <= g1y; gy++) {
    for (let gx = g0x; gx <= g1x; gx++) {
      const i = gy * GRID + gx;
      if (!grid.eligible[i] || grid.covered[i]) continue;
      const cx = (gx + 0.5) * CELL;
      const cy = (gy + 0.5) * CELL;
      if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) {
        grid.covered[i] = 1;
        grid.coveredCount++;
        added++;
      }
    }
  }
  return added;
}

/** Stamps every point of a stroke (flat [x, y, …]), filling the gaps between points. */
export function stampStroke(grid: CoverageGrid, pts: readonly number[], r: number): number {
  let added = 0;
  for (let i = 0; i + 1 < pts.length; i += 2) {
    added += stamp(grid, pts[i], pts[i + 1], r);
    if (i >= 2) {
      const dx = pts[i] - pts[i - 2];
      const dy = pts[i + 1] - pts[i - 1];
      const steps = Math.floor(Math.sqrt(dx * dx + dy * dy) / (r * 0.5));
      for (let k = 1; k < steps; k++) added += stamp(grid, pts[i - 2] + (dx * k) / steps, pts[i - 1] + (dy * k) / steps, r);
    }
  }
  return added;
}

/** 0..1 of the eligible cells covered (1 when nothing is eligible). */
export function coverage(grid: CoverageGrid): number {
  return grid.eligibleCount === 0 ? 1 : grid.coveredCount / grid.eligibleCount;
}

export function reachedAutoFinish(grid: CoverageGrid): boolean {
  return coverage(grid) >= AUTO_FINISH;
}
