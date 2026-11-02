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

## Phase 2 — `p2-studio` ✅
| Section | Status | Commit |
|---|---|---|
| A. Save schema v1/v2 | ✅ | 49a0c3e |
| B. Design Studio | ✅ | 93b400c |
| C. Sticker book | ✅ | 5ebfe2a |
| D. Content pass + preset rules | ✅ | e092355 |
| E. Entitlements, mock purchase, parent area | ✅ | 51afde0 (with F) |
| F. Credits | ✅ | 51afde0 (with E: the credits page lives in the parent area) |
| G. Showcase Room | ✅ | ce3a526 |
| Gate | ✅ | (this commit, `P2-GATE`) |

### Phase 2 gate results
- tsc clean, eslint clean, 202 tests green; `expo export` succeeds; boot smoke renders `<App/>` through Title → Clinic → Studio → Showcase → Sticker book → gate → Parent (plus Privacy, Credits, Dev).
- Kids Category / COPPA: all pass (`docs-proposals/KIDS_CHECKLIST.md`, Phase 2 table).
- **Visual check: pass** (`artifacts/visual/phase2/`): `presets.png` (all 8 presets; Unicorn with round-shiny eyes, Owl in blue with glasses, no bow tie/leaf/green), `showcase_scene.png` (8 shelves + hero on the podium, the tiny charm above it, as on the contact sheet), plus the Phase 1 renders re-made. Studio/Sticker book layouts are React Native views: please eyeball them on the iPad.

### Phase 2 PR
Compare: https://github.com/ussery161-oss/Stitch-snuggle/compare/p1-core...p2-studio (or against `main` once Phase 1 is merged).

**Summary.** Save schema v2 with migrations and a corruption guard; Design Studio with 8 bases, colours both ways, patterns, eyes, accessories, 40 voiced names, Undo (20), Surprise me and the toy shelf (Play doctor / Edit); sticker book with earned stickers, pages, drag/pinch/rotate placement and cached plushie snapshots; all 8 presets with stories, damage sets, owners and the look-alike rules; demo/unlock rules with a mocked purchase; the full parent area with privacy and credits (verse, blessing, team, credits); the Showcase Room; captions.

**Where the prompt and the docs/art differ:**
1. Save schema: P2-A says `creations: PlushSpec[]`; creations are stored as `{id, spec, createdAt}` so the shelf, stickers and showcase can point at them.
2. "Doll adds 4 hair styles": the r03 art has one hair shape per doll style (girl, boy). The Studio offers girl/boy and hair colours; 4 hair styles need art (AR-2).
3. Stickers: the tray shows every earned sticker on any page (pages are scenes; tool stickers have no base page).
4. CLAUDE.md mentions one charm (recovery room); P2-G adds the approved second one above the Showcase podium (prompt followed).
5. P2-E and P2-F landed in one commit (`P2-E/F`) so the build stayed green; the credits page is part of the parent area.
6. Music/SFX volume and captions are saved; there is no music or SFX audio yet, so the volume settings have nothing to control until audio lands.
7. Showcase: drag or tap-then-tap both work for placing, moving, swapping and the podium.

**New dependency:** `expo-file-system` (Expo module, in Expo Go) for the sticker snapshot cache.

**For Researcher 2 to record (new in Phase 2):** the 40 names `name-teddy` … `name-bubbles` (text = the name, e.g. `name-bunbun` = "Bun-Bun"), `studio-hello` "Let’s make a plushie!", `studio-saved` "Saved to your shelf!", `shelf-full` "Your shelf is full!", `surprise` "Surprise!", `tab-base` "Pick a friend.", `tab-body` "Pick a shape.", `tab-colors` "Pick a color.", `tab-patterns` "Pick a pattern.", `tab-eyes` "Pick some eyes.", `tab-accessories` "Dress it up!", `tab-name` "Pick a name.", `story-kitty-1/2`, `story-puppy-1/2`, `story-unicorn-1/2`, `story-dino-1/2`, `story-owl-1/2`, `story-doll-1/2`, `story-creation`. Exact texts: `assets/audio/VOICE_IDS.md` (96 lines, all "to record").

