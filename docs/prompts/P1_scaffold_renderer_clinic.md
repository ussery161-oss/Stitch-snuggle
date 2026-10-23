# P1: Scaffold, plush renderer and the full clinic loop (covers M0–M3)
Repo `ussery161-oss/stitch-snuggle`, branch `p1-core` off `main` (main has only `docs/` and the README). This is a long session. Work the sections **in order (A → H)**, commit after each one (`P1-A:` … `P1-H:`), and keep every check green at every commit. If you run out of time, finish the current section cleanly and list what's left in the PR. **A–D must land even if E–H don't.**

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
- **Art pipeline (real art when present, placeholders otherwise):** the Art Director delivers to `/workspace/plush-hospital/art/`, and the lead copies it into the repo at `assets/art/` with the same sub-paths (`plush/<base>/<body>/<part>_<layer>.png`, `tools/`, `fabrics/`, `ui/`, `stickers/`). You never read outside the repo. Add `scripts/gen-art-manifest.mjs` (`npm run gen:art`), which scans `assets/art/**` and writes `src/art/manifest.generated.ts`, a static `require()` map (Metro needs static requires). All drawing code calls `art(id)`, which returns the image or `null`. On `null` the caller draws its **code placeholder**. Commit the generated manifest. A test checks that the manifest matches the folder, so a stale manifest fails CI. Re-run `gen:art` whenever art lands.
- **Design docs** are `docs/GDD.md`, `docs/MILESTONES.md`, `docs/ART_REQUESTS.md` and `docs/CLAUDE.md`. Do not edit docs/.

---
## A. Project scaffold
1. Expo SDK 57 + TypeScript. Pin the same versions as sitepop: react-native-reanimated 4.5.1, react-native-worklets 0.10.1, and the Expo-Go-bundled versions of @shopify/react-native-skia and react-native-gesture-handler (`npx expo install`). Add expo-audio, expo-speech, @react-native-async-storage/async-storage and expo-screen-orientation.
2. `app.json`: name "Stitch & Snuggle", slug `stitch-snuggle`, landscape, `supportsTablet: true` (iPad **and iPhone**), `ITSAppUsesNonExemptEncryption: false`, no tracking or permission keys.
3. Folders: `src/{screens,clinic,studio,plush,audio,gate,storage,ui,logic,art,config}`, `assets/{art,audio}`, `scripts/`, `__tests__/`. Add `.gitattributes` with `* text=auto eol=lf`, because Mike's PC is Windows and sitepop had test failures from CRLF line endings.
4. `assets/CREDITS.md` has a table (asset, author, license, source). Seed it with the voice: **Kokoro-82M v1.0 (hexgrad), voice af_bella, Apache License 2.0 (code and weights); rendered clips are our own output**, plus the CC BY training-set credits that sitepop lists: Koniwa `tnc` (CC BY 3.0) and SIWIS (CC BY 4.0).

## B. Guard tests
- `workletPurity.test.ts`: parse `src/**/*.ts(x)`. Any identifier called inside `useAnimatedStyle`, `useDerivedValue`, `useAnimatedReaction`, `runOnUI` or a Gesture `.onBegin/.onUpdate/.onChange/.onEnd` body that resolves to a local or imported function must contain `'worklet'` (or be a Reanimated or Math built-in). This exact bug crashed Popsy Words in Expo Go with no red screen.
- `reservedNames.test.ts`: no Windows-reserved base names anywhere in the repo.
- `noNetwork.test.ts`: `src/**` has no `fetch(`, `XMLHttpRequest`, `WebSocket` or `http(s)://`.
- `artManifest.test.ts`: the manifest is in sync, every entry is in CREDITS, and every PNG is at most 2048 px.

