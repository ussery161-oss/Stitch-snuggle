// The clinic's Skia stage: the scene picture covering the screen, the plushie at its place, and
// whatever the current phase draws under it (`behind`) or over it (`front`), in screen points.
import { Canvas, Fill, Group, Image, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import Plush, { type PlushProps } from '../../plush/Plush';
import type { PlushSpec } from '../../plush/types';
import { useArtImage } from '../../ui/useArtImage';
import type { Repair } from '../snap';
import RepairsOverlay from './RepairsOverlay';
import { SCENE_H, SCENE_W, type SceneLayout } from '../helpers';

interface Props {
  scene: 'scene_clinic' | 'scene_recovery';
  layout: SceneLayout;
  spec: PlushSpec;
  plush?: Partial<Omit<PlushProps, 'spec'>>;
  /** Hide the plushie. */
  hidePlush?: boolean;
  /** Moves the plushie (arrival hop, go-home hug), applied around its feet. */
  plushGroup?: SharedValue<Transforms3d>;
  /** Repairs from earlier steps (they stay on the plushie). */
  repairs?: readonly Repair[];
  behind?: ReactNode;
  front?: ReactNode;
  background?: string;
}

export default function ClinicStage({ scene, layout, spec, plush, hidePlush, plushGroup, repairs, behind, front, background = '#E8F4EE' }: Props) {
  const bg = useArtImage(`ui/scenes/${scene}`);
  const own = plush?.overlay;
  const overlay: PlushProps['overlay'] =
    repairs && repairs.length > 0
      ? (a, s) => (
          <Group>
            <RepairsOverlay repairs={repairs} />
            {typeof own === 'function' ? own(a, s) : own}
          </Group>
        )
      : own;
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Fill color={background} />
      {bg ? <Image image={bg} x={layout.offsetX} y={layout.offsetY} width={SCENE_W * layout.scale} height={SCENE_H * layout.scale} fit="fill" /> : null}
      {behind}
      {hidePlush ? null : (
        <Group transform={plushGroup}>
          <Plush spec={spec} x={layout.plush.x} y={layout.plush.y} size={layout.plush.size} {...plush} overlay={overlay} />
        </Group>
      )}
      {front}
    </Canvas>
  );
}
