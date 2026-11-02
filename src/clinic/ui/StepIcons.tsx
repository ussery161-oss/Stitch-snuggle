// The progress row: one icon per care step in this visit, the current one big, finished ones with
// a little heart. No text, no numbers.
import { StyleSheet, View } from 'react-native';

import ArtImage from '../../ui/ArtImage';
import { HeartIcon } from '../../ui/Icons';
import { colors } from '../../ui/theme';
import type { StepKind } from '../visit';

export const STEP_ICON: Readonly<Record<StepKind, string>> = {
  stitch: 'ui/icons/step_stitch',
  patch: 'ui/icons/step_patch',
  stuff: 'ui/icons/step_stuff',
  wash: 'ui/icons/step_wash',
  brush: 'ui/icons/step_brush',
  dress: 'ui/icons/step_dress',
};

export default function StepIcons({ steps, current, done }: { steps: readonly StepKind[]; current: number; done: number }) {
  return (
    <View style={styles.row} pointerEvents="none" testID="step-icons">
      {steps.map((s, i) => {
        const size = i === current ? 64 : 48;
        return (
          <View key={s} style={[styles.icon, { opacity: i < done || i === current ? 1 : 0.45 }]} testID={`step-icon-${s}`}>
            <ArtImage id={STEP_ICON[s]} size={size} placeholder={<View style={[styles.ph, { width: size, height: size, borderRadius: size / 2 }]} />} />
            {i < done ? (
              <View style={styles.badge}>
                <HeartIcon size={22} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 40, paddingHorizontal: 12, paddingVertical: 6 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  ph: { backgroundColor: colors.mint, borderWidth: 3, borderColor: colors.line },
  badge: { position: 'absolute', right: -6, bottom: -6 },
});
