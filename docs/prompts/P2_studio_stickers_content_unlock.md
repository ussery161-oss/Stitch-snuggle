# P2: Design Studio, sticker book, content pass, demo/unlock, parent area and credits (covers M4–M7)
Branch `p2-studio` off `main` after P1 is merged. Work the sections **in order (A → F)** and commit after each one (`P2-A:` …). **A–C must land.**

## Rules (all sections)
- **docs/ is read-only.** Design sources: `docs/GDD.md`, `docs/MILESTONES.md`, `docs/ART_REQUESTS.md`. Where a prompt and docs disagree, the prompt wins; list the disagreement in the PR.
- **Kids Category / COPPA:** no network calls, ads, analytics, tracking, accounts or outside links. No SDK that phones home. Purchases, restore, settings and links only behind the parental gate. No fail states, scores, lives, timers or "wrong" feedback.
- **No reading required:** every child-facing instruction is voice + icon + hand hint. Voice goes through `AudioService` (two players, preload next) and `voiceLookup`; missing clips fall back to expo-speech and are listed in the PR under "For Researcher 2 to record".
- **Expo Go SDK 57 must keep working** (no native modules outside Expo Go until M8). Allowed deps: expo-*, react-native-reanimated, react-native-gesture-handler, @shopify/react-native-skia, react-native-svg, @react-native-async-storage/async-storage. Anything else: justify in the PR.
- **Worklets:** every function called from `useAnimatedStyle`, `useDerivedValue`, gesture callbacks on the UI thread, or Skia `useDerivedValue` must start with `'worklet'`. The `workletPurity` guard test must cover all `src/` files.
- **No Windows-reserved file names** (con, prn, aux, nul, com1–9, lpt1–9, any extension); a test enforces it.
- **Art/audio:** only files in `assets/` with an entry in `assets/CREDITS.md` (free, commercially licensed). Placeholders are drawn in code.
- Touch targets ≥ 64 pt; landscape; safe areas.
- Tests for everything new. `npx tsc --noEmit` clean, `npm test` green, `npx expo export --platform ios` succeeds. Commit per section (`M#-A:` …). PR body: summary, test notes for Mike's iPad, missing clips, open questions.
- Art: use `art(id)` and placeholders exactly as in P1. Re-run `npm run gen:art` if `assets/art/` changed.

---
## A. Save schema v1 (`src/storage`)
`{version:1, creations: PlushSpec[] (max 24), stickers: Record<id, earnedAtISO>, placements: StickerPlacement[], settings:{age:'3-5'|'6-7', music, sfx, captions, traySide}, entitlement:{unlocked:boolean}}`. Include a migration scaffold that upgrades from no save to v1, and a corruption guard that resets to defaults without crashing.

## B. Design Studio
- Big icon tabs: Base → Body → Colors → Patterns → Eyes → Accessories → Name. Kids can move freely between tabs. A live `<Plush>` preview with the idle animation is always visible.
- **Bases:** Bear, Bunny, Kitty, Puppy, Unicorn-pony, Dino, Owl, plus a Rag Doll with 2 body types and a skin tint. Each base has round, tall and tiny bodies.
- **Colors:** a 12-swatch palette. Two ways to paint: tap a region on the plushie and then a swatch, or tap a swatch and then a region.
- **Patterns:** solid, gingham, dots, stripes, stars, hearts, plaid, fleece, denim, floral, rainbow (untinted) and patchwork.
- **Eyes:** 8 styles, and the doll adds 4 hair styles.
- **Accessories:** bows, hats, glasses, scarves, crown, flower, bandana, heart patch, cape, tutu and bow tie.
- **Name:** no typing. The child picks from a voiced list of 40 names or taps the dice for a random one.
- **Other controls:** a "Surprise me" dice button randomizes everything, and Undo is one big button that remembers 20 steps.
- **Save:** saves to the toy shelf (max 24). If the shelf is full, show a friendly "full" animation; deleting a creation needs the gate.
- **Toy shelf:** tap a creation to "Play doctor" (sends it to the Clinic with random damage) or "Edit".
- Locked items show a padlock overlay; the rules are in E.

