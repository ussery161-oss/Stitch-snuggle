// Wash, in three phases:
//  1. Soap: rubbing erases the mud (BlendMode.Clear strokes, clipped to the part) and makes suds
//     (at most 40). Coverage is measured on the 32×32 grid at 10 Hz on the JS thread; at 85 % the
//     rest of the mud fades away by itself.
//  2. Rinse: drag the shower; it pops the suds it passes.
//  3. Dry: wiggle the towel over the plushie for 3 s.
import { Circle, Group, Image, Skia } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { say } from '../../audio/speak';
import type { PlushAssets } from '../../plush/assets';
import type { BodySet } from '../../plush/types';
import { useArtImage } from '../../ui/useArtImage';
import { makeGrid, reachedAutoFinish, stampStroke, type CoverageGrid } from '../coverage';
import { addSud, addWiggle, DRY_MS, plushToScreen, popSuds, scenePoint, screenToPlush, type Sud } from '../helpers';
import ClinicStage from '../ui/ClinicStage';
import DoneHeart from '../ui/DoneHeart';
import HandHint from '../ui/HandHint';
import MudOverlay, { SOAP_RADIUS } from '../ui/MudOverlay';
import Sprite, { spriteRect } from '../ui/Sprite';
import { useStall } from '../ui/useStall';
import { damagesFor } from '../visit';
import type { StepProps } from './types';

/** Points kept for the erase path (more than enough to clear any splat). */
export const MAX_ERASE_POINTS = 900;
export const SUD_SPACING = 46;
export const SHOWER_RADIUS = 120;
export const COVERAGE_HZ = 10;

type WashPhase = 'soap' | 'rinse' | 'dry' | 'done';