## C. App shell, navigation, home and gate
- Use a state-based router with these screens: Title, Clinic, Studio (placeholder in P1), StickerBook (placeholder), Parent (behind the gate), and Dev (behind the gate).
- **Title:** a big heart "Play" button goes to the Clinic, a scissors-and-palette button goes to the Studio, and a book button goes to the Sticker book. A small lock icon in the top corner goes through the gate to Parent.
- **Home button** on every child screen: hold it for 2 s while a ring fills. A quick tap speaks "Hold to go home" and shows the ring hint. This copies the Popsy fix.
- **ParentalGate:** shows three large numerals; the adult taps them from smallest to largest, then holds for 1 s. Wrong order resets quietly. Unit-test the logic.

## D. Audio
- `AudioService`: **two players with preload-next**, so playback isn't choppy (the Popsy lesson), plus a **FIFO queue**. A new line never drops a queued one unless it is played with `{interrupt:true}`. This was the Popsy N2 first-prompt stall.
- `voiceLookup(id)` returns the clip from `assets/audio/lines/<id>.m4a` if it's present; otherwise it falls back to expo-speech with the line's text from `src/audio/lines.ts`.
- Tests: queue order, interrupt, fallback.

## E. Plush renderer
- Types: `Region`, `PartDef {id, region, z, layers:{mask,line,shade?,highlight?}, anchor}`, `BaseDef {id, bodyTypes: round|tall|tiny, anchors(head,neck,chest,eyeL,eyeR,hand,feet), damageSpots}` and `PlushSpec {base, body, fills: Record<Region,{color,pattern}>, eyes, accessories[], nameId}`. Bases live in a registry.
- **Compositor (Skia):** for each part in z order, draw the mask. Fill it with the region colour, or the pattern tile tinted by that colour (`ImageShader` with repeat, multiply over the colour, clipped by the mask with `srcIn`). Then draw shade (Multiply), then highlight (Screen), then line (normal). Eyes and accessories are anchored sprites drawn last.
- **Placeholders:** when `art()` returns null, build the mask and line from Skia paths: body ellipse, head circle, ears (round for the bear, long for the bunny), arms, legs and a belly oval. Bear and Bunny are needed in round, tall and tiny (scaled path variants). Placeholder pattern tiles (dots, stripes, gingham, stars, hearts) are generated in code.
- **Idle animation:** a 2.4 s breathing loop (scale 1 → 1.02) and a blink every 3–6 s. All helpers are worklets. Respect Reduce Motion.
- **Dev screen** (behind the gate): a grid of Bear and Bunny in all 3 body types with random fills; tap one to randomize it. Show an fps readout and put the measured fps for 6 plushies in the PR.

## F. Clinic flow, Stitch and Wash
- `createVisit(spec, seed)` is pure and seeded. It returns `{plush, damages[], storyId}`, where `Damage = rip|hole|flat|dirt|tangle|outfit` on a part, with a path or area taken from `damageSpots` (placeholder spots are computed from the part geometry).
- **Flow:**
  - Arrival: a basket slides in and the story line plays.
  - Triage: a magnifier with a hand hint; the child taps each glowing spot and hears "Ouch… thank you!".
  - Care steps follow in a fixed order, and only the ones the visit needs.
  - Go home: an owner placeholder hugs the plushie; play "Every toy is loved!", then Bella's "Thank you!".
  - Then back to the Title. A row of step icons serves as the progress indicator, with no text.
- **Stitch:** the child traces a dotted path. Progress is the furthest arc length reached while the finger stays within 28 pt of the path ahead; the projection helper is a `'worklet'`. A needle sprite follows the finger, with a thread trail and X-stitches behind it. Going off the path only pauses; there is never an error sound.
- **Wash:** three phases.
  - Soap: rubbing erases the dirt layer with `BlendMode.Clear` strokes and spawns suds (capped at 40).
  - Coverage is measured on a 32×32 grid at 10 Hz on the JS thread. At 85% the rest clears automatically.
  - Rinse: dragging the shower pops the suds. Dry: wiggle the towel for 3 s.
