# Stitch & Snuggle — CONTINUOUS BUILD (run once, start to finish)
Say to Claude Code in the repo root: **"Read and do docs/prompts/CONTINUOUS_BUILD.md."**

You will build the whole app in three phases without waiting for Mike between them. The detailed specs are the phase files in this folder; read each one fully before its phase and follow it exactly:
- Phase 1 → `docs/prompts/P1_scaffold_renderer_clinic.md` (scaffold, guard tests, gate, audio, r03 renderer, full clinic loop, recovery room + charm)
- Phase 2 → `docs/prompts/P2_studio_stickers_content_unlock.md` (save schema, Studio, stickers, saved plushies, Showcase Room, content + preset rules, mocked unlock flag, parent area, credits merge)
- Phase 3 → `docs/prompts/P3_iap_testflight_submit.md` ($5.99 `unlock_all` IAP behind the parent gate, eas.json, TestFlight/submission notes, polish, Kids checklist)
The shared rules in `docs/prompts/_RULES.md` (repeated in each phase file) apply to every phase. Kids Category/COPPA rules are never relaxed. docs/ is read-only (except `docs-proposals/`, which is outside docs/) — write PROGRESS.md and BLOCKED.md at the **repo root**.

## 0. Start / resume
1. `git fetch origin && git status`. If `assets/art/` is missing, `git pull origin main` (the final r03 art + `assets/art/ART_CREDITS.md` are on main). If it is still missing, write BLOCKED.md ("art not in repo — copy /workspace/plush-hospital/art r01→r02→r03 assets into assets/art") and continue with code placeholders; art is not a reason to stop.
2. Read `PROGRESS.md` if it exists, and check for existing `p1-core` / `p2-studio` / `p3-ship` branches and `P1-*`/`P2-*`/`P3-*` commits. **Resume from the first unfinished section; never redo or rewrite finished, pushed work.** If a P1 branch exists from an earlier P1-only run, verify it against the phase gate below, fix only what fails (including the r03 art rules from the current P1 file), then continue.
3. Create/update `PROGRESS.md` at the repo root: a table of phases and sections (☐/▶/✅/⛔), the last commit SHA per section, the gate results, and a "Next" line. Update and commit it after every section.

## Branching and pushing (every phase)
- Phase N works on its branch (`p1-core`, `p2-studio`, `p3-ship`); each next branch starts from the previous phase branch (so the work is continuous without waiting for PR merges). Commit per section (`P1-A:` …) and `git push -u origin <branch>` after every section. Open (or update) one PR per phase into `main` with `gh pr create` if `gh` is authenticated; otherwise list the compare URL in PROGRESS.md.
- **Never force-push, never rewrite pushed history, never push to `main` directly.** If a push fails, keep committing locally, note it in PROGRESS.md, and continue.

## Phase gate (run at the end of EVERY phase; all must pass before the next phase)
1. `npx tsc --noEmit` clean; `npx eslint . --max-warnings=0` (add eslint in Phase 1 if absent; Expo config); `npm test` green (including worklet, reserved-name, no-network, art-manifest guards).
2. **Boot smoke test:** `npx expo export --platform ios` succeeds, and a jest smoke test renders `<App/>` (with Skia/Reanimated/audio mocked) through Title → Clinic → (Phase 2+) Studio, Showcase → Parent gate without throwing. Phase 3 also: `npx expo prebuild --platform ios --no-install --clean` in a temp copy succeeds.
3. **Kids Category / COPPA checklist** (write results to `docs-proposals/KIDS_CHECKLIST.md`, created in Phase 1, appended each phase): no network/ads/analytics/tracking/accounts/external links in `src/`; no price/buy text outside the parent area (static scan); purchase/restore/settings/links only behind the gate; no fail/score/timer/"wrong" feedback; no data collected; no new non-allowed deps.
4. **Visual check against the r03 contact sheet:** the contact sheet is at `docs/CONTACT_SHEET_r03.png` (if absent, skip and note it). Add a jest/Skia offscreen render (or a Dev-screen snapshot script) that writes PNGs of Bear/Bunny round+tall+tiny, one each of Kitty/Puppy/Unicorn/Dino/Owl/Doll, and the clinic/recovery/(Phase 2) showcase scenes to `artifacts/visual/phaseN/` (git-ignored). Open them and the contact sheet as images and compare: parts in the right layer order (ears under head), plush filling ~960/1024 at fit.scale, eyes/accessories on anchors, damage clipped to the body, charm small and subtle, unicorn/owl presets follow the preset rules. Fix mismatches; record "visual check: pass/notes" in PROGRESS.md.
5. Commit `P#-GATE: checks pass`, push, mark the phase ✅ and continue **automatically** to the next phase.

If a gate item cannot pass after reasonable effort and it is not a hard blocker, fix forward; do not skip the gate silently — log it under "Known issues" in PROGRESS.md and continue only if the app still boots and all COPPA checks pass.

## Hard blockers (only these may stop work, and only in the phase that needs them)
- Apple **Paid Apps agreement, tax or banking** (only Mike can do these).
- **LLC / bundle id:** DesMacApps' D-U-N-S number and Apple Developer organization account are pending; the bundle id stays the placeholder `com.desmacapps.stitchsnuggle`.
- Any **EAS or Apple credential/login** (`eas login`, Apple ID, 2FA, certificates, App Store Connect API key).
When you hit one: write/update `BLOCKED.md` at the repo root with the blocker, why it blocks, and exact numbered steps for Mike (where to click, what to run from Windows, e.g. `npx eas login`, `npx eas build -p ios --profile development`), plus what to tell Claude afterwards ("Read and do docs/prompts/CONTINUOUS_BUILD.md" resumes). Finish every part of the phase that does NOT need the blocker (all Phase 3 code, tests, eas.json, mock fallback, checklist, submission notes in `docs-proposals/SUBMISSION_NOTES.md`). Commit and push, mark ⛔ in PROGRESS.md, then stop. Earlier phases stay finished and pushed. **Never start an EAS build or submission yourself** (they spend Mike's ~3 of 15 shared monthly builds); give Mike the commands instead.

## Finish
When all phases are ✅ (or Phase 3 is ⛔ only on hard blockers), PROGRESS.md ends with: what's done, PR links, the iPad/iPhone checklists from all three phase files combined, the "For Researcher 2 to record" voice-line list, and the BLOCKED.md summary.
