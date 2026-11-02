// Dev only (behind the gate): five staged scenes for App Store screenshots on iPad and iPhone. Use
// the faint arrows in the top-right corner to move between them; take the screenshot with the
// device buttons. Nothing here changes the save.
import { Canvas, Fill, Image } from '@shopify/react-native-skia';
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ClinicScreen from '../clinic/ClinicScreen';
import RecoveryRoom from '../clinic/RecoveryRoom';
import { PRESET_SPECS, PRESETS_V1 } from '../content/presets';
import Plush from '../plush/Plush';
import { artData } from '../art';
import StudioScreen from '../studio/StudioScreen';
import { useLayout } from '../ui/theme';
import { useArtImage } from '../ui/useArtImage';
import TitleHero from './TitleHero';
import TitleScreen from './TitleScreen';

const noop = () => {};

function StagedShowcase() {
  const { width, height } = useLayout();
  const scene = useArtImage('ui/scenes/scene_showcase');
  const spots = artData<{ scene_showcase: { display_spots: { rect: { x: number; y: number; size: number } }[] } }>('ui/scenes/scenes')?.scene_showcase.display_spots ?? [];
  const s = Math.min(width / 2048, height / 1536);
  const ox = (width - 2048 * s) / 2;
  const oy = (height - 1536 * s) / 2;
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Fill color="#F8E4DE" />
      {scene ? <Image image={scene} x={ox} y={oy} width={2048 * s} height={1536 * s} fit="fill" /> : null}
      {spots.map((sp, i) => (
        <Plush key={i} spec={PRESETS_V1[i % PRESETS_V1.length].spec} x={ox + sp.rect.x * s} y={oy + sp.rect.y * s} size={sp.rect.size * s} idle={i === 8} mouth="big_happy" />
      ))}
    </Canvas>
  );
}

export const SCENES: readonly { id: string; render: () => ReactElement }[] = [
  { id: 'title', render: () => <TitleScreen onPlay={noop} onStudio={noop} onStickers={noop} onParent={noop} onShowcase={noop} hero={<TitleHero size={300} />} /> },
  { id: 'clinic', render: () => <ClinicScreen spec={PRESET_SPECS.bunny} seed={11} onExit={noop} /> },
  { id: 'studio', render: () => <StudioScreen onHome={noop} onPlayDoctor={noop} edit={{ id: 'screenshot', spec: PRESET_SPECS.unicorn, createdAt: '' }} /> },
  { id: 'showcase', render: () => <StagedShowcase /> },
  { id: 'recovery', render: () => <RecoveryRoom spec={PRESET_SPECS.bear} repairs={[]} onDone={noop} /> },
];

export default function ScreenshotScreen({ onBack }: { onBack: () => void }) {
  const [i, setI] = useState(0);
  const scene = SCENES[i];
  return (
    <View style={styles.root} testID={`screenshot-${scene.id}`}>
      <View key={scene.id} style={StyleSheet.absoluteFill}>
        {scene.render()}
      </View>
      <View style={styles.controls}>
        <Pressable testID="shot-prev" accessibilityLabel="Previous scene" onPress={() => setI((i + SCENES.length - 1) % SCENES.length)} style={styles.ctl}>
          <Text style={styles.ctlText}>‹</Text>
        </Pressable>
        <Pressable testID="shot-next" accessibilityLabel="Next scene" onPress={() => setI((i + 1) % SCENES.length)} style={styles.ctl}>
          <Text style={styles.ctlText}>›</Text>
        </Pressable>
        <Pressable testID="shot-close" accessibilityLabel="Close" onPress={onBack} style={styles.ctl}>
          <Text style={styles.ctlText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', gap: 4, opacity: 0.25 },
  ctl: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ctlText: { fontSize: 28, color: '#4A3A3A' },
});
