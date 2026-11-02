# Blocked — only Mike can do these
Phase 3's code, tests, `eas.json` and submission notes are done and pushed (branch `p3-ship`). The steps below need Mike's own accounts; no agent can do them. When they're done, tell Claude **"Read and do docs/prompts/CONTINUOUS_BUILD.md."** to resume.

## 1. DesMacApps Apple Developer account and the real bundle id
**Why it blocks:** builds, the App Store record and the in-app purchase all depend on the bundle id, which needs the organization account (and that needs the D-U-N-S number first).
1. Look up or request the D-U-N-S number for DesMacApps (free, via Apple's D-U-N-S lookup on developer.apple.com).
2. Enroll DesMacApps in the Apple Developer Program as an organization (developer.apple.com → Account → Enroll).
3. Tell Claude the final bundle id (for example `com.desmacapps.stitchsnuggle`). It's a one-line change in `app.json`.

## 2. Paid Apps agreement, tax and banking
**Why it blocks:** until the agreement is active, the `unlock_all` product won't load in sandbox, TestFlight or the App Store.
1. App Store Connect → **Business** → **Agreements**: accept the **Paid Apps** agreement.
2. On the same page, complete the **Tax** forms and the **Banking** details. Wait until the status says **Active**.

## 3. App record, product and sandbox tester (App Store Connect)
1. **Apps → + → New App:** name "Stitch & Snuggle", the bundle id from step 1, language English, SKU `stitch-snuggle`.
2. In the app: **Monetization → In-App Purchases → +**: type **Non-Consumable**, product id **`unlock_all`**, reference name "Unlock Everything", the price tier closest to **$5.99**, display name "Unlock Everything", and the review screenshot (see `docs-proposals/SUBMISSION_NOTES.md`).
3. **Users and Access → Sandbox → Testers → +**: add a sandbox Apple ID for test purchases.
4. App information: Kids Category with age bands 5 and under + 6–8; App Privacy: **Data Not Collected**.

## 4. EAS login and builds (on the Windows PC, in the repo folder)
**Why it blocks:** EAS needs Mike's Expo login and Apple credentials (with 2FA). Each build uses one of the ~15 free monthly builds shared with Popsy Words, so Mike decides when.
1. `npx eas login` (Mike's Expo account).
2. `npx eas init` (links the project; commit the `app.json` change it makes).
3. Development build for sandbox purchase testing: `npx eas build -p ios --profile development`. Sign in with the Apple ID when asked (2FA), then open the link or QR code on the iPad to install it.
4. Run the dev server for that build: `npx expo start --tunnel --clear` (without `--go`), open the dev build, and use the sandbox tester when buying.
5. For TestFlight: `npx eas build -p ios --profile production`, then `npx eas submit -p ios`.

Everyday testing still works in Expo Go with the mock purchase: `npx expo start --tunnel --clear --go`.
