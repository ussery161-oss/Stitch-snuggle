// Plush data model. A plushie is a base (bear, bunny…) in a body type (round, tall, tiny; the doll
// also has a girl/boy style), made of layered parts. Each part belongs to a colour region; the
// child's PlushSpec gives every region a colour and a fabric pattern.

export type BaseId = 'bear' | 'bunny' | 'kitty' | 'puppy' | 'unicorn' | 'dino' | 'owl' | 'doll';
export type BodyType = 'round' | 'tall' | 'tiny';
export type DollStyle = 'girl' | 'boy';

/** Colour regions. Not every base uses every region (only the doll has skin; unicorn/doll have hair). */
export type Region = 'body' | 'belly' | 'muzzle' | 'nose' | 'hair' | 'accent' | 'skin';
export const REGIONS: readonly Region[] = ['body', 'belly', 'muzzle', 'nose', 'hair', 'accent', 'skin'];

export type PatternId =
  | 'solid'
  | 'felt'
  | 'gingham'
  | 'dots'
  | 'stripes'
  | 'stars'
  | 'hearts'
  | 'plaid'
  | 'fleece'
  | 'denim'
  | 'floral'
  | 'rainbow'
  | 'patchwork';

export type EyeStyle = 'button' | 'round_shiny' | 'sleepy' | 'star' | 'heart' | 'wink' | 'big_sparkly' | 'happy_closed';
export type MouthStyle = 'sad_ouch' | 'neutral' | 'smile' | 'big_happy';

export type AccessoryId =
  | 'bow_1'
  | 'bow_2'
  | 'bow_3'
  | 'hat_party'
  | 'hat_sun'
  | 'hat_crown'
  | 'hat_beanie'
  | 'glasses_round'
  | 'glasses_heart'
  | 'scarf_1'
  | 'scarf_2'
  | 'flower'
  | 'bandana'
  | 'heart_patch'
  | 'cape_small'
  | 'tutu'
  | 'bow_tie';

/** Named points on the 1024 canvas. */
export type AnchorName = 'head' | 'neck' | 'chest' | 'eyeL' | 'eyeR' | 'mouth' | 'handL' | 'handR' | 'footL' | 'footR';
/** Where accessories sit (the r03 `accessory` block, plus chest for the heart patch). */
export type AccessorySlot = 'hat_top' | 'bow_ear' | 'glasses' | 'neckwear' | 'cape' | 'waist' | 'chest';

export type DamageKind = 'rip' | 'hole' | 'flat' | 'dirt' | 'tangle' | 'outfit';

export type Vec = readonly [number, number];
export type Bounds = readonly [number, number, number, number];

export interface PartLayers {
  mask: string;
  line: string;
  shade?: string;
  highlight?: string;
}

export interface PartDef {
  id: string;
  region: Region;
  /** Draw order (0 = back). */
  z: number;
  /** Art ids of the layers (art(id) may be null: then the placeholder path is drawn). */
  layers: PartLayers;
  /** The part's visible bounds on the 1024 canvas. */
  bounds: Bounds;
  /** The anchor the part hangs from (droop pivots here). */
  anchor: Vec;
  /** SVG path (1024 space) used when the art is missing. */
  placeholder: string;
}

export interface DamageSpot {
  id: string;
  part: string;
  xy: Vec;
  types: readonly DamageKind[];
}

/** One base in one body type: everything needed to draw and care for it. */
export interface BodySet {
  key: string;
  base: BaseId;
  body: BodyType;
  style?: DollStyle;
  parts: readonly PartDef[];
  anchors: Readonly<Record<AnchorName, Vec>>;
  accessorySlots: Readonly<Record<AccessorySlot, Vec>>;
  damageSpots: readonly DamageSpot[];
  /** r03 reframe factor: face and accessory sprites (drawn for r02) scale by this. */
  fitScale: number;
  /** True when every layer comes from code placeholders (no art). */
  placeholder: boolean;
}

export interface BaseDef {
  id: BaseId;
  bodyTypes: readonly BodyType[];
  styles?: readonly DollStyle[];
  /** The regions this base paints. */
  regions: readonly Region[];
}

export interface Fill {
  color: string;
  pattern: PatternId;
}

export interface PlushSpec {
  base: BaseId;
  body: BodyType;
  /** Doll only. */
  style?: DollStyle;
  fills: Record<Region, Fill>;
  eyes: EyeStyle;
  accessories: AccessoryId[];
  nameId: string;
}
