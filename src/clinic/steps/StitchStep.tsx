// Stitch: trace the dotted line over the rip. The needle follows the finger; progress is the
// furthest point reached while the finger stays within 28 pt of the path ahead. Thread and
// X-stitches appear behind the needle. Lifting off or wandering away only pauses (never a buzz).
import { Circle, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { say } from '../../audio/speak';
import { PRAISE_IDS } from '../../audio/lines';
import { plushToScreen, scenePoint, screenToPlush } from '../helpers';
import { advanceStitch, cumulativeLengths, pointAt, stitchDone } from '../stitchMath';
import ClinicStage from '../ui/ClinicStage';
import DoneHeart from '../ui/DoneHeart';
import HandHint from '../ui/HandHint';
import Sprite from '../ui/Sprite';
import { useStall } from '../ui/useStall';
import { damagesFor, type Damage } from '../visit';
import type { StepProps } from './types';

/** Finger tolerance (pt) and how far ahead the finger may pick up the path (1024 units). */
export const STITCH_TOLERANCE_PT = 28;
export const STITCH_LOOKAHEAD = 130;
export const X_STITCH_GAP = 38;
export const THREAD_COLOR = '#D9577A';
const LINE = '#4A3A3A';

function polyPath(pts: readonly number[]): SkPath {
  const p = Skia.Path.Make();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i + 1 < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  return p;
}

/** The torn edge: a small zigzag along the rip. */
function tornPath(pts: readonly number[], cum: readonly number[]): SkPath {
  const p = Skia.Path.Make();
  const total = cum[cum.length - 1];
  const n = Math.max(6, Math.round(total / 14));
  for (let k = 0; k <= n; k++) {
    const s = (k / n) * total;
    const a = pointAt(pts, cum, Math.max(0, s - 1));
    const b = pointAt(pts, cum, Math.min(total, s + 1));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const side = (k % 2 === 0 ? 1 : -1) * 9;
    const c = pointAt(pts, cum, s);
    const x = c.x - (dy / len) * side;
    const y = c.y + (dx / len) * side;
    if (k === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  return p;
}

function XStitch({ x, y, at, progress }: { x: number; y: number; at: number; progress: SharedValue<number> }) {
  const opacity = useDerivedValue(() => (progress.value >= at ? 1 : 0));
  const p = useMemo(() => {
    const path = Skia.Path.Make();
    path.moveTo(x - 11, y - 11);
    path.lineTo(x + 11, y + 11);
    path.moveTo(x + 11, y - 11);
    path.lineTo(x - 11, y + 11);
    return path;
  }, [x, y]);
  return <Path path={p} color={THREAD_COLOR} style="stroke" strokeWidth={7} strokeCap="round" opacity={opacity} />;
}

export function RipTrace({ rip, layout, onRipDone, onProgress, children }: { rip: Damage; layout: StepProps['layout']; onRipDone: () => void; onProgress: () => void; children: (overlay: ReactNode, needle: ReactNode, hintAt: () => { x: number; y: number }, hintTo: () => { x: number; y: number }) => ReactNode }) {
  const pts = useMemo(() => (rip.path ?? []).flatMap((p) => [p[0], p[1]]), [rip.path]);
  const cum = useMemo(() => cumulativeLengths(pts), [pts]);
  const total = cum[cum.length - 1];
  const rect = layout.plush;
  const tolerance = (STITCH_TOLERANCE_PT * 1024) / rect.size;
  const progress = useSharedValue(0);
  const reported = useSharedValue(false);
  const bucket = useSharedValue(0);
  const needleX = useSharedValue(pts[0]);
  const needleY = useSharedValue(pts[1]);

  const pan = Gesture.Pan()
    .withTestId('stitch-pan')
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      const p = screenToPlush(rect, e.x, e.y);
      needleX.value = p.x;
      needleY.value = p.y;
    })
    .onUpdate((e) => {
      'worklet';
      if (reported.value) return;
      const p = screenToPlush(rect, e.x, e.y);
      needleX.value = p.x;
      needleY.value = p.y;
      const next = advanceStitch(pts, cum, p.x, p.y, progress.value, tolerance, STITCH_LOOKAHEAD);
      if (next > progress.value) {
        progress.value = next;
        const b = Math.floor(next / 30);
        if (b > bucket.value) {
          bucket.value = b;
          scheduleOnRN(onProgress);
        }
      }
      if (stitchDone(progress.value, total)) {
        reported.value = true;
        progress.value = total;
        scheduleOnRN(onRipDone);
      }
    });

  const thread = useMemo(() => polyPath(pts), [pts]);
  const torn = useMemo(() => tornPath(pts, cum), [pts, cum]);
  const end = useDerivedValue(() => (total > 0 ? progress.value / total : 0));
  const dots = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let s = 0; s <= total; s += 24) out.push(pointAt(pts, cum, s));
    return out;
  }, [pts, cum, total]);
  const stitches = useMemo(() => {
    const out: { x: number; y: number; at: number }[] = [];
    for (let s = X_STITCH_GAP / 2; s < total; s += X_STITCH_GAP) out.push({ ...pointAt(pts, cum, s), at: s });
    return out;
  }, [pts, cum, total]);
  const needleT = useDerivedValue(() => [{ translateX: needleX.value }, { translateY: needleY.value }, { rotate: -0.7 }]);
  const needlePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, 0);
    p.lineTo(0, -110);
    return p;
  }, []);

  const overlay = (
    <Group>
      <Path path={torn} color={LINE} style="stroke" strokeWidth={6} strokeJoin="round" />
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={7} color="#FFFFFF" />
      ))}
      <Path path={thread} color={THREAD_COLOR} style="stroke" strokeWidth={9} strokeCap="round" strokeJoin="round" start={0} end={end} />
      {stitches.map((s, i) => (
        <XStitch key={i} x={s.x} y={s.y} at={s.at} progress={progress} />
      ))}
    </Group>
  );
  const needle = (
    <Group transform={needleT}>
      <Path path={needlePath} color="#B8C2CC" style="stroke" strokeWidth={9} strokeCap="round" />
      <Circle cx={0} cy={-96} r={6} color={LINE} />
      <Circle cx={0} cy={-96} r={3} color="#FFFFFF" />
    </Group>
  );
  const hintAt = () => {
    const p = pointAt(pts, cum, progress.value);
    return plushToScreen(rect, [p.x, p.y]);
  };
  const hintTo = () => {
    const p = pointAt(pts, cum, Math.min(total, progress.value + 120));
    return plushToScreen(rect, [p.x, p.y]);
  };
  return <GestureDetector gesture={pan}>{children(overlay, needle, hintAt, hintTo)}</GestureDetector>;
}

