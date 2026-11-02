/* global jest */
// Native modules that Jest can't load are mocked here, so screens render in tests as on a device.
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@shopify/react-native-skia', () => require('./test-utils/skiaMock'));
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
}));
jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: { LANDSCAPE: 'LANDSCAPE' },
}));
// Reanimated 4 / worklets: the libraries' own Jest mocks (shared values hold plain values,
// animations jump to their end value).
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  const React = require('react');
  return {
    ...mock,
    // The library mock makes a new shared value on every render; a real one lives as long as the
    // component (gesture callbacks hold on to it).
    useSharedValue: (init) => {
      const ref = React.useRef(null);
      if (ref.current === null) ref.current = mock.useSharedValue(init);
      return ref.current;
    },
    // The library mock leaves these out ("ADD ME IF NEEDED").
    useReducedMotion: () => false,
    useFrameCallback: () => ({ setActive: () => {}, isActive: false, callbackId: 0 }),
  };
});
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    isLoaded: false,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => {
  // An in-memory file system (sticker snapshots).
  const files = new Map();
  const join = (parts) => parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
  class Directory {
    constructor(...parts) {
      this.uri = join(parts);
    }
    get exists() {
      return true;
    }
    create() {}
  }
  class File {
    constructor(...parts) {
      this.uri = join(parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    write(bytes) {
      files.set(this.uri, bytes);
    }
  }
  return { Directory, File, Paths: { document: new Directory('file:///docs'), cache: new Directory('file:///cache') } };
});
// StoreKit isn't available in Jest (as in Expo Go): the app falls back to the mock purchase service.
jest.mock('expo-iap', () => ({}));
