// Re-stuff: a flat arm or leg (squashed to 80 % and drooping). Drag cotton puffs from the bag into
// it; each one springs it back towards full size. After 4–6 puffs, a short closing stitch (the same
// tracer as the Stitch step) and it's done.
import { Circle, Group, Image, Oval } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';

import { PRAISE_IDS } from '../../audio/lines';
import { say } from '../../audio/speak';
import { bodySet } from '../../plush/registry';
import type { Vec } from '../../plush/types';
import { MIN_TOUCH } from '../../ui/theme';
import { useArtImage } from '../../ui/useArtImage';
import { droopTransform, plushToScreen, puffsNeeded, scenePoint, screenToPlush } from '../helpers';
import ClinicStage from '../ui/ClinicStage';
import DoneHeart from '../ui/DoneHeart';
import HandHint from '../ui/HandHint';
import Sprite, { spriteRect } from '../ui/Sprite';
import { useStall } from '../ui/useStall';
import { useTrayDrag } from '../ui/useTrayDrag';
import { damagesFor, type Damage } from '../visit';
import { RipTrace } from './StitchStep';
import type { StepProps } from './types';

/** A puff counts when dropped within the part's box plus this margin (1024 units). */
export const PUFF_MARGIN = 70;

/** Whether a drop (1024 space) lands in the part. */
export function puffLands(drop: Vec, bounds: readonly number[]): boolean {
  return drop[0] >= bounds[0] - PUFF_MARGIN && drop[0] <= bounds[0] + bounds[2] + PUFF_MARGIN && drop[1] >= bounds[1] - PUFF_MARGIN && drop[1] <= bounds[1] + bounds[3] + PUFF_MARGIN;
}

/** The short closing stitch across the part's opening. */
export function closingPath(center: Vec, width: number): Vec[] {
  const half = Math.max(45, Math.min(90, width * 0.35));
  return [-1, -0.5, 0, 0.5, 1].map((t) => [Math.round(center[0] + t * half), Math.round(center[1] + Math.sin(t * Math.PI) * 6)] as Vec);
}

export default function RestuffStep({ visit, layout, onDone, spec, repairs, onRepair }: StepProps) {
  const flat = useMemo(() => damagesFor(visit, 'stuff')[0], [visit]);
  const set = bodySet(spec.base, spec.body, spec.style);
  const part = set.parts.find((p) => p.id === flat?.part);
  const rect = layout.plush;
  const need = puffsNeeded(visit.seed);
  const [puffs, setPuffs] = useState(0);
  const [closing, setClosing] = useState(false);
  const { hint, heart, progress } = useStall();
  const finished = useRef(false);
  const fullness = useSharedValue(0);
  const puffImgs = [useArtImage('tools/cotton_puff_1'), useArtImage('tools/cotton_puff_2'), useArtImage('tools/cotton_puff_3')];

  useEffect(() => {
    say('hint-stuff');
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const tray = scenePoint(layout, [1860, 800]);
  const bagSize = Math.max(MIN_TOUCH + 16, rect.size * 0.2);
  const items = useMemo(() => [{ x: tray.x, y: tray.y, r: bagSize * 0.6 }], [tray.x, tray.y, bagSize]);
  const bounds = useMemo(() => part?.bounds ?? [0, 0, 0, 0], [part]);
  const onDrop = useCallback(
    (_i: number, x: number, y: number) => {
      if (closing) return;
      const p = screenToPlush(rect, x, y);
      if (!puffLands([p.x, p.y], bounds)) return;
      const n = Math.min(need, puffs + 1);
      setPuffs(n);
      progress();
      fullness.set(withSpring(n / need, { damping: 7, stiffness: 140 }));
      if (n >= need) {
        say(PRAISE_IDS[(visit.seed + 1) % PRAISE_IDS.length]);
        setTimeout(() => setClosing(true), 700);
      }
    },
    [bounds, closing, fullness, need, progress, puffs, rect, visit.seed],
  );
  const drag = useTrayDrag({ testId: 'stuff-drag', items, onDrop });

  const anchor = useMemo(() => ({ x: part?.anchor[0] ?? 512, y: part?.anchor[1] ?? 512 }), [part]);
  const side = flat?.part.endsWith('L') ? 1 : -1;
  const droop = useDerivedValue(() => droopTransform(anchor, fullness.value, side));
  const partTransforms = useMemo(() => (part ? { [part.id]: droop } : undefined), [part, droop]);
  const carriedT = useDerivedValue(() => [{ translateX: drag.dragX.value }, { translateY: drag.dragY.value }]);
  const carriedO = useDerivedValue(() => (drag.picked.value >= 0 ? 1 : 0));
  const center = useMemo<Vec>(() => (part ? [part.bounds[0] + part.bounds[2] / 2, part.bounds[1] + part.bounds[3] / 2] : [512, 512]), [part]);
  const closeRip = useMemo<Damage>(() => ({ id: 'close', kind: 'rip', part: flat?.part ?? '', xy: center, path: closingPath(center, part?.bounds[2] ?? 150) }), [flat?.part, center, part]);

  const onClosed = useCallback(() => {
    onRepair({ kind: 'stitch', path: closeRip.path! });
    say('all-better');
    setTimeout(finish, 800);
  }, [closeRip, finish, onRepair]);

  if (!flat || !part) return null;
  const opening = (
    <Oval x={center[0] - 34} y={center[1] - 9} width={68} height={18} color="#4A3A3A" opacity={0.85} />
  );
  const tool = (
    <Group>
      <Sprite id="tools/cotton_bag" x={tray.x} y={tray.y} size={bagSize} placeholder={<Circle cx={tray.x} cy={tray.y} r={bagSize / 2} color="#FFFFFF" />} />
      <Group transform={carriedT} opacity={carriedO}>
        <Puff img={puffImgs[puffs % 3]} size={(110 * rect.size) / 1024} />
      </Group>
    </Group>
  );

  if (closing) {
    return (
      <RipTrace rip={closeRip} layout={layout} onRipDone={onClosed} onProgress={progress}>
        {(overlay, needle, hintAt, hintTo) => (
          <View style={StyleSheet.absoluteFill} testID="step-stuff-close">
            <ClinicStage
              scene="scene_clinic"
              layout={layout}
              spec={spec}
              repairs={repairs}
              plush={{ mouth: 'smile', overlay, partTransforms }}
              front={<Group transform={[{ translateX: rect.x }, { translateY: rect.y }, { scale: rect.size / 1024 }]}>{needle}</Group>}
            />
            {hint ? <HandHint at={hintAt()} to={hintTo()} /> : null}
            {heart ? <DoneHeart onPress={finish} /> : null}
          </View>
        )}
      </RipTrace>
    );
  }
  return (
    <GestureDetector gesture={drag.gesture}>
      <View style={StyleSheet.absoluteFill} testID="step-stuff">
        <ClinicStage scene="scene_clinic" layout={layout} spec={spec} repairs={repairs} plush={{ mouth: 'neutral', overlay: opening, partTransforms }} front={tool} />
        <View testID={`stuff-puffs-${puffs}`} />
        {hint ? <HandHint at={items[0]} to={plushToScreen(rect, center)} /> : null}
        {heart ? <DoneHeart onPress={finish} /> : null}
      </View>
    </GestureDetector>
  );
}

function Puff({ img, size }: { img: ReturnType<typeof useArtImage>; size: number }) {
  if (!img) return <Circle cx={0} cy={0} r={size / 2} color="#FFFFFF" />;
  const r = spriteRect(img, 0, 0, size);
  return <Image image={img} x={r.x} y={r.y} width={r.width} height={r.height} fit="fill" />;
}

