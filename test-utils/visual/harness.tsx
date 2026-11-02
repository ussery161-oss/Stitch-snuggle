// Helpers for the headless visual check: read art from disk, render a Skia element to a PNG.
import { drawOffscreen, makeOffscreenSurface } from '@shopify/react-native-skia/lib/commonjs/headless';
import type { ReactElement } from 'react';

import { setByteSource } from '../../src/plush/imageCache';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

export const ROOT = path.join(__dirname, '..', '..');
export const OUT_DIR = path.join(ROOT, 'artifacts', 'visual', process.env.VISUAL_PHASE ?? 'phase1');

/** Art bytes come straight from assets/art. */
export function useDiskArt(): void {
  setByteSource(async (id) => {
    const p = path.join(ROOT, 'assets', 'art', `${id}.png`);
    return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : null;
  });
}

export async function renderPng(element: ReactElement, width: number, height: number, name: string): Promise<string> {
  const surface = makeOffscreenSurface(width, height);
  const image = await drawOffscreen(surface, element);
  const bytes = image.encodeToBytes();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, Buffer.from(bytes));
  return file;
}
