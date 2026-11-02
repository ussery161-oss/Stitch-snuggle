// P1-E acceptance: the registry has all 27 sets with the right layer order and regions, the
// placeholder fallback draws when art() is null, random specs are valid, and the idle helpers are
// worklets with the right maths.
import { render } from '@testing-library/react-native';
import { Canvas } from '@shopify/react-native-skia';

import { setArtManifestForTests } from '../src/art';
import { EMPTY_ASSETS, layerIds, patternsUsed } from '../src/plush/assets';
import { blinkTransform, breathScale, nextBlinkDelay, plushTransform } from '../src/plush/idle';
import { qualityFor } from '../src/plush/imageCache';
import { placeholderShapes } from '../src/plush/placeholder';
import PlushDrawing from '../src/plush/PlushDrawing';
import { allSets, baseDef, BASES, bodySet, clearBodySetCache, regionOf } from '../src/plush/registry';
import { ACCESSORIES, isValidSpec, PRESETS, randomSpec, specProblems, wearAccessory } from '../src/plush/spec';
import { createRng } from '../src/logic/rng';
import type { BodyType } from '../src/plush/types';
import { fpsStep } from '../src/ui/FpsMeter';

const BODIES: BodyType[] = ['round', 'tall', 'tiny'];

describe('base registry (r03 art)', () => {
  it('registers all 27 base/body sets from the art', () => {
    const sets = allSets();
    expect(sets).toHaveLength(27);
    expect(sets.every((s) => !s.placeholder)).toBe(true);
    expect(new Set(sets.map((s) => s.key)).size).toBe(27);
  });

  it.each(['bear', 'bunny'] as const)('every %s body type has every region of its base', (base) => {
    for (const body of BODIES) {
      const set = bodySet(base, body);
      const regions = new Set(set.parts.map((p) => p.region));
      expect([...regions].sort()).toEqual([...baseDef(base).regions].sort());
      for (const p of set.parts) expect(p.layers.mask).toBe(`plush/${base}/${body}/${p.id}_mask`);
    }
  });

  it('draws parts in the art z_order: ears under the head, legs under the body', () => {
    for (const set of allSets()) {
      const z = (id: string) => set.parts.findIndex((p) => p.id === id);
      if (z('earL') >= 0 && set.base !== 'puppy') expect(z('earL')).toBeLessThan(z('head'));
      expect(z('legL')).toBeLessThan(z('body'));
    }
  });

  it('every set has its anchors, accessory slots, damage spots and fit scale', () => {
    for (const set of allSets()) {
      for (const a of ['head', 'neck', 'chest', 'eyeL', 'eyeR', 'mouth', 'handL', 'handR', 'footL', 'footR'] as const) expect(set.anchors[a]).toHaveLength(2);
      for (const s of ['hat_top', 'bow_ear', 'glasses', 'neckwear', 'cape', 'waist', 'chest'] as const) expect(set.accessorySlots[s]).toHaveLength(2);
      expect(set.damageSpots.length).toBeGreaterThanOrEqual(5);
      for (const d of set.damageSpots) expect(set.parts.some((p) => p.id === d.part)).toBe(true);
      expect(set.fitScale).toBeGreaterThan(0.9);
      expect(set.fitScale).toBeLessThan(1.5);
    }
  });

  it('every part of every set has bounds on the canvas', () => {
    for (const set of allSets()) {
      for (const p of set.parts) {
        expect(p.bounds[2]).toBeGreaterThan(0);
        expect(p.bounds[0] + p.bounds[2]).toBeLessThanOrEqual(1024);
      }
    }
  });

  it('maps doll parts to skin, hair and outfit', () => {
    expect(regionOf('doll', 'face')).toBe('skin');
    expect(regionOf('doll', 'hair_front')).toBe('hair');
    expect(regionOf('doll', 'legL')).toBe('body');
    expect(regionOf('unicorn', 'mane')).toBe('hair');
    expect(regionOf('unicorn', 'horn')).toBe('accent');
    expect(regionOf('owl', 'faceDisc')).toBe('belly');
  });
});

