// A child screen that arrives in a later phase (Studio and Sticker book land in P2). It shows a
// friendly picture and the Home button, so nothing is a dead end.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeButton from '../ui/HomeButton';
import { colors } from '../ui/theme';

export default function PlaceholderScreen({ onHome, testID, children, color = colors.cream }: { onHome: () => void; testID: string; children: ReactNode; color?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: color }]} testID={testID}>
      {children}
      <View style={[styles.home, { top: insets.top + 12, left: insets.left + 12 }]}>
        <HomeButton onHome={onHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  home: { position: 'absolute' },
});
