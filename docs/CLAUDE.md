# CLAUDE.md — working rules for Stitch & Snuggle
**docs/ is read-only.** Never edit, move or delete anything under `docs/`. If a doc looks wrong, say so in the PR, or put a proposal in `docs-proposals/`.

- **The product:** a plush fix-up and design-your-own-plushie game for ages 3–7 on iPad and iPhone. The specs are `docs/GDD.md`, `docs/MILESTONES.md` and `docs/ART_REQUESTS.md`. Work comes in as the prompts in `docs/prompts/` (P1, then P2, then P3).
- **Stack:** Expo SDK 57, TypeScript, Reanimated 4.5.1 with worklets 0.10.1, Gesture Handler, @shopify/react-native-skia, expo-audio and expo-speech, and AsyncStorage. It must keep running in **Expo Go**; Mike tests on an iPad from a Windows PC and has no Mac.
- **Kids Category and COPPA:** no network, ads, analytics, tracking, accounts or external links. Purchases, restore, settings and links sit behind the parental gate. No prices or nags in the child flow.
- **No fail states:** no timers, scores, lives or "wrong" feedback. Every step can be finished.
- **No reading needed:** voice plus icons plus hand hints.
- **Worklets:** any function called from a Reanimated worklet, an animated style or derived value, or a gesture callback must contain `'worklet'`. The guard test enforces this. Breaking it crashes Expo Go with no red screen.
- **No Windows-reserved file names** (con, prn, aux, nul, com1–9, lpt1–9). Use LF line endings.
- **Art and audio:** free and commercially licensed only. Every file gets a row in `assets/CREDITS.md`. Use `art(id)` from the generated manifest, which is real art when it exists and a code placeholder otherwise. Never copy the Plush Hospital (Tapps Games) art, names or UI.
- **Voice:** Bella, rendered with Kokoro-82M af_bella (Apache-2.0); credit it. Missing clips fall back to expo-speech and are listed in the PR.
- **Faith, kept subtle:** the credits open with Ephesians 4:32 (KJV) and the blessing line, and there is one tiny heart-and-cross charm on the recovery-room wall. Nothing else religious in the child flow.
- **Every PR:** `npx tsc --noEmit` clean, `npm test` green, `npx expo export --platform ios` succeeds, tests for everything new, and an iPad test list for Mike.
