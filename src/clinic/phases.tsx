// The clinic phases around the care steps: Arrival, Triage and Go home.
import { Circle, Group } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { say } from '../audio/speak';
import type { LineId } from '../audio/lines';
import { useLayout } from '../ui/theme';
import { arrivalTransform, basketTransform, hugTransform, plushToScreen, scenePoint, screenToPlush, type SceneLayout } from './helpers';
import ClinicStage from './ui/ClinicStage';
import DoneHeart from './ui/DoneHeart';
import HandHint from './ui/HandHint';
import Sprite from './ui/Sprite';
import { useStall } from './ui/useStall';
import type { PlushSpec } from '../plush/types';
import type { Repair } from './snap';
import { triageSpots, type Visit } from './visit';

/** Where things stand in scene_clinic (scenes.json). */
export const BASKET_SPOT: readonly [number, number] = [230, 1300];
export const TOOL_TRAY: readonly [number, number] = [1860, 800];
/** The plushie's feet on its 1024 canvas. */
export const FOOT = 0.93;
/** A tap this close (1024 units) to a sore spot finds it. */
export const SPOT_TAP_RADIUS = 120;
/** Every line always ends, but a phase never waits longer than this for one. */
const LINE_BACKSTOP_MS = 9000;

export const OWNERS = ['ui/owners/kid_ada', 'ui/owners/kid_jojo', 'ui/owners/kid_lin', 'ui/owners/kid_mo'] as const;

function footOf(layout: SceneLayout) {
  return { x: layout.plush.x + layout.plush.size / 2, y: layout.plush.y + layout.plush.size * FOOT };
}

// ---------- Arrival ----------

export function Arrival({ visit, layout, onArrived }: { visit: Visit; layout: SceneLayout; onArrived: () => void }) {
  const { width } = useLayout();
  const reduce = useReducedMotion();
  const slide = useSharedValue(reduce ? 1 : 0);
  const hop = useSharedValue(0);
  const done = useRef(false);
  const foot = footOf(layout);
  const basket = scenePoint(layout, BASKET_SPOT);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    hop.set(withTiming(1, { duration: reduce ? 1 : 650, easing: Easing.out(Easing.back(1.4)) }));
    setTimeout(onArrived, reduce ? 50 : 700);
  }, [hop, onArrived, reduce]);
  useEffect(() => {
    slide.set(withTiming(1, { duration: reduce ? 1 : 1000, easing: Easing.out(Easing.cubic) }));
    const backstop = setTimeout(finish, LINE_BACKSTOP_MS);
    const t = setTimeout(() => say(visit.storyId as LineId, { onDone: () => setTimeout(finish, 300) }), reduce ? 0 : 900);
    return () => {
      clearTimeout(t);
      clearTimeout(backstop);
    };
  }, [finish, reduce, slide, visit.storyId]);
  const plushT = useDerivedValue(() => arrivalTransform(slide.value, hop.value, foot, basket, width));
  const basketT = useDerivedValue(() => basketTransform(slide.value, width));
  const basketOpacity = useDerivedValue(() => 1 - hop.value * 0.6);
  return (
    <View style={StyleSheet.absoluteFill} testID="phase-arrival">
      <ClinicStage
        scene="scene_clinic"
        layout={layout}
        spec={visit.plush}
        plush={{ mouth: 'sad_ouch' }}
        plushGroup={plushT}
        front={
          <Group transform={basketT} opacity={basketOpacity}>
            <Sprite id="ui/basket" x={basket.x} y={basket.y + layout.plush.size * 0.04} size={layout.plush.size * 0.48} />
          </Group>
        }
      />
    </View>
  );
}

// ---------- Triage ----------

function Glow({ x, y, pulse }: { x: number; y: number; pulse: SharedValue<number> }) {
  const r = useDerivedValue(() => 46 + 14 * pulse.value);
  const o = useDerivedValue(() => 0.35 + 0.35 * pulse.value);
  return (
    <Group>
      <Circle cx={x} cy={y} r={r} color="#FFE27A" opacity={o} />
      <Circle cx={x} cy={y} r={20} color="#FFF6C8" opacity={o} />
    </Group>
  );
}

