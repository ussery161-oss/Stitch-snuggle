// P2-B acceptance: every Studio edit gives a valid spec, Undo restores the last 20 states, random
// specs are valid, every base has every body type and region; plus the screen: colouring both
// ways, padlocks, save to the shelf, a full shelf, and Play doctor.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { createRng } from '../src/logic/rng';
import { allSets, BASES, baseDef, bodySet } from '../src/plush/registry';
import { ACCESSORIES, EYE_STYLES, isValidSpec, NAME_IDS, PALETTE, PATTERNS, PRESETS, randomSpec } from '../src/plush/spec';
import type { Region } from '../src/plush/types';
import { defaultSave, MAX_CREATIONS, type Creation } from '../src/storage/schema';
import { saveStore } from '../src/storage/useSave';
import StudioScreen from '../src/studio/StudioScreen';
import { regionAt, startStudio, studioReducer, surpriseSpec, UNDO_LIMIT, withBase, type StudioAction } from '../src/studio/studioLogic';

function randomAction(rng: ReturnType<typeof createRng>, regions: readonly Region[]): StudioAction {
  switch (rng.int(0, 7)) {
    case 0:
      return { type: 'base', base: rng.pick(BASES).id };
    case 1:
      return { type: 'body', body: rng.pick(['round', 'tall', 'tiny'] as const) };
    case 2:
      return { type: 'style', style: rng.pick(['girl', 'boy'] as const) };
    case 3:
      return { type: 'paint', region: rng.pick(regions), color: rng.pick(PALETTE) };
    case 4:
      return { type: 'pattern', region: rng.pick(regions), pattern: rng.pick(PATTERNS) };
    case 5:
      return { type: 'eyes', eyes: rng.pick(EYE_STYLES) };
    case 6:
      return { type: 'accessory', id: rng.pick(ACCESSORIES) };
    default:
      return { type: 'name', nameId: rng.pick(NAME_IDS) };
  }
}

describe('studio logic', () => {
  it('every mutation produces a valid spec (2,000 random edits)', () => {
    const rng = createRng(7);
    let s = startStudio(PRESETS.bunny);
    for (let i = 0; i < 2000; i++) {
      s = studioReducer(s, randomAction(rng, ['body', 'belly', 'muzzle', 'hair', 'accent', 'skin']));
      expect(isValidSpec(s.spec)).toBe(true);
    }
  });

  it('Undo restores the previous 20 states in order', () => {
    const rng = createRng(3);
    let s = startStudio(PRESETS.bear);
    const history = [s.spec];
    for (let i = 0; i < 30; i++) {
      s = studioReducer(s, { type: 'paint', region: 'body', color: PALETTE[(i % 11) + 1] === s.spec.fills.body.color ? PALETTE[0] : PALETTE[(i % 11) + 1] });
      history.push(s.spec);
    }
    expect(s.past).toHaveLength(UNDO_LIMIT);
    for (let k = 1; k <= UNDO_LIMIT; k++) {
      s = studioReducer(s, { type: 'undo' });
      expect(s.spec).toEqual(history[history.length - 1 - k]);
    }
    // Nothing more to undo: it stays.
    expect(studioReducer(s, { type: 'undo' })).toBe(s);
    void rng;
  });

  it('a no-op edit does not fill the undo history', () => {
    const s = startStudio(PRESETS.bear);
    expect(studioReducer(s, { type: 'eyes', eyes: PRESETS.bear.eyes })).toBe(s);
  });

  it('changing base keeps colours and picks a valid body and doll style', () => {
    const doll = withBase(PRESETS.bear, 'doll');
    expect(doll.style).toBe('girl');
    expect(isValidSpec(doll)).toBe(true);
    const back = withBase(doll, 'bear');
    expect(back.style).toBeUndefined();
    expect(back.fills.body.color).toBe(PRESETS.bear.fills.body.color);
  });

  it('a random or surprise spec is always valid', () => {
    for (let seed = 1; seed < 300; seed++) {
      expect(isValidSpec(randomSpec(createRng(seed)))).toBe(true);
      expect(isValidSpec(surpriseSpec(createRng(seed), ['bear', 'bunny']))).toBe(true);
    }
    for (let seed = 1; seed < 50; seed++) expect(['bear', 'bunny']).toContain(surpriseSpec(createRng(seed), ['bear', 'bunny']).base);
  });

  it('every base has every body type and its regions', () => {
    for (const b of BASES) {
      for (const body of b.bodyTypes) {
        for (const style of b.styles ?? [undefined]) {
          const set = bodySet(b.id, body, style);
          expect(set.placeholder).toBe(false);
          const regions = new Set(set.parts.map((p) => p.region));
          for (const r of baseDef(b.id).regions) expect(regions.has(r)).toBe(true);
        }
      }
    }
    expect(allSets()).toHaveLength(27);
  });

  it('finds the region under a tap on the plushie', () => {
    const set = bodySet('bear', 'round');
    const belly = set.parts.find((p) => p.id === 'belly')!;
    expect(regionAt(set, belly.bounds[0] + belly.bounds[2] / 2, belly.bounds[1] + belly.bounds[3] / 2)).toBe('belly');
    const muzzle = set.parts.find((p) => p.id === 'muzzle')!;
    expect(regionAt(set, muzzle.bounds[0] + muzzle.bounds[2] / 2, muzzle.bounds[1] + muzzle.bounds[3] / 2)).toBe('muzzle');
    expect(regionAt(set, 2, 2)).toBeNull();
  });
});

