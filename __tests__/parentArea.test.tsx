// P2-E/F: the demo list is exact; locked items open after the mock unlock (seasonal included);
// the parent area shows the price and runs buy/restore, settings, reset and delete; the privacy
// page; and the credits order (verse, blessing, then credits with the Apache-2.0 voice).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { DEMO, isLocked } from '../src/logic/entitlements';
import { ACCESSORIES, EYE_STYLES, PALETTE, PATTERNS } from '../src/plush/spec';
import { BASE_IDS } from '../src/plush/registry';
import { MockPurchaseService, purchaseService } from '../src/purchase/purchaseService';
import { creditBlocks, BLESSING, VERSE } from '../src/screens/parent/credits';
import { PRIVACY_TEXT } from '../src/screens/parent/PrivacyScreen';
import { defaultSave } from '../src/storage/schema';
import { saveStore } from '../src/storage/useSave';
import { passGate } from './appShell.test';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const { execFileSync } = require('child_process') as typeof import('child_process');

describe('entitlements', () => {
  it('the demo item list is exact', () => {
    expect(DEMO).toEqual({
      bases: ['bear', 'bunny'],
      colors: PALETTE.slice(0, 4),
      patterns: ['solid', 'gingham', 'dots', 'stars'],
      eyes: ['button', 'round_shiny'],
      accessories: ['bow_1', 'hat_party', 'glasses_round'],
      presets: ['bear', 'bunny'],
      stickerPages: ['bear'],
    });
  });

  it('everything else is locked until the unlock, and all of it opens after', () => {
    const all: [Parameters<typeof isLocked>[0], readonly string[]][] = [
      ['base', BASE_IDS],
      ['color', PALETTE],
      ['pattern', PATTERNS],
      ['eyes', EYE_STYLES],
      ['accessory', ACCESSORIES],
      ['preset', BASE_IDS],
      ['seasonal', ['pumpkin_kitty', 'snow_bear', 'spring_lamb', 'beach_turtle']],
    ];
    let locked = 0;
    for (const [kind, ids] of all) {
      for (const id of ids) {
        if (isLocked(kind, id, false)) locked++;
        expect(isLocked(kind, id, true)).toBe(false);
      }
    }
    expect(locked).toBeGreaterThan(40);
    expect(isLocked('seasonal', 'snow_bear', false)).toBe(true);
  });
});

describe('mock purchase service', () => {
  beforeEach(() => saveStore.update(() => defaultSave()));

  it('shows Unlock Everything at $5.99; buy unlocks; restore then finds it', async () => {
    const svc = purchaseService();
    expect(svc).toBeInstanceOf(MockPurchaseService);
    expect(await svc.getProduct()).toEqual({ id: 'unlock_all', title: 'Unlock Everything', price: '$5.99' });
    expect(await svc.restore()).toBe('nothing');
    expect(await svc.buy()).toBe('purchased');
    expect(saveStore.current.entitlement.unlocked).toBe(true);
    expect(await svc.restore()).toBe('restored');
    (svc as MockPurchaseService).relock();
    expect(saveStore.current.entitlement.unlocked).toBe(false);
  });
});

describe('parent area', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    saveStore.update(() => ({ ...defaultSave(), creations: [{ id: 'c1', spec: require('../src/content/presets').PRESET_SPECS.bear, createdAt: 'x' }], stickers: { 'preset-bear': 'x' } }));
  });
  afterEach(() => jest.useRealTimers());

  async function openParent() {
    await render(<App />);
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    await fireEvent.press(screen.getByTestId('title-parent'));
    await passGate();
  }

  it('unlock shows the price, buys, and restore reports it', async () => {
    await openParent();
    expect(screen.getByTestId('parent-unlock').props.accessibilityLabel).toContain('$5.99');
    await fireEvent.press(screen.getByTestId('parent-unlock'));
    await act(async () => {});
    expect(saveStore.current.entitlement.unlocked).toBe(true);
    expect(screen.getByTestId('parent-unlocked')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('parent-restore'));
    await act(async () => {});
    expect(screen.getByTestId('parent-message')).toHaveTextContent(/restored/);
  });

  it('settings, reset progress and delete creation are saved', async () => {
    await openParent();
    await fireEvent.press(screen.getByTestId('music-25'));
    await fireEvent.press(screen.getByTestId('captions-on'));
    await fireEvent.press(screen.getByTestId('tray-left'));
    expect(saveStore.current.settings).toMatchObject({ music: 0.25, captions: true, traySide: 'left' });
    await fireEvent(screen.getByTestId('parent-reset'), 'longPress');
    expect(saveStore.current.stickers).toEqual({});
    await fireEvent(screen.getByTestId('delete-c1'), 'longPress');
    expect(saveStore.current.creations).toEqual([]);
  });

  it('privacy and credits pages open from the parent area', async () => {
    await openParent();
    await fireEvent.press(screen.getByTestId('parent-privacy'));
    expect(screen.getByText(PRIVACY_TEXT)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('privacy-back'));
    await fireEvent.press(screen.getByTestId('parent-credits'));
    expect(screen.getByTestId('credits-verse')).toBeTruthy();
  });
});

describe('credits', () => {
  it('opens with the verse, then the blessing, then the credits including the Apache-2.0 voice', () => {
    const blocks = creditBlocks();
    expect(blocks[0]).toEqual({ kind: 'verse', text: VERSE.text, reference: 'Ephesians 4:32 (KJV)' });
    expect(VERSE.text).toBe('And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ’s sake hath forgiven you.');
    expect(blocks[1]).toEqual({ kind: 'blessing', text: BLESSING });
    expect(BLESSING).toBe('Thanking Our Lord and Savior Jesus Christ for the ample blessings he has bestowed.');
    expect(blocks[2].kind).toBe('team');
    const credits = blocks.filter((b) => b.kind === 'credit').map((b) => (b.kind === 'credit' ? b.row : null)!);
    expect(credits.some((r) => r.asset.includes('Kokoro-82M v1.0 (hexgrad), voice af_bella') && r.license.includes('Apache License 2.0'))).toBe(true);
    for (const set of ['r01', 'r02', 'r03']) expect(credits.some((r) => r.asset.startsWith(`Art set ${set}`))).toBe(true);
  });

  it('the bundled credits match assets/CREDITS.md (run `npm run gen:credits`)', () => {
    const root = path.join(__dirname, '..');
    const fresh = execFileSync(process.execPath, ['--input-type=module', '-e', "import { buildCredits } from './scripts/gen-credits.mjs'; process.stdout.write(buildCredits());"], { cwd: root, encoding: 'utf8' });
    expect(fs.readFileSync(path.join(root, 'src', 'config', 'credits.generated.ts'), 'utf8') === fresh).toBe(true);
  });
});
