// P1-F acceptance: createVisit is deterministic with age caps; stitch progress is monotonic and
// off-path never moves it back; the coverage grid reaches 85 % correctly; the flow always finishes.
import { AUTO_FINISH, coverage, makeGrid, reachedAutoFinish, stamp, stampStroke } from '../src/clinic/coverage';
import { flowReducer, initialFlow, triageComplete, type FlowState } from '../src/clinic/flow';
import { addSud, addWiggle, doneHeartDue, hintDue, MAX_SUDS, popSuds, sceneLayout, screenToPlush, plushToScreen, type Sud } from '../src/clinic/helpers';
import { advanceStitch, cumulativeLengths, pointAt, projectOnPath, stitchDone } from '../src/clinic/stitchMath';
import { ALL_DAMAGE, createVisit, damagesFor, STEP_ORDER, stepCap, triageSpots } from '../src/clinic/visit';
import { createRng } from '../src/logic/rng';
import { PRESETS, randomSpec } from '../src/plush/spec';

describe('createVisit', () => {
  it('is deterministic for a given seed', () => {
    for (let seed = 1; seed < 50; seed++) {
      expect(createVisit(PRESETS.bear, seed)).toEqual(createVisit(PRESETS.bear, seed));
    }
    const a = JSON.stringify(createVisit(PRESETS.bear, 1));
    const differs = [2, 3, 4, 5, 6].some((s) => JSON.stringify(createVisit(PRESETS.bear, s)) !== a);
    expect(differs).toBe(true);
  });

  it('caps the steps by age: 3 for ages 3–5 (default), 4 for ages 6–7', () => {
    expect(stepCap('3-5')).toBe(3);
    expect(stepCap('6-7')).toBe(4);
    let saw4 = false;
    for (let seed = 1; seed < 300; seed++) {
      const young = createVisit(PRESETS.bunny, seed);
      expect(young.steps.length).toBeGreaterThanOrEqual(1);
      expect(young.steps.length).toBeLessThanOrEqual(3);
      const old = createVisit(PRESETS.bunny, seed, { age: '6-7' });
      expect(old.steps.length).toBeLessThanOrEqual(4);
      if (old.steps.length === 4) saw4 = true;
    }
    expect(saw4).toBe(true);
  });

  it('keeps the fixed care order and only the needed steps', () => {
    for (let seed = 1; seed < 100; seed++) {
      const v = createVisit(randomSpec(createRng(seed)), seed, { age: '6-7' });
      const order = v.steps.map((s) => STEP_ORDER.indexOf(s));
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      for (const s of v.steps) expect(damagesFor(v, s).length).toBeGreaterThan(0);
      for (const d of v.damages) expect(v.steps).toContain({ rip: 'stitch', hole: 'patch', flat: 'stuff', dirt: 'wash', tangle: 'brush', outfit: 'dress' }[d.kind]);
    }
  });

  it('generates every damage kind across seeds, each with its geometry', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 300; seed++) {
      for (const d of createVisit(PRESETS.bear, seed, { age: '6-7' }).damages) {
        seen.add(d.kind);
        if (d.kind === 'rip') expect(d.path!.length).toBeGreaterThan(3);
        if (d.kind === 'dirt' || d.kind === 'tangle' || d.kind === 'hole') expect(d.radius).toBeGreaterThan(0);
      }
    }
    expect([...seen].sort()).toEqual([...ALL_DAMAGE].sort());
  });

  it('can be limited to some damage kinds', () => {
    for (let seed = 1; seed < 50; seed++) {
      const v = createVisit(PRESETS.bear, seed, { kinds: ['rip', 'dirt'] });
      for (const d of v.damages) expect(['rip', 'dirt']).toContain(d.kind);
    }
  });

  it('works for every base (damage spots come from the art)', () => {
    for (const base of ['kitty', 'puppy', 'unicorn', 'dino', 'owl', 'doll'] as const) {
      const v = createVisit(randomSpec(createRng(3), base), 7, { age: '6-7' });
      expect(v.steps.length).toBeGreaterThan(0);
    }
  });

  it('has a voiced story for the visit', () => {
    expect(['story-bear-1', 'story-bear-2']).toContain(createVisit(PRESETS.bear, 1).storyId);
    expect(createVisit(randomSpec(createRng(1), 'owl'), 1).storyId).toBe('story-generic');
  });
});

