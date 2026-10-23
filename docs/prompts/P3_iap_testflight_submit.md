# P3: Real in-app purchase, dev build, TestFlight and submission polish (covers M8–M9)
Branch `p3-ship` off `main` after P2 is merged.

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
- **Exception to the Expo Go rule:** this prompt adds one native IAP module. Expo Go must **still run**: in Expo Go, `purchaseService` falls back to the mock. Detect this with `Constants.executionEnvironment === 'storeClient'` or a failed native module lookup.

## ⚠️ Before purchase testing: Mike must do this himself
**Mike has to sign Apple's Paid Apps agreement himself** in App Store Connect (Business → Agreements), and complete the **tax and banking** forms. Until it's active, the IAP product won't load in sandbox or TestFlight. No agent can do this for him. Also in App Store Connect (we can talk Mike through it):
1. Create the app record "Stitch & Snuggle" with bundle id `com.ussery161.stitchsnuggle` and Category Kids (age band 5 & under, plus 6–8).
2. Create the non-consumable product `unlock_all` at the price tier closest to **$5.99**, with display name "Unlock Everything" and a review screenshot.
3. Add a Sandbox tester.

## A. Real purchase
- Add `expo-iap` (StoreKit 2) and its config plugin. `StorePurchaseService` uses `getProduct('unlock_all')` to show the localized price in the parent area only, plus `buy()` and `restore()` (Restore Purchases is required by Apple). It checks entitlement at launch from current transactions, works offline from the cached entitlement, and finishes every transaction.
- No other network use. Add StoreKit's network calls to the noNetwork test's allow-list, scoped to the native module only (not to app code).
- Unit-test the service against a mocked native module: buy success, cancel, pending, restore, and an already-owned purchase.

## B. EAS builds (uses the free plan, about 3 of 15 builds per month, shared with Popsy)
- Add `eas.json` with three profiles: `development` (dev client, internal distribution), `preview`, and `production` (auto-increment the build number).
- Write the PR steps so Mike can run them from Windows: `npx eas build -p ios --profile development`, install it via QR code, then sandbox-test; later `--profile production` and `npx eas submit -p ios`. Don't start any build yourself; the lead starts builds when Mike asks.

## C. Polish and compliance
- **Performance:** keep a steady 60 fps on the TestFlight build. Lower particle caps if needed, and avoid React re-renders during gestures by keeping per-frame work in shared values and worklets.
- **Reduce Motion** turns off the wiggle, confetti and breathing.
- **VoiceOver labels** in the parent area.
- **iPhone layout pass:** safe areas and small screens. Touch targets are still at least 64 pt; scale the art, not the targets.
- **Kids Category checklist** goes in `docs-proposals/KIDS_CHECKLIST.md` (not in docs/):
  - no third-party analytics or ads SDKs
  - the privacy label says "Data Not Collected"
  - purchases and links are behind the gate
  - no external links
  - review notes explain the gate
- **App icon and launch screen:** use `art('ui/app_icon')` if it exists, otherwise a placeholder. Add a screenshot helper screen (Dev) that stages 5 nice scenes for iPad and iPhone screenshots.

## Acceptance tests
1. Purchase service: all five cases in A, plus the Expo Go mock fallback.
2. Restore unlocks content offline after a relaunch, using the cached entitlement.
3. No price appears outside the parent area (re-run the P2 scan).
4. `app.json` and the plugin config are valid; `npx expo prebuild --platform ios --no-install` succeeds in CI, with no Mac needed for prebuild.
5. All earlier tests are green, and `npx expo export --platform ios` succeeds.

## iPad checklist for Mike
- [ ] Expo Go still opens and plays, with the mock unlock.
- [ ] The **Paid Apps agreement is active** in App Store Connect (only Mike can do this).
- [ ] Install the dev build and sign in with the sandbox tester. Parent area → Unlock shows the price → buy → everything unlocks.
- [ ] Delete and reinstall, then Restore Purchases unlocks again.
- [ ] Airplane mode: everything still plays and stays unlocked.
- [ ] TestFlight build: smooth animation on both iPad and iPhone.
- [ ] Reduce Motion (iOS Settings) calms the animations.
