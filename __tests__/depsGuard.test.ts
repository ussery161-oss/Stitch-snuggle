// P1-D: Expo Go runs SDK 57. A wrong-SDK expo-* package (expo-audio pulled expo-asset 58 once)
// breaks `expo export`. Also: only the allowed runtime dependencies (Kids Category: no SDK that
// phones home).
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');

function expoPackages(dir: string, out: { name: string; version: string }[] = []): typeof out {
  if (!fs.existsSync(dir)) return out;
  for (const d of fs.readdirSync(dir)) {
    if (!/^expo-/.test(d)) continue;
    const pj = path.join(dir, d, 'package.json');
    if (fs.existsSync(pj)) out.push({ name: path.relative(NM, path.join(dir, d)), version: JSON.parse(fs.readFileSync(pj, 'utf8')).version });
    expoPackages(path.join(dir, d, 'node_modules'), out);
  }
  return out;
}

const ALLOWED = [
  /^expo(-.+)?$/,
  /^react$/,
  /^react-native$/,
  /^react-native-reanimated$/,
  /^react-native-worklets$/,
  /^react-native-gesture-handler$/,
  /^@shopify\/react-native-skia$/,
  /^react-native-svg$/,
  /^@react-native-async-storage\/async-storage$/,
  // Expo Go bundles it; used for the safe areas (iPhone notch). Justified in the PR.
  /^react-native-safe-area-context$/,
];

describe('dependencies', () => {
  it('every installed SDK-versioned expo-* package is SDK 57', () => {
    const wrong = expoPackages(NM).filter((p) => /^\d+\./.test(p.version) && Number(p.version.split('.')[0]) >= 50 && !p.version.startsWith('57.'));
    expect(wrong).toEqual([]);
  });

  it('runtime dependencies are only the allowed ones', () => {
    const deps = Object.keys(require('../package.json').dependencies);
    expect(deps.filter((d) => !ALLOWED.some((re) => re.test(d)))).toEqual([]);
  });

  it('pins Reanimated 4.5.1 and worklets 0.10.1 (as sitepop)', () => {
    const deps = require('../package.json').dependencies;
    expect(deps['react-native-reanimated']).toBe('4.5.1');
    expect(deps['react-native-worklets']).toBe('0.10.1');
  });
});
