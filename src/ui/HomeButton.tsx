// The Home button on every child screen: hold it for 2 s while a ring fills. A quick tap says
// "Hold to go home" and pulses the ring (the Popsy Words fix: no accidental exits).
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { say } from '../audio/speak';
import ArtImage from './ArtImage';
import HoldButton from './HoldButton';
import { hintAllowed, HOME_HOLD_MS } from './holdLogic';
import { colors, MIN_TOUCH } from './theme';
import { HeartIcon } from './Icons';

export default function HomeButton({ onHome, size = 84 }: { onHome: () => void; size?: number }) {
  const lastHint = useRef(-Infinity);
  const s = Math.max(MIN_TOUCH, size);
  return (
    <HoldButton
      testID="home-button"
      size={s}
      holdMs={HOME_HOLD_MS}
      onComplete={onHome}
      onShortRelease={() => {
        const now = Date.now();
        if (!hintAllowed(lastHint.current, now)) return;
        lastHint.current = now;
        say('hold-to-go-home');
      }}
      ringColor={colors.rose}
      accessibilityLabel="Home. Hold to go home."
    >
      <ArtImage
        id="ui/icons/home_button"
        size={s * 0.86}
        placeholder={
          <View style={[styles.ph, { width: s * 0.86, height: s * 0.86, borderRadius: s }]}>
            <HeartIcon size={s * 0.5} color={colors.cream} />
          </View>
        }
      />
    </HoldButton>
  );
}

const styles = StyleSheet.create({
  ph: { backgroundColor: colors.mint, borderWidth: 3, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
});
