import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useReducer, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ClinicScreen from './src/clinic/ClinicScreen';
import ParentalGate from './src/gate/ParentalGate';
import { initialRoute, routeReducer } from './src/logic/router';
import { PRESETS } from './src/plush/spec';
import DevScreen from './src/screens/DevScreen';
import ParentScreen, { AgeSetting } from './src/screens/ParentScreen';
import { saveStore, useSave } from './src/storage/useSave';
import type { AgeBand } from './src/clinic/visit';
import TitleHero from './src/screens/TitleHero';
import StudioScreen from './src/studio/StudioScreen';
import StickerBookScreen from './src/stickers/StickerBookScreen';
import type { Creation } from './src/storage/schema';
import TitleScreen from './src/screens/TitleScreen';
import { colors } from './src/ui/theme';

export default function App() {
  const [route, dispatch] = useReducer(routeReducer, initialRoute);
  const { width, height } = useWindowDimensions();
  // P1 plays the two demo presets, taking turns.
  const [visits, setVisits] = useState(0);
  // Play doctor from the toy shelf sends a creation; otherwise the presets take turns.
  const [creationPatient, setCreationPatient] = useState<Creation | null>(null);
  const patient = creationPatient?.spec ?? (visits % 2 === 0 ? PRESETS.bear : PRESETS.bunny);
  const save = useSave();
  useEffect(() => {
    if (!saveStore.isLoaded) void saveStore.load();
  }, []);
  const settings = save.settings;
  const changeAge = (age: AgeBand) => saveStore.update((s) => ({ ...s, settings: { ...s.settings, age } }));

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  const home = () => dispatch({ type: 'home' });
  let screen;
  switch (route.screen) {
    case 'title':
      screen = (
        <TitleScreen
          onPlay={() => {
            setCreationPatient(null);
            setVisits((v) => v + 1);
            dispatch({ type: 'go', screen: 'clinic' });
          }}
          onStudio={() => dispatch({ type: 'go', screen: 'studio' })}
          onStickers={() => dispatch({ type: 'go', screen: 'stickers' })}
          onParent={() => dispatch({ type: 'gate', target: 'parent' })}
          hero={<TitleHero size={Math.round(Math.min(width, height) * 0.42)} />}
        />
      );
      break;
    case 'clinic':
      screen = <ClinicScreen spec={patient} creationId={creationPatient?.id} age={settings.age} onExit={() => dispatch({ type: 'home' })} />;
      break;
    case 'studio':
      screen = (
        <StudioScreen
          onHome={home}
          onParent={() => dispatch({ type: 'gate', target: 'parent' })}
          onPlayDoctor={(c) => {
            setCreationPatient(c);
            dispatch({ type: 'go', screen: 'clinic' });
          }}
        />
      );
      break;
    case 'stickers':
      screen = <StickerBookScreen onHome={home} />;
      break;
    case 'gate':
      screen = <ParentalGate onPass={() => dispatch({ type: 'gatePassed' })} onCancel={() => dispatch({ type: 'gateCancelled' })} />;
      break;
    case 'parent':
      screen = (
        <ParentScreen onClose={home} onDev={() => dispatch({ type: 'parentNav', screen: 'dev' })}>
          <AgeSetting age={settings.age} onChange={changeAge} />
        </ParentScreen>
      );
      break;
    case 'dev':
      screen = <DevScreen onBack={() => dispatch({ type: 'parentNav', screen: 'parent' })} />;
      break;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {screen}
        <StatusBar hidden />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
});
