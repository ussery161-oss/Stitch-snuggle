# Credits — Stitch & Snuggle
Every art and audio file in `assets/` is free for commercial use and is listed here. All art is original, project-owned and code-drawn (no third-party art, fonts or AI).

## Sources
| Asset | Author | License | Source |
|---|---|---|---|
| Art set r01 (round Bear/Bunny, tools, 6 fabrics, wall charm) | Art Director for Mike U (DesMacApps) | Original, project-owned, free for commercial use; no third-party art, fonts or AI | Code-drawn (CairoSVG, NumPy); art/_src/gen_r01.py |
| Art set r02 (eyes, mouths, damage, fabrics, 17 accessories, UI, stickers, owners) | Art Director for Mike U (DesMacApps) | Original, project-owned, free for commercial use; no third-party art, fonts or AI | Code-drawn; gen_r02_plush.py, gen_r02_rest.py |
| Art set r03 (27 reframed bases, clinic/recovery/showcase scenes; replaces the r01/r02 bases) | Art Director for Mike U (DesMacApps) | Original, project-owned, free for commercial use; no AI | Code-drawn; gen_r03_plush.py, gen_r03_scenes.py |
| Voice: Kokoro-82M v1.0 (hexgrad), voice af_bella — renders every `audio/lines` clip | hexgrad (https://huggingface.co/hexgrad/Kokoro-82M) | Apache License 2.0 (code and weights); the rendered clips are our own output | https://github.com/hexgrad/kokoro |
| Kokoro-82M training data named in its model card (attribution) | Koniwa `tnc`; SIWIS French speech synthesis database | CC BY 3.0 (Koniwa); CC BY 4.0 (SIWIS) | https://huggingface.co/hexgrad/Kokoro-82M |

## Art files by folder
Every file under each folder below comes from the set named. `__tests__/artManifest.test.ts` fails if an art file is not covered by a row here.

| Folder | Set |
|---|---|
| `art/plush/` | r03 |
| `art/ui/scenes/` | r03 |
| `art/tools/` | r01 |
| `art/ui/decor/` | r01 |
| `art/fabrics/` | r01 + r02 |
| `art/faces/` | r02 |
| `art/damage/` | r02 |
| `art/accessories/` | r02 |
| `art/ui/icons/` | r02 |
| `art/ui/owners/` | r02 |
| `art/ui/stickers/` | r02 |
| `art/ui/basket.png` | r02 |

## App icon and launch image
| Folder | Source |
|---|---|
| `app/` | Placeholder composited in code (`npm run gen:icon`) from the r02/r03 Bear art above; replaced by `art/ui/app_icon.png` when the Art Director delivers it |

## Audio files by folder
| Folder | Source |
|---|---|
| `audio/lines/` | Kokoro-82M af_bella (rendered in-house) |
