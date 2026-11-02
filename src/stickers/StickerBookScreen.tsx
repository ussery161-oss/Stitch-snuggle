// The sticker book: one page per base, then My Creations and Seasonal. Earned stickers wait in the
// tray at the bottom; tap one to put it on the page, then drag, pinch and rotate it anywhere.
// Dragging it back down to the tray takes it off. Locked pages (demo) show a padlock and wiggle.
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { isLocked } from '../logic/entitlements';
import type { StickerPlacement } from '../storage/schema';
import { saveStore, useSave } from '../storage/useSave';
import StudioIcon from '../studio/StudioIcons';
import Wiggle from '../studio/Wiggle';
import ArtImage from '../ui/ArtImage';
import HomeButton from '../ui/HomeButton';
import { colors, MIN_TOUCH, useLayout } from '../ui/theme';
import { useStickerSource } from './stickerArt';
import { addPlacement, droppedInTray, PAGES, pageBackground, removePlacement, updatePlacement } from './stickers';

const STICKER_PT = 120;

export function StickerPicture({ id, size }: { id: string; size: number }) {
  const save = useSave();
  const src = useStickerSource(id, save);
  return (
    <View style={[styles.sticker, { width: size, height: size, borderRadius: size * 0.2 }]}>
      {src ? <Image source={src} style={{ width: size * 0.86, height: size * 0.86 }} resizeMode="contain" /> : <StudioIcon name="save" size={size * 0.5} />}
    </View>
  );
}

function PlacedSticker({ p, trayTop, onChange, onRemove }: { p: StickerPlacement; trayTop: number; onChange: (id: string, x: number, y: number, scale: number, rotation: number) => void; onRemove: (id: string) => void }) {
  const tx = useSharedValue(p.x);
  const ty = useSharedValue(p.y);
  const sc = useSharedValue(p.scale);
  const rot = useSharedValue(p.rotation);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startS = useSharedValue(1);
  const startR = useSharedValue(0);
  const commit = () => {
    'worklet';
    if (ty.value + STICKER_PT / 2 >= trayTop) scheduleOnRN(onRemove, p.id);
    else scheduleOnRN(onChange, p.id, tx.value, ty.value, sc.value, rot.value);
  };
  const pan = Gesture.Pan()
    .withTestId(`sticker-pan-${p.id}`)
    .onBegin(() => {
      'worklet';
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      'worklet';
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      commit();
    });
  const pinch = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      startS.value = sc.value;
    })
    .onUpdate((e) => {
      'worklet';
      sc.value = Math.max(0.3, Math.min(3, startS.value * e.scale));
    })
    .onEnd(() => {
      'worklet';
      commit();
    });
  const rotate = Gesture.Rotation()
    .onBegin(() => {
      'worklet';
      startR.value = rot.value;
    })
    .onUpdate((e) => {
      'worklet';
      rot.value = startR.value + e.rotation;
    })
    .onEnd(() => {
      'worklet';
      commit();
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value - STICKER_PT / 2 }, { translateY: ty.value - STICKER_PT / 2 }, { scale: sc.value }, { rotate: `${rot.value}rad` }],
  }));
  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch, rotate)}>
      <Animated.View style={[styles.placed, style]} testID={`placed-${p.id}`}>
        <StickerPicture id={p.stickerId} size={STICKER_PT} />
      </Animated.View>
    </GestureDetector>
  );
}

