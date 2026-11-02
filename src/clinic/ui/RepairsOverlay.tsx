// Repairs made earlier in the visit, drawn on the plushie in every later phase: sewn rips (thread
// and X-stitches) and patches with their three stitches. Pure drawing.
import { Circle, Group, Image, Path, Skia, type SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { cumulativeLengths, pointAt } from '../stitchMath';
import { patchDots, type Repair } from '../snap';
import { useArtImage } from '../../ui/useArtImage';

export const THREAD = '#D9577A';

function xPath(points: readonly { x: number; y: number }[], r = 11) {
  const p = Skia.Path.Make();
  for (const { x, y } of points) {
    p.moveTo(x - r, y - r);
    p.lineTo(x + r, y + r);
    p.moveTo(x + r, y - r);
    p.lineTo(x - r, y + r);
  }
  return p;
}

function SewnRip({ path }: { path: readonly (readonly [number, number])[] }) {
  const { line, xs } = useMemo(() => {
    const pts = path.flatMap((q) => [q[0], q[1]]);
    const cum = cumulativeLengths(pts);
    const l = Skia.Path.Make();
    l.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) l.lineTo(pts[i], pts[i + 1]);
    const out: { x: number; y: number }[] = [];
    for (let s = 19; s < cum[cum.length - 1]; s += 38) out.push(pointAt(pts, cum, s));
    return { line: l, xs: xPath(out) };
  }, [path]);
  return (
    <Group>
      <Path path={line} color={THREAD} style="stroke" strokeWidth={6} strokeCap="round" opacity={0.8} />
      <Path path={xs} color={THREAD} style="stroke" strokeWidth={7} strokeCap="round" />
    </Group>
  );
}

export function PatchDrawing({ at, radius, image, dotsDone = 3 }: { at: readonly [number, number]; radius: number; image: SkImage | null; dotsDone?: number }) {
  const dots = patchDots(at, radius * 0.72).slice(0, dotsDone);
  const size = radius * 2.1;
  const rr = useMemo(() => Skia.RRectXY(Skia.XYWHRect(at[0] - size / 2, at[1] - size / 2, size, size), size * 0.18, size * 0.18), [at, size]);
  const clip = useMemo(() => Skia.Path.Make().addRRect(rr), [rr]);
  return (
    <Group>
      <Group clip={clip}>
        {image ? <Image image={image} x={at[0] - size / 2} y={at[1] - size / 2} width={size} height={size} fit="cover" /> : <Circle cx={at[0]} cy={at[1]} r={size} color="#F4A7B9" />}
      </Group>
      <Path path={clip} color="#4A3A3A" style="stroke" strokeWidth={6} />
      <Path path={xPath(dots.map(([x, y]) => ({ x, y })), 10)} color={THREAD} style="stroke" strokeWidth={7} strokeCap="round" />
    </Group>
  );
}

function PatchRepair({ r }: { r: Extract<Repair, { kind: 'patch' }> }) {
  const img = useArtImage(r.swatch);
  return <PatchDrawing at={r.at} radius={r.radius} image={img} />;
}

export default function RepairsOverlay({ repairs }: { repairs: readonly Repair[] }) {
  return (
    <Group>
      {repairs.map((r, i) => (r.kind === 'stitch' ? <SewnRip key={i} path={r.path} /> : <PatchRepair key={i} r={r} />))}
    </Group>
  );
}
