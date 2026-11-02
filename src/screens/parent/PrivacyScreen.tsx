// The privacy page, shown in the app (no web link).
import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '../../ui/theme';
import { ParentButton } from './ParentScreen';

export const PRIVACY_TEXT = 'This app collects no data. No ads, no tracking, no accounts, no internet.';

export const PRIVACY_DETAILS = [
  'Everything your child makes (plushies, stickers, settings) is saved only on this device.',
  'The app never connects to the internet, has no ads or analytics, and asks for no permissions.',
  'Purchases are handled by Apple; the app never sees payment details.',
];

export default function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="privacy-screen">
      <ParentButton testID="privacy-back" label="Back" onPress={onBack} />
      <Text style={styles.title}>Privacy</Text>
      <Text style={styles.lead}>{PRIVACY_TEXT}</Text>
      {PRIVACY_DETAILS.map((d) => (
        <Text key={d} style={styles.text}>
          {d}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 32, gap: 14 },
  title: { fontSize: 30, fontWeight: '800', color: colors.line },
  lead: { fontSize: 22, fontWeight: '700', color: colors.line },
  text: { fontSize: 18, color: colors.line },
});
