/* global __dirname */
// npm run visual — renders plushies and scenes with real Skia (CanvasKit, headless) into
// artifacts/visual/ (git-ignored) for the phase-gate visual check against the r03 contact sheet.
module.exports = {
  rootDir: __dirname,
  testMatch: ['<rootDir>/test-utils/visual/**/*.visual.tsx'],
  testEnvironment: '<rootDir>/test-utils/visual/skiaEnv.js',
  transform: { '^.+\.[jt]sx?$': ['babel-jest', { presets: [require.resolve('expo/internal/babel-preset')] }] },
  moduleNameMapper: {
    '^@shopify/react-native-skia$': '<rootDir>/test-utils/visual/skiaHeadless.js',
    '^react-native$': '<rootDir>/test-utils/visual/rnStub.js',
    '\.(png|m4a)$': '<rootDir>/test-utils/visual/fileStub.js',
  },
  testTimeout: 120000,
};
