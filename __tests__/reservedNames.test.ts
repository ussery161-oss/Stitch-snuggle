// P1-B: Windows can't check out a file whose base name is a reserved device name (con, prn, aux,
// nul, com1–9, lpt1–9), with any extension. Mike works from Windows, so none may exist.
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'dist', '.expo', 'artifacts', 'ios', 'android']);
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function isReservedName(name: string): boolean {
  return RESERVED.test(name.split('.')[0].trim());
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (SKIP.has(d.name)) return [];
    const p = path.join(dir, d.name);
    return d.isDirectory() ? [p, ...walk(p)] : [p];
  });
}

describe('Windows-reserved file names', () => {
  it('recognises the reserved names, with any extension and any case', () => {
    for (const n of ['con', 'CON.ts', 'nul.png', 'Aux.json', 'com1', 'lpt9.md', 'prn.tar.gz']) expect(isReservedName(n)).toBe(true);
    for (const n of ['console.ts', 'icon.png', 'com10.ts', 'auxiliary.md', 'null.ts', 'com0']) expect(isReservedName(n)).toBe(false);
  });

  it('no file or folder in the repo uses one', () => {
    const bad = walk(ROOT)
      .filter((p) => isReservedName(path.basename(p)))
      .map((p) => path.relative(ROOT, p));
    expect(bad).toEqual([]);
  });
});
