// Brush: stroke the tangled fuzz smooth. The tangle overlay clears under the brush (Clear strokes,
// clipped to the part) with a few sparkles; coverage uses the shared 32×32 grid, and at 85 % the
// rest smooths out by itself.
import { Group, Skia } from '@shopify/react-native-skia';
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
import { plushToScreen, scenePoint, screenToPlush } from '../helpers';
import ClinicStage from '../ui/ClinicStage';
import DoneHeart from '../ui/DoneHeart';
import HandHint from '../ui/HandHint';
import MudOverlay from '../ui/MudOverlay';
import Sprite from '../ui/Sprite';
import { useStall } from '../ui/useStall';
import { damagesFor } from '../visit';
import type { StepProps } from './types';

export const BRUSH_RADIUS = 58;
export const MAX_SPARKLES = 12;
const MAX_POINTS = 900;

interface Sparkle {
  id: number;
  x: number;
  y: number;
}

export default function BrushStep({ visit, layout, onDone, spec, repairs }: StepProps) {
  const tangles = useMemo(() => damagesFor(visit, 'brush'), [visit]);
  const rect = layout.plush;
  const grid = useRef<CoverageGrid>(makeGrid(tangles.map((d) => ({ x: d.xy[0], y: d.xy[1], r: d.radius ?? 100 }))));
  const buf = useRef<number[]>([]);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const sparkId = useRef(0);
  const finished = useRef(false);
  const smooth = useRef(false);
  const { hint, heart, progress } = useStall();
  const points = useSharedValue<number[]>([]);
  const brushX = useSharedValue(-999);
  const brushY = useSharedValue(-999);
  const lastX = useSharedValue(-999);
  const lastY = useSharedValue(-999);
  const fuzz = useSharedValue(1);
  const tile = useArtImage('damage/tangle_tile');

  useEffect(() => {
    say('hint-brush');
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const onPoint = useCallback((x: number, y: number) => {
    buf.current.push(x, y);
    if (buf.current.length % 6 === 0) {
      const id = sparkId.current++;
      setSparkles((s) => [...s.slice(-(MAX_SPARKLES - 1)), { id, x, y }]);
      setTimeout(() => setSparkles((s) => s.filter((p) => p.id !== id)), 650);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (smooth.current || buf.current.length === 0) return;
      const pts = buf.current;
      buf.current = [];
      if (stampStroke(grid.current, pts, BRUSH_RADIUS) > 0) progress();
      if (reachedAutoFinish(grid.current)) {
        smooth.current = true;
        fuzz.set(withTiming(0, { duration: 700 }));
        say('praise-3');
        setTimeout(finish, 900);
      }
    }, 100);
    return () => clearInterval(id);
  }, [finish, fuzz, progress]);

  /* eslint-disable react-hooks/refs */
  const pan = Gesture.Pan()
    .withTestId('brush-pan')
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      const p = screenToPlush(rect, e.x, e.y);
      brushX.value = p.x;
      brushY.value = p.y;
      lastX.value = p.x;
      lastY.value = p.y;
      if (points.value.length < MAX_POINTS * 2) points.value = [...points.value, NaN, NaN, p.x, p.y];
      scheduleOnRN(onPoint, p.x, p.y);
    })
    .onUpdate((e) => {
      'worklet';
      const p = screenToPlush(rect, e.x, e.y);
      brushX.value = p.x;
      brushY.value = p.y;
      const dx = p.x - lastX.value;
      const dy = p.y - lastY.value;
      if (dx * dx + dy * dy < 144) return;
      lastX.value = p.x;
      lastY.value = p.y;
      if (points.value.length < MAX_POINTS * 2) points.value = [...points.value, p.x, p.y];
      scheduleOnRN(onPoint, p.x, p.y);
    })
    .onFinalize(() => {
      'worklet';
      brushX.value = -999;
      brushY.value = -999;
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

  const overlay = (assets: PlushAssets, set: BodySet) => (
    <Group>
      <MudOverlay dirt={tangles} assets={assets} set={set} erase={erase} opacity={fuzz} splats={[]} tangle={tile} />
      {sparkles.map((s) => (
        <Sprite key={s.id} id="tools/sparkle_set" x={s.x} y={s.y} size={90} />
      ))}
    </Group>
  );
  const brushT = useDerivedValue(() => [{ translateX: brushX.value }, { translateY: brushY.value }]);
  const tray = scenePoint(layout, [1860, 800]);
  const at = tangles[0] ? plushToScreen(rect, tangles[0].xy) : { x: rect.x + rect.size / 2, y: rect.y + rect.size / 2 };
  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill} testID="step-brush">
        <ClinicStage
          scene="scene_clinic"
          layout={layout}
          spec={spec}
          repairs={repairs}
          plush={{ mouth: 'neutral', overlay }}
          front={
            <Group>
              <Sprite id="tools/brush" x={tray.x} y={tray.y} size={rect.size * 0.22} opacity={0.6} />
              <Group transform={[{ translateX: rect.x }, { translateY: rect.y }, { scale: rect.size / 1024 }]}>
                <Group transform={brushT}>
                  <Sprite id="tools/brush" x={40} y={-30} size={210} />
                </Group>
              </Group>
            </Group>
          }
        />
        {hint ? <HandHint at={at} to={{ x: at.x + 90, y: at.y }} /> : null}
        {heart ? <DoneHeart onPress={finish} /> : null}
      </View>
    </GestureDetector>
  );
}