**iPad checklist for Mike (Phase 2)**
- [ ] Studio: pick Bunny, make it tall, paint it pink with stars, add star eyes and a crown, pick a name, and Save (needs the mock unlock for stars/star eyes/crown; in the demo they wiggle with a padlock).
- [ ] The dice and Undo work, and a doll can get a skin tone and hair colour.
- [ ] Toy shelf, then Play doctor: your own plushie arrives hurt and you can fix it.
- [ ] A sticker flies into the book. You can move it, make it bigger, and it's still there after you close and reopen the app.
- [ ] Locked plushies show a padlock with no price and no nag. Parent area, then Unlock (mock), and everything opens.
- [ ] Credits open with Ephesians 4:32, then the blessing line.
- [ ] The privacy page says no data is collected.
- [ ] Showcase Room: put 3 plushies on shelves, move one to the podium, close and reopen — they're still there.
- [ ] Parent → Captions On: the spoken words appear at the bottom.

**Open questions:** (1) Art for the 4 doll hair styles. (2) Music and SFX files (CC0) if wanted.

## Phase 3 — `p3-ship` ⛔ (code done; waiting only on Mike's accounts, see BLOCKED.md)
| Section | Status | Commit |
|---|---|---|
| A. Real purchase (expo-iap, StoreKit 2) | ✅ | 364c539 |
| B. EAS profiles (no builds started) | ✅ | 77b664e |
| C. Polish and compliance | ✅ | b97a1f3 |
| Gate | ✅ code / ⛔ accounts | (this commit, `P3-GATE`) |
| Sandbox purchase, TestFlight, submission | ⛔ | needs the Apple org account, Paid Apps agreement and EAS login |

### Phase 3 gate results
- tsc clean, eslint clean, 219 tests green; `npx expo export --platform ios` succeeds; boot smoke as in Phase 2.
- Prebuild: `npx expo prebuild --platform ios --no-install --clean` was run in a temp copy, but **Expo skips iOS prebuild on Windows** ("run from macOS or Linux"), and WSL isn't installed on this PC. Instead `npx expo config --type introspect` ran every config plugin (expo-audio, screen orientation, expo-iap, splash screen, dev client) and produced a valid iOS config: the placeholder bundle id, `ITSAppUsesNonExemptEncryption = false`, no tracking or usage keys except the dev launcher's local-network key, which its own build phase deletes from Release builds. The real prebuild runs on the EAS builders.
- Kids Category / COPPA: all pass (`docs-proposals/KIDS_CHECKLIST.md`, Phase 3 table).
- **Visual check: pass** (`artifacts/visual/phase3/`, same set as Phase 2; nothing visual changed in Phase 3 apart from the app icon `assets/app/icon.png`).

### Phase 3 PR
Compare: https://github.com/ussery161-oss/Stitch-snuggle/compare/p2-studio...p3-ship (or against `main` once Phases 1–2 are merged).

**Summary.** Real StoreKit 2 purchase (`unlock_all`) through expo-iap with launch re-check, offline cache, finished transactions and Restore; Expo Go and missing-module fallback to the mock; `eas.json` (development / preview / production); dev client; app icon and launch screen placeholders; screenshot helper; submission notes, Kids checklist and BLOCKED.md.

**Changes to how Mike runs it:** Expo Go now needs `npx expo start --tunnel --clear --go` (because of the dev client). README updated.

**New dependencies (all Expo modules):** expo-iap (+ config plugin), expo-constants, expo-dev-client, expo-splash-screen, expo-file-system (P2).

**Open questions:** (1) Final bundle id. (2) Final app icon art (`assets/art/ui/app_icon.png`). (3) When to spend the ~3 EAS builds.

## Known issues
- `gh` CLI is not installed on this PC, so PRs can't be opened automatically; the compare links are listed per phase. To open them: click the link and press "Create pull request", or install GitHub CLI (`winget install GitHub.cli`, then `gh auth login`).
- iOS prebuild can't run on Windows (Expo skips it); the EAS builders run it. Config validated with `expo config --type introspect`.
- fps on the iPad not yet measured (Parent → Plush test screen shows it).
- No Bella clips are in the repo yet: every line uses the iPhone voice until they're recorded (`assets/audio/VOICE_IDS.md`).
- No music or sound effects yet (the volume settings are saved for when they land).

