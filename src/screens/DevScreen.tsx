// Dev screen (behind the gate): Bear and Bunny in round, tall and tiny with random fills, all
// breathing and blinking. Tap one to randomize it. The fps readout measures the UI thread.
import { Canvas } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createRng, randomSeed } from '../logic/rng';
import Plush from '../plush/Plush';
import { randomSpec } from '../plush/spec';
import type { BaseId, BodyType, PlushSpec } from '../plush/types';
import FpsMeter from '../ui/FpsMeter';
import { colors, MIN_TOUCH, useLayout } from '../ui/theme';

export const DEV_GRID: readonly { base: BaseId; body: BodyType }[] = [
  { base: 'bear', body: 'round' },
  { base: 'bear', body: 'tall' },
  { base: 'bear', body: 'tiny' },
  { base: 'bunny', body: 'round' },
  { base: 'bunny', body: 'tall' },
  { base: 'bunny', body: 'tiny' },
];

export default function DevScreen({ onBack, seed }: { onBack: () => void; seed?: number }) {
  const rng = useMemo(() => createRng(seed ?? randomSeed()), [seed]);
  const [specs, setSpecs] = useState<PlushSpec[]>(() => DEV_GRID.map((g) => randomSpec(rng, g.base, g.body)));
  const { width, height } = useLayout();
  const insets = useSafeAreaInsets();
  const cols = 3;
  const cellW = width / cols;
  const cellH = height / 2;
  const size = Math.min(cellW, cellH) * 0.95;

  return (
    <View style={styles.root} testID="dev-screen">
      <Canvas style={StyleSheet.absoluteFill}>
        {specs.map((spec, i) => (
          <Plush key={i} spec={spec} size={size} x={(i % cols) * cellW + (cellW - size) / 2} y={Math.floor(i / cols) * cellH + (cellH - size) / 2} />
        ))}
      </Canvas>
      {specs.map((_, i) => (
        <Pressable
          key={i}
          testID={`dev-cell-${i}`}
          accessibilityRole="button"
          accessibilityLabel={`Randomize ${DEV_GRID[i].base} ${DEV_GRID[i].body}`}
          onPress={() => setSpecs((s) => s.map((x, j) => (j === i ? randomSpec(rng, DEV_GRID[i].base, DEV_GRID[i].body) : x)))}
          style={[styles.cell, { left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH, width: cellW, height: cellH }]}
        />
      ))}
      <View style={[styles.bar, { top: insets.top + 10, right: insets.right + 10 }]}>
        <FpsMeter />
        <Pressable testID="dev-back" onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  cell: { position: 'absolute' },
  bar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, paddingHorizontal: 16, borderRadius: 14, borderWidth: 3, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, fontWeight: '700', color: colors.line },
});
