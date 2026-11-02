// Every voiced line: its id (also the clip file name, assets/audio/lines/<id>.m4a) and exactly
// what Bella says. Missing clips fall back to expo-speech with this text.

export const LINES = {
  'hold-to-go-home': 'Hold to go home.',
  'ouch-thanks': 'Ouch… thank you!',
  'praise-1': 'Great job!',
  'praise-2': 'You did it!',
  'praise-3': 'So gentle!',
  'praise-4': 'Wonderful!',
  'every-toy-loved': 'Every toy is loved!',
  'thank-you': 'Thank you!',
  // Tool names, said when a care step starts.
  'tool-needle': 'Needle and thread.',
  'tool-patch': 'Patch.',
  'tool-cotton': 'Cotton.',
  'tool-soap': 'Soap.',
  'tool-shower': 'Shower.',
  'tool-towel': 'Towel.',
  'tool-brush': 'Brush.',
  'tool-dress': 'Dress up!',
  // Arrival stories, one per preset plushie (story-<base>-<n>).
  'story-bear-1': 'Teddy fell out of the tree house!',
  'story-bear-2': 'Teddy had a muddy picnic!',
  'story-bunny-1': 'Bun-Bun fell in a puddle!',
  'story-bunny-2': 'Bun-Bun got caught on a fence!',
  'story-generic': 'This little friend needs your help!',
  // Hints and step prompts (voice plus a hand hint; no reading needed).
  'hint-find-spots': 'Tap the sore spots.',
  'hint-stitch': 'Follow the dots to sew.',
  'hint-wash-soap': 'Rub with the soap.',
  'hint-wash-rinse': 'Rinse off the bubbles.',
  'hint-wash-dry': 'Wiggle the towel to dry.',
  'hint-patch': 'Pick a patch and put it on.',
  'hint-patch-sew': 'Tap the dots to sew it on.',
  'hint-stuff': 'Fill it up with cotton.',
  'hint-brush': 'Brush the fuzzy fur.',
  'hint-dress': 'Dress up your friend!',
  'all-better': 'All better!',
  // The 40 plushie names (Studio name picker; P2-B).
  'name-teddy': 'Teddy',
  'name-bunbun': 'Bun-Bun',
  'name-honey': 'Honey',
  'name-pip': 'Pip',
  'name-mochi': 'Mochi',
  'name-button': 'Button',
  'name-clover': 'Clover',
  'name-sunny': 'Sunny',
  'name-poppy': 'Poppy',
  'name-biscuit': 'Biscuit',
  'name-maple': 'Maple',
  'name-pebble': 'Pebble',
  'name-daisy': 'Daisy',
  'name-cocoa': 'Cocoa',
  'name-peanut': 'Peanut',
  'name-buttercup': 'Buttercup',
  'name-marshmallow': 'Marshmallow',
  'name-ziggy': 'Ziggy',
  'name-lulu': 'Lulu',
  'name-coco': 'Coco',
  'name-bean': 'Bean',
  'name-sprout': 'Sprout',
  'name-juniper': 'Juniper',
  'name-waffles': 'Waffles',
  'name-pudding': 'Pudding',
  'name-noodle': 'Noodle',
  'name-jellybean': 'Jellybean',
  'name-cupcake': 'Cupcake',
  'name-muffin': 'Muffin',
  'name-sparky': 'Sparky',
  'name-rosie': 'Rosie',
  'name-milo': 'Milo',
  'name-luna': 'Luna',
  'name-ruby': 'Ruby',
  'name-finn': 'Finn',
  'name-hazel': 'Hazel',
  'name-pumpkin': 'Pumpkin',
  'name-snowflake': 'Snowflake',
  'name-dottie': 'Dottie',
  'name-bubbles': 'Bubbles',
  // Studio and shelf (P2-B).
  'studio-hello': 'Let’s make a plushie!',
  'studio-saved': 'Saved to your shelf!',
  'shelf-full': 'Your shelf is full!',
  'surprise': 'Surprise!',
  'tab-base': 'Pick a friend.',
  'tab-body': 'Pick a shape.',
  'tab-colors': 'Pick a color.',
  'tab-patterns': 'Pick a pattern.',
  'tab-eyes': 'Pick some eyes.',
  'tab-accessories': 'Dress it up!',
  'tab-name': 'Pick a name.',
} as const;

export type LineId = keyof typeof LINES;

export const LINE_IDS = Object.keys(LINES) as LineId[];

export function lineText(id: LineId): string {
  return LINES[id];
}

export const PRAISE_IDS: readonly LineId[] = ['praise-1', 'praise-2', 'praise-3', 'praise-4'];