---

## Finish
**Done:** Phase 1 ✅ (`p1-core`), Phase 2 ✅ (`p2-studio`), Phase 3 ⛔ only on hard blockers (`p3-ship`: all code, tests, `eas.json`, mock fallback, checklist and submission notes are done). Every branch is pushed; nothing was force-pushed and nothing was pushed to `main`.

**PR links (open each and press "Create pull request"):**
1. Phase 1: https://github.com/ussery161-oss/Stitch-snuggle/compare/main...p1-core
2. Phase 2: https://github.com/ussery161-oss/Stitch-snuggle/compare/p1-core...p2-studio (retarget to `main` after Phase 1 merges)
3. Phase 3: https://github.com/ussery161-oss/Stitch-snuggle/compare/p2-studio...p3-ship (retarget to `main` after Phase 2 merges)

**Combined iPad / iPhone checklist** (Expo Go: `npx expo start --tunnel --clear --go`)
- [ ] The app opens without crashing; the Title shows the big buttons and a breathing bear.
- [ ] A quick tap on Home says "Hold to go home"; a 2 s hold goes Home.
- [ ] The lock icon opens the gate; tapping the numbers smallest to largest, then holding the lock, opens Parent.
- [ ] Parent → Plush test screen: Bear and Bunny in 3 sizes, tap to change; note the fps (top right).
- [ ] Parent → Ages 6–7 is remembered after closing and reopening.
- [ ] Play: the plushie arrives in a basket, the story is spoken, glowing spots say "ouch… thank you".
- [ ] Stitch: tracing the dots sews; lifting off never buzzes.
- [ ] Wash: rubbing cleans the mud, the shower pops the suds, the towel dries.
- [ ] Patch, stuffing, brushing and dressing all work; the done heart appears if you wait 20 s.
- [ ] Go home: a hug, "Every toy is loved!", then "Thank you!".
- [ ] Recovery room: the small gold heart-and-cross is easy to miss; a sticker flies into the book.
- [ ] Studio: pick Bunny, make it tall, paint it pink with stars, add star eyes and a crown, pick a name, Save (unlock first, or those wiggle with padlocks).
- [ ] The dice and Undo work; a doll gets a skin tone and hair colour.
- [ ] Toy shelf → Play doctor: your own plushie arrives hurt and you can fix it.
- [ ] Stickers: move one, make it bigger; it's still there after closing and reopening.
- [ ] Locked items show a padlock with no price and no nag. Parent → Unlock (mock) → everything opens.
- [ ] Credits open with Ephesians 4:32, then the blessing line. The privacy page says no data is collected.
- [ ] Showcase Room: 3 plushies on shelves, one to the podium; still there after reopening.
- [ ] Parent → Captions On shows the spoken words.
- [ ] Reduce Motion (iOS Settings → Accessibility → Motion) calms the animations.
- [ ] Try an iPhone too, for the layout.
- After BLOCKED.md: [ ] dev build + sandbox tester: Parent → Unlock shows the price → buy → everything unlocks; [ ] delete and reinstall → Restore Purchases unlocks again; [ ] airplane mode: still plays and stays unlocked; [ ] TestFlight build smooth on iPad and iPhone.

**For Researcher 2 to record:** all 96 lines in `assets/audio/VOICE_IDS.md` (ids and exact texts; Phase 1's 32 are listed above, Phase 2 adds the 40 names, Studio lines and the other stories). Render each with Kokoro-82M af_bella to `assets/audio/lines/<id>.m4a`, then run `npm run gen:voice` and `npm run gen:voice-ids`.

**BLOCKED.md summary:** (1) DesMacApps D-U-N-S and Apple Developer organization account, then the real bundle id; (2) Paid Apps agreement, tax and banking in App Store Connect; (3) the app record, the `unlock_all` product at $5.99 and a sandbox tester; (4) `npx eas login`, `npx eas init`, then the development build for sandbox testing and later production + submit. Then say "Read and do docs/prompts/CONTINUOUS_BUILD.md." to resume.

## Next
Waiting on BLOCKED.md. Then: sandbox purchase test on the dev build, TestFlight, submission.
