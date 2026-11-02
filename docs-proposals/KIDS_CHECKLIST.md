# Kids Category / COPPA checklist — Stitch & Snuggle
Updated at every phase gate (`docs/prompts/CONTINUOUS_BUILD.md`). Each line names the test that enforces it.

## Phase 1 gate (branch `p1-core`)
| Check | Result | Enforced by |
|---|---|---|
| No network calls (`fetch`, XHR, WebSocket) and no `http(s)://` in `src/` | ✅ pass | `__tests__/noNetwork.test.ts` |
| No external links (`Linking.openURL`) | ✅ pass | `__tests__/noNetwork.test.ts` |
| No ads, analytics, tracking, crash-reporting or account SDKs | ✅ pass | `__tests__/kidsCategory.test.ts`, `__tests__/depsGuard.test.ts` (allowed-deps list) |
| No price / "buy" / purchase text outside the parent area | ✅ pass (no purchases exist yet) | `__tests__/kidsCategory.test.ts` |
| Settings and the developer screen only behind the parental gate | ✅ pass | `__tests__/router.test.ts`, `__tests__/appShell.test.tsx` |
| Parental gate: three numerals smallest → largest, then a 1 s hold; wrong order resets quietly | ✅ pass | `__tests__/gateLogic.test.ts` |
| No fail states, scores, lives, timers or "wrong" feedback in the clinic | ✅ pass | `__tests__/clinicFlow.test.tsx` (static scan + done-heart run) |
| Every step can be finished (hand hint at 8 s, done heart at 20 s) | ✅ pass | `__tests__/clinicFlow.test.tsx` |
| No data collected: only the age setting, on the device (AsyncStorage) | ✅ pass | `__tests__/kidsCategory.test.ts` |
| No tracking or permission keys in `app.json`; microphone off | ✅ pass | `__tests__/appJson.test.ts`, `__tests__/kidsCategory.test.ts` |
| No reading needed: every child instruction is voice + icon + hand hint | ✅ pass (by design; see `src/audio/lines.ts`) | `__tests__/voiceIds.test.ts` (every line voiced) |
| Faith kept subtle: only the wall charm in the child flow | ✅ pass | `__tests__/recoveryCharm.test.tsx` |

Still to do in later phases: purchase/restore behind the gate (P2 mock, P3 StoreKit), privacy page, App Store privacy label "Data Not Collected", review notes explaining the gate (P3).

## Phase 2 gate (branch `p2-studio`)
| Check | Result | Enforced by |
|---|---|---|
| No network, no links (incl. credits: web addresses are plain text, no scheme) | ✅ pass | `__tests__/noNetwork.test.ts` |
| No ads/analytics/tracking/account SDKs; only allowed deps (+ `expo-file-system` for sticker snapshots, an Expo module) | ✅ pass | `__tests__/kidsCategory.test.ts`, `__tests__/depsGuard.test.ts` |
| No price / "buy" text outside the parent area (`src/screens/parent/`, `src/purchase/`) | ✅ pass | `__tests__/kidsCategory.test.ts` |
| Locked items in the child flow show only a padlock (wiggle on tap); no price, buy button or nag | ✅ pass | `__tests__/studio.test.tsx`, `__tests__/stickers.test.tsx` |
| Purchase, restore, settings, reset, delete creations, privacy and credits only behind the gate | ✅ pass | `__tests__/parentArea.test.tsx`, `__tests__/router.test.ts` |
| Purchase is mocked (no store connection in P2) | ✅ pass | `__tests__/parentArea.test.tsx` |
| Data stays on the device (one AsyncStorage save; sticker snapshots in the app's documents folder) | ✅ pass | `__tests__/kidsCategory.test.ts`, `__tests__/saveSchema.test.ts` |
| Privacy page in the app: "This app collects no data. No ads, no tracking, no accounts, no internet." | ✅ pass | `__tests__/parentArea.test.tsx` |
| Stickers are earned only (no currency, no random rewards) | ✅ pass | `__tests__/stickers.test.tsx` |
| Faith: verse and blessing only in the parent-area credits; in the child flow only the two approved charms (recovery wall, above the Showcase podium) | ✅ pass | `__tests__/recoveryCharm.test.tsx`, `__tests__/parentArea.test.tsx` |
| No reading needed: Studio tabs, names and plaque are voiced; captions are a parent option (off by default) | ✅ pass | `__tests__/studio.test.tsx`, `__tests__/appShell.test.tsx` |

## Phase 3 (branch `p3-ship`) — the App Store review list
| Check | Result | Enforced by |
|---|---|---|
| No third-party analytics or ads SDKs (StoreKit via `expo-iap` is Apple's purchase API) | ✅ pass | `__tests__/kidsCategory.test.ts`, `__tests__/depsGuard.test.ts` |
| App code makes no network calls; only `src/purchase/` loads the StoreKit module | ✅ pass | `__tests__/noNetwork.test.ts` |
| The privacy label says **Data Not Collected** | ✅ ready (set in App Store Connect) | `docs-proposals/SUBMISSION_NOTES.md` |
| Purchases (Unlock Everything, $5.99 `unlock_all`), Restore and settings only in the parent area, behind the gate | ✅ pass | `__tests__/parentArea.test.tsx`, `__tests__/kidsCategory.test.ts` |
| No external links | ✅ pass | `__tests__/noNetwork.test.ts` (openURL, http(s)) |
| Review notes explain the gate | ✅ ready | `docs-proposals/SUBMISSION_NOTES.md` |
| Expo Go keeps working, with the mock purchase | ✅ pass | `__tests__/storePurchase.test.ts` |
| No permission prompts in release builds: no usage keys in `app.json`; the dev launcher's local-network key is removed from Release builds by its own build phase | ✅ pass | `__tests__/appJson.test.ts`, `expo config --type introspect` |
| Reduce Motion turns off the breathing, wiggles, hand-hint motion, waves and sticker flight | ✅ pass | `useReducedMotion` in every animated component |
| VoiceOver: parent-area buttons have labels and sections are headers; decor (the charm) is hidden | ✅ pass | `__tests__/recoveryCharm.test.tsx`, parent screen |
