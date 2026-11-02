// The Design Studio: build a plushie, then save it to the toy shelf. A live, breathing preview is
// always on the left; big icon tabs on the right (Base → Body → Colours → Patterns → Eyes →
// Accessories → Name), free to move between. Colouring works both ways: tap a part of the plushie
// (or a part chip) and then a swatch, or a swatch and then a part. Undo remembers 20 steps; the
// dice makes a surprise plushie. Locked items show only a padlock and wiggle when tapped.
import { Canvas } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LineId } from '../audio/lines';
import { say } from '../audio/speak';
import { isLocked, type LockKind } from '../logic/entitlements';
import { createRng, randomSeed } from '../logic/rng';
import Plush from '../plush/Plush';
import { BASES, baseDef, bodySet } from '../plush/registry';
import { ACCESSORIES, EYE_STYLES, NAME_IDS, PALETTE, PATTERN_TILE, PATTERNS, PRESETS } from '../plush/spec';
import type { BaseId, Region } from '../plush/types';
import { putCreation, shelfFull, type Creation } from '../storage/schema';
import { saveStore, useSave } from '../storage/useSave';
import ArtImage from '../ui/ArtImage';
import HomeButton from '../ui/HomeButton';
import { StudioIcon as PaletteIcon } from '../ui/Icons';
import { colors, MIN_TOUCH, useLayout } from '../ui/theme';
import PlushThumb from './PlushThumb';
import StudioIcon from './StudioIcons';
import { regionAt, startStudio, studioReducer, surpriseSpec, swatchesFor, TABS, type Tab } from './studioLogic';
import ToyShelf from './ToyShelf';
import Wiggle from './Wiggle';

export const REGION_LABEL: Readonly<Record<Region, string>> = { body: 'Body', belly: 'Tummy', muzzle: 'Snout', nose: 'Nose', hair: 'Hair', accent: 'Horn', skin: 'Skin' };

interface Props {
  onHome: () => void;
  onPlayDoctor: (c: Creation) => void;
  /** Open on a saved creation (Toy shelf → Edit). */
  edit?: Creation | null;
  /** After saving (P2-G: the Showcase Room). */
  onSaved?: (c: Creation) => void;
  /** The parent-lock badge on locked items leads to the gate. */
  onParent?: () => void;
}

function Cell({ size, onPress, children, selected, testID, label }: { size: number; onPress: () => void; children: ReactNode; selected?: boolean; testID?: string; label: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.cell, { width: size, height: size }, selected && styles.cellOn]}>
      {children}
    </Pressable>
  );
}

