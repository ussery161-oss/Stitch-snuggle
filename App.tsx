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
import ParentScreen from './src/screens/ParentScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import TitleHero from './src/screens/TitleHero';
import TitleScreen from './src/screens/TitleScreen';
import { HeartIcon, StudioIcon } from './src/ui/Icons';
import { colors } from './src/ui/theme';

export default function App() {
  const [route, dispatch] = useReducer(routeReducer, initialRoute);
  const { width, height } = useWindowDimensions();
  // P1 plays the two demo presets, taking turns.
  const [visits, setVisits] = useState(0);
  const patient = visits % 2 === 0 ? PRESETS.bear : PRESETS.bunny;

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
      screen = <ClinicScreen spec={patient} onExit={() => dispatch({ type: 'home' })} />;
      break;
    case 'studio':
      screen = (
        <PlaceholderScreen testID="studio-screen" onHome={home} color={colors.lavender}>
          <StudioIcon size={200} />
        </PlaceholderScreen>
      );
      break;
    case 'stickers':
      screen = (
        <PlaceholderScreen testID="stickers-screen" onHome={home} color={colors.sky}>
          <HeartIcon size={160} color={colors.lavender} />
        </PlaceholderScreen>
      );
      break;
    case 'gate':
      screen = <ParentalGate onPass={() => dispatch({ type: 'gatePassed' })} onCancel={() => dispatch({ type: 'gateCancelled' })} />;
      break;
    case 'parent':
      screen = <ParentScreen onClose={home} onDev={() => dispatch({ type: 'parentNav', screen: 'dev' })} />;
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
