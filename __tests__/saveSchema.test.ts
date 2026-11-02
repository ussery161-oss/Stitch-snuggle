// P2-A (and G): the save file: defaults, the v0 → v1 → v2 migrations, the corruption guard, and a
// round trip of 24 creations plus sticker and showcase placements.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createRng } from '../src/logic/rng';
import { randomSpec } from '../src/plush/spec';
import { SAVE_KEY, SaveStore, V0_SETTINGS_KEY } from '../src/storage/saveStore';
import {
  defaultSave,
  deleteCreation,
  loadFrom,
  MAX_CREATIONS,
  migrateV0toV1,
  migrateV1toV2,
  putCreation,
  SAVE_VERSION,
  shelfFull,
  SHOWCASE_SPOTS,
  type Creation,
  type Save,
} from '../src/storage/schema';

function creations(n: number): Creation[] {
  return Array.from({ length: n }, (_, i) => ({ id: `c${i}`, spec: randomSpec(createRng(i + 1)), createdAt: '2026-11-01T00:00:00.000Z' }));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('save schema', () => {
  it('has safe defaults (ages 3–5, locked, empty shelf and showcase)', () => {
    const s = defaultSave();
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.settings).toEqual({ age: '3-5', music: 0.6, sfx: 0.8, captions: false, traySide: 'right' });
    expect(s.entitlement.unlocked).toBe(false);
    expect(s.creations).toEqual([]);
    expect(s.showcase.spots).toHaveLength(SHOWCASE_SPOTS);
    expect(s.showcase.podium).toBeNull();
  });

  it('no save → defaults; P1 settings (v0) carry over through v1 to v2', () => {
    expect(loadFrom(null).save).toEqual(defaultSave());
    const v1 = migrateV0toV1({ age: '6-7' });
    expect(v1.version).toBe(1);
    expect(v1.settings.age).toBe('6-7');
    const v2 = migrateV1toV2(v1);
    expect(v2.version).toBe(2);
    expect(v2.showcase.spots).toHaveLength(SHOWCASE_SPOTS);
    expect(loadFrom(null, '{"age":"6-7"}').save.settings.age).toBe('6-7');
  });

  it('a stored v1 save upgrades to v2, keeping everything', () => {
    const v1 = { version: 1, creations: creations(3), stickers: { s1: '2026-11-01' }, placements: [], settings: { age: '6-7' }, entitlement: { unlocked: true } };
    const { save, reset } = loadFrom(JSON.stringify(v1));
    expect(reset).toBe(false);
    expect(save.version).toBe(2);
    expect(save.creations.map((c) => c.id)).toEqual(['c0', 'c1', 'c2']);
    expect(save.entitlement.unlocked).toBe(true);
    expect(save.stickers).toEqual({ s1: '2026-11-01' });
  });

  it('corruption resets to defaults without crashing', () => {
    for (const bad of ['{not json', '42', 'null', '[]', '{"version":99}', '{"version":"x"}']) {
      const { save, reset } = loadFrom(bad);
      expect(save).toEqual(defaultSave());
      expect(reset).toBe(true);
    }
  });

  it('drops broken parts but keeps the good ones', () => {
    const raw = {
      version: 2,
      creations: [...creations(2), { id: 'bad', spec: { base: 'dragon' } }, { id: 'c0', spec: creations(1)[0].spec }],
      stickers: { a: 'x', b: 5 },
      placements: [{ id: 'p', stickerId: 's', page: 'bear', x: 1, y: 2, scale: 99, rotation: 0 }, { nope: true }],
      settings: { age: 'teen', music: 5, sfx: -1 },
      entitlement: { unlocked: 'yes' },
      showcase: { spots: ['c1', 'ghost', null], podium: 'ghost' },
    };
    const { save } = loadFrom(JSON.stringify(raw));
    expect(save.creations.map((c) => c.id)).toEqual(['c0', 'c1']);
    expect(save.stickers).toEqual({ a: 'x' });
    expect(save.placements).toHaveLength(1);
    expect(save.placements[0].scale).toBe(3);
    expect(save.settings).toMatchObject({ age: '3-5', music: 1, sfx: 0 });
    expect(save.entitlement.unlocked).toBe(false);
    expect(save.showcase.spots.slice(0, 3)).toEqual(['c1', null, null]);
    expect(save.showcase.podium).toBeNull();
  });

  it('holds at most 24 creations; a full shelf refuses a new one', () => {
    let s: Save = defaultSave();
    for (const c of creations(MAX_CREATIONS)) s = putCreation(s, c)!;
    expect(shelfFull(s)).toBe(true);
    expect(putCreation(s, { ...creations(30)[29], id: 'new' })).toBeNull();
    // Editing an existing one still works.
    expect(putCreation(s, { ...s.creations[0], spec: creations(30)[29].spec })).not.toBeNull();
  });

  it('deleting a creation clears it from the showcase', () => {
    let s: Save = defaultSave();
    for (const c of creations(3)) s = putCreation(s, c)!;
    s = { ...s, showcase: { spots: ['c1', 'c2', null, null, null, null, null, null], podium: 'c1' } };
    s = deleteCreation(s, 'c1');
    expect(s.creations.map((c) => c.id)).toEqual(['c0', 'c2']);
    expect(s.showcase.spots[0]).toBeNull();
    expect(s.showcase.podium).toBeNull();
  });
});

describe('save store (AsyncStorage)', () => {
  it('round-trips 24 creations, sticker placements and the showcase', async () => {
    const a = new SaveStore();
    await a.load();
    a.update((s) => {
      let next = s;
      for (const c of creations(24)) next = putCreation(next, c)!;
      return {
        ...next,
        stickers: { bear_healed: '2026-11-01T10:00:00.000Z' },
        placements: [{ id: 'p1', stickerId: 'bear_healed', page: 'bear', x: 100, y: 120, scale: 1.4, rotation: 0.3 }],
        showcase: { spots: ['c0', null, 'c5', null, null, null, null, 'c23'], podium: 'c7' },
      };
    });
    await a.flush();
    const b = new SaveStore();
    const loaded = await b.load();
    expect(loaded).toEqual(a.current);
    expect(loaded.creations).toHaveLength(24);
  });

  it('migrates P1 settings on first load and writes the new save', async () => {
    await AsyncStorage.setItem(V0_SETTINGS_KEY, JSON.stringify({ age: '6-7' }));
    const s = await new SaveStore().load();
    expect(s.settings.age).toBe('6-7');
    expect(JSON.parse((await AsyncStorage.getItem(SAVE_KEY))!).version).toBe(2);
  });

  it('a corrupt stored save loads as defaults', async () => {
    await AsyncStorage.setItem(SAVE_KEY, '{oops');
    expect(await new SaveStore().load()).toEqual(defaultSave());
  });
});
