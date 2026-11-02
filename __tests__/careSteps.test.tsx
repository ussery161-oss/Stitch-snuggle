// P1-G: snap logic for Patch and Dress, Re-stuff helpers, the age setting, and Patch / Re-stuff /
// Brush / Dress each finished with simulated gestures.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import App from '../App';
import { CLINIC_PLUSH_RECT, droopTransform, FLAT_SCALE_Y, plushToScreen, puffsNeeded, scenePoint, sceneLayout } from '../src/clinic/helpers';
import { compatibleSlots, dropAccessory, DRESS_SNAP_PT, PATCH_SNAP_PT, patchDots, ptToUnits, snapAccessory, snapPatch, wornAt, type Repair } from '../src/clinic/snap';
import BrushStep from '../src/clinic/steps/BrushStep';
import DressStep, { DRESS_ITEMS } from '../src/clinic/steps/DressStep';
import PatchStep from '../src/clinic/steps/PatchStep';
import RestuffStep, { closingPath, puffLands } from '../src/clinic/steps/RestuffStep';
import type { StepProps } from '../src/clinic/steps/types';
import { cumulativeLengths, pointAt } from '../src/clinic/stitchMath';
import { createVisit, type Visit } from '../src/clinic/visit';
import { bodySet } from '../src/plush/registry';
import { ACCESSORY_INFO, PRESETS } from '../src/plush/spec';
import type { AccessoryId } from '../src/plush/types';
import { parseSettings, SETTINGS_KEY } from '../src/storage/settings';
import { passGate } from './appShell.test';

const W = 750;
const H = 1334;
const layout = sceneLayout(W, H, CLINIC_PLUSH_RECT);
const set = bodySet('bear', 'round');

async function tick(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

function pan(id: string, pts: { x: number; y: number }[]) {
  fireGestureHandler(getByGestureTestId(id), [{ state: State.BEGAN, ...pts[0] }, ...pts.map((p) => ({ state: State.ACTIVE, ...p })), { state: State.END, ...pts[pts.length - 1] }]);
}

function tap(id: string, p: { x: number; y: number }) {
  fireGestureHandler(getByGestureTestId(id), [{ state: State.BEGAN, ...p }, { state: State.ACTIVE, ...p }, { state: State.END, ...p }]);
}

/** A straight drag from a to b in 12 steps. */
function line(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Array.from({ length: 13 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 12, y: a.y + ((b.y - a.y) * i) / 12 }));
}

function visitWith(step: string): Visit {
  for (let s = 1; s < 800; s++) {
    const v = createVisit(PRESETS.bear, s, { age: '6-7' });
    if (v.steps.includes(step as never)) return v;
  }
  throw new Error(`no visit with ${step}`);
}

