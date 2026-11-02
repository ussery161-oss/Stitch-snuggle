// The Showcase Room: the child's saved plushies on 8 shelves and a hero podium (scene_showcase).
// Drag (or tap, then tap) a plushie from the tray onto a shelf; drag a shown one to another spot to
// move or swap it, or onto the podium to make it the hero. Dropping one back on the tray takes it
// off the showcase (free; deleting needs the grown-up gate). The plaque shows the hero's name as an
// icon and says it. The tiny heart-and-cross charm hangs above the podium.
import { Canvas, Fill, Image } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LineId } from '../audio/lines';
import { say } from '../audio/speak';
import { useTrayDrag } from '../clinic/ui/useTrayDrag';
import WallCharm from '../clinic/WallCharm';
import { artData } from '../art';
import Plush from '../plush/Plush';
import type { PlushSpec } from '../plush/types';
import { snapshotPlush } from '../stickers/stickerArt';
import type { Creation } from '../storage/schema';
import { saveStore, useSave } from '../storage/useSave';
import StudioIcon from '../studio/StudioIcons';
import HomeButton from '../ui/HomeButton';
import { colors, MIN_TOUCH, useLayout } from '../ui/theme';
import { useArtImage } from '../ui/useArtImage';
import { occupant, placeAt, positionOf, removeFrom, type Spot } from './showcaseLogic';

const SCENE_W = 2048;
const SCENE_H = 1536;

interface ScenesJson {
  scene_showcase: {
    display_spots: { id: string; rect: { x: number; y: number; size: number } }[];
    wall_charm: { pos: [number, number] };
    name_plaque: [number, number];
  };
}

const FALLBACK: ScenesJson['scene_showcase'] = {
  display_spots: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `shelf_${i + 1}`, rect: { x: 70 + (i % 4) * 400, y: i < 4 ? 376 : 836, size: 360 } })),
    { id: 'hero_podium', rect: { x: 644, y: 610, size: 760 } },
  ],
  wall_charm: { pos: [1024, 330] },
  name_plaque: [1024, 168],
};

/** A cheap hash of a spec, so an edited creation gets a fresh snapshot. */
export function specKey(spec: PlushSpec): string {
  const text = JSON.stringify(spec);
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function Snapshot({ c, size }: { c: Creation; size: number }) {
  const key = `showcase-${c.id}-${specKey(c.spec)}`;
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    snapshotPlush(c.spec, key).then((u) => {
      if (live) setUri(u);
    });
    return () => {
      live = false;
    };
  }, [c.spec, key]);
  return uri ? <RNImage source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" /> : <View style={{ width: size, height: size }} />;
}

