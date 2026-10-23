# GDD — Plush fix-up game (ages 3–7) — v0.1, Oct 22, 2026
Sister project to Popsy Words. Benchmark: Plush Hospital (Tapps Games). **Do not copy** its name, art, characters, UI layout or flow; we use original art, characters and our own structure (design studio + care clinic + sticker book).

## 1. Name (approved Oct 22, 2026)
**Stitch & Snuggle**. Store subtitle: "Toy Fix-Up for Kids". Repo: `ussery161-oss/stitch-snuggle`. Bundle id: `com.ussery161.stitchsnuggle` (to confirm in P3). Trademark note: see DECISIONS_FOR_MIKE.md §Trademark.

## 2. Pillars
1. **Nothing to fail.** No timers, scores, lives or "wrong". Every touch helps. If a child stalls, an animated hand hint appears after 8 s, and a big "done" heart appears after 20 s so they can always move on.
2. **No reading.** Bella-style voice lines + icons + animated hand hints. All text is decorative/parent-facing.
3. **My plushie.** Kids design their own plushie, then care for it. Their creations live in a toy shelf.
4. **Every toy is loved.** Kindness theme: plushies thank the child, owner hugs, "Every toy is loved" hearts.
5. **Kid-safe.** No network, ads, analytics, accounts or tracking. Parent gate for purchase, restore, links, settings, delete.

## 3. Core loop
Arrival → Triage → Care steps → Go home → Sticker
1. **Arrival:** a plushie arrives in a basket with a short voiced story ("Bun-Bun fell in a puddle!"). Damage is randomized per visit from its damage set: rips, holes, flat stuffing, dirt/mud, tangled fur, missing outfit.
2. **Triage:** a bouncing magnifier reveals hurt spots (glowing). Tap each one; plushie says "ouch… thank you!".
3. **Care steps** (only the ones needed, each 20–60 s):
   - **Stitch:** trace a dotted path with a finger; needle follows with a thread trail. Tolerance wide (≥ 28 pt from path counts; off-path just pauses). Path progress = arc length covered; stitches appear behind the finger.
   - **Patch:** pick 1 of 3 fabric swatches → drag onto the hole → it snaps (magnet within 60 pt) → tap 3 buttons/stitch dots to secure.
   - **Re-stuff:** drag cotton puffs into the opening; plushie inflates (scale/shape morph) per puff; 4–6 puffs.
   - **Wash:** rub soap (suds particles + dirt mask erase), rinse with shower (drag), dry with towel or hair dryer (wiggle). Dirt removed via erase-to-reveal mask; done at ≥ 85 % cleared (auto-finish the last 15 %).
   - **Brush:** stroke tangled fur areas (tangle mask → smooth), sparkles.
   - **Dress:** drawer of outfits/hats/bows/glasses; drag on, snap to anchor points. Always optional; "done" heart button.
4. **Go home:** owner (simple original kid characters, varied skin tones) hugs the plushie; "Every toy is loved!" and a Bella "Thank you!".
5. **Sticker:** sticker of that plushie (in its outfit-variant) flies into the sticker book.

## 4. Design Studio (Mike's addition)
Kids build their own plushie, then it becomes a patient (or just a toy on their shelf).
- **Base:** animal or doll. v1 bases: Bear, Bunny, Kitty, Puppy, Unicorn-pony, Dino, plus Rag Doll (2 body types). Demo: Bear + Bunny.
- **Body type:** round / tall / tiny (3 silhouettes per base; same anchor scheme).
- **Colors:** 12-swatch palette per region (body, belly/inner ears, muzzle, hair/mane for doll & unicorn). Tap region then swatch, or tap swatch then region ("paint bucket").
- **Fabrics/patterns:** solid, gingham, polka dot, stripes, stars, hearts, flannel plaid, felt, fleece, denim, floral, rainbow. Pattern tinted by the chosen color (pattern is grayscale/2-tone tile × color multiply).
- **Eyes:** 8 styles (button, round shiny, sleepy, star, heart, wink, big sparkly). Doll adds 4 hair styles.
- **Accessories:** bows, hats, scarves, glasses, crowns, flowers, heart patch, bandana (also reused in Dress).
- **Name:** no typing. Kid picks from voiced name list (40 names) or "random" dice; parent can type a custom name behind the gate.
- **Save:** up to 24 creations (local only). "Play doctor" button sends the creation to the clinic with random damage.
- **Rendering:** each base × body type = layered parts; each part has `line` (dark outline, untinted), `mask` (white silhouette for tint/pattern fill), optional `shade` (multiply) and `highlight` (screen) layers. Composite: fill(mask, color × pattern) → shade → highlight → line. Same layered structure drives damage overlays (rip/dirt/tangle masks) so custom plushies get the full care loop.

