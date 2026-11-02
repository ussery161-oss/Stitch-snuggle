# Stitch & Snuggle — build progress
Driven by `docs/prompts/CONTINUOUS_BUILD.md`. ☐ not started · ▶ in progress · ✅ done · ⛔ blocked

## Phase 1 — `p1-core` (scaffold, renderer, clinic) ✅
| Section | Status | Commit |
|---|---|---|
| A. Scaffold | ✅ | 3f5761d |
| B. Guard tests | ✅ | 15c2d28 |
| C. Shell, nav, home, gate | ✅ | ca40785 |
| D. Audio | ✅ | 2cdb608 |
| E. Plush renderer | ✅ | c897e47 |
| F. Clinic, Stitch, Wash | ✅ | 2b8f7c7 |
| G. Patch, Re-stuff, Brush, Dress | ✅ | 267cfa6 |
| H. Recovery room + charm | ✅ | ecf6811 |
| Gate | ✅ | (this commit, `P1-GATE`) |

### Phase 1 gate results
- `npx tsc --noEmit`: clean. `npx eslint . --max-warnings=0`: clean. `npm test`: 139 tests green (worklet purity, reserved names, no network, art manifest + bounds + credits, deps/SDK guard, Kids Category).
- Boot smoke: `npx expo export --platform ios` succeeds; `__tests__/appShell.test.tsx` renders `<App/>` through Title → Clinic → Studio/Stickers placeholders → gate → Parent → Dev; `__tests__/clinicFlow.test.tsx` plays a whole visit with simulated gestures.
- Kids Category / COPPA: all pass — see `docs-proposals/KIDS_CHECKLIST.md`.
- **Visual check: pass.** `npm run visual` renders with real Skia (CanvasKit) into `artifacts/visual/phase1/`: `plush_sheet.png` (Bear/Bunny round+tall+tiny, Kitty, Puppy, Unicorn, Dino, Owl, Doll girl + boy), `clinic_scene.png`, `care_overlays.png`, `recovery_scene.png`, `clinic_iphone.png`. Compared with `docs/CONTACT_SHEET_r03.png`: parts in z_order (ears under the head, legs under the body), plush fills ~960/1024, eyes on the eye anchors, accessories on their slots, mud/tangles clipped to the part, charm small and subtle, plush feet on the clinic cushion and the recovery rug. Fixes made during the check: shade blend switched to Overlay (Multiply darkened everything by half), mud clip needed a DstIn layer paint, charm tint switched to a colour matrix (the "color" blend filled its transparent corners), wide-phone layout anchored to the floor so the cushion stays on screen. Unicorn/Owl preset rules are a Phase 2 item (presets are registered in P2-D).
- fps for 6 plushies: **not measured** (needs the iPad). Mike: Parent → Plush test screen shows the live fps in the top-right corner.

### Phase 1 PR (gh is not installed; open it from the compare link)
https://github.com/ussery161-oss/Stitch-snuggle/compare/main...p1-core

**Summary.** Expo SDK 57 app with Reanimated 4.5.1 / worklets 0.10.1, Skia and Gesture Handler. Guard tests (worklets, Windows names, no network, art manifest), title + hold-to-go-home + parental gate, AudioService (two players, preload next, FIFO, speech fallback), the r03 plush compositor for all 27 base/body sets with idle breathing/blinking, and the full clinic: arrival, triage, Stitch, Patch, Re-stuff, Wash, Brush, Dress, go home, recovery room with the wall charm.

**Where the prompt and the docs disagree (prompt followed unless noted):**
1. Parental gate: GDD §8 describes hold + math; P1 says three numerals smallest → largest, then a 1 s hold. Built the P1 gate.
2. Shade layer: P1 says Multiply; ART_REQUESTS says the shade is mid-grey = no change, which is Overlay. Multiply halved every colour (see the visual check), so **Overlay is used**. Open question for Mike/Art Director.
3. Art paths: ART_REQUESTS says `assets/plush/...`; the prompt and the repo use `assets/art/plush/...`.
4. Wall charm: the r01 art is pink; the approved colour is gold #F2C94C at 60 % → recoloured in code. scenes.json says scale 0.35 (≈45 pt on iPad); the prompt says 28 pt iPad / 22 pt iPhone → used 28/22.
5. CLAUDE.md says every art file gets a row in CREDITS; with 1,543 art files, CREDITS lists each art folder (and `ui/basket.png`) against its set, and a test fails if any file isn't covered.
6. Bundle id: GDD says `com.ussery161.stitchsnuggle`; the prompts say the placeholder `com.desmacapps.stitchsnuggle` → placeholder used (one line in `app.json`).