export default function StitchStep({ visit, layout, onDone, spec, repairs, onRepair }: StepProps) {
  const rips = useMemo(() => damagesFor(visit, 'stitch'), [visit]);
  const [index, setIndex] = useState(0);
  const { hint, heart, progress } = useStall();
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    say('hint-stitch');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);
  const onRipDone = useCallback(() => {
    progress();
    const sewn = rips[Math.min(index, rips.length - 1)];
    if (sewn?.path) onRepair({ kind: 'stitch', path: sewn.path });
    say(PRAISE_IDS[index % PRAISE_IDS.length]);
    timer.current = setTimeout(() => {
      if (index + 1 < rips.length) setIndex(index + 1);
      else finish();
    }, 900);
  }, [finish, index, onRepair, progress, rips]);
  const rip = rips[Math.min(index, rips.length - 1)];
  const tray = scenePoint(layout, [1860, 800]);
  if (!rip) return null;
  return (
    <RipTrace key={rip.id} rip={rip} layout={layout} onRipDone={onRipDone} onProgress={progress}>
      {(overlay, needle, hintAt, hintTo) => (
        <View style={StyleSheet.absoluteFill} testID="step-stitch">
          <ClinicStage
            scene="scene_clinic"
            layout={layout}
            spec={spec}
            repairs={repairs}
            plush={{ mouth: 'neutral', overlay }}
            front={
              <Group>
                <Sprite id="tools/needle_spool" x={tray.x} y={tray.y} size={layout.plush.size * 0.22} />
                <Group transform={[{ translateX: layout.plush.x }, { translateY: layout.plush.y }, { scale: layout.plush.size / 1024 }]}>{needle}</Group>
              </Group>
            }
          />
          {hint ? <HandHint at={hintAt()} to={hintTo()} /> : null}
          {heart ? <DoneHeart onPress={finish} /> : null}
        </View>
      )}
    </RipTrace>
  );
}
