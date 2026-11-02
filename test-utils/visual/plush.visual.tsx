// Visual check: the compositor's output for every base, laid out like the r03 contact sheet.
import { Fill, Group } from '@shopify/react-native-skia';

import { loadPlushAssets, type PlushAssets } from '../../src/plush/assets';
import PlushDrawing from '../../src/plush/PlushDrawing';
import { bodySet } from '../../src/plush/registry';
import { defaultFills, PRESETS } from '../../src/plush/spec';
import type { PlushSpec } from '../../src/plush/types';
import { renderPng, useDiskArt } from './harness';

const CELL = 300;

const SHEET: PlushSpec[] = [
  PRESETS.bear,
  { ...PRESETS.bear, body: 'tall', fills: { ...defaultFills('#C8B6E8'), body: { color: '#C8B6E8', pattern: 'fleece' } }, eyes: 'round_shiny' },
  { ...PRESETS.bear, body: 'tiny', fills: { ...defaultFills('#A8DCC8'), body: { color: '#A8DCC8', pattern: 'gingham' } }, eyes: 'sleepy', accessories: ['hat_party'] },
  PRESETS.bunny,
  { ...PRESETS.bunny, body: 'tall', fills: { ...defaultFills('#A9CDEE'), body: { color: '#A9CDEE', pattern: 'dots' } }, eyes: 'heart', accessories: ['bow_1'] },
  { ...PRESETS.bunny, body: 'tiny', fills: { ...defaultFills('#F7D97C'), body: { color: '#F7D97C', pattern: 'stars' } }, eyes: 'wink', accessories: ['scarf_1'] },
  { base: 'kitty', body: 'round', fills: { ...defaultFills('#C8B6E8'), body: { color: '#C8B6E8', pattern: 'hearts' } }, eyes: 'happy_closed', accessories: [], nameId: 'mochi' },
  { base: 'puppy', body: 'round', fills: defaultFills('#E2B26A'), eyes: 'button', accessories: ['bandana'], nameId: 'pip' },
  { base: 'unicorn', body: 'round', fills: defaultFills('#F4A7B9'), eyes: 'round_shiny', accessories: [], nameId: 'sunny' },
  { base: 'dino', body: 'round', fills: { ...defaultFills('#F6C6A8'), body: { color: '#F6C6A8', pattern: 'felt' } }, eyes: 'big_sparkly', accessories: [], nameId: 'clover' },
  { base: 'owl', body: 'round', fills: { ...defaultFills('#A9CDEE'), belly: { color: '#FDF3E2', pattern: 'solid' } }, eyes: 'sleepy', accessories: [], nameId: 'button' },
  { base: 'doll', body: 'round', style: 'girl', fills: { ...defaultFills('#F7D97C'), body: { color: '#F7D97C', pattern: 'gingham' } }, eyes: 'heart', accessories: ['flower'], nameId: 'honey' },
  { base: 'doll', body: 'tall', style: 'boy', fills: { ...defaultFills('#A8DCC8', '#FDF3E2'), skin: { color: '#7A4E35', pattern: 'solid' } }, eyes: 'star', accessories: ['glasses_round'], nameId: 'pip' },
];

describe('visual: plush compositor', () => {
  beforeAll(() => useDiskArt());

  it('renders the contact-sheet set to artifacts/visual', async () => {
    const loaded: { spec: PlushSpec; assets: PlushAssets }[] = [];
    for (const spec of SHEET) {
      const set = bodySet(spec.base, spec.body, spec.style);
      loaded.push({ spec, assets: await loadPlushAssets(spec, set, 0.6, 'smile') });
    }
    const cols = 5;
    const rows = Math.ceil(SHEET.length / cols);
    const file = await renderPng(
      <Group>
        <Fill color="#F0E4D4" />
        {loaded.map(({ spec, assets }, i) => (
          <Group key={i} transform={[{ translateX: (i % cols) * CELL }, { translateY: Math.floor(i / cols) * CELL }, { scale: CELL / 1024 }]}>
            <PlushDrawing set={bodySet(spec.base, spec.body, spec.style)} spec={spec} assets={assets} />
          </Group>
        ))}
      </Group>,
      cols * CELL,
      rows * CELL,
      'plush_sheet.png',
    );
    expect(file).toContain('plush_sheet.png');
    for (const l of loaded) expect(l.assets.layers.size).toBeGreaterThan(20);
  });
});

describe('visual: the 8 presets', () => {
  beforeAll(() => useDiskArt());

  it('renders every preset (Unicorn and Owl follow the preset rules)', async () => {
    const { PRESETS_V1 } = require('../../src/content/presets');
    const loaded: { spec: PlushSpec; assets: PlushAssets }[] = [];
    for (const p of PRESETS_V1 as { spec: PlushSpec }[]) loaded.push({ spec: p.spec, assets: await loadPlushAssets(p.spec, bodySet(p.spec.base, p.spec.body, p.spec.style), 0.6, 'smile') });
    const file = await renderPng(
      <Group>
        <Fill color="#F0E4D4" />
        {loaded.map(({ spec, assets }, i) => (
          <Group key={i} transform={[{ translateX: (i % 4) * CELL }, { translateY: Math.floor(i / 4) * CELL }, { scale: CELL / 1024 }]}>
            <PlushDrawing set={bodySet(spec.base, spec.body, spec.style)} spec={spec} assets={assets} />
          </Group>
        ))}
      </Group>,
      4 * CELL,
      2 * CELL,
      'presets.png',
    );
    expect(file).toContain('presets.png');
  });
});
