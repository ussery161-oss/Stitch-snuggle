// Code placeholders for plush parts, used whenever art(id) returns null. Pure TypeScript: each
// part is an SVG path string on the 1024 canvas (Skia parses it at draw time). Bear and Bunny are
// drawn in round, tall and tiny; any other base borrows the bear's shapes.
import type { BaseId, BodyType, Vec } from './types';

export interface PlaceholderShape {
  part: string;
  /** SVG path on the 1024 canvas. */
  d: string;
  /** Centre (also the droop pivot). */
  c: Vec;
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M${r(cx - rx)} ${r(cy)} A${r(rx)} ${r(ry)} 0 1 0 ${r(cx + rx)} ${r(cy)} A${r(rx)} ${r(ry)} 0 1 0 ${r(cx - rx)} ${r(cy)} Z`;
}

/** Body proportions per body type (width factor, height factor, head size). */
const BODY: Record<BodyType, { w: number; h: number; head: number; headY: number }> = {
  round: { w: 1.0, h: 1.0, head: 1.0, headY: 330 },
  tall: { w: 0.78, h: 1.12, head: 0.82, headY: 300 },
  tiny: { w: 1.08, h: 0.82, head: 1.14, headY: 360 },
};

/** The placeholder parts for a base and body type, back to front. */
export function placeholderShapes(base: BaseId, body: BodyType): PlaceholderShape[] {
  const b = BODY[body];
  const cx = 512;
  const headR = 200 * b.head;
  const headY = b.headY;
  const bodyRx = 210 * b.w;
  const bodyRy = 220 * b.h;
  const bodyY = headY + headR + bodyRy * 0.55;
  const footY = Math.min(960, bodyY + bodyRy + 40);
  const out: PlaceholderShape[] = [];
  const add = (part: string, x: number, y: number, rx: number, ry: number) => out.push({ part, d: ellipse(x, y, rx, ry), c: [x, y] });

  add('tail', cx + bodyRx * 0.85, bodyY + bodyRy * 0.35, 46, 42);
  add('legL', cx - bodyRx * 0.5, footY - 50, 78 * b.w + 10, 62);
  add('legR', cx + bodyRx * 0.5, footY - 50, 78 * b.w + 10, 62);
  add('body', cx, bodyY, bodyRx, bodyRy);
  add('belly', cx, bodyY + bodyRy * 0.12, bodyRx * 0.58, bodyRy * 0.58);
  add('armL', cx - bodyRx * 0.98, bodyY - bodyRy * 0.15, 62, 112 * b.h);
  add('armR', cx + bodyRx * 0.98, bodyY - bodyRy * 0.15, 62, 112 * b.h);
  if (base === 'bunny') {
    // Long ears, standing up behind the head.
    const earH = 190 * b.head;
    add('earL', cx - headR * 0.42, headY - headR - earH * 0.55, 52 * b.head, earH);
    add('earR', cx + headR * 0.42, headY - headR - earH * 0.55, 52 * b.head, earH);
    add('earInnerL', cx - headR * 0.42, headY - headR - earH * 0.55, 26 * b.head, earH * 0.72);
    add('earInnerR', cx + headR * 0.42, headY - headR - earH * 0.55, 26 * b.head, earH * 0.72);
  } else {
    // Round ears on top of the head.
    const er = 70 * b.head;
    add('earL', cx - headR * 0.78, headY - headR * 0.72, er, er);
    add('earR', cx + headR * 0.78, headY - headR * 0.72, er, er);
    add('earInnerL', cx - headR * 0.78, headY - headR * 0.72, er * 0.55, er * 0.55);
    add('earInnerR', cx + headR * 0.78, headY - headR * 0.72, er * 0.55, er * 0.55);
  }
  add('head', cx, headY, headR, headR * 0.92);
  add('muzzle', cx, headY + headR * 0.42, headR * 0.42, headR * 0.3);
  add('nose', cx, headY + headR * 0.3, headR * 0.12, headR * 0.08);
  return out;
}

/** Anchors for a placeholder body (the art's anchors.json has these for real art). */
export function placeholderAnchors(base: BaseId, body: BodyType) {
  const b = BODY[body];
  const shapes = placeholderShapes(base, body);
  const get = (p: string) => shapes.find((s) => s.part === p)!.c;
  const head = get('head');
  const headR = 200 * b.head;
  const bodyC = get('body');
  return {
    anchors: {
      head,
      neck: [512, head[1] + headR * 0.95] as Vec,
      chest: [512, bodyC[1] - 40] as Vec,
      eyeL: [512 - headR * 0.4, head[1] - 10] as Vec,
      eyeR: [512 + headR * 0.4, head[1] - 10] as Vec,
      mouth: [512, head[1] + headR * 0.58] as Vec,
      handL: get('armL'),
      handR: get('armR'),
      footL: get('legL'),
      footR: get('legR'),
    },
    slots: {
      hat_top: [512, head[1] - headR * 1.0] as Vec,
      bow_ear: [512 + headR * 0.7, head[1] - headR * 0.75] as Vec,
      glasses: [512, head[1] - 10] as Vec,
      neckwear: [512, head[1] + headR * 0.95] as Vec,
      cape: [512, head[1] + headR] as Vec,
      waist: [512, bodyC[1] + 60] as Vec,
      chest: [512, bodyC[1] - 40] as Vec,
    },
  };
}

/** Rough bounds [x, y, w, h] of a placeholder shape (from its centre and radii). */
export function placeholderBounds(d: string): readonly [number, number, number, number] {
  const m = /^M([\d.-]+) ([\d.-]+) A([\d.-]+) ([\d.-]+)/.exec(d);
  if (!m) return [0, 0, 1024, 1024];
  const x = Number(m[1]);
  const cy = Number(m[2]);
  const rx = Number(m[3]);
  const ry = Number(m[4]);
  return [Math.floor(x - 2), Math.floor(cy - ry - 2), Math.ceil(rx * 2 + 4), Math.ceil(ry * 2 + 4)];
}
