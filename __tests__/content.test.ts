// P2-D: the 8 presets (story, damage set, owner), seasonal slots, and the look-alike preset rules.
import { art } from '../src/art';
import { LINES } from '../src/audio/lines';
import { createVisit } from '../src/clinic/visit';
import { isGreen, OWNERS, playablePresets, presetFor, PRESETS_V1, SEASONAL, seasonalReady } from '../src/content/presets';
import { DEMO, isLocked } from '../src/logic/entitlements';
import { isValidSpec } from '../src/plush/spec';

describe('preset roster', () => {
  it('registers all 8 presets: Bear, Bunny, Kitty, Puppy, Unicorn-pony, Dino, Rag Doll and Owl', () => {
    expect(PRESETS_V1.map((p) => p.base).sort()).toEqual(['bear', 'bunny', 'dino', 'doll', 'kitty', 'owl', 'puppy', 'unicorn']);
  });

  it('each has a valid spec, voiced stories, a damage set and an owner', () => {
    for (const p of PRESETS_V1) {
      expect(isValidSpec(p.spec)).toBe(true);
      expect(p.stories.length).toBeGreaterThan(0);
      for (const s of p.stories) expect(s in LINES).toBe(true);
      expect(p.damage.length).toBeGreaterThanOrEqual(3);
      expect(OWNERS).toContain(p.owner);
      expect(art(`ui/owners/${p.owner}`)).not.toBeNull();
    }
    // The 4 owners all appear.
    expect(new Set(PRESETS_V1.map((p) => p.owner)).size).toBe(4);
  });

  it('a visit uses the preset story and damage set', () => {
    for (const p of PRESETS_V1) {
      for (let seed = 1; seed < 20; seed++) {
        const v = createVisit(p.spec, seed, { kinds: p.damage, stories: p.stories });
        expect(p.stories).toContain(v.storyId);
        for (const d of v.damages) expect(p.damage).toContain(d.kind);
      }
    }
  });

  it('Play offers Bear and Bunny in the demo and all 8 once unlocked', () => {
    expect(playablePresets(false, DEMO.presets).map((p) => p.base)).toEqual(['bear', 'bunny']);
    expect(playablePresets(true, DEMO.presets)).toHaveLength(8);
  });
});

describe('preset rules (Art Director: look-alike avoidance)', () => {
  it('the Unicorn preset uses round-shiny or button eyes, never big-sparkly', () => {
    expect(['round_shiny', 'button']).toContain(presetFor('unicorn').spec.eyes);
  });

  it('the Owl preset has no bow tie, no leaf and no green tint', () => {
    const owl = presetFor('owl').spec;
    expect(owl.accessories).not.toContain('bow_tie');
    expect(owl.accessories.some((a) => /leaf/.test(a))).toBe(false);
    for (const [region, fill] of Object.entries(owl.fills)) {
      if (['body', 'belly', 'nose', 'muzzle'].includes(region)) expect(isGreen(fill.color)).toBe(false);
    }
  });

  it('isGreen spots greens', () => {
    expect(isGreen('#A8DCC8')).toBe(true); // mint counts as a green tint
    expect(isGreen('#B9D98B')).toBe(true);
    expect(isGreen('#A9CDEE')).toBe(false);
  });
});

describe('seasonal slots', () => {
  it('has Pumpkin Kitty, Snow Bear, Spring Lamb and Beach Turtle, inert until their art lands', () => {
    expect(SEASONAL.map((s) => s.id)).toEqual(['pumpkin_kitty', 'snow_bear', 'spring_lamb', 'beach_turtle']);
    for (const s of SEASONAL) expect(seasonalReady(s, (id) => art(id) !== null)).toBe(false);
    expect(seasonalReady(SEASONAL[0], () => true)).toBe(true);
  });

  it('seasonal items are locked in the demo and included in the unlock', () => {
    expect(isLocked('seasonal', 'pumpkin_kitty', false)).toBe(true);
    expect(isLocked('seasonal', 'pumpkin_kitty', true)).toBe(false);
  });
});
