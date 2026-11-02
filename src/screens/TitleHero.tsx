// The Title's mascot: the Bear preset, breathing and blinking.
import { Canvas } from '@shopify/react-native-skia';

import Plush from '../plush/Plush';
import { PRESETS } from '../plush/spec';

export default function TitleHero({ size }: { size: number }) {
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Plush spec={PRESETS.bear} x={0} y={0} size={size} />
    </Canvas>
  );
}
