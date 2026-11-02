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

describe('visual: care step overlays', () => {
  beforeAll(() => useDiskArt());

  it('renders a patch, tangles and a drooping arm', async () => {
    const { PatchDrawing } = require('../../src/clinic/ui/RepairsOverlay');
    const { droopTransform } = require('../../src/clinic/helpers');
    const spec = PRESETS.bunny;
    const set = bodySet('bunny', 'round');
    const assets = await loadPlushAssets(spec, set, 0.6, 'neutral');
    const swatch = await loadImage('fabrics/patch_swatch_mint_check');
    const tile = await loadImage('damage/tangle_tile');
    const arm = set.parts.find((p) => p.id === 'armL')!;
    const belly = set.damageSpots.find((d) => d.part === 'belly')!;
    const head = set.damageSpots.find((d) => d.id === 'rip_head')!;
    const tangles = [{ id: 't', kind: 'tangle' as const, part: 'head', xy: head.xy, radius: 110 }];
    const file = await renderPng(
      <Group>
        <Fill color="#F0E4D4" />
        <Group transform={[{ scale: 0.6 }]}>
          <PlushDrawing
            set={set}
            spec={spec}
            assets={assets}
            partTransforms={{ armL: droopTransform({ x: arm.anchor[0], y: arm.anchor[1] }, 0, 1) }}
            overlay={(a, st) => (
              <Group>
                <PatchDrawing at={belly.xy} radius={62} image={swatch} />
                <MudOverlay dirt={tangles} assets={a} set={st} erase={Skia.Path.Make()} opacity={1} splats={[]} tangle={tile} />
              </Group>
            )}
          />
        </Group>
      </Group>,
      615,
      615,
      'care_overlays.png',
    );
    expect(file).toContain('care_overlays.png');
  });
});

describe('visual: recovery room', () => {
  beforeAll(() => useDiskArt());

  it('renders the recovery room with the plush on the rug and the tiny gold charm', async () => {
    const { RECOVERY_PLUSH_RECT, scenePoint } = require('../../src/clinic/helpers');
    const { CHARM_OPACITY, CHARM_SCENE_POS, charmSize, goldMatrix } = require('../../src/clinic/WallCharm');
    const { ColorMatrix } = require('@shopify/react-native-skia');
    const layout = sceneLayout(W, H, RECOVERY_PLUSH_RECT);
    const scene = await loadImage('ui/scenes/scene_recovery');
    const charm = await loadImage('ui/decor/wall_charm_heart_cross');
    const spec = PRESETS.bunny;
    const set = bodySet('bunny', 'round');
    const assets = await loadPlushAssets(spec, set, 0.8, 'big_happy');
    const at = scenePoint(layout, CHARM_SCENE_POS);
    const size = charmSize(false);
    const file = await renderPng(
      <Group>
        <Fill color="#E9E1F5" />
        {scene ? <Image image={scene} x={layout.offsetX} y={layout.offsetY} width={SCENE_W * layout.scale} height={SCENE_H * layout.scale} fit="fill" /> : null}
        <Group transform={[{ translateX: layout.plush.x }, { translateY: layout.plush.y }, { scale: layout.plush.size / 1024 }]}>
          <PlushDrawing set={set} spec={spec} assets={assets} />
        </Group>
        <Group opacity={CHARM_OPACITY}>
          <Image image={charm} x={at.x - size / 2} y={at.y - size / 2} width={size} height={size} fit="contain">
            <ColorMatrix matrix={goldMatrix()} />
          </Image>
        </Group>
      </Group>,
      W,
      H,
      'recovery_scene.png',
    );
    expect(file).toContain('recovery_scene.png');
  });
});
