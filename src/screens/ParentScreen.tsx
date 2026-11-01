// The parent area (only reached through the gate). P1 holds the age setting and the Dev screen;
// P2 adds purchase, restore, sound, credits and privacy.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, MIN_TOUCH } from '../ui/theme';

interface Props {
  onClose: () => void;
  onDev: () => void;
  /** Extra settings rows (the age setting, from P1-G). */
  children?: ReactNode;
}

export function ParentButton({ label, onPress, testID, selected }: { label: string; onPress: () => void; testID?: string; selected?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.btn, selected && styles.btnOn]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function ParentScreen({ onClose, onDev, children }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="parent-screen">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Grown-ups
        </Text>
        <ParentButton testID="parent-close" label="Done" onPress={onClose} />
      </View>
      {children}
      <Text style={styles.section}>Developer</Text>
      <ParentButton testID="parent-dev" label="Plush test screen" onPress={onDev} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 32, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 32, fontWeight: '800', color: colors.line },
  section: { fontSize: 20, fontWeight: '700', color: colors.line, marginTop: 12 },
  btn: { minHeight: MIN_TOUCH, minWidth: 140, paddingHorizontal: 22, borderRadius: 16, borderWidth: 3, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  btnOn: { backgroundColor: colors.mint },
  btnText: { fontSize: 20, color: colors.line, fontWeight: '600' },
});
