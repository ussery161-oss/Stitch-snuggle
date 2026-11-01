// P1-A: app.json is what the App Store sees. Kids Category: no tracking or permission keys.
const appJson = require('../app.json');

describe('app.json', () => {
  const expo = appJson.expo;

  it('names the app and pins the landscape iPad + iPhone setup', () => {
    expect(expo.name).toBe('Stitch & Snuggle');
    expect(expo.slug).toBe('stitch-snuggle');
    expect(expo.orientation).toBe('landscape');
    expect(expo.ios.supportsTablet).toBe(true);
    expect(expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('keeps the placeholder bundle id in one place', () => {
    expect(expo.ios.bundleIdentifier).toBe('com.desmacapps.stitchsnuggle');
  });

  it('asks for no tracking or permissions', () => {
    const text = JSON.stringify(appJson);
    expect(text).not.toMatch(/NSUserTrackingUsageDescription|UsageDescription|permissions"/);
    const audio = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-audio');
    expect(audio[1].microphonePermission).toBe(false);
  });
});
