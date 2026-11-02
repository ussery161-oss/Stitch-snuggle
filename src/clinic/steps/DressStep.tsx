// Dress: a drawer of outfits. Drag one onto the plushie; it snaps to its anchor within 80 pt (one
// per slot; a new hat replaces the old one). Tap a worn item to take it off. Always optional: the
// done heart is there from the start.
import { Circle, Group, Image, RoundedRect } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { PRAISE_IDS } from '../../audio/lines';
import { say } from '../../audio/speak';
import { bodySet } from '../../plush/registry';
import { ACCESSORY_INFO } from '../../plush/spec';
import type { AccessoryId } from '../../plush/types';
import { MIN_TOUCH } from '../../ui/theme';
import { useArtImage } from '../../ui/useArtImage';
import { plushToScreen, scenePoint, screenToPlush } from '../helpers';
import { dropAccessory, wornAt } from '../snap';
import ClinicStage from '../ui/ClinicStage';
import DoneHeart from '../ui/DoneHeart';
import HandHint from '../ui/HandHint';
import { spriteRect } from '../ui/Sprite';
import { useStall } from '../ui/useStall';
import { useTrayDrag } from '../ui/useTrayDrag';
import type { StepProps } from './types';

/** The drawer (six items, two columns). */
export const DRESS_ITEMS: readonly AccessoryId[] = ['bow_1', 'hat_party', 'glasses_round', 'scarf_1', 'flower', 'bow_tie'];

export default function DressStep({ layout, onDone, spec, repairs, onOutfit }: StepProps) {
  const rect = layout.plush;
  const set = bodySet(spec.base, spec.body, spec.style);
  const [worn, setWorn] = useState<AccessoryId[]>(() => [...spec.accessories]);
  const { hint, progress } = useStall();
  const finished = useRef(false);
  const imgs = [useArtImage(`accessories/${DRESS_ITEMS[0]}`), useArtImage(`accessories/${DRESS_ITEMS[1]}`), useArtImage(`accessories/${DRESS_ITEMS[2]}`), useArtImage(`accessories/${DRESS_ITEMS[3]}`), useArtImage(`accessories/${DRESS_ITEMS[4]}`), useArtImage(`accessories/${DRESS_ITEMS[5]}`)];

  useEffect(() => {
    say('hint-dress');
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const change = useCallback(
    (next: AccessoryId[]) => {
      setWorn(next);
      onOutfit(next);
      progress();
    },
    [onOutfit, progress],
  );

  const tray = scenePoint(layout, [1860, 800]);
  const cell = Math.max(MIN_TOUCH + 4, rect.size * 0.13);
  const items = useMemo(
    () => DRESS_ITEMS.map((_, i) => ({ x: tray.x + (i % 2 === 0 ? -0.55 : 0.55) * cell, y: tray.y + (Math.floor(i / 2) - 1) * cell * 1.1, r: cell * 0.55 })),
    [tray.x, tray.y, cell],
  );
  const onDrop = useCallback(
    (i: number, x: number, y: number) => {
      const p = screenToPlush(rect, x, y);
      const item = DRESS_ITEMS[i];
      const next = dropAccessory(worn, item, [p.x, p.y], set, rect.size);
      // Not near its anchor (it floats back to the drawer), or already worn: nothing changes.
      if (!next.includes(item) || worn.includes(item)) return;
      change(next);
      say(PRAISE_IDS[next.length % PRAISE_IDS.length]);
    },
    [change, rect, set, worn],
  );
  const onTap = useCallback(
    (x: number, y: number) => {
      const p = screenToPlush(rect, x, y);
      const hit = wornAt(worn, [p.x, p.y], set, rect.size);
      if (hit) change(worn.filter((a) => a !== hit));
    },
    [change, rect, set, worn],
  );
  const drag = useTrayDrag({ testId: 'dress-drag', items, onDrop, onTap });
  const carriedT = useDerivedValue(() => [{ translateX: drag.dragX.value }, { translateY: drag.dragY.value }]);
  const carriedSize = (300 * set.fitScale * rect.size) / 1024;

  const first = DRESS_ITEMS.findIndex((a) => !worn.includes(a));
  const firstSlot = first >= 0 ? plushToScreen(rect, set.accessorySlots[ACCESSORY_INFO[DRESS_ITEMS[first]].slot]) : null;
  return (
    <GestureDetector gesture={drag.gesture}>
      <View style={StyleSheet.absoluteFill} testID="step-dress">
        <ClinicStage
          scene="scene_clinic"
          layout={layout}
          spec={{ ...spec, accessories: worn }}
          repairs={repairs}
          plush={{ mouth: 'big_happy' }}
          front={
            <Group>
              <RoundedRect x={tray.x - cell * 1.25} y={tray.y - cell * 1.75} width={cell * 2.5} height={cell * 3.5} r={cell * 0.25} color="rgba(255,255,255,0.75)" />
              {items.map((it, i) => (
                <DrawerItem key={i} img={imgs[i]} x={it.x} y={it.y} size={cell * 0.9} worn={worn.includes(DRESS_ITEMS[i])} />
              ))}
              <Group transform={carriedT}>
                {imgs.map((img, i) => (
                  <Carried key={i} index={i} picked={drag.picked} img={img} size={carriedSize} />
                ))}
              </Group>
            </Group>
          }
        />
        <View testID={`dress-worn-${worn.join('+') || 'none'}`} />
        {hint && first >= 0 && firstSlot ? <HandHint at={items[first]} to={firstSlot} /> : null}
        <DoneHeart onPress={finish} />
      </View>
    </GestureDetector>
  );
}

function DrawerItem({ img, x, y, size, worn }: { img: ReturnType<typeof useArtImage>; x: number; y: number; size: number; worn: boolean }) {
  if (!img) return <Circle cx={x} cy={y} r={size / 2} color="#F4A7B9" opacity={worn ? 0.4 : 1} />;
  const r = spriteRect(img, x, y, size);
  return (
    <Group opacity={worn ? 0.4 : 1}>
      <Image image={img} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />
    </Group>
  );
}

function Carried({ index, picked, img, size }: { index: number; picked: SharedValue<number>; img: ReturnType<typeof useArtImage>; size: number }) {
  const opacity = useDerivedValue(() => (picked.value === index ? 1 : 0));
  if (!img) return null;
  const r = spriteRect(img, 0, 0, size);
  return (
    <Group opacity={opacity}>
      <Image image={img} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />
    </Group>
  );
}
