// P1-F/G: the clinic end to end with simulated gestures: arrival → triage (tap every glowing
// spot) → each care step → go home → back to the title. Also: every step can be finished with the
// done heart, and src/clinic has no fail/"wrong"/error sound or event.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';

import ClinicScreen, { CLINIC_KINDS, CLINIC_PLUSH_RECT } from '../src/clinic/ClinicScreen';
import { plushToScreen, sceneLayout } from '../src/clinic/helpers';
import { createVisit, triageSpots, type Visit } from '../src/clinic/visit';
import { PRESETS } from '../src/plush/spec';
import { pointAt, cumulativeLengths } from '../src/clinic/stitchMath';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

// The test renderer's window is 750×1334; the clinic lays out for it like any screen.
const W = 750;
const H = 1334;
const layout = sceneLayout(W, H, CLINIC_PLUSH_RECT);

/** Everything said so far (lines are ended by speechDone, as the device would). */
let spoken: string[] = [];
function speechDone() {
  const calls = (Speech.speak as jest.Mock).mock.calls;
  for (const c of calls.splice(0)) {
    spoken.push(c[0]);
    c[1]?.onDone?.();
  }
}
const said = () => [...spoken, ...(Speech.speak as jest.Mock).mock.calls.map((c) => c[0])];

async function tick(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function talk(rounds = 4) {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      speechDone();
    });
    await tick(800);
  }
}

function seedWith(pred: (v: Visit) => boolean): number {
  for (let s = 1; s < 500; s++) if (pred(createVisit(PRESETS.bear, s, { kinds: CLINIC_KINDS }))) return s;
  throw new Error('no seed');
}

beforeEach(() => {
  spoken = [];
  jest.useFakeTimers();
  (Speech.speak as jest.Mock).mockClear();
});
afterEach(() => jest.useRealTimers());

