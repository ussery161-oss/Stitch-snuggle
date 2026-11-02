// The toy shelf: every saved creation (up to 24). Tap one, then "Play doctor" (it goes to the
// clinic with random damage) or "Edit" (back into the Studio). Deleting needs the parent gate.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Creation } from '../storage/schema';
import { colors, MIN_TOUCH, useLayout } from '../ui/theme';
import PlushThumb from './PlushThumb';
import StudioIcon from './StudioIcons';

interface Props {
  creations: readonly Creation[];
  onClose: () => void;
  onPlayDoctor: (c: Creation) => void;
  onEdit: (c: Creation) => void;
}

export default function ToyShelf({ creations, onClose, onPlayDoctor, onEdit }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const { width } = useLayout();
  const cell = Math.max(MIN_TOUCH + 24, Math.min(130, (width - 120) / 7));
  return (
    <View style={styles.backdrop} testID="toy-shelf">
      <View style={styles.sheet}>
        <Pressable testID="shelf-close" accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
          <StudioIcon name="close" size={40} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.grid}>
          {creations.map((c) => (
            <View key={c.id} style={styles.item}>
              <Pressable testID={`shelf-${c.id}`} accessibilityRole="button" accessibilityLabel="A plushie you made" onPress={() => setPicked(picked === c.id ? null : c.id)} style={[styles.cell, { width: cell, height: cell }, picked === c.id && styles.cellOn]}>
                <PlushThumb spec={c.spec} size={cell * 0.92} />
              </Pressable>
              {picked === c.id ? (
                <View style={styles.actions}>
                  <Pressable testID={`shelf-doctor-${c.id}`} accessibilityRole="button" accessibilityLabel="Play doctor" onPress={() => onPlayDoctor(c)} style={styles.action}>
                    <StudioIcon name="doctor" size={MIN_TOUCH} />
                  </Pressable>
                  <Pressable testID={`shelf-edit-${c.id}`} accessibilityRole="button" accessibilityLabel="Edit" onPress={() => onEdit(c)} style={styles.action}>
                    <StudioIcon name="edit" size={MIN_TOUCH} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(74,58,58,0.35)', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: '86%', height: '82%', backgroundColor: colors.peach, borderRadius: 28, borderWidth: 4, borderColor: colors.line, padding: 16 },
  close: { position: 'absolute', right: 8, top: 8, width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: MIN_TOUCH },
  item: { alignItems: 'center' },
  cell: { borderRadius: 20, backgroundColor: colors.paper, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  cellOn: { borderColor: colors.rose },
  actions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  action: { width: MIN_TOUCH, height: MIN_TOUCH },
});
