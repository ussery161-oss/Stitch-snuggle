// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Tests load modules lazily (after mocks) and use Node built-ins through require().
    files: ['__tests__/**', 'test-utils/**', 'jest.setup.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['dist/*', 'artifacts/*', 'node_modules/*', 'src/art/manifest.generated.ts', 'src/audio/voiceManifest.generated.ts'],
  },
]);