export function Triage({ visit, layout, found, onSpot, onDone }: { visit: Visit; layout: SceneLayout; found: readonly string[]; onSpot: (id: string) => void; onDone: () => void }) {
  const spots = useMemo(() => triageSpots(visit), [visit]);
  const rect = layout.plush;
  const { hint, heart, progress } = useStall();
  const pulse = useSharedValue(0);
  const reduce = useReducedMotion();
  const finished = useRef(false);
  useEffect(() => {
    say('hint-find-spots');
    if (!reduce) pulse.set(withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0, { duration: 650 })), -1, false));
  }, [pulse, reduce]);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);
  // The latest found list for the tap callback (it can run before the next render).
  const foundRef = useRef<readonly string[]>(found);
  const allFound = useRef(false);
  useEffect(() => {
    foundRef.current = found;
    allFound.current = spots.every((sp) => found.includes(sp.id));
    if (!allFound.current) return;
    // The last "ouch" ends the triage; this backstop covers a line that never reports back.
    const t = setTimeout(finish, LINE_BACKSTOP_MS);
    return () => clearTimeout(t);
  }, [found, spots, finish]);
  const onTap = useCallback(
    (x: number, y: number) => {
      const open = spots.filter((sp) => !foundRef.current.includes(sp.id));
      let best: (typeof spots)[number] | null = null;
      let bestD = SPOT_TAP_RADIUS;
      for (const sp of open) {
        const d = Math.hypot(sp.xy[0] - x, sp.xy[1] - y);
        if (d <= bestD) {
          best = sp;
          bestD = d;
        }
      }
      if (!best) return;
      foundRef.current = [...foundRef.current, best.id];
      progress();
      onSpot(best.id);
      say('ouch-thanks', {
        onDone: () => {
          if (allFound.current) setTimeout(finish, 400);
        },
      });
    },
    [finish, onSpot, progress, spots],
  );
  /* eslint-disable react-hooks/refs */
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .withTestId('triage-tap')
        .onEnd((e) => {
        'worklet';
        const p = screenToPlush(rect, e.x, e.y);
        scheduleOnRN(onTap, p.x, p.y);
      }),
    [onTap, rect],
  );
  /* eslint-enable react-hooks/refs */
  const next = spots.find((s) => !found.includes(s.id));
  const nextScreen = next ? plushToScreen(rect, next.xy) : null;
  const overlay = (
    <Group>
      {spots
        .filter((s) => !found.includes(s.id))
        .map((s) => (
          <Glow key={s.id} x={s.xy[0]} y={s.xy[1]} pulse={pulse} />
        ))}
    </Group>
  );
  const mag = nextScreen ?? footOf(layout);
  const bob = useDerivedValue(() => [{ translateY: -10 * pulse.value }]);
  return (
    <GestureDetector gesture={tap}>
      <View style={StyleSheet.absoluteFill} testID="phase-triage">
        <ClinicStage
          scene="scene_clinic"
          layout={layout}
          spec={visit.plush}
          plush={{ mouth: 'sad_ouch', overlay }}
          front={
            <Group transform={bob}>
              <Sprite id="tools/magnifier" x={mag.x + rect.size * 0.12} y={mag.y - rect.size * 0.1} size={rect.size * 0.2} />
            </Group>
          }
        />
        {/* The magnifier comes with a hand hint from the start, and again after 8 s with no tap. */}
        {nextScreen && (found.length === 0 || hint) ? <HandHint at={nextScreen} /> : null}
        {heart ? <DoneHeart onPress={finish} /> : null}
      </View>
    </GestureDetector>
  );
}

// ---------- Go home ----------

export function GoHome({ visit, layout, onDone, spec, repairs, owner: ownerId }: { visit: Visit; layout: SceneLayout; onDone: () => void; spec: PlushSpec; repairs: readonly Repair[]; owner?: string }) {
  const { width } = useLayout();
  const reduce = useReducedMotion();
  const walk = useSharedValue(reduce ? 1 : 0);
  const hug = useSharedValue(0);
  const done = useRef(false);
  const foot = footOf(layout);
  const owner = ownerId ? `ui/owners/${ownerId}` : OWNERS[visit.seed % OWNERS.length];
  const ownerSize = layout.plush.size * 0.62;
  const standX = Math.min(width - ownerSize * 0.35, layout.plush.x + layout.plush.size * 0.86);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);
  useEffect(() => {
    walk.set(withTiming(1, { duration: reduce ? 1 : 900, easing: Easing.out(Easing.cubic) }));
    if (!reduce)
      hug.set(
        withSequence(withTiming(0, { duration: 900 }), withTiming(1, { duration: 350 }), withTiming(0.4, { duration: 350 }), withTiming(1, { duration: 300 }), withTiming(0, { duration: 500 })),
      );
    const backstop = setTimeout(finish, LINE_BACKSTOP_MS + 3000);
    say('every-toy-loved', { onDone: () => say('thank-you', { onDone: () => setTimeout(finish, 500) }) });
    return () => clearTimeout(backstop);
  }, [finish, hug, reduce, walk]);
  const plushT = useDerivedValue(() => hugTransform(hug.value, foot));
  const ownerT = useDerivedValue(() => [{ translateX: (width - standX + ownerSize) * (1 - walk.value) - 40 * hug.value }]);
  const heartsOpacity = useDerivedValue(() => hug.value);
  return (
    <View style={StyleSheet.absoluteFill} testID="phase-gohome">
      <ClinicStage
        scene="scene_clinic"
        layout={layout}
        spec={spec}
        repairs={repairs}
        plush={{ mouth: 'big_happy' }}
        plushGroup={plushT}
        front={
          <Group>
            <Group transform={ownerT}>
              <Sprite id={owner} x={standX} y={foot.y - ownerSize * 0.48} size={ownerSize} />
            </Group>
            <Group opacity={heartsOpacity}>
              <Sprite id="tools/heart_burst" x={layout.plush.x + layout.plush.size * 0.62} y={layout.plush.y + layout.plush.size * 0.22} size={layout.plush.size * 0.34} />
            </Group>
          </Group>
        }
      />
    </View>
  );
}