describe('studio screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    saveStore.update(() => defaultSave());
  });
  afterEach(() => jest.useRealTimers());

  it('paints a region both ways: part then swatch, and swatch then part', async () => {
    await render(<StudioScreen onHome={() => {}} onPlayDoctor={() => {}} />);
    await fireEvent.press(screen.getByTestId('studio-tab-colors'));
    // Part (belly chip) then swatch.
    await fireEvent.press(screen.getByTestId('studio-region-belly'));
    await fireEvent.press(screen.getByTestId(`studio-color-${PALETTE[1]}`));
    // Swatch then part: pick a colour (it paints the selected part), then tap Body: Body takes it.
    await fireEvent.press(screen.getByTestId(`studio-color-${PALETTE[2]}`));
    await fireEvent.press(screen.getByTestId('studio-region-body'));
    // Save and look at the stored spec.
    await fireEvent.press(screen.getByTestId('studio-save'));
    const saved = saveStore.current.creations[0].spec;
    expect(saved.fills.body.color).toBe(PALETTE[2]);
    expect(saved.fills.belly.color).toBe(PALETTE[2]);
  });

  it('locked items only wiggle (demo); unlocked they apply', async () => {
    await render(<StudioScreen onHome={() => {}} onPlayDoctor={() => {}} />);
    await fireEvent.press(screen.getByTestId('studio-base-kitty'));
    await fireEvent.press(screen.getByTestId('studio-save'));
    expect(saveStore.current.creations[0].spec.base).toBe('bunny');
    await act(async () => {
      saveStore.update((s) => ({ ...s, entitlement: { unlocked: true } }));
    });
    await fireEvent.press(screen.getByTestId('studio-base-kitty'));
    await fireEvent.press(screen.getByTestId('studio-save'));
    expect(saveStore.current.creations[0].spec.base).toBe('kitty');
  });

  it('Undo and Surprise me', async () => {
    await render(<StudioScreen onHome={() => {}} onPlayDoctor={() => {}} />);
    await fireEvent.press(screen.getByTestId('studio-tab-eyes'));
    await fireEvent.press(screen.getByTestId('studio-eyes-button'));
    await fireEvent.press(screen.getByTestId('studio-undo'));
    await fireEvent.press(screen.getByTestId('studio-save'));
    expect(saveStore.current.creations[0].spec.eyes).toBe(PRESETS.bunny.eyes);
    await fireEvent.press(screen.getByTestId('studio-surprise'));
    await fireEvent.press(screen.getByTestId('studio-save'));
    const spec = saveStore.current.creations[0].spec;
    expect(isValidSpec(spec)).toBe(true);
    expect(['bear', 'bunny']).toContain(spec.base);
  });

  it('a full shelf refuses a new plushie with a friendly wiggle', async () => {
    const full: Creation[] = Array.from({ length: MAX_CREATIONS }, (_, i) => ({ id: `c${i}`, spec: PRESETS.bear, createdAt: '2026-11-01' }));
    saveStore.update((s) => ({ ...s, creations: full }));
    await render(<StudioScreen onHome={() => {}} onPlayDoctor={() => {}} />);
    await fireEvent.press(screen.getByTestId('studio-save'));
    expect(saveStore.current.creations).toHaveLength(MAX_CREATIONS);
  });

  it('the toy shelf: Play doctor and Edit', async () => {
    const c: Creation = { id: 'mine', spec: { ...PRESETS.bear, eyes: 'heart' }, createdAt: '2026-11-01' };
    saveStore.update((s) => ({ ...s, creations: [c] }));
    const onPlayDoctor = jest.fn();
    await render(<StudioScreen onHome={() => {}} onPlayDoctor={onPlayDoctor} />);
    await fireEvent.press(screen.getByTestId('studio-shelf'));
    await fireEvent.press(screen.getByTestId('shelf-mine'));
    await fireEvent.press(screen.getByTestId('shelf-edit-mine'));
    // Editing then saving updates the same creation.
    await fireEvent.press(screen.getByTestId('studio-tab-eyes'));
    await fireEvent.press(screen.getByTestId('studio-eyes-button'));
    await fireEvent.press(screen.getByTestId('studio-save'));
    expect(saveStore.current.creations).toHaveLength(1);
    expect(saveStore.current.creations[0].spec.eyes).toBe('button');
    await fireEvent.press(screen.getByTestId('studio-shelf'));
    await fireEvent.press(screen.getByTestId('shelf-mine'));
    await fireEvent.press(screen.getByTestId('shelf-doctor-mine'));
    expect(onPlayDoctor).toHaveBeenCalledWith(expect.objectContaining({ id: 'mine' }));
  });

  it('every tab opens and names are voiced', async () => {
    await render(<StudioScreen onHome={() => {}} onPlayDoctor={() => {}} />);
    for (const t of ['base', 'body', 'colors', 'patterns', 'eyes', 'accessories', 'name']) await fireEvent.press(screen.getByTestId(`studio-tab-${t}`));
    await fireEvent.press(screen.getByTestId('studio-name-maple'));
    await fireEvent.press(screen.getByTestId('studio-save'));
    expect(saveStore.current.creations[0].spec.nameId).toBe('maple');
    expect(NAME_IDS).toHaveLength(40);
  });
});
