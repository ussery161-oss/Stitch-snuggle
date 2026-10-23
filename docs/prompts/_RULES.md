# Shared rules — paste at the top of every Stitch & Snuggle prompt
- **docs/ is read-only.** Design sources: `docs/GDD.md`, `docs/MILESTONES.md`, `docs/ART_REQUESTS.md`. Where a prompt and docs disagree, the prompt wins; list the disagreement in the PR.
- **Kids Category / COPPA:** no network calls, ads, analytics, tracking, accounts or outside links. No SDK that phones home. Purchases, restore, settings and links only behind the parental gate. No fail states, scores, lives, timers or "wrong" feedback.
- **No reading required:** every child-facing instruction is voice + icon + hand hint. Voice goes through `AudioService` (two players, preload next) and `voiceLookup`; missing clips fall back to expo-speech and are listed in the PR under "For Researcher 2 to record".
- **Expo Go SDK 57 must keep working** (no native modules outside Expo Go until M8). Allowed deps: expo-*, react-native-reanimated, react-native-gesture-handler, @shopify/react-native-skia, react-native-svg, @react-native-async-storage/async-storage. Anything else: justify in the PR.
- **Worklets:** every function called from `useAnimatedStyle`, `useDerivedValue`, gesture callbacks on the UI thread, or Skia `useDerivedValue` must start with `'worklet'`. The `workletPurity` guard test must cover all `src/` files.
- **No Windows-reserved file names** (con, prn, aux, nul, com1–9, lpt1–9, any extension); a test enforces it.
- **Art/audio:** only files in `assets/` with an entry in `assets/CREDITS.md` (free, commercially licensed). Placeholders are drawn in code.
- Touch targets ≥ 64 pt; landscape; safe areas.
- Tests for everything new. `npx tsc --noEmit` clean, `npm test` green, `npx expo export --platform ios` succeeds. Commit per section (`M#-A:` …). PR body: summary, test notes for Mike's iPad, missing clips, open questions.
