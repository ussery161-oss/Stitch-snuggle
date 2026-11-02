// Shows the spoken line at the bottom of the screen when captions are on (parent setting).
import { StyleSheet, Text, View } from 'react-native';

import { useCaption } from '../audio/captions';
import { colors } from './theme';

export default function CaptionBar({ enabled }: { enabled: boolean }) {
  const text = useCaption();
  if (!enabled || !text) return null;
  return (
    <View pointerEvents="none" style={styles.wrap} testID="caption-bar">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' },
  text: { fontSize: 24, fontWeight: '700', color: colors.white, backgroundColor: 'rgba(74,58,58,0.8)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, overflow: 'hidden' },
});
