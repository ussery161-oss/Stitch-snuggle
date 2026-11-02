// The parent area (only reached through the gate): Unlock Everything (with its price) and Restore
// Purchases, the child's age, sound, captions, tray side, reset progress, delete creations, the
// privacy page and the credits. Grown-up text is fine here; nothing in it reaches the child flow.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AgeBand } from '../../clinic/visit';
import { MockPurchaseService, purchaseService, type Product, type PurchaseResult } from '../../purchase/purchaseService';
import { deleteCreation, emptyShowcase } from '../../storage/schema';
import { saveStore, useSave } from '../../storage/useSave';
import PlushThumb from '../../studio/PlushThumb';
import { colors, MIN_TOUCH } from '../../ui/theme';

interface Props {
  onClose: () => void;
  onDev: () => void;
  onPrivacy?: () => void;
  onCredits?: () => void;
  children?: ReactNode;
}

export function ParentButton({ label, onPress, testID, selected, onLongPress }: { label: string; onPress?: () => void; testID?: string; selected?: boolean; onLongPress?: () => void }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={1500}
      style={[styles.btn, selected && styles.btnOn]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

/** Age band: caps the care steps per visit (3 for ages 3–5, 4 for ages 6–7). */
export function AgeSetting({ age, onChange }: { age: AgeBand; onChange: (a: AgeBand) => void }) {
  return (
    <View>
      <Text style={styles.section}>Child’s age</Text>
      <Text style={styles.note}>Ages 3–5: up to 3 care steps per visit. Ages 6–7: up to 4.</Text>
      <View style={styles.row}>
        <ParentButton testID="age-3-5" label="Ages 3–5" selected={age === '3-5'} onPress={() => onChange('3-5')} />
        <ParentButton testID="age-6-7" label="Ages 6–7" selected={age === '6-7'} onPress={() => onChange('6-7')} />
      </View>
    </View>
  );
}

const STEPS = [0, 0.25, 0.5, 0.75, 1];

function Volume({ label, value, onChange, testID }: { label: string; value: number; onChange: (v: number) => void; testID: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, styles.labelW]}>{label}</Text>
      {STEPS.map((v) => (
        <ParentButton key={v} testID={`${testID}-${v * 100}`} label={v === 0 ? 'Off' : `${v * 100}%`} selected={Math.abs(value - v) < 0.13} onPress={() => onChange(v)} />
      ))}
    </View>
  );
}

export const RESULT_TEXT: Record<PurchaseResult, string> = {
  purchased: 'Thank you! Everything is unlocked.',
  restored: 'Your purchase is restored. Everything is unlocked.',
  cancelled: 'No purchase was made.',
  pending: 'The purchase is waiting for approval.',
  nothing: 'No earlier purchase was found for this Apple ID.',
  unavailable: 'The App Store isn’t available right now. Please try again later.',
};

