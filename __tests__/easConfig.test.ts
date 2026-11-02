// P3-B: eas.json has the three profiles; app.json and its plugins stay valid for prebuild.
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..');
const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
const app = require('../app.json').expo;

describe('eas.json', () => {
  it('has development (dev client, internal), preview and production (auto build number)', () => {
    expect(eas.build.development).toMatchObject({ developmentClient: true, distribution: 'internal' });
    expect(eas.build.preview).toMatchObject({ distribution: 'internal' });
    expect(eas.build.production).toMatchObject({ autoIncrement: true });
    expect(eas.cli.appVersionSource).toBe('remote');
  });
});

describe('app.json for builds', () => {
  it('keeps the placeholder bundle id in one place and the IAP plugin configured', () => {
    expect(app.ios.bundleIdentifier).toBe('com.desmacapps.stitchsnuggle');
    expect(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8').match(/stitchsnuggle/g)).toHaveLength(1);
    expect(app.plugins).toContain('expo-iap');
  });

  it('every plugin resolves to an installed package', () => {
    for (const p of app.plugins) {
      const name = Array.isArray(p) ? p[0] : p;
      expect(fs.existsSync(path.join(ROOT, 'node_modules', name, 'package.json'))).toBe(true);
    }
  });

  it('Skia’s native libraries are allowed to install (needed by native builds)', () => {
    const pkg = require('../package.json');
    expect(Object.keys(pkg.allowScripts ?? {}).some((k) => k.startsWith('@shopify/react-native-skia'))).toBe(true);
  });
});
