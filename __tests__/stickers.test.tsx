// P2-C acceptance: sticker earn rules, no duplicates, placements persist; the book screen places,
// moves (drag/pinch/rotate) and removes stickers; creation stickers are snapshotted and cached.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { createVisit } from '../src/clinic/visit';
import ClinicScreen from '../src/clinic/ClinicScreen';
import { PRESETS } from '../src/plush/spec';
import { snapshotPlush } from '../src/stickers/stickerArt';
import StickerBookScreen from '../src/stickers/StickerBookScreen';
import { addPlacement, earn, FIXED_STICKERS, PAGES, removePlacement, stickerDef, stickersFor, updatePlacement } from '../src/stickers/stickers';
import { defaultSave, loadFrom } from '../src/storage/schema';
import { saveStore } from '../src/storage/useSave';

const { drawAsImage } = require('@shopify/react-native-skia') as { drawAsImage: jest.Mock };

describe('sticker rules', () => {
  it('earns a preset sticker, a first-heal creation sticker and first-use tool stickers', () => {
    expect(stickersFor({}, { presetBase: 'bear', steps: ['stitch', 'wash'] })).toEqual(['preset-bear', 'tool-stitch', 'tool-wash']);
    expect(stickersFor({}, { creationId: 'c1', steps: ['dress'] })).toEqual(['creation-c1', 'tool-dress']);
  });

  it('never gives the same sticker twice', () => {
    let stickers: Record<string, string> = {};
    let r = earn(stickers, { presetBase: 'bunny', steps: ['stitch'] }, 't1');
    stickers = r.stickers;
    expect(r.added).toEqual(['preset-bunny', 'tool-stitch']);
    r = earn(stickers, { presetBase: 'bunny', steps: ['stitch', 'patch'] }, 't2');
    expect(r.added).toEqual(['tool-patch']);
    expect(r.stickers['preset-bunny']).toBe('t1');
    expect(stickersFor(r.stickers, { creationId: 'x', steps: [] })).toEqual(['creation-x']);
    expect(stickersFor({ 'creation-x': 't' }, { creationId: 'x', steps: [] })).toEqual([]);
  });

  it('has about 40 stickers across pages for each base, My Creations and Seasonal', () => {
    expect(PAGES).toEqual(['bear', 'bunny', 'kitty', 'puppy', 'unicorn', 'dino', 'owl', 'doll', 'creations', 'seasonal']);
    // 8 presets + 6 tools + 4 seasonal fixed, plus up to 24 creations.
    expect(FIXED_STICKERS.length + 24).toBeGreaterThanOrEqual(40);
    expect(stickerDef('creation-abc')).toEqual({ id: 'creation-abc', kind: 'creation', creationId: 'abc' });
    expect(stickerDef('nope')).toBeNull();
  });

  it('placements: add, move/scale/rotate (clamped), remove, and they persist', () => {
    let list = addPlacement([], { id: 'p1', stickerId: 'preset-bear', page: 'bear', x: 10, y: 10, scale: 1, rotation: 0 });
    list = updatePlacement(list, 'p1', { x: 50, y: 60, scale: 9, rotation: 1 });
    expect(list[0]).toMatchObject({ x: 50, y: 60, scale: 3, rotation: 1 });
    const saved = JSON.stringify({ ...defaultSave(), placements: list });
    expect(loadFrom(saved).save.placements).toEqual(list);
    expect(removePlacement(list, 'p1')).toEqual([]);
  });
});

describe('sticker book screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    saveStore.update(() => ({ ...defaultSave(), stickers: { 'preset-bear': '2026-11-01T00:00:00Z', 'tool-stitch': '2026-11-01T00:00:01Z' } }));
  });
  afterEach(() => jest.useRealTimers());

  it('places a sticker from the tray, moves it, and dragging it to the tray removes it', async () => {
    await render(<StickerBookScreen onHome={() => {}} />);
    await fireEvent.press(screen.getByTestId('tray-preset-bear'));
    expect(saveStore.current.placements).toHaveLength(1);
    const p = saveStore.current.placements[0];
    expect(p).toMatchObject({ stickerId: 'preset-bear', page: 'bear' });
    // Drag it somewhere else: it stays there.
    const pan = () => getByGestureTestId(`sticker-pan-${p.id}`);
    fireGestureHandler(pan(), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 20, translationY: -15 },
      { state: State.ACTIVE, translationX: 40, translationY: -30 },
      { state: State.END, translationX: 40, translationY: -30 },
    ]);
    await act(async () => {
      jest.advanceTimersByTime(20);
    });
    expect(saveStore.current.placements[0]).toMatchObject({ x: p.x + 40, y: p.y - 30 });
    // Drag it down into the tray: it comes off the page.
    fireGestureHandler(pan(), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 0, translationY: 1000 },
      { state: State.ACTIVE, translationX: 0, translationY: 2000 },
      { state: State.END, translationX: 0, translationY: 2000 },
    ]);
    await act(async () => {
      jest.advanceTimersByTime(20);
    });
    expect(saveStore.current.placements).toHaveLength(0);
  });

  it('a locked page (demo) shows a padlock and places nothing; unlocked it works', async () => {
    await render(<StickerBookScreen onHome={() => {}} />);
    await fireEvent.press(screen.getByTestId('page-kitty'));
    await fireEvent.press(screen.getByTestId('tray-preset-bear'));
    expect(saveStore.current.placements).toHaveLength(0);
    await act(async () => {
      saveStore.update((s) => ({ ...s, entitlement: { unlocked: true } }));
    });
    await fireEvent.press(screen.getByTestId('tray-preset-bear'));
    expect(saveStore.current.placements[0].page).toBe('kitty');
  });
});

describe('earning in the clinic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    saveStore.update(() => defaultSave());
  });
  afterEach(() => jest.useRealTimers());

  it('a finished visit awards its stickers once and the sticker flies to the book', async () => {
    const visit = createVisit(PRESETS.bear, 4);
    await render(<ClinicScreen spec={PRESETS.bear} seed={4} onExit={() => {}} />);
    // Skip through every phase with the done heart / timers.
    for (let i = 0; i < 12 && !screen.queryByTestId('recovery-room'); i++) {
      await act(async () => {
        jest.advanceTimersByTime(21000);
      });
      const heart = screen.queryByTestId('done-heart');
      if (heart) await fireEvent.press(heart);
      await act(async () => {
        jest.advanceTimersByTime(13000);
      });
    }
    expect(screen.getByTestId('recovery-room')).toBeTruthy();
    expect(Object.keys(saveStore.current.stickers).sort()).toEqual(['preset-bear', ...visit.steps.map((s) => `tool-${s}`)].sort());
    expect(screen.getByTestId('sticker-fly', { includeHiddenElements: true })).toBeTruthy();
  }, 30000);
});

describe('creation snapshots', () => {
  it('draws the plushie offscreen once and caches the PNG on the device', async () => {
    const fakeImage = { encodeToBytes: () => new Uint8Array([1, 2, 3]) };
    drawAsImage.mockResolvedValueOnce(fakeImage);
    const uri = await snapshotPlush(PRESETS.bear, 'creation-test1');
    expect(uri).toBe('file:///docs/stickers/creation-test1.png');
    drawAsImage.mockClear();
    expect(await snapshotPlush(PRESETS.bear, 'creation-test1')).toBe(uri);
    expect(drawAsImage).not.toHaveBeenCalled();
  });
});