describe('placeholder fallback', () => {
  afterEach(() => {
    setArtManifestForTests(null);
    clearBodySetCache();
  });

  it('builds Bear and Bunny from code paths in every body type when art() is null', () => {
    setArtManifestForTests({ images: {}, data: {} });
    clearBodySetCache();
    for (const base of ['bear', 'bunny'] as const) {
      for (const body of BODIES) {
        const set = bodySet(base, body);
        expect(set.placeholder).toBe(true);
        expect(layerIds(set)).toEqual([]);
        for (const p of set.parts) expect(p.placeholder).toMatch(/^M[\d.]+ [\d.]+ A/);
        const regions = new Set(set.parts.map((p) => p.region));
        expect([...regions].sort()).toEqual([...baseDef(base).regions].sort());
      }
    }
  });

  it('bunny ears are long and bear ears are round', () => {
    const ear = (base: 'bear' | 'bunny') => placeholderShapes(base, 'round').find((s) => s.part === 'earL')!.d;
    const radii = (d: string) => /A([\d.]+) ([\d.]+)/.exec(d)!.slice(1).map(Number);
    const [bx, by] = radii(ear('bear'));
    const [nx, ny] = radii(ear('bunny'));
    expect(by / bx).toBeCloseTo(1);
    expect(ny / nx).toBeGreaterThan(2.5);
  });

  it('PlushDrawing draws filled and outlined placeholder paths when no art is loaded', async () => {
    setArtManifestForTests({ images: {}, data: {} });
    clearBodySetCache();
    const set = bodySet('bear', 'round');
    const r = await render(
      <Canvas>
        <PlushDrawing set={set} spec={PRESETS.bear} assets={EMPTY_ASSETS} />
      </Canvas>,
    );
    type Node = { type: string; props: Record<string, unknown>; children: Node[] | null };
    const paths: Node[] = [];
    const walk = (n: Node | Node[] | null) => {
      if (n === null || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (n.type === 'SkiaPath') paths.push(n);
      (n.children ?? []).forEach((c) => walk(c));
    };
    walk(r.toJSON() as unknown as Node);
    // Each part: a fill and an outline, plus the placeholder eyes.
    expect(paths.length).toBeGreaterThanOrEqual(set.parts.length * 2);
    const fills = paths.filter((p) => p.props.color === '#E2B26A');
    expect(fills.length).toBeGreaterThan(0);
  });
});

describe('PlushSpec', () => {
  it('every spec from a random seed is valid', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const spec = randomSpec(createRng(seed));
      expect(specProblems(spec)).toEqual([]);
    }
  });

  it('random specs cover every base, and keep the requested base/body', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) seen.add(randomSpec(createRng(seed)).base);
    expect(seen.size).toBe(BASES.length);
    const s = randomSpec(createRng(9), 'bunny', 'tiny');
    expect([s.base, s.body]).toEqual(['bunny', 'tiny']);
  });

  it('the presets are valid and a doll always has a style', () => {
    expect(isValidSpec(PRESETS.bear)).toBe(true);
    expect(isValidSpec(PRESETS.bunny)).toBe(true);
    expect(isValidSpec({ ...PRESETS.bear, base: 'doll' })).toBe(false);
  });

  it('one accessory per slot', () => {
    expect(wearAccessory(['hat_party'], 'hat_crown')).toEqual(['hat_crown']);
    expect(wearAccessory(['hat_party'], 'bow_1')).toEqual(['hat_party', 'bow_1']);
    expect(isValidSpec({ ...PRESETS.bear, accessories: ['hat_party', 'hat_sun'] })).toBe(false);
    expect(ACCESSORIES).toHaveLength(17);
  });

  it('only loads the pattern tiles a spec uses', () => {
    const set = bodySet('bunny', 'round');
    expect(patternsUsed(PRESETS.bunny, set)).toEqual(['felt']);
    expect(patternsUsed(PRESETS.bear, bodySet('bear', 'round'))).toEqual([]);
  });
});

describe('idle animation and fps helpers', () => {
  it('breathes from 1 to 1.02', () => {
    expect(breathScale(0)).toBe(1);
    expect(breathScale(1)).toBeCloseTo(1.02);
    expect(breathScale(5)).toBeCloseTo(1.02);
  });

  it('places the canvas and scales it to the display size', () => {
    const t = plushTransform(10, 20, 512, 0);
    expect(t.slice(0, 3)).toEqual([{ translateX: 10 }, { translateY: 20 }, { scale: 0.5 }]);
  });

  it('blinks around the eye line and never fully closes to zero', () => {
    expect(blinkTransform(300, 0)[1]).toEqual({ scaleY: 0.08 });
    expect(blinkTransform(300, 1)[0]).toEqual({ translateY: 300 });
  });

  it('blinks every 3–6 s', () => {
    expect(nextBlinkDelay(0)).toBe(3000);
    expect(nextBlinkDelay(0.999)).toBeLessThan(6000);
  });

  it('picks a layer resolution for the display size', () => {
    expect(qualityFor(300)).toBe(0.4);
    expect(qualityFor(2000)).toBe(1);
  });

  it('fpsStep reports fps once per window', () => {
    let s = fpsStep(0, 0, 1000);
    expect(s.fps).toBe(-1);
    for (let i = 1; i <= 30; i++) s = fpsStep(s.frames, s.windowStart, 1000 + i * (500 / 30));
    expect(s.fps).toBe(60);
  });
});
