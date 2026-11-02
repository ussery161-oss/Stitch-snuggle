# Stitch & Snuggle
A gentle, ad-free plush fix-up game for ages 3–7: stitch, patch, re-stuff, wash, brush and dress toys, design your own plushies, and collect stickers. Every toy is loved.

- iPad and iPhone, built with Expo (SDK 57). Kids Category: no ads, no tracking and no network.
- A free demo, with a one-time $5.99 unlock that includes future plushies.
- Design docs are in `docs/`; Claude's build prompts are in `docs/prompts/` (P1 → P3).

## Run (Windows, Expo Go)
```
npm install
npx expo start --tunnel --clear --go
```
Scan the QR code with the iPad camera to open it in Expo Go. (`--go` is needed because the project also has a development build for in-app purchase testing; without it, the QR code targets that build.)

## Checks
```
npx tsc --noEmit
npx eslint . --max-warnings=0
npm test
npm run visual     # renders plushies and scenes into artifacts/visual/ (real Skia, headless)
npx expo export --platform ios
```

## Builds (EAS, from Windows; see BLOCKED.md for the account steps first)
```
npx eas build -p ios --profile development   # dev build for sandbox purchase testing (QR install)
npx eas build -p ios --profile production    # App Store / TestFlight build
npx eas submit -p ios                        # upload the production build
```

© 2026 ussery161-oss. All rights reserved.
