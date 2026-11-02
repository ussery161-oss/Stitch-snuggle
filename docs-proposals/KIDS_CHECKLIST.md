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
