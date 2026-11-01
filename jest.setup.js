/* global jest */
// Native modules that Jest can't load are mocked here, so screens render in tests as on a device.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
