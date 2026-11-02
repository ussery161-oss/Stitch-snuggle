# Submission notes — Stitch & Snuggle (draft for Mike)
Proposal file (outside `docs/`). Everything here can be pasted into App Store Connect once the accounts in `BLOCKED.md` are ready.

## App record
- **Name:** Stitch & Snuggle — **Subtitle:** Toy Fix-Up for Kids
- **Bundle id:** placeholder `com.desmacapps.stitchsnuggle` (one line in `app.json`; change it when the DesMacApps Apple Developer organization account exists).
- **Category:** Kids Category, age bands **5 and under** and **6–8** (primary category Education or Games › Family).
- **Platforms:** iPad and iPhone, landscape only.
- **Age rating questionnaire:** no violence, no mature themes, no gambling, no web access, no user-generated content shared with others, no chat.

## In-app purchase
- **Type:** Non-Consumable. **Product id:** `unlock_all`. **Reference name:** Unlock Everything. **Price:** the tier closest to **$5.99**.
- **Display name:** Unlock Everything. **Description:** "Unlocks every plushie, colour, pattern, eye style, accessory and sticker page, including all future plushies."
- **Review screenshot:** the parent area with the Unlock Everything button (on the iPad: Grown-ups lock → gate → Parent).
- Restore Purchases is in the parent area (required by Apple).

## Privacy
- **App Privacy label:** **Data Not Collected.**
- No third-party SDKs for ads, analytics, tracking, crash reporting or accounts. App code makes no network calls; StoreKit (Apple) handles the purchase.
- In-app privacy page: "This app collects no data. No ads, no tracking, no accounts, no internet."
- App Store Connect still asks for a Privacy Policy URL: host a one-page policy with the same text on a site Mike controls. The app never links to it.

## Review notes (paste into "Notes for the reviewer")
> Stitch & Snuggle is a Kids Category app for ages 3–7. Children play without reading: every instruction is spoken and shown with icons and an animated hand.
>
> **Parental gate:** the grown-up area (purchase, restore, settings, privacy, credits) is behind a gate: the lock icon in the top-right corner of the title screen, and the small lock badge in the Studio. To pass it, tap the three numbers from smallest to largest, then press and hold the lock for 1 second. A wrong order quietly shows new numbers.
>
> The only purchase is the non-consumable "Unlock Everything" (`unlock_all`), offered only inside the gated parent area. Locked items in the child flow show a padlock only: no prices, buy buttons or prompts.
>
> The app collects no data, makes no network requests of its own, shows no ads and has no external links.

## Release checklist
- [ ] Real bundle id in `app.json`; `npx eas init` links the EAS project (adds `extra.eas.projectId` and `owner`).
- [ ] Paid Apps agreement, tax and banking active.
- [ ] `unlock_all` created at the $5.99 tier, with its review screenshot.
- [ ] Sandbox purchase and restore tested on the development build.
- [ ] Bella clips recorded (`assets/audio/VOICE_IDS.md`), then `npm run gen:voice`.
- [ ] Final app icon (`assets/art/ui/app_icon.png`), then `npm run gen:icon`.
- [ ] Screenshots: Parent → Plush test screen → Screenshots (5 staged scenes) on a 13" iPad and a 6.9" iPhone.
- [ ] TestFlight build smooth on iPad and iPhone; Reduce Motion calms the animations.
- [ ] USPTO search for "Stitch & Snuggle" in Classes 9 and 41 (see `docs/DECISIONS_FOR_MIKE.md`).
