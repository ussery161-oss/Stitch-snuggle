/* global Buffer */
// npm run gen:icon — the app icon (1024, no transparency, as Apple requires) and the launch image.
// If the Art Director's assets/art/ui/app_icon.png exists, it is used as is. Otherwise a placeholder
// is composited from the r03 Bear art (same layer rules as the app: mask tint, overlay shade,
// screen highlight, line) on a soft cream background.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'assets', 'art');
const OUT = join(ROOT, 'assets', 'app');
const require = createRequire(import.meta.url);

const BEAR = { body: '#E2B26A', belly: '#FDF3E2', muzzle: '#FDF3E2', nose: '#6E483C' };
const region = (p) => (p === 'belly' || p.startsWith('earInner') ? 'belly' : p === 'muzzle' ? 'muzzle' : p === 'nose' ? 'nose' : 'body');

async function main() {
  mkdirSync(OUT, { recursive: true });
  const CK = await require('canvaskit-wasm/bin/full/canvaskit.js')({ locateFile: (f) => join(dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.js')), f) });
  const load = (rel) => {
    const p = join(ART, rel);
    return existsSync(p) ? CK.MakeImageFromEncoded(readFileSync(p)) : null;
  };
  const save = (surface, name) => writeFileSync(join(OUT, name), Buffer.from(surface.makeImageSnapshot().encodeToBytes()));

  const drawBear = (c) => {
    const a = JSON.parse(readFileSync(join(ART, 'plush/bear/round/anchors.json'), 'utf8'));
    for (const part of a.z_order) {
      const d = `plush/bear/round/${part}_`;
      const mask = load(d + 'mask.png');
      if (!mask) continue;
      const fill = new CK.Paint();
      fill.setColorFilter(CK.ColorFilter.MakeBlend(CK.parseColorString(BEAR[region(part)]), CK.BlendMode.SrcIn));
      c.drawImage(mask, 0, 0, fill);
      const sh = load(d + 'shade.png');
      if (sh) {
        const p = new CK.Paint();
        p.setBlendMode(CK.BlendMode.Overlay);
        c.drawImage(sh, 0, 0, p);
      }
      const hl = load(d + 'highlight.png');
      if (hl) {
        const p = new CK.Paint();
        p.setBlendMode(CK.BlendMode.Screen);
        c.drawImage(hl, 0, 0, p);
      }
      const line = load(d + 'line.png');
      if (line) c.drawImage(line, 0, 0, new CK.Paint());
    }
    // Button eyes and a smile from the face sprites, on the anchors (scaled by fit.scale).
    const s = a.fit.scale;
    const eyes = [load('faces/eyes/button_fill.png'), load('faces/eyes/button_line.png')];
    for (const img of eyes) {
      if (!img) continue;
      for (const [anchor, cx, sx] of [
        [a.eyeL, 160, 0],
        [a.eyeR, 352, 256],
      ]) {
        c.save();
        c.translate(anchor[0] - cx * s, anchor[1] - 128 * s);
        c.scale(s, s);
        c.clipRect(CK.XYWHRect(sx, 0, 256, 256), CK.ClipOp.Intersect, true);
        c.drawImage(img, 0, 0, new CK.Paint());
        c.restore();
      }
    }
    for (const name of ['smile_fill', 'smile_line']) {
      const img = load(`faces/mouths/${name}.png`);
      if (!img) continue;
      c.save();
      c.translate(a.mouth[0] - 128 * s, a.mouth[1] - 64 * s);
      c.scale(s, s);
      c.drawImage(img, 0, 0, new CK.Paint());
      c.restore();
    }
  };

  // Icon: 1024×1024, opaque.
  const iconArt = join(ART, 'ui', 'app_icon.png');
  const icon = CK.MakeSurface(1024, 1024);
  const ic = icon.getCanvas();
  ic.clear(CK.parseColorString('#FFE3EA'));
  if (existsSync(iconArt)) {
    ic.drawImage(CK.MakeImageFromEncoded(readFileSync(iconArt)), 0, 0, new CK.Paint());
  } else {
    const glow = new CK.Paint();
    glow.setColor(CK.parseColorString('#FFF4E6'));
    glow.setAntiAlias(true);
    ic.drawCircle(512, 560, 470, glow);
    ic.save();
    // The bear's head and shoulders fill the icon.
    ic.translate(-180, -40);
    ic.scale(1.36, 1.36);
    drawBear(ic);
    ic.restore();
  }
  save(icon, 'icon.png');

  // Launch image: the whole bear on transparent (the splash background colour is in app.json).
  const splash = CK.MakeSurface(1024, 1024);
  const sc = splash.getCanvas();
  sc.clear(CK.TRANSPARENT);
  drawBear(sc);
  save(splash, 'splash.png');
  console.log('wrote assets/app/icon.png and assets/app/splash.png');
}

main();