export default function ShowcaseScreen({ onHome }: { onHome: () => void }) {
  const save = useSave();
  const { width, height, isPhone } = useLayout();
  const insets = useSafeAreaInsets();
  const scene = useArtImage('ui/scenes/scene_showcase');
  const data = artData<ScenesJson>('ui/scenes/scenes')?.scene_showcase ?? FALLBACK;
  const [selected, setSelected] = useState<string | null>(null);
  const show = save.showcase;
  const byId = useMemo(() => new Map(save.creations.map((c) => [c.id, c])), [save.creations]);

  // The scene fits the screen above the tray (contain), centred.
  const trayH = Math.max(MIN_TOUCH + 36, height * 0.18);
  const areaH = height - trayH - insets.bottom;
  const scale = Math.min(width / SCENE_W, areaH / SCENE_H);
  const ox = (width - SCENE_W * scale) / 2;
  const oy = (areaH - SCENE_H * scale) / 2;
  const spotRect = (i: number) => {
    const r = data.display_spots[i].rect;
    return { x: ox + r.x * scale, y: oy + r.y * scale, size: r.size * scale };
  };
  const spots: Spot[] = [0, 1, 2, 3, 4, 5, 6, 7, 'podium'];
  const rectOf = (s: Spot) => spotRect(s === 'podium' ? 8 : s);
  const traySize = Math.min(trayH - 16, 96);
  const trayItems = save.creations.map((c, i) => ({ c, x: insets.left + 24 + traySize / 2 + i * (traySize + 10), y: height - insets.bottom - trayH / 2 }));
  const shown = (s: Spot) => occupant(show, s);

  const hitSpot = (x: number, y: number): Spot | null => {
    for (const s of spots) {
      const r = rectOf(s);
      if (x >= r.x && x <= r.x + r.size && y >= r.y && y <= r.y + r.size) return s;
    }
    return null;
  };
  const update = (fn: (s: typeof show) => typeof show) => saveStore.update((sv) => ({ ...sv, showcase: fn(sv.showcase) }));
  const heroChanged = (id: string | null) => {
    const c = id ? byId.get(id) : null;
    if (c) say(`name-${c.spec.nameId}` as LineId);
  };

  // Drag items: the tray plushies, then the shown ones.
  const items = useMemo(
    () => [
      ...trayItems.map((t) => ({ x: t.x, y: t.y, r: traySize / 2 })),
      ...spots.flatMap((s) => {
        const r = rectOf(s);
        return shown(s) ? [{ x: r.x + r.size / 2, y: r.y + r.size / 2, r: r.size / 2 }] : [{ x: -9999, y: -9999, r: 0 }];
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [save.creations, show, width, height],
  );
  const idForItem = (i: number): string | null => (i < trayItems.length ? trayItems[i].c.id : shown(spots[i - trayItems.length]));
  const onDrop = (i: number, x: number, y: number) => {
    const id = idForItem(i);
    if (!id) return;
    const target = hitSpot(x, y);
    const inTray = y >= height - insets.bottom - trayH;
    if (target === null && inTray) {
      // Back to the tray (or a tap on a tray plushie: select it).
      if (positionOf(show, id) !== null) update((s) => removeFrom(s, id));
      else setSelected(selected === id ? null : id);
      return;
    }
    if (target === null) return;
    if (positionOf(show, id) === target) {
      // A tap on a shown plushie: select it (then tap a spot to move it).
      setSelected(selected === id ? null : id);
      if (target === 'podium') heroChanged(id);
      return;
    }
    update((s) => placeAt(s, id, target));
    setSelected(null);
    if (target === 'podium') heroChanged(id);
  };
  const onTap = (x: number, y: number) => {
    const target = hitSpot(x, y);
    if (selected && target !== null) {
      update((s) => placeAt(s, selected, target));
      if (target === 'podium') heroChanged(selected);
      setSelected(null);
    }
  };
  const drag = useTrayDrag({ testId: 'showcase-drag', items, onDrop, onTap });
  const carried = useAnimatedStyle(() => ({ opacity: drag.picked.value >= 0 ? 0.9 : 0, transform: [{ translateX: drag.dragX.value - 40 }, { translateY: drag.dragY.value - 40 }] }));

  const hero = show.podium ? byId.get(show.podium) : undefined;
  const heroRect = rectOf('podium');
  const plaque = { x: ox + data.name_plaque[0] * scale, y: oy + data.name_plaque[1] * scale };
  const charm = { x: ox + data.wall_charm.pos[0] * scale, y: oy + data.wall_charm.pos[1] * scale };
  return (
    <View style={styles.root} testID="showcase-screen">
      <GestureDetector gesture={drag.gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill color="#F8E4DE" />
            {scene ? <Image image={scene} x={ox} y={oy} width={SCENE_W * scale} height={SCENE_H * scale} fit="fill" /> : null}
            {hero ? <Plush spec={hero.spec} x={heroRect.x} y={heroRect.y} size={heroRect.size} mouth="big_happy" /> : null}
          </Canvas>
          {spots.map((s) => {
            if (s === 'podium') return null;
            const id = shown(s);
            const c = id ? byId.get(id) : undefined;
            const r = rectOf(s);
            return (
              <View key={s} pointerEvents="none" style={[styles.spot, { left: r.x, top: r.y, width: r.size, height: r.size }, selected && id === selected && styles.selected]} testID={`spot-${s}${id ? `-${id}` : ''}`}>
                {c ? <Snapshot c={c} size={r.size} /> : null}
              </View>
            );
          })}
          {hero ? <View pointerEvents="none" testID={`spot-podium-${hero.id}`} style={[styles.spot, { left: heroRect.x, top: heroRect.y, width: heroRect.size, height: heroRect.size }, selected === hero.id && styles.selected]} /> : null}
          <View style={[styles.tray, { height: trayH, bottom: insets.bottom }]} pointerEvents="none">
            {trayItems.map((t) => (
              <View key={t.c.id} testID={`showcase-tray-${t.c.id}`} style={[styles.trayItem, { left: t.x - traySize / 2, top: (trayH - traySize) / 2, width: traySize, height: traySize }, positionOf(show, t.c.id) !== null && styles.used, selected === t.c.id && styles.selected]}>
                <Snapshot c={t.c} size={traySize} />
              </View>
            ))}
          </View>
          <Animated.View pointerEvents="none" style={[styles.carried, carried]}>
            <StudioIcon name="save" size={80} />
          </Animated.View>
        </View>
      </GestureDetector>
      {/* The name plaque: the hero's name as an icon; tap to hear it. */}
      <Pressable testID="showcase-plaque" accessibilityRole="button" accessibilityLabel="Name" onPress={() => heroChanged(show.podium)} style={[styles.plaque, { left: plaque.x - 40, top: plaque.y - 32 }]}>
        <StudioIcon name="name" size={64} />
      </Pressable>
      <WallCharm x={charm.x} y={charm.y} isPhone={isPhone} />
      <View style={[styles.home, { top: insets.top + 12, left: insets.left + 12 }]}>
        <HomeButton onHome={onHome} />
      </View>
    </View>
  );
}

/** Saving in the Studio: the newest plushie goes on the podium. */
export { withNewest } from './showcaseLogic';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8E4DE' },
  spot: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end', borderRadius: 16 },
  selected: { borderWidth: 4, borderColor: colors.rose },
  tray: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(246,198,168,0.92)', borderTopWidth: 4, borderColor: colors.line },
  trayItem: { position: 'absolute', borderRadius: 16, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  used: { opacity: 0.4 },
  carried: { position: 'absolute', left: 0, top: 0 },
  plaque: { position: 'absolute', width: 80, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  home: { position: 'absolute' },
});
