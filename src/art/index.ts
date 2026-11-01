// art(id): the bundled image for an art id, or null when that art hasn't landed yet. Every
// drawing call goes through here; on null the caller draws its code placeholder.
import { ART_DATA, ART_IMAGES } from './manifest.generated';

let images: Readonly<Record<string, number>> = ART_IMAGES;
let data: Readonly<Record<string, unknown>> = ART_DATA;

/** The image module for `id` ('plush/bear/round/head_mask'), or null. */
export function art(id: string): number | null {
  return images[id] ?? null;
}

/** A bundled art JSON file ('plush/bear/round/anchors'), or null. */
export function artData<T = unknown>(id: string): T | null {
  return (data[id] as T | undefined) ?? null;
}

/** Every art image id (for tests and the dev screen). */
export function artIds(): string[] {
  return Object.keys(images);
}

/** Tests only: pretend the art folder holds just these entries (null = restore the real manifest). */
export function setArtManifestForTests(next: { images?: Record<string, number>; data?: Record<string, unknown> } | null): void {
  images = next?.images ?? ART_IMAGES;
  data = next?.data ?? ART_DATA;
}
