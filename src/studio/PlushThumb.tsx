// A small, still plushie picture (base and body choices, the toy shelf), with an optional padlock.
import { Canvas } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

import Plush from '../plush/Plush';
import type { PlushSpec } from '../plush/types';
import StudioIcon from './StudioIcons';

export default function PlushThumb({ spec, size, locked }: { spec: PlushSpec; size: number; locked?: boolean }) {
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Plush spec={spec} x={0} y={0} size={size} idle={false} mouth="smile" />
      </Canvas>
      {locked ? (
        <View style={styles.lock}>
          <StudioIcon name="padlock" size={size * 0.38} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { position: 'absolute', right: 0, bottom: 0 },
});