function props(visit: Visit, extra: Partial<StepProps> = {}): StepProps & { onDone: jest.Mock; onRepair: jest.Mock; onOutfit: jest.Mock } {
  return { visit, layout, onDone: jest.fn(), spec: visit.plush, repairs: [], onRepair: jest.fn(), onOutfit: jest.fn(), ...extra } as never;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('snap logic', () => {
  const size = 600; // plush shown at 600 pt
  it('a patch snaps onto the hole within 60 pt, not beyond', () => {
    const hole: [number, number] = [500, 600];
    const u = ptToUnits(PATCH_SNAP_PT, size);
    expect(snapPatch([hole[0] + u - 1, hole[1]], hole, size)).toEqual(hole);
    expect(snapPatch([hole[0] + u + 2, hole[1]], hole, size)).toBeNull();
    expect(snapPatch([hole[0] + 20, hole[1] + 20], hole, size)).toEqual(hole);
  });

  it('an accessory snaps to its compatible anchor within 80 pt', () => {
    const at = set.accessorySlots.hat_top;
    const u = ptToUnits(DRESS_SNAP_PT, size);
    expect(compatibleSlots('hat_party')).toEqual(['hat_top']);
    expect(snapAccessory([at[0], at[1] + u - 1], 'hat_party', set, size)).toBe('hat_top');
    expect(snapAccessory([at[0], at[1] + u + 2], 'hat_party', set, size)).toBeNull();
    // Glasses dropped on the hat spot don't snap there.
    expect(snapAccessory([at[0], at[1]], 'glasses_round', set, size)).toBeNull();
  });

  it('dropping wears it (replacing the same slot) and tapping takes it off', () => {
    const hat = set.accessorySlots.hat_top;
    let worn: AccessoryId[] = dropAccessory([], 'hat_party', hat, set, size);
    expect(worn).toEqual(['hat_party']);
    worn = dropAccessory(worn, 'hat_crown', hat, set, size);
    expect(worn).toEqual(['hat_crown']);
    expect(dropAccessory(worn, 'bow_tie', [0, 0], set, size)).toEqual(['hat_crown']);
    expect(wornAt(worn, hat, set, size)).toBe('hat_crown');
    expect(wornAt(worn, [0, 1000], set, size)).toBeNull();
  });

  it('puts three stitch dots around a patch', () => {
    const d = patchDots([500, 500], 50);
    expect(d).toHaveLength(3);
    for (const p of d) expect(Math.hypot(p[0] - 500, p[1] - 500)).toBeCloseTo(50, 0);
  });
});

describe('re-stuff helpers', () => {
  it('needs 4–6 puffs and fills from 80 % to full', () => {
    for (let s = 0; s < 20; s++) expect([4, 5, 6]).toContain(puffsNeeded(s));
    const t0 = droopTransform({ x: 0, y: 0 }, 0, 1);
    const t1 = droopTransform({ x: 0, y: 0 }, 1, 1);
    expect(t0[3]).toEqual({ scaleY: FLAT_SCALE_Y });
    expect(t1[3]).toEqual({ scaleY: 1 });
    expect((t0[2] as { rotate: number }).rotate).toBeGreaterThan(0);
    expect((t1[2] as { rotate: number }).rotate).toBe(0);
  });

  it('a puff lands in the part (with a margin)', () => {
    expect(puffLands([100, 100], [80, 80, 50, 50])).toBe(true);
    expect(puffLands([400, 400], [80, 80, 50, 50])).toBe(false);
    expect(closingPath([500, 500], 200)).toHaveLength(5);
  });
});

describe('age setting', () => {
  it('parses stored settings and falls back to ages 3–5', () => {
    expect(parseSettings(null).age).toBe('3-5');
    expect(parseSettings('{"age":"6-7"}').age).toBe('6-7');
    expect(parseSettings('garbage').age).toBe('3-5');
  });

  it('is changed behind the gate and saved on the device', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByTestId('title-parent'));
    await passGate();
    await fireEvent.press(screen.getByTestId('age-6-7'));
    await tick(10);
    expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY))!)).toEqual({ age: '6-7' });
  });
});

