// Title: a big heart Play button (Clinic), a palette-and-scissors button (Studio), a book button
// (Sticker book), and a small lock in the corner that goes through the gate to the parent area.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ArtImage from '../ui/ArtImage';
import { HeartIcon, LockIcon, StudioIcon } from '../ui/Icons';
import { colors, MIN_TOUCH, touchSize, useLayout } from '../ui/theme';

interface Props {
  onPlay: () => void;
  onStudio: () => void;
  onStickers: () => void;
  onParent: () => void;
  /** Optional art drawn above the buttons (the Plush preview, from P1-E). */
  hero?: ReactNode;
}

function BigButton({ size, label, onPress, children, testID, color }: { size: number; label: string; onPress: () => void; children: ReactNode; testID: string; color: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.big, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export default function TitleScreen({ onPlay, onStudio, onStickers, onParent, hero }: Props) {
  const { scale } = useLayout();
  const insets = useSafeAreaInsets();
  const play = touchSize(210, scale);
  const side = touchSize(150, scale);
  return (
    <View style={styles.root} testID="title-screen">
      {/* Decorative: the name is for grown-ups; kids follow the pictures. */}
      <Text style={[styles.logo, { fontSize: Math.max(28, 54 * scale) }]} accessibilityRole="header">
        Stitch & Snuggle
      </Text>
      {hero ? <View style={styles.hero}>{hero}</View> : null}
      <View style={[styles.row, { gap: 40 * scale + 12 }]}>
        <BigButton testID="title-studio" label="Design studio" size={side} onPress={onStudio} color={colors.lavender}>
          <StudioIcon size={side * 0.66} />
        </BigButton>
        <BigButton testID="title-play" label="Play" size={play} onPress={onPlay} color={colors.pink}>
          <HeartIcon size={play * 0.66} color={colors.rose} />
        </BigButton>
        <BigButton testID="title-stickers" label="Sticker book" size={side} onPress={onStickers} color={colors.sky}>
          <ArtImage id="ui/stickers/book_cover" size={side * 0.56} aspect={1.2} placeholder={<HeartIcon size={side * 0.5} color={colors.lavender} />} />
        </BigButton>
      </View>
      <Pressable
        testID="title-parent"
        accessibilityRole="button"
        accessibilityLabel="Grown-ups"
        onPress={onParent}
        style={[styles.lock, { top: insets.top + 12, right: insets.right + 12 }]}
      >
        <ArtImage id="ui/icons/parent_lock" size={44} placeholder={<LockIcon size={40} />} style={styles.lockImg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  logo: { color: colors.line, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  hero: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  big: { borderWidth: 5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', shadowColor: colors.line, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 6 } },
  pressed: { transform: [{ scale: 0.95 }] },
  // A small icon with a full-size touch area.
  lock: { position: 'absolute', width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
  lockImg: { opacity: 0.9 },
});