## C. Sticker book
- **Earning:** a sticker for each preset plushie healed, the first heal of each creation, and the first use of each tool (about 40 in v1). A sticker flies into the book after Go home.
- **Pages:** one page per base, a "My Creations" page and a Seasonal page. Stickers can be dragged, pinched and rotated freely on a scene page. Dragging a sticker back to the tray removes it.
- **Creation stickers:** snapshot `<Plush>` with `makeImageSnapshot` and cache it to the file system.
- No currency and no random rewards.

## D. Content pass
- Register all 8 presets: Bear, Bunny, Kitty, Puppy, Unicorn-pony, Dino, Rag Doll and Owl. Each gets a story line, a damage set and an owner (4 original kid characters with varied skin tones; placeholders are circles with simple faces).
- **Seasonal set:** keep a registry slot for seasonal presets that ship in free app updates (Pumpkin Kitty, Snow Bear, Spring Lamb, Beach Turtle). They are inert until art lands, and they are **included in the unlock**.

## E. Demo/unlock rules and parent area
- **`entitlements.ts`:**
  - Free demo: Bear and Bunny presets; Bear and Bunny bases in the Studio with 4 colours, 4 patterns, 2 eye styles and 3 accessories; and sticker page 1.
  - Everything else needs the **Unlock Everything** purchase, a one-time **$5.99** buy that also includes every future plushie.
  - Locked items show a padlock only. The child flow never shows a price, a "buy" button or an "ask a grownup" nag. Tapping a padlock plays a gentle wiggle; a small parent-lock badge in the corner leads to the gate.
- **Purchase is mocked in P2:** `purchaseService` has the interface `getProduct()`, `buy()` and `restore()`. The `MockPurchaseService` (used in `__DEV__` and Expo Go) toggles `entitlement.unlocked`. The real StoreKit comes in P3.
- **Parent area (behind the gate):** Unlock Everything with the price shown, Restore Purchases, the age setting, music and SFX volume, captions, tray side, reset progress, delete creations, a privacy page (in-app text: "This app collects no data. No ads, no tracking, no accounts, no internet."), and Credits.

## F. Credits
These are in the parent area only. The order is fixed:
1. *"And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you."* — Ephesians 4:32 (KJV)
2. "Thanking Our Lord and Savior Jesus Christ for the ample blessings he has bestowed."
3. The team, then the art and audio credits rendered from `assets/CREDITS.md`, including **Voice: Kokoro-82M v1.0 (hexgrad), voice af_bella, Apache License 2.0**.

The child flow stays faith-light: only the kindness lines and the P1 wall charm.

## Acceptance tests
1. Schema: defaults, migration, corruption reset, and a round trip of 24 creations.
2. Studio: every mutation produces a valid spec, Undo restores the previous 20 states, a random spec is always valid, and every base has every body type and region.
3. Entitlements: the demo item list is exact, locked items are blocked until the mock unlock and all open after it, and seasonal items are included in the unlock.
4. No price or "buy" text exists in any child screen (a static scan of `src/screens` minus `parent/`).
5. Stickers: the earn rules, no duplicate stickers, and placements persist.
6. Credits order: the verse is first, the blessing second, and the Apache-2.0 voice credit is present.
7. All P1 guard tests still pass. tsc, jest and `expo export` are green.

## iPad checklist for Mike
- [ ] Studio: pick Bunny, make it tall, paint it pink with stars, add star eyes and a crown, pick a name, and Save.
- [ ] The dice and Undo work, and a doll can get a skin tone and hair.
- [ ] Toy shelf, then Play doctor: your own plushie arrives hurt and you can fix it.
- [ ] A sticker flies into the book. You can move it, make it bigger, and it's still there after you close and reopen the app.
- [ ] Locked plushies show a padlock with no price and no nag. Parent area, then Unlock (mock), and everything opens.
- [ ] Credits open with Ephesians 4:32, then the blessing line.
- [ ] The privacy page says no data is collected.
