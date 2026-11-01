import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useReducer } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ParentalGate from './src/gate/ParentalGate';
import { initialRoute, routeReducer } from './src/logic/router';
import ParentScreen from './src/screens/ParentScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import TitleScreen from './src/screens/TitleScreen';
import { HeartIcon, StudioIcon } from './src/ui/Icons';
import { colors } from './src/ui/theme';

export default function App() {
  const [route, dispatch] = useReducer(routeReducer, initialRoute);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  const home = () => dispatch({ type: 'home' });
  let screen;
  switch (route.screen) {
    case 'title':
      screen = (
        <TitleScreen
          onPlay={() => dispatch({ type: 'go', screen: 'clinic' })}
          onStudio={() => dispatch({ type: 'go', screen: 'studio' })}
          onStickers={() => dispatch({ type: 'go', screen: 'stickers' })}
          onParent={() => dispatch({ type: 'gate', target: 'parent' })}
        />
      );
      break;
    case 'clinic':
      screen = (
        <PlaceholderScreen testID="clinic-screen" onHome={home} color={colors.mint}>
          <HeartIcon size={160} />
        </PlaceholderScreen>
      );
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
      screen = (
        <PlaceholderScreen testID="dev-screen" onHome={() => dispatch({ type: 'parentNav', screen: 'parent' })}>
          <StudioIcon size={120} />
        </PlaceholderScreen>
      );
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
