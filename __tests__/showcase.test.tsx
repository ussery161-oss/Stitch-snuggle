// P2-G acceptance: place, swap, podium and persistence after relaunch; a deleted creation clears its
// spot; the newest creation goes to the podium; the screen's drag places and removes.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import App from '../App';
import { PRESET_SPECS } from '../src/content/presets';
import { placeAt, positionOf, removeFrom, withNewest } from '../src/showcase/showcaseLogic';
import { SaveStore } from '../src/storage/saveStore';
import { defaultSave, deleteCreation, emptyShowcase, type Creation } from '../src/storage/schema';
import { saveStore } from '../src/storage/useSave';

const mine = (id: string, base: keyof typeof PRESET_SPECS = 'bear'): Creation => ({ id, spec: PRESET_SPECS[base], createdAt: '2026-11-01' });

describe('showcase logic', () => {
  it('places from the tray, moves between spots (swapping) and onto the podium', () => {
    let s = emptyShowcase();
    s = placeAt(s, 'a', 0);
    s = placeAt(s, 'b', 1);
    expect(s.spots.slice(0, 2)).toEqual(['a', 'b']);
    // Move a onto b's spot: they swap.
    s = placeAt(s, 'a', 1);
    expect(s.spots.slice(0, 2)).toEqual(['b', 'a']);
    // a to the podium; its shelf empties.
    s = placeAt(s, 'a', 'podium');
    expect(s.podium).toBe('a');
    expect(positionOf(s, 'a')).toBe('podium');
    expect(s.spots[1]).toBeNull();
    // From the tray onto an occupied spot: the one there goes back to the tray.
    s = placeAt(s, 'c', 0);
    expect(s.spots[0]).toBe('c');
    expect(positionOf(s, 'b')).toBeNull();
    // Removing is free.
    expect(positionOf(removeFrom(s, 'c'), 'c')).toBeNull();
  });

  it('the newest creation goes to the podium and the old hero to the first empty shelf', () => {
    let s = withNewest(emptyShowcase(), 'a');
    expect(s.podium).toBe('a');
    s = withNewest(s, 'b');
    expect(s.podium).toBe('b');
    expect(s.spots[0]).toBe('a');
  });

  it('deleting a creation (behind the gate) clears its spot', () => {
    let save = { ...defaultSave(), creations: [mine('a'), mine('b')] };
    save = { ...save, showcase: placeAt(placeAt(save.showcase, 'a', 2), 'b', 'podium') };
    save = deleteCreation(save, 'a');
    expect(save.showcase.spots[2]).toBeNull();
    expect(save.showcase.podium).toBe('b');
  });

  it('persists after a relaunch', async () => {
    await AsyncStorage.clear();
    const a = new SaveStore();
    await a.load();
    a.update((s) => ({ ...s, creations: [mine('a'), mine('b', 'bunny'), mine('c', 'kitty')], showcase: placeAt(placeAt(placeAt(s.showcase, 'a', 0), 'b', 3), 'c', 'podium') }));
    await a.flush();
    const b = await new SaveStore().load();
    expect(b.showcase.spots[0]).toBe('a');
    expect(b.showcase.spots[3]).toBe('b');
    expect(b.showcase.podium).toBe('c');
  });
});

describe('showcase screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    saveStore.update(() => ({ ...defaultSave(), creations: [mine('a'), mine('b', 'bunny')] }));
  });
  afterEach(() => jest.useRealTimers());

  it('opens from the Title, places a plushie by dragging, and drags it back to the tray', async () => {
    await render(<App />);
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    await fireEvent.press(screen.getByTestId('title-showcase'));
    expect(screen.getByTestId('showcase-screen')).toBeTruthy();
    expect(screen.getByTestId('wall-charm', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
    const trayItem = screen.getByTestId('showcase-tray-a');
    const style = Object.assign({}, ...[trayItem.props.style].flat(3));
    const H = 1334;
    // The tray sits at the bottom of the screen; aim at plushie a's centre in it.
    const tray = Object.assign({}, ...[trayItem.parent!.props.style].flat(3));
    const start = { x: style.left + style.width / 2, y: H - tray.height / 2 };
    // Drop on the podium (the big spot in the middle of the scene).
    const podium = { x: 375, y: 600 };
    fireGestureHandler(getByGestureTestId('showcase-drag'), [
      { state: State.BEGAN, ...start },
      { state: State.ACTIVE, ...start },
      { state: State.ACTIVE, ...podium },
      { state: State.END, ...podium },
    ]);
    await act(async () => {
      jest.advanceTimersByTime(20);
    });
    const pos = positionOf(saveStore.current.showcase, 'a');
    expect(pos).not.toBeNull();
  });
});
