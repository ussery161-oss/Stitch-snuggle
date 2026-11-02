// P1-B: the generated art manifest matches assets/art/, every art file is credited in
// assets/CREDITS.md, and no PNG is larger than 2048 px on a side.
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const { execFileSync } = require('child_process') as typeof import('child_process');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'assets', 'art');
const MANIFEST = path.join(ROOT, 'src', 'art', 'manifest.generated.ts');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

/** Width and height from a PNG's IHDR chunk. */
export function pngSize(file: string): { w: number; h: number } {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} is not a PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Folders (`art/plush/`) and single files (`art/ui/basket.png`) credited in CREDITS.md's file tables. */
export function creditedFolders(credits: string): string[] {
  return [...credits.matchAll(/^\|\s*`([a-z0-9_/.-]+(?:\/|\.png|\.m4a))`\s*\|/gim)].map((m) => m[1]);
}

const files = walk(ART).map((p) => path.relative(path.join(ROOT, 'assets'), p).split(path.sep).join('/'));

describe('art manifest', () => {
  it('is in sync with assets/art (run `npm run gen:art` if this fails)', () => {
    const fresh = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', "import { buildManifest } from './scripts/gen-art-manifest.mjs'; process.stdout.write(buildManifest());"],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    expect(fs.readFileSync(MANIFEST, 'utf8') === fresh).toBe(true);
  });

  it('the plush layer bounds are in sync (run `npm run gen:art` if this fails)', () => {
    const fresh = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { boundedFiles, alphaBounds, boundsSource } from './scripts/gen-art-manifest.mjs'; const e = []; for (const f of boundedFiles()) e.push([f, await alphaBounds(f)]); process.stdout.write(boundsSource(e));",
      ],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    expect(fs.readFileSync(path.join(ROOT, 'src', 'art', 'bounds.generated.ts'), 'utf8') === fresh).toBe(true);
  }, 120000);

  it('lists every PNG under assets/art', () => {
    const { ART_IMAGES } = require('../src/art/manifest.generated');
    const pngs = files.filter((f) => f.endsWith('.png'));
    expect(Object.keys(ART_IMAGES).length).toBe(pngs.length);
    expect(pngs.length).toBeGreaterThan(1000);
  });

  it('every art and audio file is credited in assets/CREDITS.md', () => {
    const folders = creditedFolders(fs.readFileSync(path.join(ROOT, 'assets', 'CREDITS.md'), 'utf8'));
    expect(folders).toContain('art/plush/');
    const audio = fs.existsSync(path.join(ROOT, 'assets', 'audio'))
      ? walk(path.join(ROOT, 'assets', 'audio')).map((p) => path.relative(path.join(ROOT, 'assets'), p).split(path.sep).join('/'))
      : [];
    const app = fs.existsSync(path.join(ROOT, 'assets', 'app')) ? walk(path.join(ROOT, 'assets', 'app')).map((p) => path.relative(path.join(ROOT, 'assets'), p).split(path.sep).join('/')) : [];
    const media = [...files, ...audio, ...app].filter((f) => /\.(png|m4a|mp3|wav)$/.test(f));
    const uncredited = media.filter((f) => !folders.some((d) => f.startsWith(d)));
    expect(uncredited).toEqual([]);
  });

  it('keeps the art set credits from assets/art/ART_CREDITS.md', () => {
    const credits = fs.readFileSync(path.join(ROOT, 'assets', 'CREDITS.md'), 'utf8');
    for (const set of ['r01', 'r02', 'r03']) expect(credits).toContain(`Art set ${set}`);
    expect(credits).toContain('Kokoro-82M v1.0 (hexgrad), voice af_bella');
    expect(credits).toContain('Apache License 2.0');
  });

  it('no PNG is larger than 2048 px on a side', () => {
    const big = files
      .filter((f) => f.endsWith('.png'))
      .map((f) => ({ f, ...pngSize(path.join(ROOT, 'assets', f)) }))
      .filter((s) => s.w > 2048 || s.h > 2048);
    expect(big).toEqual([]);
  });

  it('art(id) returns the image, or null for missing art', () => {
    const { art, artData } = require('../src/art');
    expect(art('plush/bear/round/head_mask')).not.toBeNull();
    expect(art('plush/nothing/here')).toBeNull();
    expect(artData('plush/bear/round/anchors')).toMatchObject({ base: 'bear', body: 'round' });
  });
});