export default function StickerBookScreen({ onHome }: { onHome: () => void }) {
  const save = useSave();
  const [page, setPage] = useState(PAGES[0]);
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  const { width, height } = useLayout();
  const insets = useSafeAreaInsets();
  const trayH = Math.max(MIN_TOUCH + 40, height * 0.2);
  const trayTop = height - trayH - insets.bottom;
  const earned = Object.keys(save.stickers).sort((a, b) => save.stickers[a].localeCompare(save.stickers[b]));
  const onPage = save.placements.filter((p) => p.page === page);
  const locked = isLocked('stickerPage', page, save.entitlement.unlocked);

  const place = (stickerId: string) => {
    if (locked) return;
    const n = onPage.length;
    saveStore.update((s) => ({
      ...s,
      placements: addPlacement(s.placements, { id: `p${Date.now().toString(36)}${n}`, stickerId, page, x: width / 2 + ((n % 5) - 2) * 40, y: trayTop / 2 + ((n % 3) - 1) * 30, scale: 1, rotation: 0 }),
    }));
  };
  const onChange = (id: string, x: number, y: number, scale: number, rotation: number) => saveStore.update((s) => ({ ...s, placements: updatePlacement(s.placements, id, { x, y, scale, rotation }) }));
  const onRemove = (id: string) => saveStore.update((s) => ({ ...s, placements: removePlacement(s.placements, id) }));

  return (
    <View style={styles.root} testID="stickers-screen">
      <ArtImage id={pageBackground(page)} size={height} aspect={width / height} style={StyleSheet.absoluteFill} placeholder={<View style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]} />} />
      {onPage.map((p) => (
        <PlacedSticker key={p.id} p={p} trayTop={trayTop} onChange={onChange} onRemove={onRemove} />
      ))}
      {locked ? (
        <View style={styles.lockedPage} pointerEvents="none">
          <StudioIcon name="padlock" size={120} />
        </View>
      ) : null}
      {/* Page tabs. */}
      <ScrollView horizontal style={[styles.tabs, { top: insets.top + 8, left: insets.left + 100 }]} contentContainerStyle={styles.tabRow}>
        {PAGES.map((pg, i) => (
          <Wiggle key={pg} trigger={wiggles[pg] ?? 0}>
            <Pressable
              testID={`page-${pg}`}
              accessibilityRole="button"
              accessibilityLabel={`Page ${i + 1}`}
              onPress={() => {
                setPage(pg);
                if (isLocked('stickerPage', pg, save.entitlement.unlocked)) setWiggles((w) => ({ ...w, [pg]: (w[pg] ?? 0) + 1 }));
              }}
              style={[styles.tab, page === pg && styles.tabOn]}
            >
              {pg === 'creations' ? <StudioIcon name="edit" size={44} /> : pg === 'seasonal' ? <StudioIcon name="dice" size={44} /> : <StickerPicture id={`preset-${pg}`} size={52} />}
              {isLocked('stickerPage', pg, save.entitlement.unlocked) ? (
                <View style={styles.tabLock}>
                  <StudioIcon name="padlock" size={24} />
                </View>
              ) : null}
            </Pressable>
          </Wiggle>
        ))}
      </ScrollView>
      {/* The tray of earned stickers. */}
      <View style={[styles.tray, { height: trayH, bottom: insets.bottom }]} testID="sticker-tray">
        <ScrollView horizontal contentContainerStyle={styles.trayRow}>
          {earned.map((id) => (
            <Pressable key={id} testID={`tray-${id}`} accessibilityRole="button" accessibilityLabel="A sticker" onPress={() => place(id)} style={styles.trayItem}>
              <StickerPicture id={id} size={Math.min(trayH - 20, 96)} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={[styles.home, { top: insets.top + 12, left: insets.left + 12 }]}>
        <HomeButton onHome={onHome} />
      </View>
    </View>
  );
}

export { droppedInTray };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  sticker: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  placed: { position: 'absolute', left: 0, top: 0 },
  lockedPage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },
  tabs: { position: 'absolute', right: 12, maxHeight: 84 },
  tabRow: { gap: 8, alignItems: 'center' },
  tab: { width: MIN_TOUCH + 8, height: MIN_TOUCH + 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  tabOn: { borderColor: colors.rose },
  tabLock: { position: 'absolute', right: -2, bottom: -2 },
  tray: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(246,198,168,0.92)', borderTopWidth: 4, borderColor: colors.line },
  trayRow: { gap: 12, padding: 10, alignItems: 'center' },
  trayItem: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH },
  home: { position: 'absolute' },
});