- **Everywhere:** a hand hint after 8 s of no progress, and a big "done" heart after 20 s. Every step can be finished.

## G. Patch, Re-stuff, Brush and Dress
- **Patch:** three fabric swatches. The child drags one onto the hole; it snaps within 60 pt, then they tap 3 glowing dots to sew it on. The patch stays on the plushie for the rest of the visit.
- **Re-stuff:** the part starts deflated (scaleY 0.8 and drooping). The child drags 4–6 cotton puffs into it; each one springs the part back toward full size. Then a short closing stitch, reusing the Stitch component.
- **Brush:** a tangle overlay that clears through the shared coverage grid, with sparkles. It finishes automatically at 85%.
- **Dress:** an accessory drawer. Items snap to the nearest compatible anchor within 80 pt, and tapping a worn item removes it. The step is optional and the "done" heart is always visible.
- `createVisit` now generates every damage kind. Cap the steps at 3 per visit for ages 3–5 (the default) and 4 for ages 6–7. The age setting is behind the gate.

## H. Recovery room and heart-and-cross charm
- Between Go home and the Title, show a 3-second recovery-room scene: the plushie waves from a little bed.
- On the wall, draw **one tiny heart-and-cross charm** using `art('ui/charm_heart_cross')`, or a placeholder made from Skia paths (a heart with a small cross above it). Size: 28 pt on iPad and 22 pt on iPhone. Colour: #F2C94C at 60% opacity. Set `pointerEvents="none"`; it is not animated and not voiced.

## Voice lines added (`src/audio/lines.ts` and `assets/audio/VOICE_IDS.md`)
story-*, ouch-thanks, praise-1..4, every-toy-loved, thank-you, hold-to-go-home, and tool names (needle, patch, cotton, soap, shower, towel, brush, dress). Missing clips fall back to expo-speech. List them in the PR under "For Researcher 2 to record" with each id and its exact text.

## Acceptance tests (must exist and pass)
1. The guard tests in B.
2. AudioService: queue order, interrupt, fallback.
3. Gate logic: correct order passes, wrong order resets.
4. Renderer: every Bear and Bunny body type has every region. Placeholder fallback works when `art()` is null. Every PlushSpec from a random seed is valid.
5. `createVisit` is deterministic for a given seed, and step caps are applied by age.
6. Stitch projection and progress are monotonic, and off-path doesn't move progress backwards.
7. The coverage grid reaches the 85% threshold correctly.
8. Snap logic for Patch and Dress.
9. No-fail: a static test asserts that no "wrong", "fail" or "error" sound or event exists in `src/clinic`.
10. `npx tsc --noEmit` is clean, `npm test` is green, and `npx expo export --platform ios` succeeds.

## iPad checklist for Mike (Expo Go, `npx expo start --tunnel --clear` on TheDeskTop)
- [ ] The app opens without crashing and the Title shows three big buttons.
- [ ] A quick tap on Home says "Hold to go home"; a 2 s hold goes Home.
- [ ] The lock icon opens the gate, and tapping the numbers smallest to largest opens Parent.
- [ ] The Dev screen shows Bear and Bunny in 3 sizes, and tapping one changes its colours and patterns.
- [ ] Play: the plushie arrives, the story is spoken, and tapping the glowing spots says "ouch… thank you".
- [ ] Stitch: tracing the dots sews, and lifting off the line never buzzes.
- [ ] Wash: rubbing cleans the mud, the shower pops the suds, and the towel dries.
- [ ] Patch, stuffing, brushing and dressing all work, and the done heart appears if you wait.
- [ ] Go home: a hug, "Every toy is loved!", then "Thank you!" in Bella's voice or the iPhone voice.
- [ ] Recovery room: the small gold heart-and-cross on the wall is easy to miss.
- [ ] The animation feels smooth (Expo Go runs choppier than TestFlight).
- [ ] Also try it on an iPhone if one is handy, to check the layout.