export default function ParentScreen({ onClose, onDev, onPrivacy, onCredits, children }: Props) {
  const save = useSave();
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const settings = save.settings;
  useEffect(() => {
    let live = true;
    purchaseService()
      .getProduct()
      .then((p) => {
        if (live) setProduct(p);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const setSettings = (change: Partial<typeof settings>) => saveStore.update((s) => ({ ...s, settings: { ...s.settings, ...change } }));
  const run = async (fn: () => Promise<PurchaseResult>) => {
    try {
      setMessage(RESULT_TEXT[await fn()]);
    } catch {
      setMessage(RESULT_TEXT.unavailable);
    }
  };
  const mock = purchaseService() instanceof MockPurchaseService ? (purchaseService() as MockPurchaseService) : null;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="parent-screen">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Grown-ups
        </Text>
        <ParentButton testID="parent-close" label="Done" onPress={onClose} />
      </View>

      <Text style={styles.section}>Unlock Everything</Text>
      {save.entitlement.unlocked ? (
        <Text style={styles.note} testID="parent-unlocked">
          Everything is unlocked, including every future plushie. Thank you!
        </Text>
      ) : (
        <View style={styles.row}>
          <ParentButton testID="parent-unlock" label={`Unlock Everything — ${product?.price ?? '…'}`} onPress={() => run(() => purchaseService().buy())} />
        </View>
      )}
      <Text style={styles.note}>One purchase unlocks all plushies, colours, patterns, eyes, accessories and sticker pages, plus every plushie added in free updates.</Text>
      <View style={styles.row}>
        <ParentButton testID="parent-restore" label="Restore Purchases" onPress={() => run(() => purchaseService().restore())} />
      </View>
      {message ? (
        <Text style={styles.message} testID="parent-message">
          {message}
        </Text>
      ) : null}

      {children}

      <Text style={styles.section}>Sound and display</Text>
      <Volume label="Music" value={settings.music} onChange={(music) => setSettings({ music })} testID="music" />
      <Volume label="Sound effects" value={settings.sfx} onChange={(sfx) => setSettings({ sfx })} testID="sfx" />
      <View style={styles.row}>
        <Text style={[styles.label, styles.labelW]}>Captions</Text>
        <ParentButton testID="captions-off" label="Off" selected={!settings.captions} onPress={() => setSettings({ captions: false })} />
        <ParentButton testID="captions-on" label="On" selected={settings.captions} onPress={() => setSettings({ captions: true })} />
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, styles.labelW]}>Tool tray side</Text>
        <ParentButton testID="tray-right" label="Right" selected={settings.traySide === 'right'} onPress={() => setSettings({ traySide: 'right' })} />
        <ParentButton testID="tray-left" label="Left (left-handed)" selected={settings.traySide === 'left'} onPress={() => setSettings({ traySide: 'left' })} />
      </View>

      <Text style={styles.section}>Saved plushies</Text>
      <Text style={styles.note}>Press and hold a plushie’s Delete button for 1.5 seconds to delete it.</Text>
      <View style={styles.grid}>
        {save.creations.map((c) => (
          <View key={c.id} style={styles.creation}>
            <PlushThumb spec={c.spec} size={90} />
            <ParentButton testID={`delete-${c.id}`} label="Delete" onLongPress={() => saveStore.update((s) => deleteCreation(s, c.id))} />
          </View>
        ))}
        {save.creations.length === 0 ? <Text style={styles.note}>None yet.</Text> : null}
      </View>

      <Text style={styles.section}>Reset progress</Text>
      <Text style={styles.note}>Removes all stickers and the Showcase Room arrangement. Saved plushies and the purchase stay. Press and hold for 1.5 seconds.</Text>
      <View style={styles.row}>
        <ParentButton testID="parent-reset" label="Reset progress" onLongPress={() => saveStore.update((s) => ({ ...s, stickers: {}, placements: [], showcase: emptyShowcase() }))} />
      </View>

      <Text style={styles.section}>About</Text>
      <View style={styles.row}>
        {onPrivacy ? <ParentButton testID="parent-privacy" label="Privacy" onPress={onPrivacy} /> : null}
        {onCredits ? <ParentButton testID="parent-credits" label="Credits" onPress={onCredits} /> : null}
      </View>

      <Text style={styles.section}>Developer</Text>
      <View style={styles.row}>
        <ParentButton testID="parent-dev" label="Plush test screen" onPress={onDev} />
        {__DEV__ && mock && save.entitlement.unlocked ? <ParentButton testID="parent-relock" label="Lock again (test)" onPress={() => mock.relock()} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 32, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 32, fontWeight: '800', color: colors.line },
  section: { fontSize: 20, fontWeight: '700', color: colors.line, marginTop: 12 },
  btn: { minHeight: MIN_TOUCH, minWidth: 100, paddingHorizontal: 18, borderRadius: 16, borderWidth: 3, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  btnOn: { backgroundColor: colors.mint },
  btnText: { fontSize: 18, color: colors.line, fontWeight: '600' },
  note: { fontSize: 16, color: colors.line, opacity: 0.8, marginBottom: 4 },
  message: { fontSize: 18, color: colors.line, fontWeight: '600' },
  label: { fontSize: 18, color: colors.line, alignSelf: 'center' },
  labelW: { minWidth: 150 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  creation: { alignItems: 'center', gap: 4 },
});
