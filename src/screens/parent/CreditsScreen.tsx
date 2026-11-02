// Credits (parent area only): the verse first, the blessing second, then the team and every art
// and audio credit. No links (the app has no network).
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../ui/theme';
import { creditBlocks } from './credits';
import { ParentButton } from './ParentScreen';

export default function CreditsScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="credits-screen">
      <ParentButton testID="credits-back" label="Back" onPress={onBack} />
      {creditBlocks().map((b, i) => {
        switch (b.kind) {
          case 'verse':
            return (
              <View key={i} style={styles.verse} testID="credits-verse">
                <Text style={styles.verseText}>“{b.text}”</Text>
                <Text style={styles.ref}>— {b.reference}</Text>
              </View>
            );
          case 'blessing':
            return (
              <Text key={i} style={styles.blessing} testID="credits-blessing">
                {b.text}
              </Text>
            );
          case 'team':
            return (
              <View key={i} style={styles.block}>
                {b.lines.map((l) => (
                  <Text key={l} style={styles.line}>
                    {l}
                  </Text>
                ))}
              </View>
            );
          case 'credit':
            return (
              <View key={i} style={styles.block}>
                <Text style={styles.asset}>{b.row.asset}</Text>
                <Text style={styles.line}>{b.row.author}</Text>
                <Text style={styles.small}>{b.row.license}</Text>
                <Text style={styles.small}>{b.row.source}</Text>
              </View>
            );
        }
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 32, gap: 18 },
  verse: { alignItems: 'center', gap: 6, marginTop: 8 },
  verseText: { fontSize: 22, fontStyle: 'italic', color: colors.line, textAlign: 'center' },
  ref: { fontSize: 18, color: colors.line },
  blessing: { fontSize: 18, color: colors.line, textAlign: 'center' },
  block: { gap: 2 },
  asset: { fontSize: 18, fontWeight: '700', color: colors.line },
  line: { fontSize: 16, color: colors.line },
  small: { fontSize: 14, color: colors.line, opacity: 0.8 },
});
