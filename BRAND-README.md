# EINFÄDLER brand pack

Art and identity for the app. **To install it, follow [`ART-KEY.md`](ART-KEY.md):** it maps every image to the exact screen in `app.js`, with paste-in snippets. Steps 1 to 4 (drop the folder in, a few lines in `index.html`, one theme stylesheet, one helper block) make the whole app on-brand.

## The look in one line

A clean betting-app interface in night navy, gate red and race blue, with the personality carried by 80s ski-poster caricatures. The interface stays plain so the art can be loud. One accent colour per screen.

## What's in the folder

| Path | What it is |
|---|---|
| `ART-KEY.md` | **The install guide and location sheet.** Start here |
| `FEATURES.md` | Build spec for the Outsider pick and Double points, with their art placed |
| `einfaedler-theme.css` | Re-skins the app by overriding the variables `styles.css` already uses (light and dark), loads the fonts, swaps in the snowflake loader, and adds the small art classes the key uses |
| `site.webmanifest` | App name and icons for "Add to Home Screen" |
| `logo/` | The wordmark: `-light` (navy letters, light backgrounds) and `-dark` (white letters, navy backgrounds), SVG plus 2400 px PNG |
| `app-icons/` | The red GS gate with the white E: favicons, Apple touch icon, PWA 192 / 512 / maskable, 1024 store icon, Android layers, white notification icon, splash |
| `icons/` | 27 illustrated icons, 256 px transparent WebP |
| `characters/` | The cast of seven, transparent WebP |
| `moments/` | 17 transparent WebPs, one per app state |
| `scenes/` | One header per discipline (day races), the night hero for sign-in, and a bonus ski cross scene |
| `share/` | `og-image.jpg` (WhatsApp / iMessage link preview) and five 1080 × 1350 share-card templates, plus filled-in `examples/` |
| `loader/` | The snowflake loader (light and dark) |
| `fonts/` | Barlow Condensed (SIL Open Font License), bundled so headlines and share cards never depend on a font CDN |

## The cast

| File | Character | Discipline / job |
|---|---|---|
| `einfaedler` | The Einfädler, the mascot, bib 13 | sign-in, link preview, perfect score, zero points |
| `speed-merchant` | Mullet, gold chain, bib 5 | downhill |
| `rocket` | Start-gate speed demon, bib 9 | super-G |
| `angle-queen` | Laid over at a crazy angle, bib 1 | giant slalom, top of the table |
| `technician` | Tape measure, round shades, bib 2 | slalom, champagne |
| `underdog` | Bib 47, borrowed suit | combined, parallel |
| `coach` | Beanie, visor shades, gate bundle | picks locked, under review, asleep |

## Rules of thumb

- Home's Next Race card shows **that race's discipline header**. The night hero (the Einfädler) is only for sign-in and the link preview.
- **Perfect Score is only for the exact podium.** Any other points use Champagne. Every badge shows the real number.
- Scenes sit **above** text, never behind it.
- One red action per screen. Blue means "you" or "picked".

The Outsider pick and Double points aren't built yet: `FEATURES.md` is the spec. Other spare art is listed at the end of `ART-KEY.md`.
