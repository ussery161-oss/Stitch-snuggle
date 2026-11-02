// Phase gate: Kids Category / COPPA static checks. (No network and no outside links are checked in
// noNetwork.test.ts; allowed dependencies in depsGuard.test.ts.)
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(d: string): string[] {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
}

/** Grown-up screens (behind the gate) may talk about purchases; nothing else may. */
const PARENT_ONLY = [/[\\/]screens[\\/]parent[\\/]/, /[\\/]screens[\\/]ParentScreen\.tsx$/, /[\\/]gate[\\/]/, /[\\/]purchase[\\/]/];

describe('Kids Category', () => {
  it('no price, buy, purchase or subscription text outside the parent area', () => {
    const hits = walk(SRC)
      .filter((f) => !PARENT_ONLY.some((re) => re.test(f)))
      .flatMap((f) =>
        fs
          .readFileSync(f, 'utf8')
          .split('\n')
          // Comments may explain the rule; only code and UI text count.
          .map((l) => l.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/^\s*(\/\*\*?|\*).*$/, ''))
          .filter((l) => /\$\s?\d|\bprice\b|\bbuy\b|\bpurchase\b|\bsubscription|\bunlock now\b|in-app/i.test(l))
          .map((l) => `${path.relative(SRC, f)}: ${l.trim()}`),
      );
    expect(hits).toEqual([]);
  });

  it('no ads, analytics, tracking or account SDKs in package.json', () => {
    const pkg = require('../package.json');
    const all = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
    expect(all).not.toMatch(/firebase|analytics|segment|amplitude|mixpanel|admob|ads|facebook|sentry|bugsnag|appsflyer|adjust|branch|onesignal|auth0|clerk/i);
  });

  it('app.json asks for no tracking and no permissions', () => {
    const text = fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8');
    expect(text).not.toMatch(/NSUserTracking|UsageDescription|"permissions"/);
  });

  it('nothing is stored about the child except settings on the device', () => {
    const users = walk(SRC).filter((f) => fs.readFileSync(f, 'utf8').includes('AsyncStorage'));
    expect(users.map((f) => path.relative(SRC, f).split(path.sep).join('/'))).toEqual(['storage/saveStore.ts']);
  });
});
