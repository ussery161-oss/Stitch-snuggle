// Shared colours and sizes. The palette follows the r03 art (warm pastels, #4A3A3A outlines).
import { useWindowDimensions } from 'react-native';

export const colors = {
  cream: '#FFF4E6',
  paper: '#FDF8F0',
  line: '#4A3A3A',
  pink: '#F4A7B9',
  rose: '#E87F95',
  mint: '#A8DCC8',
  butter: '#F7D97C',
  lavender: '#C8B6E8',
  sky: '#A9CDEE',
  peach: '#F6C6A8',
  gold: '#F2C94C',
  white: '#FFFFFF',
  shadow: 'rgba(74,58,58,0.18)',
} as const;

/** Kids' touch targets are never smaller than this (pt). */
export const MIN_TOUCH = 64;

/** Below this width (pt) the screen is a phone. */
export const PHONE_MAX_WIDTH = 900;

export interface Layout {
  width: number;
  height: number;
  /** Scale from the 1024×768 iPad design size; art scales by this, touch targets never drop below MIN_TOUCH. */
  scale: number;
  isPhone: boolean;
}

export function layoutFor(width: number, height: number): Layout {
  const scale = Math.min(width / 1024, height / 768);
  return { width, height, scale, isPhone: Math.min(width, height) < 600 || width < PHONE_MAX_WIDTH };
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor(width, height);
}

/** A design size (pt at 1024×768) scaled to the screen, but never under MIN_TOUCH. */
export function touchSize(design: number, scale: number): number {
  return Math.max(MIN_TOUCH, Math.round(design * scale));
}