describe('stitch projection', () => {
  const pts = [0, 0, 100, 0, 200, 0, 300, 0];
  const cum = cumulativeLengths(pts);

  it('measures arc length', () => {
    expect(cum).toEqual([0, 100, 200, 300]);
    expect(pointAt(pts, cum, 150)).toEqual({ x: 150, y: 0 });
  });

  it('projects onto the path window', () => {
    expect(projectOnPath(pts, cum, 120, 10, 0, 300)).toEqual({ s: 120, d: 10 });
    // Outside the window: clamped to its end.
    expect(projectOnPath(pts, cum, 250, 0, 0, 100).s).toBe(100);
  });

  it('progress is monotonic along a wobbly trace and reaches the end', () => {
    let p = 0;
    const seen: number[] = [];
    for (let x = 0; x <= 310; x += 5) {
      p = advanceStitch(pts, cum, x, Math.sin(x / 10) * 20, p, 28, 80);
      seen.push(p);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(stitchDone(p, 300)).toBe(true);
  });

  it('going off the path only pauses: progress never goes backwards', () => {
    let p = advanceStitch(pts, cum, 150, 0, 140, 28, 80);
    expect(p).toBe(150);
    p = advanceStitch(pts, cum, 160, 120, p, 28, 80); // far off the path
    expect(p).toBe(150);
    p = advanceStitch(pts, cum, 20, 0, p, 28, 80); // back near the start
    expect(p).toBe(150);
    p = advanceStitch(pts, cum, 200, 0, p, 28, 80); // back on, ahead
    expect(p).toBe(200);
  });

  it('cannot jump far ahead past the lookahead window', () => {
    expect(advanceStitch(pts, cum, 290, 0, 0, 28, 80)).toBe(0);
  });
});

describe('coverage grid', () => {
  it('reaches the 85 % threshold only when 85 % of the area is covered', () => {
    const grid = makeGrid([{ x: 512, y: 512, r: 150 }]);
    expect(grid.eligibleCount).toBeGreaterThan(50);
    expect(coverage(grid)).toBe(0);
    // Cover cells one by one, checking the threshold flips exactly at 85 %.
    let flipped = false;
    for (let i = 0; i < grid.eligible.length; i++) {
      if (!grid.eligible[i]) continue;
      grid.covered[i] = 1;
      grid.coveredCount++;
      const c = coverage(grid);
      expect(reachedAutoFinish(grid)).toBe(c >= AUTO_FINISH);
      if (!flipped && reachedAutoFinish(grid)) {
        flipped = true;
        expect(c).toBeGreaterThanOrEqual(0.85);
        expect((grid.coveredCount - 1) / grid.eligibleCount).toBeLessThan(0.85);
      }
    }
    expect(flipped).toBe(true);
  });

  it('stamping outside the area covers nothing; rubbing over it covers it', () => {
    const grid = makeGrid([{ x: 300, y: 300, r: 100 }]);
    expect(stamp(grid, 900, 900, 60)).toBe(0);
    const stroke: number[] = [];
    for (let y = 190; y <= 410; y += 40) for (let x = 190; x <= 410; x += 40) stroke.push(x, y);
    stampStroke(grid, stroke, 60);
    expect(reachedAutoFinish(grid)).toBe(true);
  });

  it('a stroke fills the gaps between far-apart points', () => {
    const grid = makeGrid([{ x: 512, y: 512, r: 400 }]);
    const a = stampStroke(makeGrid([{ x: 512, y: 512, r: 400 }]), [200, 512, 800, 512], 40);
    const b = stamp(grid, 200, 512, 40) + stamp(grid, 800, 512, 40);
    expect(a).toBeGreaterThan(b);
  });

  it('an empty area counts as done', () => {
    expect(coverage(makeGrid([]))).toBe(1);
  });
});

describe('wash and stall helpers', () => {
  it('caps the suds at 40 and the shower pops the ones it passes', () => {
    let suds: Sud[] = [];
    for (let i = 0; i < 60; i++) suds = addSud(suds, { id: i, x: i * 10, y: 0, r: 10, variant: 0 });
    expect(suds).toHaveLength(MAX_SUDS);
    expect(popSuds(suds, 0, 0, 50).length).toBeLessThan(MAX_SUDS);
    expect(popSuds(suds, 5000, 5000, 50)).toHaveLength(MAX_SUDS);
  });

  it('adds up towel wiggle time, ignoring pauses', () => {
    expect(addWiggle(0, 1000, 1100)).toBe(100);
    expect(addWiggle(100, 1100, 2000)).toBe(100);
  });

  it('hint after 8 s of no progress, done heart after 20 s', () => {
    expect(hintDue(0, 7999)).toBe(false);
    expect(hintDue(0, 8000)).toBe(true);
    expect(doneHeartDue(0, 19999)).toBe(false);
    expect(doneHeartDue(0, 20000)).toBe(true);
  });
});

describe('scene layout', () => {
  const rect = { x: 354, y: 0, size: 1340 };
  it('fills an iPad with the scene and keeps the plush rect', () => {
    const l = sceneLayout(1024, 768, rect);
    expect(l.scale).toBeCloseTo(0.5);
    expect(l.plush.size).toBeCloseTo(670);
  });

  it('keeps the plush fully on a wide iPhone screen', () => {
    const l = sceneLayout(844, 390, rect);
    expect(l.plush.y).toBeGreaterThanOrEqual(-1);
    expect(l.plush.size).toBeLessThanOrEqual(390);
  });

  it('converts between screen and plush space', () => {
    const r = { x: 100, y: 50, size: 512 };
    const p = plushToScreen(r, [512, 512]);
    expect(p).toEqual({ x: 356, y: 306 });
    expect(screenToPlush(r, p.x, p.y)).toEqual({ x: 512, y: 512 });
  });
});

describe('clinic flow', () => {
  it('always runs arrival → triage → each step → go home → recovery → finished', () => {
    for (let seed = 1; seed < 30; seed++) {
      const v = createVisit(PRESETS.bunny, seed);
      let s: FlowState = initialFlow;
      s = flowReducer(v, s, { type: 'arrived' });
      expect(s.phase).toBe('triage');
      for (const d of triageSpots(v)) s = flowReducer(v, s, { type: 'spotTapped', id: d.id });
      expect(triageComplete(v, s)).toBe(true);
      s = flowReducer(v, s, { type: 'triageDone' });
      for (let i = 0; i < v.steps.length; i++) {
        expect(s.phase).toBe('care');
        expect(s.step).toBe(i);
        s = flowReducer(v, s, { type: 'stepDone' });
      }
      expect(s.phase).toBe('gohome');
      s = flowReducer(v, s, { type: 'homeDone' });
      expect(s.phase).toBe('recovery');
      s = flowReducer(v, s, { type: 'recoveryDone' });
      expect(s.phase).toBe('finished');
    }
  });

  it('ignores unknown or repeated spot taps', () => {
    const v = createVisit(PRESETS.bear, 1);
    let s = flowReducer(v, initialFlow, { type: 'arrived' });
    s = flowReducer(v, s, { type: 'spotTapped', id: 'nope' });
    expect(s.found).toEqual([]);
    const id = triageSpots(v)[0].id;
    s = flowReducer(v, s, { type: 'spotTapped', id });
    expect(flowReducer(v, s, { type: 'spotTapped', id })).toBe(s);
  });
});
