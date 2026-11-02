// P1-C boot smoke test: <App/> renders the title and every route reachable from it.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import App from '../App';

/** Taps the gate's numerals from smallest to largest, then holds the lock for 1 s. */
export async function passGate(): Promise<void> {
  const nums = screen
    .getAllByTestId(/^gate-number-/)
    .map((n) => Number(String(n.props.testID).replace('gate-number-', '')))
    .sort((a, b) => a - b);
  for (const n of nums) await fireEvent.press(screen.getByTestId(`gate-number-${n}`));
  await fireEvent(screen.getByTestId('gate-hold'), 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
}

describe('app shell', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the title with three big buttons and the grown-up lock', async () => {
    await render(<App />);
    expect(screen.getByTestId('title-screen')).toBeTruthy();
    for (const id of ['title-play', 'title-studio', 'title-stickers', 'title-parent']) expect(screen.getByTestId(id)).toBeTruthy();
  });

  it('Play opens the clinic; a quick tap on Home says the hint, a 2 s hold goes home', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByTestId('title-play'));
    expect(screen.getByTestId('clinic-screen')).toBeTruthy();
    const home = screen.getByTestId('home-button');
    await fireEvent(home, 'pressIn');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await fireEvent(home, 'pressOut');
    expect(Speech.speak).toHaveBeenCalledWith('Hold to go home.', expect.anything());
    expect(screen.getByTestId('clinic-screen')).toBeTruthy();
    await fireEvent(screen.getByTestId('home-button'), 'pressIn');
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('title-screen')).toBeTruthy();
  });

  it('Studio and Sticker book open (placeholders in P1) and have a Home button', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByTestId('title-studio'));
    expect(screen.getByTestId('studio-screen')).toBeTruthy();
    expect(screen.getByTestId('home-button')).toBeTruthy();
  });

  it('the lock goes through the gate to the parent area and on to the dev screen', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByTestId('title-parent'));
    expect(screen.getByTestId('parental-gate')).toBeTruthy();
    await passGate();
    expect(screen.getByTestId('parent-screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('parent-dev'));
    expect(screen.getByTestId('dev-screen')).toBeTruthy();
  });

  it('closing the gate goes back to the title', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByTestId('title-parent'));
    await fireEvent.press(screen.getByTestId('gate-close'));
    expect(screen.getByTestId('title-screen')).toBeTruthy();
  });
});

describe('app shell (phase 2)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('boots through Title → Studio, Showcase and Sticker book, each with Home', async () => {
    await render(<App />);
    for (const [button, screenId] of [
      ['title-studio', 'studio-screen'],
      ['title-showcase', 'showcase-screen'],
      ['title-stickers', 'stickers-screen'],
    ]) {
      await fireEvent.press(screen.getByTestId(button));
      expect(screen.getByTestId(screenId)).toBeTruthy();
      await fireEvent(screen.getByTestId('home-button'), 'pressIn');
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.getByTestId('title-screen')).toBeTruthy();
    }
  });

  it('captions (a parent setting) show the spoken line', async () => {
    const { saveStore } = require('../src/storage/useSave');
    saveStore.update((s: { settings: object }) => ({ ...s, settings: { ...s.settings, captions: true } }));
    await render(<App />);
    await fireEvent.press(screen.getByTestId('title-studio'));
    expect(screen.getByTestId('caption-bar')).toHaveTextContent('Let’s make a plushie!');
  });
});
