// Patch: pick one of three fabric swatches and drag it onto the hole; it snaps on within 60 pt
// (anywhere else it just floats back to the tray). Then tap the three glowing dots to sew it on.
// The patch stays on the plushie for the rest of the visit.
import { Circle, Group, Image, Path, Skia, type SkImage } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PRAISE_IDS } from '../../audio/lines';
import { say } from '../../audio/speak';
import { MIN_TOUCH } from '../../ui/theme';
import { useArtImage } from '../../ui/useArtImage';
import { plushToScreen, scenePoint, screenToPlush } from '../helpers';
import { patchDots, ptToUnits, snapPatch } from '../snap';
import ClinicStage from '../ui/ClinicStage';
import DoneHeart from '../ui/DoneHeart';
import HandHint from '../ui/HandHint';
import { PatchDrawing } from '../ui/RepairsOverlay';
import { spriteRect } from '../ui/Sprite';
import { useStall } from '../ui/useStall';
import { useTrayDrag } from '../ui/useTrayDrag';
import { damagesFor } from '../visit';
import type { StepProps } from './types';

export const SWATCHES = ['fabrics/patch_swatch_pink_dots', 'fabrics/patch_swatch_mint_check', 'fabrics/patch_swatch_butter_stars'] as const;
const DOT_TAP_UNITS = 80;