## 5. Sticker book
- One page per base + "My Creations" page + seasonal page. Stickers are earned for: each preset plushie healed, first heal of a creation, each care tool first-use. ~40 stickers in v1. No currency, no loot boxes, no random paid rewards. Stickers can be placed freely on a scene page (drag, pinch).

## 6. Content & updates
- **v1 (paid):** 8 preset plushies (Bear, Bunny, Kitty, Puppy, Unicorn-pony, Dino, Rag Doll, Owl) + full Studio.
- **Demo (free):** 2 presets (Bear, Bunny), Studio with Bear+Bunny bases, 4 colors/4 patterns, sticker book page 1. Unlimited play, no nags in child flow; a small padlock on locked items → parent gate → purchase screen.
- **Free updates:** new plushies shipped in app binary (no downloads; no network). Seasonal: Pumpkin Kitty (fall), Snow Bear (winter), Spring Lamb, Beach Turtle.

## 7. Monetization
- Free download, one non-consumable IAP "Unlock Everything" at **$5.99** (approved; App Store price tier closest to $5.99). All future plushies included for unlock owners. Restore Purchases in parent area. IAP via `expo-iap` or RevenueCat-free StoreKit wrapper — **note:** IAP requires a dev build (not Expo Go); until M8 the unlock is mocked by a `__DEV__` toggle. No subscription, no ads, no consumables.

## 8. Parent gate & settings
Reuse Popsy Words' parental gate pattern (hold + simple multi-digit math shown as numerals, spoken digits not used). Behind gate: purchase, restore, sound/music volume, reset progress, delete creations, credits link, privacy policy (shown in-app, no web link).

## 9. Faith (subtle)
- Credits screen (parent area only) opens with the KJV verse, then "Thanking Our Lord and Savior Jesus Christ for the ample blessings he has bestowed." Then the regular credits (art, audio licenses).
- **Approved verse: Ephesians 4:32 (KJV)**: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you."
- In play: the kindness theme ("Every toy is loved", hugs, Bella "Thank you!") plus **one tiny heart-and-cross charm on the recovery-room wall** (approved). It is small (about 28 pt on iPad and 22 pt on iPhone), soft gold #F2C94C at about 60% opacity, and part of the background decor. It is not tappable, not animated and not voiced. No God lines in the child flow.

## 10. Audio
- Voice: **reuse Bella** (approved). Bella is Kokoro-82M v1.0 voice `af_bella` (hexgrad), **Apache-2.0** code and weights, which I confirmed from sitepop `assets/CREDITS.md` and `VOICE_PLAN.md`. The rendered clips are our own output. Credit it in CREDITS: "Voice: Kokoro-82M v1.0 (hexgrad), voice af_bella, Apache License 2.0", along with the CC BY training-set notes from VOICE_PLAN; ~120 lines (tool names, prompts, praise, plushie stories, 40 names). All SFX/music CC0 or commercially licensed with attribution recorded in CREDITS.
- Fallback: expo-speech for any missing clip; PR lists missing clips.

## 11. Tech (engine decision)
**Expo (SDK 57, same as sitepop) + react-native-skia + Reanimated 4 + Gesture Handler.**
- Why: Mike has no Mac. Godot's iOS export requires Xcode on a Mac (or a rented cloud Mac + manual signing); there is no Expo-Go-style instant iPad testing for Godot iOS. Expo gives Expo Go testing from TheDeskTop, EAS cloud builds/TestFlight with no Mac, and reuses sitepop code (parental gate, AudioService two-player fix, voiceLookup, worklet guard test, Windows-safe-name test).
- Godot honestly: better native 2D (particles, masks, shaders, tracing) and an easier game loop; Android/desktop export works from Windows. But iOS is the target market and Claude's/our review experience is in TS. Skia (bundled in Expo Go) covers masks, blend modes (multiply/srcIn for tint+pattern), erase-to-reveal paths and particles at 60 fps on iPad.
- Risks: Skia in Expo Go is slower than release builds (as seen with Popsy); IAP needs a dev build (M8). Keep particle counts capped; all per-frame math in worklets (`'worklet'` on every helper; guard test).
- Data: AsyncStorage (versioned schema), all local. No network permission usage; no analytics SDKs.

## 12. Accessibility & UX
Touch targets ≥ 64 pt (kids), safe-area aware, landscape-only, **iPad and iPhone at launch** (approved), reduce-motion support, captions off by default (parent toggle), left-handed friendly trays (tray side toggle).

## 13. Out of scope v1
Multiplayer, cloud saves, photo import, typing for kids, Android (possible later from same codebase), Apple Watch.