**Dependencies outside the allowed list:** `react-native-safe-area-context` (bundled in Expo Go; needed for the iPhone safe areas). Dev only: eslint + eslint-config-expo, jest-expo, Testing Library. `expo-asset` is pinned to SDK 57 with an npm override (expo-audio pulled SDK 58's, which broke `expo export`).

**For Researcher 2 to record** (Bella / Kokoro af_bella → `assets/audio/lines/<id>.m4a`, then `npm run gen:voice` and `npm run gen:voice-ids`). No clips are in the repo yet, so every line uses the iPhone voice for now:

| Id | Text |
|---|---|
| `hold-to-go-home` | Hold to go home. |
| `ouch-thanks` | Ouch… thank you! |
| `praise-1` | Great job! |
| `praise-2` | You did it! |
| `praise-3` | So gentle! |
| `praise-4` | Wonderful! |
| `every-toy-loved` | Every toy is loved! |
| `thank-you` | Thank you! |
| `tool-needle` | Needle and thread. |
| `tool-patch` | Patch. |
| `tool-cotton` | Cotton. |
| `tool-soap` | Soap. |
| `tool-shower` | Shower. |
| `tool-towel` | Towel. |
| `tool-brush` | Brush. |
| `tool-dress` | Dress up! |
| `story-bear-1` | Teddy fell out of the tree house! |
| `story-bear-2` | Teddy had a muddy picnic! |
| `story-bunny-1` | Bun-Bun fell in a puddle! |
| `story-bunny-2` | Bun-Bun got caught on a fence! |
| `story-generic` | This little friend needs your help! |
| `hint-find-spots` | Tap the sore spots. |
| `hint-stitch` | Follow the dots to sew. |
| `hint-wash-soap` | Rub with the soap. |
| `hint-wash-rinse` | Rinse off the bubbles. |
| `hint-wash-dry` | Wiggle the towel to dry. |
| `hint-patch` | Pick a patch and put it on. |
| `hint-patch-sew` | Tap the dots to sew it on. |
| `hint-stuff` | Fill it up with cotton. |
| `hint-brush` | Brush the fuzzy fur. |
| `hint-dress` | Dress up your friend! |
| `all-better` | All better! |

**iPad checklist for Mike (Expo Go: `npx expo start --tunnel --clear` on TheDeskTop)**
- [ ] The app opens without crashing and the Title shows three big buttons (and a breathing bear).
- [ ] A quick tap on Home says "Hold to go home"; a 2 s hold goes Home.
- [ ] The lock icon opens the gate, and tapping the numbers smallest to largest, then holding the lock, opens Parent.
- [ ] Parent → Plush test screen shows Bear and Bunny in 3 sizes; tapping one changes its colours and patterns. Note the fps number (top right) for the PR.
- [ ] Parent → Ages 6–7 is remembered after closing and reopening the app.
- [ ] Play: the plushie arrives in a basket, the story is spoken, and tapping the glowing spots says "ouch… thank you".
- [ ] Stitch: tracing the dots sews, and lifting off the line never buzzes.
- [ ] Wash: rubbing cleans the mud, the shower pops the suds, and the towel dries.
- [ ] Patch, stuffing, brushing and dressing all work, and the done heart appears if you wait 20 s.
- [ ] Go home: a hug, "Every toy is loved!", then "Thank you!" (iPhone voice until Bella's clips land).
- [ ] Recovery room: the small gold heart-and-cross on the wall is easy to miss.
- [ ] The animation feels smooth (Expo Go runs choppier than TestFlight).
- [ ] Also try it on an iPhone if one is handy, to check the layout.

**Open questions:** (1) Overlay vs Multiply for the shade layer (above). (2) The fps reading from the iPad.

## Phase 2 — `p2-studio`
☐ not started

## Phase 3 — `p3-ship`
☐ not started

## Known issues
- `gh` CLI is not installed on this PC, so PRs can't be opened automatically; the compare links are listed per phase. To open them: click the link and press "Create pull request", or install GitHub CLI (`winget install GitHub.cli`, then `gh auth login`).
- npm held back `@shopify/react-native-skia`'s postinstall (it downloads the native Skia libraries). Not needed for Expo Go, Jest or `expo export`; needed before a native build (Phase 3): `npm install-scripts approve @shopify/react-native-skia`.

## Next
Phase 2: branch `p2-studio` from `p1-core`, section A (save schema v1/v2).