describe('clinic flow', () => {
  it('arrival → triage → stitch → wash → go home → title, with gestures', async () => {
    const seed = seedWith((v) => v.steps.join() === 'stitch,wash');
    const visit = createVisit(PRESETS.bear, seed, { kinds: CLINIC_KINDS });
    const onExit = jest.fn();
    await render(<ClinicScreen spec={PRESETS.bear} seed={seed} onExit={onExit} />);
    expect(screen.getByTestId('phase-arrival')).toBeTruthy();
    // The story is spoken; when it ends the plushie hops onto the cushion.
    await tick(1000);
    expect(said()).toContain(
      { 'story-bear-1': 'Teddy fell out of the tree house!', 'story-bear-2': 'Teddy had a muddy picnic!' }[visit.storyId as 'story-bear-1'],
    );
    await talk(2);
    expect(screen.getByTestId('phase-triage')).toBeTruthy();

    // Triage: tap each glowing spot; each says "Ouch… thank you!".
    for (const d of triageSpots(visit)) {
      const p = plushToScreen(layout.plush, d.xy);
      fireGestureHandler(getByGestureTestId('triage-tap'), [{ state: State.BEGAN, x: p.x, y: p.y }, { state: State.ACTIVE, x: p.x, y: p.y }, { state: State.END, x: p.x, y: p.y }]);
      await tick(10);
    }
    await talk(3);
    expect(said().filter((c) => c === 'Ouch… thank you!').length).toBe(triageSpots(visit).length);
    expect(screen.getByTestId('step-stitch')).toBeTruthy();
    expect(screen.getByTestId('step-icons')).toBeTruthy();

    // Stitch: trace each rip from start to end (with a wobble).
    for (const rip of visit.damages.filter((d) => d.kind === 'rip')) {
      const pts = rip.path!.flatMap((q) => [q[0], q[1]]);
      const cum = cumulativeLengths(pts);
      const total = cum[cum.length - 1];
      const events = [];
      for (let s = 0; s <= total + 1; s += 10) {
        const q = pointAt(pts, cum, s);
        const sp = plushToScreen(layout.plush, [q.x, q.y + Math.sin(s) * 6]);
        events.push({ x: sp.x, y: sp.y });
      }
      events.push(plushToScreen(layout.plush, rip.path![rip.path!.length - 1]));
      fireGestureHandler(getByGestureTestId('stitch-pan'), [{ state: State.BEGAN, ...events[0] }, ...events.map((e) => ({ state: State.ACTIVE, ...e })), { state: State.END, ...events[events.length - 1] }]);
      await tick(1000);
    }
    expect(screen.getByTestId('step-wash')).toBeTruthy();

    // Wash: scrub back and forth over every dirt spot until 85 % is clean.
    const scrub = () => {
      const ev: { x: number; y: number }[] = [];
      for (const d of visit.damages.filter((x) => x.kind === 'dirt')) {
        const r = d.radius!;
        for (let y = -r; y <= r; y += 30) for (let x = -r; x <= r; x += 30) ev.push(plushToScreen(layout.plush, [d.xy[0] + (y % 60 === 0 ? x : -x), d.xy[1] + y]));
      }
      fireGestureHandler(getByGestureTestId('wash-pan'), [{ state: State.BEGAN, ...ev[0] }, ...ev.map((e) => ({ state: State.ACTIVE, ...e })), { state: State.END, ...ev[ev.length - 1] }]);
    };
    expect(screen.getByTestId('wash-soap')).toBeTruthy();
    scrub();
    await tick(1600);
    expect(screen.getByTestId('wash-rinse')).toBeTruthy();
    // Rinse: sweep the shower over the plushie until every bubble pops.
    for (let pass = 0; pass < 3; pass++) {
      const ev: { x: number; y: number }[] = [];
      for (let y = 0; y <= 1024; y += 40) for (let x = 0; x <= 1024; x += 60) ev.push(plushToScreen(layout.plush, [y % 80 === 0 ? x : 1024 - x, y - 90]));
      fireGestureHandler(getByGestureTestId('wash-pan'), [{ state: State.BEGAN, ...ev[0] }, ...ev.map((e) => ({ state: State.ACTIVE, ...e })), { state: State.END, ...ev[ev.length - 1] }]);
      await tick(400);
    }
    expect(screen.getByTestId('wash-dry')).toBeTruthy();
    // Dry: wiggle the towel for 3 s.
    const c = plushToScreen(layout.plush, [512, 600]);
    for (let i = 0; i < 45 && screen.queryByTestId('wash-dry'); i++) {
      const a = { x: c.x + (i % 2 ? 40 : -40), y: c.y };
      const b = { x: c.x + (i % 2 ? -40 : 40), y: c.y };
      fireGestureHandler(getByGestureTestId('wash-pan'), [{ state: State.BEGAN, ...a }, { state: State.ACTIVE, ...a }, { state: State.ACTIVE, ...b }, { state: State.END, ...b }]);
      await tick(100);
    }
    await tick(1000);

    // Go home: the hug and the two lines, then back to the title.
    expect(screen.getByTestId('phase-gohome')).toBeTruthy();
    await talk(8);
    expect(said()).toContain('Every toy is loved!');
    expect(said()).toContain('Thank you!');
    expect(said().filter((x) => x === 'All better!')).toHaveLength(1);
    // The recovery room, with the tiny charm on the wall, then back to the title after 3 s.
    if (!onExit.mock.calls.length) {
      expect(screen.getByTestId('recovery-room')).toBeTruthy();
      expect(screen.getByTestId('wall-charm', { includeHiddenElements: true })).toBeTruthy();
      await tick(3100);
    }
    expect(onExit).toHaveBeenCalled();
  }, 30000);

  it('every phase can be finished with the done heart when a child waits', async () => {
    const seed = seedWith((v) => v.steps.length >= 2);
    const onExit = jest.fn();
    await render(<ClinicScreen spec={PRESETS.bunny} seed={seed} onExit={onExit} />);
    // Arrival finishes by itself even if the story never reports back.
    await tick(10000);
    expect(screen.getByTestId('phase-triage')).toBeTruthy();
    for (let i = 0; i < 6 && !onExit.mock.calls.length; i++) {
      await tick(21000);
      const heart = screen.queryByTestId('done-heart');
      if (heart) await fireEvent.press(heart);
      await tick(13000);
    }
    expect(onExit).toHaveBeenCalled();
  }, 30000);

  it('the hand hint appears after 8 s with no progress', async () => {
    const seed = seedWith((v) => v.steps[0] === 'stitch');
    await render(<ClinicScreen spec={PRESETS.bear} seed={seed} onExit={() => {}} />);
    await tick(10000);
    // Triage shows the hint from the start; skip to the first step with the heart.
    await tick(21000);
    await fireEvent.press(screen.getByTestId('done-heart'));
    await tick(500);
    expect(screen.getByTestId('step-stitch')).toBeTruthy();
    expect(screen.queryByTestId('hand-hint')).toBeNull();
    await tick(8600);
    expect(screen.getByTestId('hand-hint')).toBeTruthy();
  }, 30000);
});

describe('no fail states in the clinic (static scan)', () => {
  const SRC = path.join(__dirname, '..', 'src', 'clinic');
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

  it('no "wrong", "fail" or "error" sound, line or event exists in src/clinic', () => {
    const hits: string[] = [];
    for (const f of walk(SRC)) {
      const text = fs.readFileSync(f, 'utf8');
      text.split('\n').forEach((line, i) => {
        // Comments may explain the rule ("never a buzz"); code may not use the words.
        const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
        if (/\b(wrong|fail\w*|error\w*|buzz\w*|lose|lost|score|lives|timer)\b/i.test(code) && !/clearTimeout|setTimeout|clearInterval|setInterval/.test(code)) hits.push(`${path.relative(SRC, f)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('no voice line is negative', () => {
    const { LINES } = require('../src/audio/lines');
    for (const text of Object.values(LINES) as string[]) expect(text).not.toMatch(/\b(wrong|no!|oops|try again|fail)\b/i);
  });
});