export default function PatchStep({ visit, layout, onDone, spec, repairs, onRepair }: StepProps) {
  const hole = useMemo(() => damagesFor(visit, 'patch')[0], [visit]);
  const rect = layout.plush;
  const radius = hole?.radius ?? 62;
  const [placed, setPlaced] = useState<string | null>(null);
  const [sewn, setSewn] = useState<number[]>([]);
  const { hint, heart, progress } = useStall();
  const finished = useRef(false);
  const reduce = useReducedMotion();
  const glow = useSharedValue(0);
  const swatchImgs = [useArtImage(SWATCHES[0]), useArtImage(SWATCHES[1]), useArtImage(SWATCHES[2])];
  const holeImg = useArtImage('damage/hole');
  const targetImg = useArtImage('damage/patch_target');

  useEffect(() => {
    say('hint-patch');
    if (!reduce) glow.set(withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0, { duration: 600 })), -1, false));
  }, [glow, reduce]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  // The tray: three swatches stacked at the tool tray.
  const tray = scenePoint(layout, [1860, 800]);
  const swSize = Math.max(MIN_TOUCH + 8, rect.size * 0.15);
  const items = useMemo(
    () =>
      [-1, 0, 1].map((k) => ({
        x: tray.x,
        y: tray.y + k * swSize * 1.25,
        r: swSize * 0.62,
      })),
    [tray.x, tray.y, swSize],
  );

  const onDrop = useCallback(
    (i: number, x: number, y: number) => {
      if (!hole || placed) return;
      const p = screenToPlush(rect, x, y);
      if (snapPatch([p.x, p.y], hole.xy, rect.size)) {
        setPlaced(SWATCHES[i]);
        progress();
        say('hint-patch-sew');
      }
    },
    [hole, placed, progress, rect],
  );
  const drag = useTrayDrag({ testId: 'patch-drag', items, onDrop });

  const dots = useMemo(() => (hole ? patchDots(hole.xy, radius * 0.72) : []), [hole, radius]);
  const onSewTap = useCallback(
    (x: number, y: number) => {
      const p = screenToPlush(rect, x, y);
      const i = dots.findIndex((d, k) => !sewn.includes(k) && Math.hypot(d[0] - p.x, d[1] - p.y) <= DOT_TAP_UNITS);
      if (i < 0) return;
      const next = [...sewn, i];
      setSewn(next);
      progress();
      if (next.length === dots.length && hole && placed) {
        onRepair({ kind: 'patch', at: hole.xy, radius, swatch: placed });
        say(PRAISE_IDS[visit.seed % PRAISE_IDS.length]);
        setTimeout(finish, 900);
      }
    },
    [dots, finish, hole, onRepair, placed, progress, radius, rect, sewn, visit.seed],
  );
  // The tap's callback runs on the UI thread (the compiler lint can't tell it doesn't run in render).
  /* eslint-disable react-hooks/refs */
  const sewTap = Gesture.Tap()
    .withTestId('patch-sew')
    .onEnd((e) => {
      'worklet';
      scheduleOnRN(onSewTap, e.x, e.y);
    });
  /* eslint-enable react-hooks/refs */

  const dotR = useDerivedValue(() => 16 + 8 * glow.value);
  const dragT = useDerivedValue(() => [{ translateX: drag.dragX.value }, { translateY: drag.dragY.value }]);
  const placedImg = placed ? swatchImgs[SWATCHES.indexOf(placed as (typeof SWATCHES)[number])] : null;

  if (!hole) return null;
  const overlay = (
    <Group>
      {placed ? (
        <Group>
          <PatchDrawing at={hole.xy} radius={radius} image={placedImg} dotsDone={0} />
          {dots.map((d, k) =>
            sewn.includes(k) ? (
              <Path key={k} path={xMark(d[0], d[1])} color="#D9577A" style="stroke" strokeWidth={7} strokeCap="round" />
            ) : (
              <Circle key={k} cx={d[0]} cy={d[1]} r={dotR} color="#FFE27A" opacity={0.9} />
            ),
          )}
        </Group>
      ) : (
        <Group>
          {holeImg ? <HoleImage img={holeImg} at={hole.xy} size={radius * 2.2} /> : <Circle cx={hole.xy[0]} cy={hole.xy[1]} r={radius * 0.8} color="#4A3A3A" />}
          {targetImg ? <HoleImage img={targetImg} at={hole.xy} size={ptToUnits(150, rect.size)} /> : null}
        </Group>
      )}
    </Group>
  );
  const holeScreen = plushToScreen(rect, hole.xy);
  const nextDot = dots.find((_, k) => !sewn.includes(k));
  return (
    <GestureDetector gesture={placed ? sewTap : drag.gesture}>
      <View style={StyleSheet.absoluteFill} testID="step-patch">
        <ClinicStage
          scene="scene_clinic"
          layout={layout}
          spec={spec}
          repairs={repairs}
          plush={{ mouth: placed ? 'smile' : 'neutral', overlay }}
          front={
            <Group>
              {placed
                ? null
                : items.map((it, i) =>
                    swatchImgs[i] ? (
                      <Image key={i} image={swatchImgs[i]} x={it.x - swSize / 2} y={it.y - swSize / 2} width={swSize} height={swSize} fit="cover" />
                    ) : (
                      <Circle key={i} cx={it.x} cy={it.y} r={swSize / 2} color={['#F4A7B9', '#A8DCC8', '#F7D97C'][i]} />
                    ),
                  )}
              <Group transform={dragT}>
                {swatchImgs.map((img, i) => (
                  <Carried key={i} index={i} picked={drag.picked} image={img} size={(radius * 2.1 * rect.size) / 1024} />
                ))}
              </Group>
            </Group>
          }
        />
        {hint ? placed && nextDot ? <HandHint at={plushToScreen(rect, nextDot)} /> : <HandHint at={items[0]} to={holeScreen} /> : null}
        {heart ? <DoneHeart onPress={finish} /> : null}
      </View>
    </GestureDetector>
  );
}

/** The swatch in the child's finger (shown only while it's the picked one). */
function Carried({ index, picked, image, size }: { index: number; picked: SharedValue<number>; image: SkImage | null; size: number }) {
  const opacity = useDerivedValue(() => (picked.value === index ? 1 : 0));
  return (
    <Group opacity={opacity}>
      {image ? (
        <Image image={image} x={-size / 2} y={-size / 2} width={size} height={size} fit="cover" />
      ) : (
        <Circle cx={0} cy={0} r={size / 2} color="#F4A7B9" />
      )}
    </Group>
  );
}

function xMark(x: number, y: number) {
  const p = Skia.Path.Make();
  p.moveTo(x - 12, y - 12);
  p.lineTo(x + 12, y + 12);
  p.moveTo(x + 12, y - 12);
  p.lineTo(x - 12, y + 12);
  return p;
}

function HoleImage({ img, at, size }: { img: SkImage; at: readonly [number, number]; size: number }) {
  const r = spriteRect(img, at[0], at[1], size);
  return <Image image={img} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />;
}
