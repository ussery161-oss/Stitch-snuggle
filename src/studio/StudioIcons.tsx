// Code-drawn icons for the Studio (no art for these yet). Each draws in a 100×100 box.
import { Canvas, Circle, Group, Line, Oval, Path, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';

import { HEART_SVG } from '../ui/Icons';
import { colors } from '../ui/theme';

const L = colors.line;

function Box({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: size / 100 }]}>{children}</Group>
    </Canvas>
  );
}

export type IconName = 'base' | 'body' | 'patterns' | 'eyes' | 'name' | 'undo' | 'dice' | 'save' | 'shelf' | 'padlock' | 'doctor' | 'edit' | 'close';

export default function StudioIcon({ name, size }: { name: IconName; size: number }) {
  const heart = useMemo(() => Skia.Path.MakeFromSVGString(HEART_SVG)!, []);
  const arrow = useMemo(() => Skia.Path.MakeFromSVGString('M30 30 C60 10 90 35 80 62 C72 82 45 86 30 74')!, []);
  const tag = useMemo(() => Skia.Path.MakeFromSVGString('M12 30 L58 30 L88 50 L58 70 L12 70 Z')!, []);
  const eye = useMemo(() => Skia.Path.MakeFromSVGString('M8 50 C30 20 70 20 92 50 C70 80 30 80 8 50 Z')!, []);
  const shackle = useMemo(() => Skia.Path.MakeFromSVGString('M32 48 L32 34 C32 22 40 14 50 14 C60 14 68 22 68 34 L68 48')!, []);
  switch (name) {
    case 'base':
      return (
        <Box size={size}>
          <Circle cx={50} cy={62} r={22} color={colors.peach} />
          <Circle cx={26} cy={36} r={10} color={colors.peach} />
          <Circle cx={42} cy={24} r={10} color={colors.peach} />
          <Circle cx={60} cy={24} r={10} color={colors.peach} />
          <Circle cx={76} cy={36} r={10} color={colors.peach} />
          <Circle cx={50} cy={62} r={22} color={L} style="stroke" strokeWidth={4} />
        </Box>
      );
    case 'body':
      return (
        <Box size={size}>
          <Oval x={6} y={40} width={26} height={44} color={colors.pink} />
          <Oval x={37} y={18} width={26} height={66} color={colors.sky} />
          <Oval x={68} y={52} width={26} height={32} color={colors.mint} />
        </Box>
      );
    case 'patterns':
      return (
        <Box size={size}>
          <RoundedRect x={10} y={10} width={80} height={80} r={12} color={colors.butter} />
          {[0, 1, 2, 3].flatMap((i) => [0, 1, 2, 3].map((j) => ((i + j) % 2 ? <Rect key={`${i}${j}`} x={10 + i * 20} y={10 + j * 20} width={20} height={20} color={colors.rose} opacity={0.6} /> : null)))}
          <RoundedRect x={10} y={10} width={80} height={80} r={12} color={L} style="stroke" strokeWidth={4} />
        </Box>
      );
    case 'eyes':
      return (
        <Box size={size}>
          <Path path={eye} color="#FFFFFF" />
          <Circle cx={50} cy={50} r={16} color={L} />
          <Circle cx={44} cy={44} r={5} color="#FFFFFF" />
          <Path path={eye} color={L} style="stroke" strokeWidth={4} />
        </Box>
      );
    case 'name':
      return (
        <Box size={size}>
          <Path path={tag} color={colors.butter} />
          <Path path={tag} color={L} style="stroke" strokeWidth={4} strokeJoin="round" />
          <Circle cx={70} cy={50} r={5} color={L} />
          <Line p1={vec(22, 44)} p2={vec(48, 44)} color={L} strokeWidth={4} />
          <Line p1={vec(22, 56)} p2={vec(40, 56)} color={L} strokeWidth={4} />
        </Box>
      );
    case 'undo':
      return (
        <Box size={size}>
          <Path path={arrow} color={L} style="stroke" strokeWidth={9} strokeCap="round" />
          <Path path={Skia.Path.MakeFromSVGString('M14 30 L36 14 L38 42 Z')!} color={L} />
        </Box>
      );
    case 'dice':
      return (
        <Box size={size}>
          <RoundedRect x={12} y={12} width={76} height={76} r={16} color="#FFFFFF" />
          <RoundedRect x={12} y={12} width={76} height={76} r={16} color={L} style="stroke" strokeWidth={5} />
          {[
            [32, 32],
            [68, 32],
            [50, 50],
            [32, 68],
            [68, 68],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={7} color={colors.rose} />
          ))}
        </Box>
      );
    case 'save':
      return (
        <Box size={size}>
          <Path path={heart} color={colors.rose} />
          <Path path={heart} color={L} style="stroke" strokeWidth={5} />
          <Line p1={vec(50, 32)} p2={vec(50, 64)} color="#FFFFFF" strokeWidth={8} strokeCap="round" />
          <Line p1={vec(34, 48)} p2={vec(66, 48)} color="#FFFFFF" strokeWidth={8} strokeCap="round" />
        </Box>
      );
    case 'shelf':
      return (
        <Box size={size}>
          <RoundedRect x={10} y={8} width={80} height={84} r={8} color={colors.peach} />
          <Rect x={10} y={46} width={80} height={6} color={L} />
          <Rect x={10} y={86} width={80} height={6} color={L} />
          <Circle cx={32} cy={34} r={10} color={colors.pink} />
          <Circle cx={66} cy={34} r={10} color={colors.sky} />
          <Circle cx={48} cy={72} r={10} color={colors.mint} />
          <RoundedRect x={10} y={8} width={80} height={84} r={8} color={L} style="stroke" strokeWidth={4} />
        </Box>
      );
    case 'padlock':
      return (
        <Box size={size}>
          <Path path={shackle} color={L} style="stroke" strokeWidth={9} strokeCap="round" />
          <RoundedRect x={22} y={44} width={56} height={44} r={10} color={colors.butter} />
          <RoundedRect x={22} y={44} width={56} height={44} r={10} color={L} style="stroke" strokeWidth={5} />
          <Circle cx={50} cy={64} r={6} color={L} />
        </Box>
      );
    case 'doctor':
      return (
        <Box size={size}>
          <Circle cx={50} cy={50} r={42} color="#FFFFFF" />
          <Path path={heart} color={colors.rose} transform={[{ translateX: 18 }, { translateY: 18 }, { scale: 0.64 }]} />
          <Rect x={44} y={32} width={12} height={34} color="#FFFFFF" />
          <Rect x={33} y={43} width={34} height={12} color="#FFFFFF" />
          <Circle cx={50} cy={50} r={42} color={L} style="stroke" strokeWidth={5} />
        </Box>
      );
    case 'edit':
      return (
        <Box size={size}>
          <Circle cx={50} cy={50} r={42} color={colors.lavender} />
          <Circle cx={36} cy={40} r={8} color={colors.rose} />
          <Circle cx={56} cy={32} r={8} color={colors.butter} />
          <Circle cx={66} cy={52} r={8} color={colors.sky} />
          <Circle cx={44} cy={64} r={8} color={colors.mint} />
          <Circle cx={50} cy={50} r={42} color={L} style="stroke" strokeWidth={5} />
        </Box>
      );
    case 'close':
      return (
        <Box size={size}>
          <Line p1={vec(25, 25)} p2={vec(75, 75)} color={L} strokeWidth={10} strokeCap="round" />
          <Line p1={vec(75, 25)} p2={vec(25, 75)} color={L} strokeWidth={10} strokeCap="round" />
        </Box>
      );
  }
}
