// Snap rules for Patch and Dress, and the repairs that stay on the plushie for the rest of the
// visit. Pure TypeScript.
import { ACCESSORY_INFO, wearAccessory } from '../plush/spec';
import type { AccessoryId, AccessorySlot, BodySet, Vec } from '../plush/types';

/** A patch snaps onto the hole when dropped within this many points of it. */
export const PATCH_SNAP_PT = 60;
/** An accessory snaps to its anchor when dropped within this many points of it. */
export const DRESS_SNAP_PT = 80;

/** Points on screen → units on the 1024 plush canvas shown at `plushSize` pt. */
export function ptToUnits(pt: number, plushSize: number): number {
  return (pt * 1024) / plushSize;
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Where a dropped patch lands: on the hole if close enough, else null (it floats back to the tray). */
export function snapPatch(drop: Vec, hole: Vec, plushSize: number): Vec | null {
  return dist(drop, hole) <= ptToUnits(PATCH_SNAP_PT, plushSize) ? hole : null;
}

/** The slots an accessory may go on. */
export function compatibleSlots(item: AccessoryId): AccessorySlot[] {
  return [ACCESSORY_INFO[item].slot];
}

/** The nearest compatible slot within DRESS_SNAP_PT of the drop, or null. */
export function snapAccessory(drop: Vec, item: AccessoryId, set: BodySet, plushSize: number): AccessorySlot | null {
  const limit = ptToUnits(DRESS_SNAP_PT, plushSize);
  let best: AccessorySlot | null = null;
  let bestD = limit;
  for (const slot of compatibleSlots(item)) {
    const at = set.accessorySlots[slot];
    if (!at) continue;
    const d = dist(drop, at);
    if (d <= bestD) {
      best = slot;
      bestD = d;
    }
  }
  return best;
}

/** Drops an accessory: worn if it snapped (replacing the one in its slot), else unchanged. */
export function dropAccessory(worn: readonly AccessoryId[], item: AccessoryId, drop: Vec, set: BodySet, plushSize: number): AccessoryId[] {
  return snapAccessory(drop, item, set, plushSize) ? wearAccessory(worn, item) : [...worn];
}

/** The worn accessory tapped at `at` (within DRESS_SNAP_PT of its slot), or null. */
export function wornAt(worn: readonly AccessoryId[], at: Vec, set: BodySet, plushSize: number): AccessoryId | null {
  const limit = ptToUnits(DRESS_SNAP_PT, plushSize);
  let best: AccessoryId | null = null;
  let bestD = limit;
  for (const a of worn) {
    const p = set.accessorySlots[ACCESSORY_INFO[a].slot];
    if (!p) continue;
    const d = dist(at, p);
    if (d <= bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

/** The three stitch dots around a patch (1024 units). */
export function patchDots(center: Vec, radius: number): Vec[] {
  return [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    return [Math.round(center[0] + Math.cos(a) * radius), Math.round(center[1] + Math.sin(a) * radius)] as Vec;
  });
}

// ---------- Repairs that stay on for the rest of the visit ----------

export type Repair = { kind: 'patch'; at: Vec; radius: number; swatch: string } | { kind: 'stitch'; path: readonly Vec[] };

export function addRepair(list: readonly Repair[], r: Repair): Repair[] {
  return [...list, r];
}
