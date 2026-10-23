# Art requests — Stitch & Snuggle (for Art Director)
Original style only. Do not reference or trace Plush Hospital (Tapps) art. Soft, rounded, felt/fleece look, thick friendly outlines, warm pastel palette. Put the finished files in `/workspace/plush-hospital/art/` using the same paths as below (`art/plush/...`, `art/tools/...`, `art/fabrics/...`, `art/ui/...`); the code picks them up there. Use the same license rules as Popsy Words: original or free and commercially licensed, with every file logged in `assets/CREDITS.md`. No Windows-reserved file names. PNG with alpha, sRGB.

## Layer system (needed for customization AND damage)
Every plush part is delivered as aligned layers on the same **1024×1024 canvas**, at the same registration, with no offsets:
- `_mask.png`: pure white silhouette on transparent, no outline, no shading. The code tints it and fills it with a pattern.
- `_line.png`: dark outline plus seam/stitch details only, transparent elsewhere, never tinted. Use color #4A3A3A (warm dark brown), not black.
- `_shade.png` (optional): grayscale shading, used with multiply. Mid-gray = no change.
- `_highlight.png` (optional): soft highlights, used with screen.
Path: `assets/plush/<base>/<body>/<part>_<layer>.png`, e.g. `bear/round/head_mask.png`.
Parts per base: `body`, `head`, `earL`, `earR`, `armL`, `armR`, `legL`, `legR`, `belly`, `muzzle`, `earInnerL/R`, `nose`, `tail` (if any); doll adds `hair_back`, `hair_front`, `face`. Unicorn adds `horn`, `mane`, `tailHair`.
An **anchors JSON** per base/body: `assets/plush/<base>/<body>/anchors.json` with pixel coords for head, neck, chest, eyeL, eyeR, hand, feet, and the damage spots (see below).

## AR-1 Bases (priority: Bear, Bunny first, as these are the demo)
Bear, Bunny, Kitty, Puppy, Unicorn-pony, Dino, Owl; Rag Doll (girl-ish and boy-ish body types, 4 skin tones via tint, so the face uses a mask too). Each in 3 body types: round, tall and tiny.
## AR-2 Eyes & faces
8 eye styles (button, round shiny, sleepy, star, heart, wink, big sparkly, happy-closed). Deliver each as a pair sprite with `_line` plus a fixed-color fill. No X eyes and nothing scary. Also 4 mouth expressions (sad-ouch, neutral, smile, big-happy) for the care states.
## AR-3 Tools (fixed color, 512 px)
Needle + thread spool, thread trail tile (seamless, 64 px), X-stitch sprite, magnifier, fabric scissors, cotton bag + 3 cotton puff variants, soap bar, suds bubble set (5), shower head, towel, hair dryer, brush, comb, sparkle set, heart burst.
## AR-4 Damage overlays (per part mask-aligned, or generic tiles)
Rip (dotted stitch guide plus torn-edge line), hole (to be patched), dirt/mud tile (seamless, multiply), tangle/fuzz tile, deflated "droop" state is done in code. Optional bandage sticker.
## AR-5 Fabrics / patterns (seamless 256×256 tiles, **grayscale or 2-tone** so the code can tint)
Solid felt texture, gingham, polka dot, stripes, stars, hearts, plaid flannel, fleece, denim, floral, rainbow (this one is full color, not tinted), and patchwork. Plus 3 full-color "patch" swatches for the Patch step.
## AR-6 Accessories / outfits (anchored, 512 px, with registration point marked)
Bows (3), hats (party, sun, crown, beanie), glasses (2), scarves (2), flower, bandana, heart patch, small cape, tutu, bow tie.
## AR-7 Stickers & UI
Sticker frame/edge style, sticker book cover and 4 page backgrounds, 2 scene backgrounds (clinic room, recovery room; max 2048 px wide), basket, owner kids (4 original characters, varied skin tones), icons for steps (stitch, patch, stuff, wash, brush, dress), padlock, home button, parent lock. **Heart-and-cross wall charm (approved):** a tiny wall decoration for the recovery room. A small heart with a simple cross inside or above it, soft gold #F2C94C, delivered as one 256 px PNG. It must read as gentle decor and must not be the focal point.
## AR-8 App icon & store
App icon (1024), 5 iPad screenshots frames: these come later (M9).

## Delivery order
1) Bear + Bunny round (all layers) plus tools AR-3 plus 6 fabrics → unblocks M1–M3. 2) Eyes, accessories, the other Bear/Bunny body types → M4. 3) Remaining bases → M6. Placeholders exist in code, so nothing blocks Claude.
