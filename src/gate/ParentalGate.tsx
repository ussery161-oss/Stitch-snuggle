// The parental gate screen: three large numerals; tap them from smallest to largest, then hold
// the open button for 1 s. Out of order quietly starts over. The written instructions are for
// the grown-up; there's no voice here (a child shouldn't be coached through it).
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { createRng, randomSeed } from '../logic/rng';
import HoldButton from '../ui/HoldButton';
import { LockIcon } from '../ui/Icons';
import { colors, MIN_TOUCH, useLayout } from '../ui/theme';
import { GATE_HOLD_MS, holdDone, startGate, tapNumber, type GateState } from './gateLogic';

interface Props {
  onPass: () => void;
  onCancel: () => void;
  seed?: number;
}

export default function ParentalGate({ onPass, onCancel, seed }: Props) {
  const rng = useMemo(() => createRng(seed ?? randomSeed()), [seed]);
  const [state, setState] = useState<GateState>(() => startGate(rng));
  const passed = useRef(false);
  const { scale } = useLayout();
  const tile = Math.max(96, Math.round(150 * scale));

  return (
    <View style={styles.root} testID="parental-gate">
      <Pressable onPress={onCancel} style={styles.close} accessibilityRole="button" accessibilityLabel="Close" testID="gate-close">
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <Text style={styles.title}>For grown-ups</Text>
      <Text style={styles.help}>
        {state.phase === 'order' ? 'Tap the numbers from smallest to largest.' : 'Now press and hold the lock for 1 second.'}
      </Text>
      <View style={styles.row}>
        {state.numbers.map((n, i) => {
          const on = state.tapped.includes(i);
          return (
            <Pressable
              key={`${n}-${i}`}
              testID={`gate-number-${n}`}
              accessibilityRole="button"
              accessibilityLabel={String(n)}
              onPress={() => setState((s) => tapNumber(s, i, rng))}
              style={[styles.tile, { width: tile, height: tile }, on && styles.tileOn]}
            >
              <Text style={[styles.num, { fontSize: tile * 0.45 }]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.holdWrap, state.phase !== 'hold' && styles.dim]} pointerEvents={state.phase === 'hold' ? 'auto' : 'none'}>
        <HoldButton
          testID="gate-hold"
          size={Math.max(MIN_TOUCH + 24, tile * 0.75)}
          holdMs={GATE_HOLD_MS}
          ringColor={colors.mint}
          accessibilityLabel="Hold to open"
          onComplete={() => {
            if (passed.current) return;
            const next = holdDone(state);
            setState(next);
            if (next.phase === 'open') {
              passed.current = true;
              onPass();
            }
          }}
        >
          <LockIcon size={tile * 0.45} />
        </HoldButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 18 },
  close: { position: 'absolute', top: 24, left: 24, width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 32, color: colors.line },
  title: { fontSize: 30, fontWeight: '700', color: colors.line },
  help: { fontSize: 20, color: colors.line },
  row: { flexDirection: 'row', gap: 28 },
  tile: { borderRadius: 24, borderWidth: 4, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tileOn: { backgroundColor: colors.mint },
  num: { fontWeight: '800', color: colors.line },
  holdWrap: { marginTop: 8 },
  dim: { opacity: 0.3 },
});
