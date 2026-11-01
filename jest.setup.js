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
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
