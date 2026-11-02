// Visual check: the clinic scene with the plushie at scenes.json's plush_rect, half-scrubbed mud
// (erase strokes + clip to the part), suds, a rip guide, and the Bunny with a dirty belly.
import { Circle, Fill, Group, Image, Path, Skia } from '@shopify/react-native-skia';

import { CLINIC_PLUSH_RECT, sceneLayout, SCENE_H, SCENE_W } from '../../src/clinic/helpers';
import { cumulativeLengths, pointAt } from '../../src/clinic/stitchMath';
import MudOverlay from '../../src/clinic/ui/MudOverlay';
import { createVisit } from '../../src/clinic/visit';
import { loadPlushAssets } from '../../src/plush/assets';
import { loadImage } from '../../src/plush/imageCache';
import PlushDrawing from '../../src/plush/PlushDrawing';
import { bodySet } from '../../src/plush/registry';
import { PRESETS } from '../../src/plush/spec';
import { renderPng, useDiskArt } from './harness';

const W = 1024;
const H = 768;

describe('visual: clinic', () => {
  beforeAll(() => useDiskArt());

  it('renders the clinic scene with mud, suds and a rip', async () => {
    const layout = sceneLayout(W, H, CLINIC_PLUSH_RECT);
    const scene = await loadImage('ui/scenes/scene_clinic');
    const spec = PRESETS.bear;
    const set = bodySet('bear', 'round');
    const assets = await loadPlushAssets(spec, set, 0.8, 'sad_ouch');
    const splats = [await loadImage('damage/mud_splat_1'), await loadImage('damage/mud_splat_2')];
    let seed = 1;
    let visit = createVisit(spec, seed, { kinds: ['rip', 'dirt'] });
    while (!(visit.damages.some((d) => d.kind === 'dirt' && d.part === 'body') && visit.damages.some((d) => d.kind === 'rip'))) visit = createVisit(spec, ++seed, { kinds: ['rip', 'dirt'] });
    const dirt = visit.damages.filter((d) => d.kind === 'dirt');
    // One scrub stroke through the first splat.
    const erase = Skia.Path.Make();
    erase.moveTo(dirt[0].xy[0] - 140, dirt[0].xy[1] - 120);
    erase.lineTo(dirt[0].xy[0] - 60, dirt[0].xy[1] - 70);
    const rip = visit.damages.find((d) => d.kind === 'rip')!;
    const pts = rip.path!.flatMap((p) => [p[0], p[1]]);
    const cum = cumulativeLengths(pts);
    const dots: { x: number; y: number }[] = [];
    for (let s = 0; s <= cum[cum.length - 1]; s += 24) dots.push(pointAt(pts, cum, s));
    const file = await renderPng(
      <Group>
        <Fill color="#E8F4EE" />
        {scene ? <Image image={scene} x={layout.offsetX} y={layout.offsetY} width={SCENE_W * layout.scale} height={SCENE_H * layout.scale} fit="fill" /> : null}
        <Group transform={[{ translateX: layout.plush.x }, { translateY: layout.plush.y }, { scale: layout.plush.size / 1024 }]}>
          <PlushDrawing
            set={set}
            spec={spec}
            assets={assets}
            overlay={(a, st) => (
              <Group>
                <MudOverlay dirt={dirt} assets={a} set={st} erase={erase} opacity={1} splats={splats} />
                {dots.map((d, i) => (
                  <Circle key={i} cx={d.x} cy={d.y} r={7} color="#FFFFFF" />
                ))}
                <Path path={(() => { const p = Skia.Path.Make(); p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); return p; })()} color="#D9577A" style="stroke" strokeWidth={9} start={0} end={0.5} />
                <Circle cx={dirt[0].xy[0] + 30} cy={dirt[0].xy[1] - 40} r={26} color="rgba(255,255,255,0.9)" />
              </Group>
            )}
          />
        </Group>
      </Group>,
      W,
      H,
      'clinic_scene.png',
    );
    expect(file).toContain('clinic_scene.png');
  });
});
