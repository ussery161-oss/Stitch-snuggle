# Milestones — Stitch & Snuggle
Repo: `ussery161-oss/stitch-snuggle` (private). Mike wants few prompts, so M0–M9 are delivered as **3 Claude prompts**: **P1** = M0–M3 (scaffold, renderer, full clinic loop), **P2** = M4–M7 (Studio, stickers, content, demo/unlock, parent area, credits), **P3** = M8–M9 (IAP dev build, TestFlight, submission polish). Each: tests green, `npx tsc --noEmit` clean, `npx expo export --platform ios` OK, tested on iPad via Expo Go on TheDeskTop.

| # | Milestone | Content | Exit test (Mike on iPad) | Art needed |
|---|---|---|---|---|
| M0 | Scaffold | Expo SDK 57 app, Skia/Reanimated/RNGH, docs/ imported, lint/test/CI-free checks (worklet guard, reserved names, no-network), title screen, parental gate port, placeholder art | App opens in Expo Go, gate works | none (placeholders) |
| M1 | Plush renderer | Layered part compositor (mask+pattern tint, shade, highlight, line), anchors, Bear+Bunny with placeholder parts, idle wiggle | Bear and Bunny render with color/pattern swaps | AR-1 Bear/Bunny parts (placeholders OK) |
| M2 | Clinic loop v1: Stitch + Wash | Arrival, triage, Stitch tracing, Wash (erase mask), Go home, voice fallback | Fix Bear: stitch rip, wash mud, owner hug | AR-3 tools, AR-4 damage overlays |
| M3 | Patch, Re-stuff, Brush, Dress | Remaining care steps, outfit anchors | Full care loop on Bear & Bunny | AR-5 fabrics, AR-6 outfits |
| M4 | Design Studio | Base/body/colors/patterns/eyes/accessories, voiced names, save 24 creations, "Play doctor" | Build a plushie and heal it | AR-1/2 full parts for demo bases |
| M5 | Sticker book + progress | Sticker earn/place, save schema v1, toy shelf | Earn and place stickers, survives relaunch | AR-7 stickers |
| M6b | Showcase Room | 8 display spots + podium from r03 scenes.json, local save (schema v2) | Place/swap/podium survives relaunch | r03 scene_showcase |
| M6 | Content pass | Remaining 6 presets & bases, owners, stories, Bella clips | All 8 plushies playable | AR-1 full set, voice lines |
| M7 | Demo/unlock + parent area + credits | Lock rules, mocked IAP, purchase/restore UI behind gate, settings, credits with verse, privacy page | Demo locks, gate, credits text | padlock, parent UI |
| M8 | Dev build + real IAP + TestFlight | expo-iap (or StoreKit wrapper), EAS dev build, sandbox purchase, TestFlight | Sandbox purchase/restore works on iPad | app icon, screenshots |
| M9 | Polish & submit | Perf, reduce-motion, Kids Category review checklist, App Store listing, age band 5 & under / 6–8 | Submitted | store art |
| U1+ | Free updates | Seasonal plushies | — | per plushie |

Order notes: M1 before any care step (everything draws through the compositor). Art can trail code: every milestone ships with placeholders generated in code (colored shapes) so Claude is never blocked.
Builds: EAS free plan is shared with Popsy (15/month) — M8 needs ~3 builds; Mike decides timing.

## Prompt map (run in order; Claude Code in the repo: "Read and do docs/prompts/P#_….md")
- **P1** = M0–M3 + recovery room/charm, using final r03 art already in `assets/art/`.
- **P2** = M4–M7 + Showcase Room (M6b), preset rules, credits merge (r01+r02+r03), mocked unlock flag.
- **P3** = M8–M9: real $5.99 `unlock_all` IAP behind the parent gate, eas.json, TestFlight/submit notes.
Art: final (r03 approved Oct 22, 2026) and committed — no art blockers. Blockers for P3 builds only: DesMacApps D-U-N-S → Apple Developer org account → real bundle id (placeholder `com.desmacapps.stitchsnuggle`); Mike signs Paid Apps agreement + tax/banking; ~3 of 15 shared EAS builds, timing Mike's call.