describe('care steps with gestures', () => {
  it('Patch: drag a swatch onto the hole, tap 3 dots; the patch stays as a repair', async () => {
    const visit = visitWith('patch');
    const p = props(visit);
    await render(<PatchStep {...p} />);
    const hole = visit.damages.find((d) => d.kind === 'hole')!;
    const holeScreen = plushToScreen(layout.plush, hole.xy);
    const tray = scenePoint(layout, [1860, 800]);
    // A drop far from the hole changes nothing (no error, the swatch floats back).
    pan('patch-drag', line(tray, { x: 10, y: 10 }));
    await tick(10);
    expect(() => getByGestureTestId('patch-sew')).toThrow();
    pan('patch-drag', line(tray, holeScreen));
    await tick(10);
    const dots = patchDots(hole.xy, (hole.radius ?? 62) * 0.72);
    for (const d of dots) {
      tap('patch-sew', plushToScreen(layout.plush, d));
      await tick(10);
    }
    await tick(1000);
    expect(p.onRepair).toHaveBeenCalledWith(expect.objectContaining({ kind: 'patch', at: hole.xy }));
    expect(p.onDone).toHaveBeenCalledTimes(1);
  });

  it('Re-stuff: drop the puffs into the flat part, then the closing stitch', async () => {
    const visit = visitWith('stuff');
    const p = props(visit);
    await render(<RestuffStep {...p} />);
    const flat = visit.damages.find((d) => d.kind === 'flat')!;
    const part = set.parts.find((x) => x.id === flat.part)!;
    const centre = plushToScreen(layout.plush, [part.bounds[0] + part.bounds[2] / 2, part.bounds[1] + part.bounds[3] / 2]);
    const tray = scenePoint(layout, [1860, 800]);
    for (let i = 0; i < puffsNeeded(visit.seed); i++) {
      pan('stuff-drag', line(tray, centre));
      await tick(50);
    }
    await tick(800);
    expect(screen.getByTestId('step-stuff-close')).toBeTruthy();
    const c: [number, number] = [part.bounds[0] + part.bounds[2] / 2, part.bounds[1] + part.bounds[3] / 2];
    const path = closingPath(c, part.bounds[2]);
    const pts = path.flatMap((q) => [q[0], q[1]]);
    const cum = cumulativeLengths(pts);
    const trace = [];
    for (let s = 0; s <= cum[cum.length - 1]; s += 8) {
      const q = pointAt(pts, cum, s);
      trace.push(plushToScreen(layout.plush, [q.x, q.y]));
    }
    trace.push(plushToScreen(layout.plush, path[path.length - 1]));
    pan('stitch-pan', trace);
    await tick(1000);
    expect(p.onRepair).toHaveBeenCalledWith(expect.objectContaining({ kind: 'stitch' }));
    expect(p.onDone).toHaveBeenCalledTimes(1);
  });

  it('Re-stuff: a puff dropped away from the part does nothing', async () => {
    const visit = visitWith('stuff');
    await render(<RestuffStep {...props(visit)} />);
    const tray = scenePoint(layout, [1860, 800]);
    pan('stuff-drag', line(tray, { x: tray.x, y: tray.y - 5 }));
    await tick(50);
    expect(screen.getByTestId('stuff-puffs-0')).toBeTruthy();
  });

  it('Brush: brushing the tangles clears them at 85 %', async () => {
    const visit = visitWith('brush');
    const p = props(visit);
    await render(<BrushStep {...p} />);
    for (const d of visit.damages.filter((x) => x.kind === 'tangle')) {
      const r = d.radius!;
      const ev = [];
      for (let y = -r; y <= r; y += 25) for (let x = -r; x <= r; x += 25) ev.push(plushToScreen(layout.plush, [d.xy[0] + (y % 50 === 0 ? x : -x), d.xy[1] + y]));
      pan('brush-pan', ev);
    }
    await tick(1200);
    expect(p.onDone).toHaveBeenCalledTimes(1);
  });

  it('Dress: drag an item onto its anchor, tap it to take it off; the done heart is always there', async () => {
    const visit = visitWith('dress');
    const p = props(visit);
    await render(<DressStep {...p} />);
    expect(screen.getByTestId('done-heart')).toBeTruthy();
    const tray = scenePoint(layout, [1860, 800]);
    const cell = Math.max(68, layout.plush.size * 0.13);
    const hatIndex = DRESS_ITEMS.indexOf('hat_party');
    const from = { x: tray.x + (hatIndex % 2 === 0 ? -0.55 : 0.55) * cell, y: tray.y + (Math.floor(hatIndex / 2) - 1) * cell * 1.1 };
    const slot = plushToScreen(layout.plush, set.accessorySlots[ACCESSORY_INFO.hat_party.slot]);
    pan('dress-drag', line(from, slot));
    await tick(10);
    expect(screen.getByTestId('dress-worn-hat_party')).toBeTruthy();
    expect(p.onOutfit).toHaveBeenLastCalledWith(['hat_party']);
    tap('dress-drag', slot);
    await tick(10);
    expect(screen.getByTestId('dress-worn-none')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('done-heart'));
    expect(p.onDone).toHaveBeenCalledTimes(1);
  });

  it('repairs from earlier steps are drawn on the plushie in later steps', async () => {
    const visit = visitWith('dress');
    const repairs: Repair[] = [{ kind: 'patch', at: [500, 700], radius: 60, swatch: 'fabrics/patch_swatch_pink_dots' }];
    const r = await render(<DressStep {...props(visit, { repairs })} />);
    // In Jest images don't decode, so the patch is its code placeholder, drawn at the repair spot.
    expect(JSON.stringify(r.toJSON())).toContain('"cx":500,"cy":700');
  });
});
