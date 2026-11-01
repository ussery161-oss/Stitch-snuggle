// P1-B: Kids Category / COPPA. App code makes no network calls and holds no web links.
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

const SRC = path.join(__dirname, '..', 'src');
const ROOT = path.join(__dirname, '..');

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'fetch(', re: /\bfetch\s*\(/ },
  { name: 'XMLHttpRequest', re: /XMLHttpRequest/ },
  { name: 'WebSocket', re: /WebSocket/ },
  { name: 'http(s)://', re: /https?:\/\//i },
  { name: 'Linking.openURL', re: /openURL/ },
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

export function networkHits(text: string): string[] {
  return FORBIDDEN.filter((f) => f.re.test(text)).map((f) => f.name);
}

describe('no network in src/', () => {
  it('detects each forbidden pattern', () => {
    expect(networkHits("fetch('x')")).toEqual(['fetch(']);
    expect(networkHits('new WebSocket(u)')).toEqual(['WebSocket']);
    expect(networkHits('const u = "https://example.com";')).toEqual(['http(s)://']);
    expect(networkHits('const prefetched = 1;')).toEqual([]);
  });

  it('no src/ file uses fetch, XMLHttpRequest, WebSocket, openURL or an http(s) URL', () => {
    const hits = walk(SRC)
      .filter((f) => /\.(tsx?|js|json)$/.test(f))
      .flatMap((f) => networkHits(fs.readFileSync(f, 'utf8')).map((h) => `${path.relative(ROOT, f)}: ${h}`));
    expect(hits).toEqual([]);
  });
});
