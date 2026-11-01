// A static UI sprite from the art manifest, or the given code placeholder when it hasn't landed.
import type { ReactNode } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { art } from '../art';

interface Props {
  id: string;
  size: number;
  /** Width / height (default square). */
  aspect?: number;
  style?: StyleProp<ImageStyle>;
  placeholder: ReactNode;
}

export default function ArtImage({ id, size, aspect = 1, style, placeholder }: Props) {
  const src = art(id);
  if (src === null) return <>{placeholder}</>;
  return <Image source={src} style={[{ width: size * aspect, height: size }, style]} resizeMode="contain" />;
}
