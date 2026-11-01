// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'artifacts/*', 'node_modules/*', 'src/art/manifest.generated.ts', 'src/audio/voiceManifest.generated.ts'],
  },
]);