export default function StudioScreen({ onHome, onPlayDoctor, edit, onSaved, onParent }: Props) {
  const save = useSave();
  const unlocked = save.entitlement.unlocked;
  const [state, dispatch] = useReducer(studioReducer, undefined, () => startStudio(edit?.spec ?? PRESETS.bunny, edit?.id ?? null));
  const [tab, setTab] = useState<Tab>('base');
  const [region, setRegion] = useState<Region>('body');
  const [bucket, setBucket] = useState<{ kind: 'color'; color: string } | { kind: 'pattern'; pattern: (typeof PATTERNS)[number] } | null>(null);
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  const [shelfOpen, setShelfOpen] = useState(false);
  const rng = useMemo(() => createRng(randomSeed()), []);
  const { width, height, scale } = useLayout();
  const insets = useSafeAreaInsets();
  const spec = state.spec;
  const def = baseDef(spec.base);
  const set = bodySet(spec.base, spec.body, spec.style);
  const regions: Region[] = def.regions.filter((r) => r !== 'nose');
  const activeRegion = regions.includes(region) ? region : regions[0];

  useEffect(() => {
    say('studio-hello');
  }, []);

  const wiggle = (key: string) => setWiggles((w) => ({ ...w, [key]: (w[key] ?? 0) + 1 }));
  /** Runs `fn` unless the item is locked (then it wiggles; never a price or a nag). */
  const guard = (kind: LockKind, id: string, fn: () => void) => {
    if (isLocked(kind, id, unlocked)) wiggle(`${kind}:${id}`);
    else fn();
  };

  const paintRegion = useCallback(
    (r: Region, b: typeof bucket) => {
      if (!b) return;
      if (b.kind === 'color') dispatch({ type: 'paint', region: r, color: b.color });
      else dispatch({ type: 'pattern', region: r, pattern: b.pattern });
    },
    [],
  );
  const pickRegion = (r: Region) => {
    setRegion(r);
    if (tab === 'colors' || tab === 'patterns') paintRegion(r, bucket);
  };
  const onPreviewTap = (x: number, y: number) => {
    const r = regionAt(set, x, y);
    if (r && regions.includes(r)) pickRegion(r);
  };

  const doSave = () => {
    const now = new Date().toISOString();
    const c: Creation = { id: state.editingId ?? `c${Date.now().toString(36)}`, spec, createdAt: now };
    const next = putCreation(saveStore.current, c);
    if (!next) {
      wiggle('shelf');
      say('shelf-full');
      return;
    }
    saveStore.update(() => next);
    if (!state.editingId) dispatch({ type: 'load', spec, editingId: c.id });
    say('studio-saved');
    onSaved?.(c);
  };

  // Layout: preview on the left, panel on the right.
  const panelW = Math.min(width * 0.48, 560);
  const previewSize = Math.min(width - panelW - 32, height - 150);
  const cell = Math.max(MIN_TOUCH + 8, Math.min(112, (panelW - 40) / 4.4));
  const allowedBases = BASES.map((b) => b.id).filter((b) => !isLocked('base', b, unlocked));

  let content: ReactNode = null;
  switch (tab) {
    case 'base':
      content = BASES.map((b) => (
        <Wiggle key={b.id} trigger={wiggles[`base:${b.id}`] ?? 0}>
          <Cell testID={`studio-base-${b.id}`} label={b.id} size={cell} selected={spec.base === b.id} onPress={() => guard('base', b.id, () => dispatch({ type: 'base', base: b.id as BaseId }))}>
            <PlushThumb spec={{ ...spec, base: b.id, body: 'round', ...(b.styles ? { style: spec.style ?? 'girl' } : { style: undefined }), accessories: [] }} size={cell * 0.92} locked={isLocked('base', b.id, unlocked)} />
          </Cell>
        </Wiggle>
      ));
      break;
    case 'body':
      content = [
        ...def.bodyTypes.map((bt) => (
          <Cell key={bt} testID={`studio-body-${bt}`} label={bt} size={cell} selected={spec.body === bt} onPress={() => dispatch({ type: 'body', body: bt })}>
            <PlushThumb spec={{ ...spec, body: bt, accessories: [] }} size={cell * 0.92} />
          </Cell>
        )),
        ...(def.styles ?? []).map((st) => (
          <Cell key={st} testID={`studio-style-${st}`} label={st} size={cell} selected={spec.style === st} onPress={() => dispatch({ type: 'style', style: st })}>
            <PlushThumb spec={{ ...spec, style: st, accessories: [] }} size={cell * 0.92} />
          </Cell>
        )),
      ];
      break;
    case 'colors':
      content = swatchesFor(activeRegion, PALETTE).map((c) => (
        <Wiggle key={c} trigger={wiggles[`color:${c}`] ?? 0}>
          <Cell
            testID={`studio-color-${c}`}
            label={`colour ${c}`}
            size={cell * 0.8}
            selected={bucket?.kind === 'color' && bucket.color === c}
            onPress={() =>
              guard(activeRegion === 'skin' || activeRegion === 'hair' ? 'base' : 'color', activeRegion === 'skin' || activeRegion === 'hair' ? spec.base : c, () => {
                const b = { kind: 'color' as const, color: c };
                setBucket(b);
                paintRegion(activeRegion, b);
              })
            }
          >
            <View style={[styles.swatch, { backgroundColor: c, width: cell * 0.6, height: cell * 0.6, borderRadius: cell }]} />
            {isLocked('color', c, unlocked) && activeRegion !== 'skin' && activeRegion !== 'hair' ? <View style={styles.cornerLock}><StudioIcon name="padlock" size={26} /></View> : null}
          </Cell>
        </Wiggle>
      ));
      break;
    case 'patterns':
      content = PATTERNS.map((p) => (
        <Wiggle key={p} trigger={wiggles[`pattern:${p}`] ?? 0}>
          <Cell
            testID={`studio-pattern-${p}`}
            label={`pattern ${p}`}
            size={cell * 0.8}
            selected={bucket?.kind === 'pattern' && bucket.pattern === p}
            onPress={() =>
              guard('pattern', p, () => {
                const b = { kind: 'pattern' as const, pattern: p };
                setBucket(b);
                paintRegion(activeRegion, b);
              })
            }
          >
            {PATTERN_TILE[p] ? <ArtImage id={PATTERN_TILE[p]!} size={cell * 0.62} style={styles.tile} placeholder={<View style={[styles.swatch, { width: cell * 0.6, height: cell * 0.6 }]} />} /> : <View style={[styles.swatch, { width: cell * 0.6, height: cell * 0.6, backgroundColor: spec.fills[activeRegion].color }]} />}
            {isLocked('pattern', p, unlocked) ? <View style={styles.cornerLock}><StudioIcon name="padlock" size={26} /></View> : null}
          </Cell>
        </Wiggle>
      ));
      break;
    case 'eyes':
      content = EYE_STYLES.map((e) => (
        <Wiggle key={e} trigger={wiggles[`eyes:${e}`] ?? 0}>
          <Cell testID={`studio-eyes-${e}`} label={`eyes ${e}`} size={cell} selected={spec.eyes === e} onPress={() => guard('eyes', e, () => dispatch({ type: 'eyes', eyes: e }))}>
            <ArtImage id={`faces/eyes/${e}_fill`} size={cell * 0.42} aspect={2} placeholder={<StudioIcon name="eyes" size={cell * 0.6} />} />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.center}>
                <ArtImage id={`faces/eyes/${e}_line`} size={cell * 0.42} aspect={2} placeholder={null} />
              </View>
            </View>
            {isLocked('eyes', e, unlocked) ? <View style={styles.cornerLock}><StudioIcon name="padlock" size={26} /></View> : null}
          </Cell>
        </Wiggle>
      ));
      break;
    case 'accessories':
      content = ACCESSORIES.map((a) => (
        <Wiggle key={a} trigger={wiggles[`accessory:${a}`] ?? 0}>
          <Cell testID={`studio-acc-${a}`} label={a} size={cell} selected={spec.accessories.includes(a)} onPress={() => guard('accessory', a, () => dispatch({ type: 'accessory', id: a }))}>
            <ArtImage id={`accessories/${a}`} size={cell * 0.8} placeholder={<StudioIcon name="save" size={cell * 0.5} />} />
            {isLocked('accessory', a, unlocked) ? <View style={styles.cornerLock}><StudioIcon name="padlock" size={26} /></View> : null}
          </Cell>
        </Wiggle>
      ));
      break;
    case 'name':
      content = [
        <Cell
          key="dice"
          testID="studio-name-dice"
          label="random name"
          size={cell}
          onPress={() => {
            const n = rng.pick(NAME_IDS);
            dispatch({ type: 'name', nameId: n });
            say(`name-${n}` as LineId);
          }}
        >
          <StudioIcon name="dice" size={cell * 0.7} />
        </Cell>,
        ...NAME_IDS.map((n, i) => (
          <Pressable
            key={n}
            testID={`studio-name-${n}`}
            accessibilityRole="button"
            accessibilityLabel={n}
            onPress={() => {
              dispatch({ type: 'name', nameId: n });
              say(`name-${n}` as LineId);
            }}
            style={[styles.nameChip, { minHeight: MIN_TOUCH, backgroundColor: [colors.pink, colors.sky, colors.mint, colors.butter, colors.lavender, colors.peach][i % 6] }, spec.nameId === n && styles.cellOn]}
          >
            {/* Decorative for grown-ups; kids hear each name when they tap it. */}
            <Text style={styles.nameText}>{n.charAt(0).toUpperCase() + n.slice(1)}</Text>
          </Pressable>
        )),
      ];
      break;
  }

  const showRegions = tab === 'colors' || tab === 'patterns';
  return (
    <View style={styles.root} testID="studio-screen">
      {/* The preview: tap a part of the plushie to choose it. */}
      <Pressable
        testID="studio-preview"
        accessibilityLabel="Your plushie"
        onPress={(e) => onPreviewTap(((e.nativeEvent.locationX - 0) * 1024) / previewSize, ((e.nativeEvent.locationY - 0) * 1024) / previewSize)}
        style={[styles.preview, { left: 16 + insets.left, top: Math.max(70, (height - previewSize) / 2), width: previewSize, height: previewSize }]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Plush spec={spec} x={0} y={0} size={previewSize} mouth="smile" />
        </Canvas>
      </Pressable>
      {showRegions ? (
        <View style={[styles.regions, { left: 16 + insets.left, top: 16 + insets.top + MIN_TOUCH + 8 }]}>
          {regions.map((r) => (
            <Pressable key={r} testID={`studio-region-${r}`} accessibilityRole="button" accessibilityLabel={REGION_LABEL[r]} onPress={() => pickRegion(r)} style={[styles.regionChip, activeRegion === r && styles.cellOn]}>
              <View style={[styles.regionDot, { backgroundColor: spec.fills[r].color }]} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[styles.panel, { width: panelW, right: 12 + insets.right, top: 12 + insets.top, bottom: 12 + insets.bottom }]}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              testID={`studio-tab-${t}`}
              accessibilityRole="button"
              accessibilityLabel={t}
              onPress={() => {
                setTab(t);
                say(`tab-${t}` as LineId);
              }}
              style={[styles.tab, { width: Math.max(MIN_TOUCH, (panelW - 16) / 7), height: MIN_TOUCH }, tab === t && styles.tabOn]}
            >
              {t === 'colors' ? <PaletteIcon size={40 * Math.max(1, scale)} /> : t === 'accessories' ? <ArtImage id="accessories/bow_1" size={44} placeholder={<StudioIcon name="save" size={40} />} /> : <StudioIcon name={t} size={40} />}
            </Pressable>
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.grid}>{content}</ScrollView>
      </View>

      <View style={[styles.bar, { left: 16 + insets.left, bottom: 12 + insets.bottom }]}>
        <Cell testID="studio-undo" label="Undo" size={MIN_TOUCH + 12} onPress={() => dispatch({ type: 'undo' })}>
          <StudioIcon name="undo" size={50} />
        </Cell>
        <Cell
          testID="studio-surprise"
          label="Surprise me"
          size={MIN_TOUCH + 12}
          onPress={() => {
            dispatch({ type: 'surprise', spec: surpriseSpec(rng, allowedBases.length ? allowedBases : ['bear'], undefined) });
            say('surprise');
          }}
        >
          <StudioIcon name="dice" size={50} />
        </Cell>
        <Cell testID="studio-save" label="Save" size={MIN_TOUCH + 12} onPress={doSave}>
          <StudioIcon name="save" size={50} />
        </Cell>
        <Wiggle trigger={wiggles.shelf ?? 0}>
          <Cell testID="studio-shelf" label="Toy shelf" size={MIN_TOUCH + 12} onPress={() => setShelfOpen(true)}>
            <StudioIcon name="shelf" size={50} />
            {shelfFull(save) ? <View style={styles.cornerLock}><StudioIcon name="save" size={22} /></View> : null}
          </Cell>
        </Wiggle>
      </View>

      <View style={[styles.home, { top: insets.top + 12, left: insets.left + 12 }]}>
        <HomeButton onHome={onHome} />
      </View>
      {onParent && !unlocked ? (
        <Pressable testID="studio-parent" accessibilityRole="button" accessibilityLabel="Grown-ups" onPress={onParent} style={[styles.parentBadge, { right: 16 + insets.right + panelW - MIN_TOUCH, top: insets.top + 12 }]}>
          <ArtImage id="ui/icons/parent_lock" size={36} placeholder={<StudioIcon name="padlock" size={32} />} />
        </Pressable>
      ) : null}
      {shelfOpen ? (
        <ToyShelf
          creations={save.creations}
          onClose={() => setShelfOpen(false)}
          onPlayDoctor={(c) => {
            setShelfOpen(false);
            onPlayDoctor(c);
          }}
          onEdit={(c) => {
            setShelfOpen(false);
            dispatch({ type: 'load', spec: c.spec, editingId: c.id });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3ECFA' },
  preview: { position: 'absolute' },
  regions: { position: 'absolute', flexDirection: 'column', gap: 8 },
  regionChip: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, borderWidth: 3, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  regionDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.line },
  panel: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 24, borderWidth: 3, borderColor: colors.line, padding: 8 },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tab: { alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  tabOn: { backgroundColor: colors.butter },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
  cell: { borderRadius: 18, borderWidth: 3, borderColor: 'transparent', backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  cellOn: { borderColor: colors.rose, backgroundColor: '#FFF1F4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  swatch: { borderWidth: 3, borderColor: colors.line, borderRadius: 12 },
  tile: { borderRadius: 10 },
  cornerLock: { position: 'absolute', right: 2, bottom: 2 },
  nameChip: { paddingHorizontal: 16, borderRadius: 32, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  nameText: { fontSize: 18, fontWeight: '700', color: colors.line },
  bar: { position: 'absolute', flexDirection: 'row', gap: 10 },
  home: { position: 'absolute' },
  parentBadge: { position: 'absolute', width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
});