export default function WashStep({ visit, layout, onDone, spec, repairs }: StepProps) {
  const dirt = useMemo(() => damagesFor(visit, 'wash'), [visit]);
  const rect = layout.plush;
  const [phase, setPhase] = useState<WashPhase>('soap');
  const [suds, setSuds] = useState<Sud[]>([]);
  // The suds are read by the JS callbacks between renders, so they are mirrored in a ref.
  const sudsRef = useRef<Sud[]>([]);
  const updateSuds = useCallback((fn: (s: readonly Sud[]) => Sud[]) => {
    const next = fn(sudsRef.current);
    sudsRef.current = next;
    setSuds(next);
    return next;
  }, []);
  const { hint, heart, progress } = useStall();
  const grid = useRef<CoverageGrid>(makeGrid(dirt.map((d) => ({ x: d.xy[0], y: d.xy[1], r: d.radius ?? 100 }))));
  const strokeBuf = useRef<number[]>([]);
  const sudId = useRef(0);
  const wiggle = useRef({ total: 0, last: 0 });
  const finished = useRef(false);

  // UI-thread state: the erase stroke, the tool position, spacing for suds and reports.
  const points = useSharedValue<number[]>([]);
  const toolX = useSharedValue(-999);
  const toolY = useSharedValue(-999);
  const lastX = useSharedValue(-999);
  const lastY = useSharedValue(-999);
  const phaseSv = useSharedValue<WashPhase>('soap');
  const mudOpacity = useSharedValue(1);

  const splat1 = useArtImage('damage/mud_splat_1');
  const splat2 = useArtImage('damage/mud_splat_2');
  const splat3 = useArtImage('damage/mud_splat_3');
  const bubbles = [useArtImage('tools/suds_bubble_1'), useArtImage('tools/suds_bubble_2'), useArtImage('tools/suds_bubble_3'), useArtImage('tools/suds_bubble_4'), useArtImage('tools/suds_bubble_5')];

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setPhase('done');
    phaseSv.set('done');
    onDone();
  }, [onDone, phaseSv]);

  const goTo = useCallback(
    (next: WashPhase) => {
      setPhase(next);
      phaseSv.set(next);
      progress();
      if (next === 'rinse') say('hint-wash-rinse');
      if (next === 'dry') say('hint-wash-dry');
    },
    [phaseSv, progress],
  );

  useEffect(() => {
    say('hint-wash-soap');
  }, []);

  // 1. Soap: the JS side collects stroke points and checks coverage 10 times a second.
  const onSoapPoint = useCallback(
    (x: number, y: number, spawn: boolean) => {
      strokeBuf.current.push(x, y);
      if (spawn) {
        const id = sudId.current++;
        updateSuds((s) => addSud(s, { id, x: x + ((id * 37) % 60) - 30, y: y + ((id * 53) % 50) - 25, r: 22 + (id % 4) * 8, variant: id % 5 }));
      }
    },
    [updateSuds],
  );
  useEffect(() => {
    if (phase !== 'soap') return;
    const id = setInterval(() => {
      const buf = strokeBuf.current;
      if (buf.length === 0) return;
      strokeBuf.current = [];
      if (stampStroke(grid.current, buf, SOAP_RADIUS) > 0) progress();
      if (reachedAutoFinish(grid.current)) {
        // The last 15 % clears by itself.
        mudOpacity.set(withTiming(0, { duration: 700 }));
        clearInterval(id);
        // No suds to rinse (a very quick wash): straight to drying.
        setTimeout(() => goTo(sudsRef.current.length > 0 ? 'rinse' : 'dry'), 750);
      }
    }, 1000 / COVERAGE_HZ);
    return () => clearInterval(id);
  }, [phase, goTo, mudOpacity, progress]);

  // 2. Rinse.
  const onRinse = useCallback(
    (x: number, y: number) => {
      const before = sudsRef.current.length;
      if (before === 0) return;
      const left = updateSuds((s) => popSuds(s, x, y + 90, SHOWER_RADIUS));
      if (left.length < before) progress();
      if (left.length === 0) setTimeout(() => goTo('dry'), 300);
    },
    [goTo, progress, updateSuds],
  );

  // 3. Dry.
  const onWiggle = useCallback(() => {
    const now = Date.now();
    const w = wiggle.current;
    // Already dry: more wiggling changes nothing (and says nothing again).
    if (w.total >= DRY_MS) return;
    w.total = addWiggle(w.total, w.last, now);
    w.last = now;
    if (w.total > 0) progress();
    if (w.total >= DRY_MS) {
      say('all-better');
      setTimeout(finish, 600);
    }
  }, [finish, progress]);

  // The gesture's callbacks run on the UI thread and hand JS work over with scheduleOnRN; the
  // compiler lint can't tell they don't run during render.
  /* eslint-disable react-hooks/refs */
  const pan = Gesture.Pan()
    .withTestId('wash-pan')
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      const p = screenToPlush(rect, e.x, e.y);
      toolX.value = p.x;
      toolY.value = p.y;
      lastX.value = p.x;
      lastY.value = p.y;
      if (phaseSv.value === 'soap' && points.value.length < MAX_ERASE_POINTS * 2) {
        // A new stroke: a break marker (NaN) then the start point.
        points.value = [...points.value, NaN, NaN, p.x, p.y];
        scheduleOnRN(onSoapPoint, p.x, p.y, false);
      }
    })
    .onUpdate((e) => {
      'worklet';
      const p = screenToPlush(rect, e.x, e.y);
      toolX.value = p.x;
      toolY.value = p.y;
      const dx = p.x - lastX.value;
      const dy = p.y - lastY.value;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ph = phaseSv.value;
      if (ph === 'soap') {
        if (dist < 12) return;
        if (points.value.length < MAX_ERASE_POINTS * 2) points.value = [...points.value, p.x, p.y];
        lastX.value = p.x;
        lastY.value = p.y;
        scheduleOnRN(onSoapPoint, p.x, p.y, dist >= 12 && Math.floor(points.value.length / 2) % 3 === 0);
      } else if (ph === 'rinse') {
        if (dist < 20) return;
        lastX.value = p.x;
        lastY.value = p.y;
        scheduleOnRN(onRinse, p.x, p.y);
      } else if (ph === 'dry') {
        if (dist < 8) return;
        lastX.value = p.x;
        lastY.value = p.y;
        scheduleOnRN(onWiggle);
      }
    })
    .onFinalize(() => {
      'worklet';
      toolX.value = -999;
      toolY.value = -999;
    });
  /* eslint-enable react-hooks/refs */

  const erase = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const pts = points.value;
    let pen = false;
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const x = pts[i];
      const y = pts[i + 1];
      if (x !== x) {
        // NaN: a stroke break.
        pen = false;
        continue;
      }
      if (!pen) {
        path.moveTo(x, y);
        path.lineTo(x + 0.1, y);
        pen = true;
      } else path.lineTo(x, y);
    }
    return path;
  });

  const splats = [splat1, splat2, splat3];
  const overlay = (assets: PlushAssets, set: BodySet) => (
    <Group>
      <MudOverlay dirt={dirt} assets={assets} set={set} erase={erase} opacity={mudOpacity} splats={splats} />
      {suds.map((s) => {
        const img = bubbles[s.variant];
        if (!img) return <Circle key={s.id} cx={s.x} cy={s.y} r={s.r} color="rgba(255,255,255,0.85)" />;
        const r = spriteRect(img, s.x, s.y, s.r * 2);
        return <Image key={s.id} image={img} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />;
      })}
    </Group>
  );

  const toolId = phase === 'soap' ? 'tools/soap_bar' : phase === 'rinse' ? 'tools/shower_head' : 'tools/towel';
  const toolT = useDerivedValue(() => [{ translateX: toolX.value }, { translateY: toolY.value - (phaseSv.value === 'rinse' ? 70 : 0) }]);
  const tray = scenePoint(layout, [1860, 800]);
  const dirtCentre = dirt[0] ? plushToScreen(rect, dirt[0].xy) : { x: rect.x + rect.size / 2, y: rect.y + rect.size / 2 };
  const firstSud = suds[0] ? plushToScreen(rect, [suds[0].x, suds[0].y]) : dirtCentre;
  const hintAt = phase === 'rinse' ? firstSud : dirtCentre;
  const hintTo = { x: hintAt.x + 80, y: hintAt.y + 10 };

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill} testID="step-wash">
        <ClinicStage
          scene="scene_clinic"
          layout={layout}
          spec={spec}
          repairs={repairs}
          plush={{ mouth: phase === 'soap' ? 'neutral' : 'smile', overlay }}
          front={
            <Group>
              <Sprite id={toolId} x={tray.x} y={tray.y} size={rect.size * 0.22} opacity={0.6} />
              <Group transform={[{ translateX: rect.x }, { translateY: rect.y }, { scale: rect.size / 1024 }]}>
                <Group transform={toolT}>
                  <Sprite id={toolId} x={0} y={0} size={phase === 'dry' ? 260 : 190} />
                </Group>
              </Group>
            </Group>
          }
        />
        <View testID={`wash-${phase}`} />
        {hint && phase !== 'done' ? <HandHint at={hintAt} to={hintTo} /> : null}
        {heart && phase !== 'done' ? <DoneHeart onPress={finish} /> : null}
      </View>
    </GestureDetector>
  );
}
