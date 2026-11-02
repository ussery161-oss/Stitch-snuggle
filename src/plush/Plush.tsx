// <Plush>: one plushie drawn inside a Skia <Canvas>, at (x, y) with its 1024 canvas shown at
// `size` pt. Loads its layers (cropped and sized for the screen), breathes and blinks while idle
// (both off with Reduce Motion), and draws through PlushDrawing.
import { Group } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PixelRatio } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, cancelAnimation } from 'react-native-reanimated';

import { assetKey, EMPTY_ASSETS, loadPlushAssets, type PlushAssets } from './assets';
import { blinkTransform, BREATH_PERIOD_MS, nextBlinkDelay, plushTransform } from './idle';
import { qualityFor } from './imageCache';
import PlushDrawing, { type PlushDrawingProps } from './PlushDrawing';
import { bodySet } from './registry';
import type { MouthStyle, PlushSpec } from './types';

export interface PlushProps {
  spec: PlushSpec;
  x: number;
  y: number;
  /** Size (pt) of the 1024 canvas on screen. */
  size: number;
  /** Breathe and blink (default true; always off with Reduce Motion). */
  idle?: boolean;
  mouth?: MouthStyle | null;
  partTransforms?: PlushDrawingProps['partTransforms'];
  hideAccessories?: boolean;
  /** Drawn in 1024 space over the parts (damage, patches). */
  overlay?: ReactNode;
  /** Called once the art is loaded. */
  onReady?: () => void;
}

/** Loads a plushie's assets; keeps the last ones while new ones load if the set didn't change. */
export function usePlushAssets(spec: PlushSpec, size: number, mouth: MouthStyle | null): { assets: PlushAssets; ready: boolean } {
  const set = bodySet(spec.base, spec.body, spec.style);
  const quality = qualityFor(size * PixelRatio.get());
  const key = assetKey(spec, set, quality, mouth);
  const [state, setState] = useState<{ key: string; setKey: string; assets: PlushAssets } | null>(null);
  useEffect(() => {
    let live = true;
    loadPlushAssets(spec, set, quality, mouth).then((assets) => {
      if (live) setState({ key, setKey: set.key, assets });
    });
    return () => {
      live = false;
    };
    // The key covers everything the assets depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (state === null || state.setKey !== set.key) return { assets: EMPTY_ASSETS, ready: set.placeholder };
  return { assets: state.assets, ready: state.key === key };
}

export default function Plush({ spec, x, y, size, idle = true, mouth = 'smile', partTransforms, hideAccessories, overlay, onReady }: PlushProps) {
  const set = bodySet(spec.base, spec.body, spec.style);
  const { assets, ready } = usePlushAssets(spec, size, mouth);
  const reduceMotion = useReducedMotion();
  const animate = idle && !reduceMotion;
  const breath = useSharedValue(0);
  const open = useSharedValue(1);

  useEffect(() => {
    if (ready) onReady?.();
    // Only when it becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: BREATH_PERIOD_MS / 2, easing: Easing.inOut(Easing.sin) }), -1, true);
    let timer: ReturnType<typeof setTimeout>;
    const blink = () => {
      open.value = withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 120 }));
      timer = setTimeout(blink, nextBlinkDelay(Math.random()));
    };
    timer = setTimeout(blink, nextBlinkDelay(Math.random()));
    return () => {
      clearTimeout(timer);
      cancelAnimation(breath);
    };
  }, [animate, breath, open]);

  const transform = useDerivedValue(() => plushTransform(x, y, size, breath.value));
  const eyeY = (set.anchors.eyeL[1] + set.anchors.eyeR[1]) / 2;
  const eyeTransform = useDerivedValue(() => blinkTransform(eyeY, open.value));
  const drawing = useMemo(
    () => <PlushDrawing set={set} spec={spec} assets={assets} partTransforms={partTransforms} eyeTransform={eyeTransform} hideAccessories={hideAccessories} overlay={overlay} />,
    [set, spec, assets, partTransforms, eyeTransform, hideAccessories, overlay],
  );
  // Real art still loading for the first time: draw nothing rather than flash the placeholder.
  if (!set.placeholder && assets === EMPTY_ASSETS) return null;
  return <Group transform={transform}>{drawing}</Group>;
}
