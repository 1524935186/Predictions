# EINFÄDLER art key: where everything goes

This is the install guide for the brand pack, written against this repo as it stands (`index.html`, `styles.css`, `app.js` at commit `374903e`). Every screen is named by its render function in `app.js`, with the exact art and a paste-in snippet. Nothing here changes how the app works; it only adds images and swaps colours and fonts.

Do steps 1 to 4 and the app is fully on-brand. Steps 5 and 6 are the extras (art moments and share cards).

---

## 1. Drop in the folder

Put the `brand/` folder in the repo root, next to `index.html`. All paths below are relative to that.

## 2. `index.html`: head, header and tab bar

**In `<head>`**, change the title and add these lines after the existing `styles.css` link:

```html
<title>EINFÄDLER</title>
<link rel="stylesheet" href="brand/einfaedler-theme.css">
<link rel="icon" type="image/png" sizes="32x32" href="brand/app-icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="brand/app-icons/favicon-48.png">
<link rel="apple-touch-icon" href="brand/app-icons/apple-touch-icon.png">
<link rel="manifest" href="brand/site.webmanifest">
<meta property="og:title" content="EINFÄDLER">
<meta property="og:description" content="World Cup ski predictions. Pick the podium. Beat your mates.">
<meta property="og:image" content="https://YOUR-SITE-URL/brand/share/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
```

`og:image` has to be the full web address of the live site, or WhatsApp won't show the preview. Replace `YOUR-SITE-URL`.

**Header.** Replace the text logo:

```html
<a href="#/" class="brand" id="brand">Predictions</a>
```
with
```html
<a href="#/" class="brand" id="brand"><picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/logo/einfaedler-wordmark-dark.svg">
  <img src="brand/logo/einfaedler-wordmark-light.svg" alt="EINFÄDLER">
</picture></a>
```

**Tab bar.** In `<nav class="tabs">`, replace each `<svg …>…</svg>` with an image. The labels stay as they are.

| Tab (`data-tab`) | Replace the `<svg>` with |
|---|---|
| `home` (Races) | `<img src="brand/icons/races.webp" alt="">` |
| `results` (Past) | `<img src="brand/icons/final.webp" alt="">` |
| `table` (Table) | `<img src="brand/icons/standings.webp" alt="">` |
| `me` (Me) | `<img src="brand/icons/profile.webp" alt="">` |
| `admin` (Admin) | `<img src="brand/icons/admin.webp" alt="">` |

## 3. The theme

`brand/einfaedler-theme.css` (linked in step 2) overrides the variables `styles.css` already uses, in light and dark mode:

| Variable | Was | Now | Where it shows |
|---|---|---|---|
| `--slate` | slate blue | night navy `#060B16` | the "one strong block": next-race card, active tab, toasts |
| `--accent` | sky blue | race blue `#2F6FE0` | "Pick in ✓", selected slot, your row in the table |
| `--score` | orange | gate red `#E3172B` | points, "No pick yet", Live now |
| `.btn.accent` | sky blue | gate red | the main "Make your pick" button: one red action per screen |
| fonts | Outfit / Source Sans 3 | Barlow Condensed (italic headlines) / Inter | everywhere |

It also swaps `.spinner` for the snowflake loader, reusing your existing `spin` keyframes and reduced-motion rule. Your `SKINS` in `config.js` still work, because they set variables inline, which wins.

## 4. Helpers for `app.js`

Paste these once, near the top of `app.js` under the other utilities (after `lastName`). Every snippet below uses them.

```js
// ---------- EINFÄDLER art ----------
const EF = "brand/";
const EF_SCENE = { DH: "downhill", SG: "super-g", GS: "giant-slalom", SL: "slalom", AC: "combined", TDC: "combined", PAR: "parallel", PGS: "parallel", PSL: "parallel" };
const efScene = (d) => `${EF}scenes/header-${EF_SCENE[d] || "giant-slalom"}.jpg`;
const efBanner = (d, page = false) => `<div class="ef-banner${page ? " page" : ""}"><img src="${efScene(d)}" alt=""></div>`;
const efMoment = (name, small = false) => `<img class="ef-moment${small ? " sm" : ""}" src="${EF}moments/${name}.webp" alt="">`;
const efIcon = (name) => `<img class="ef-icon" src="${EF}icons/${name}.webp" alt="">`;
// Your-pick result art: Perfect Score only for the exact podium, Champagne for any other points, Zero Points for 0. Badges always show the real total.
function efResult(s) {
  if (!s || s.points == null) return { art: "under-review", badge: "" };
  if (s.tier === "exact_podium") return { art: "perfect-score", badge: `<span class="ef-badge perfect">+${s.points}</span>` };
  if (s.points > 0) return { art: "champagne", badge: `<span class="ef-badge">+${s.points}</span>` };
  return { art: "zero-points", badge: `<span class="ef-badge zero">0</span>` };
}
```

---

## 5. Screen by screen

### Sign in / sign up: `renderAuth()`

| Where | Art |
|---|---|
| Top `card slate` | Hero banner + wordmark, in place of the league name heading |
| "Check your email" card (after sign-up) | `welcome` moment |

```js
// replace:  <section class="card slate"><h1>${esc(C.LEAGUE_NAME)}</h1>
<section class="card slate">
  <div class="ef-banner"><img src="brand/scenes/hero-night.jpg" alt="" style="object-position:60% 100%"></div>
  <img src="brand/logo/einfaedler-wordmark-dark.svg" alt="EINFÄDLER" style="height:44px;width:auto;align-self:flex-start">
  <h2>${esc(C.LEAGUE_NAME)}</h2>
```
```js
// "Check your email": add as the first thing inside that card
${efMoment("welcome")}
```

### Awaiting approval / account closed: `renderPending()`

| State | Art |
|---|---|
| Awaiting approval | `under-review` moment (the Coach checking with binoculars), above the `<h1>` |
| Account closed (`banned`) | `entries-closed` moment |

```js
// first line inside <section class="section">
${efMoment(banned ? "entries-closed" : "under-review")}
```

### Home: `renderHome()`

| Element | Art | How |
|---|---|---|
| **Next race** card (`first`, the `card slate`) | **Discipline header for that race** (Slalom = the Technician, GS = the Angle Queen, and so on) | `${first ? efBanner(r.discipline) : ""}` as the first thing inside the `<a class="card …">` |
| Pill "Pick in ✓" | `accepted` icon | prepend `${efIcon("accepted")}` |
| Pill "No pick yet" | `closing-soon` icon | prepend `${efIcon("closing-soon")}` |
| Pill "Pay to pick" | `locked` icon | prepend `${efIcon("locked")}` |
| "Live now" eyebrow | `live` icon | replace the 8 px dot `<span>` with `${efIcon("live")}` |
| "No races open" card | `asleep` moment (the Coach asleep on the gates) | `${efMoment("asleep")}` first inside the card |
| "Awaiting payment" card | `locked` icon | before the `<b>` |
| Last result card | result art + score badge | see below |
| "Top three" eyebrow | `leader` icon | prepend `${efIcon("leader")}` |

**Last result.** Add `tier` to the select, then swap the big number for the art and badge:

```js
const { data } = await sb.from("race_scores").select("points,tier,display_name").eq("race_id", last.id);
// …
const res = efResult(mineScore);
// replace:  <span class="big-score">${mineScore ? "+" + mineScore.points : "—"}</span>
<span class="ef-result">${mineScore ? efMoment(res.art, true) + res.badge : '<span class="big-score">—</span>'}</span>
```

The night hero (`scenes/hero-night.jpg`, the Einfädler under floodlights) is **not** used on Home. Home always shows the next race's own discipline. The hero is for sign-in and the link preview.

### Race page: `renderRace(id)` and `renderPickForm()`

**Header.** In `head()`, add the discipline banner under the back link:

```js
const head = (sub) => `<a href="#/" class="muted small">‹ Races</a>
  ${efBanner(race.discipline, true)}
  <section class="section">…`;
```

| State (in code) | Art |
|---|---|
| Not in the competition (`!inComp`) | `locked` icon before the `<h3>` |
| Pick form, **existing pick** (`existing`) | `locked-in` moment (the Coach planting a gate) above `#slots`, with "Your pick is in. Change it until run 1." |
| Pick form, race `postponed` | `weather-hold` moment above `#slots` (the Speed Merchant in the start hut) |
| Save fails because the race locked (the row-level-security error) | `entries-closed` moment in `#pick-err` |
| `race.status === "cancelled"` | `cancelled` moment in the card |
| Locked, no result yet | `under-review` moment in the card |
| **Your pick** card | `efResult(mine)`: Perfect Score + red badge for the exact podium, Champagne + blue **+N** for any other points, Zero Points + grey **0** for none |
| "You didn't pick for this race" | `asleep` moment |

```js
// renderPickForm: after the "Pick who finishes…" paragraph
${existing ? `<div class="card row">${efMoment("locked-in", true)}<b>Your pick is in. Change it until run 1.</b></div>` : ""}
${race.status === "postponed" ? `<div class="card row">${efMoment("weather-hold", true)}<b>Postponed. Picks stay open.</b></div>` : ""}

// save error branch
$("#pick-err").innerHTML = /row-level security/i.test(error.message)
  ? efMoment("entries-closed", true) + "Too late: the race has locked."
  : esc(error.message);

// your-pick card: replace the big-score span
const res = efResult(mine);
<div class="row"><span class="eyebrow">Your pick</span>${res.badge}</div>
${efMoment(res.art)}
```

**Easter egg.** In the name search inside `renderPickForm`, anyone who types "ski cross" gets the Coach and the Einfädler crying with laughter:

```js
// in the slotsEl "input" handler, right after: const q = input.value.trim().toLowerCase();
if (/ski ?cross|skicross/.test(q)) { sugg.innerHTML = `<div style="padding:10px;text-align:center">${efMoment("in-stitches")}<b>We don't predict ski cross.</b></div>`; sugg.hidden = false; return; }
```

### Leaderboard: `renderTable(kind)`

| Element | Art |
|---|---|
| You're first on this table | `league-leader` moment above the list, with "Top of the table" and the share button (step 6) |
| Pot card | `standings` icon before the eyebrow |

```js
${rows[0]?.user_id === state.profile.id ? `<div class="card slate row">${efMoment("league-leader", true)}<div class="stack"><h3>Top of the table</h3><span class="muted small">${rows[0][key]} points</span></div></div>` : ""}
```

### Past races: `renderPastRaces()`

| Element | Art |
|---|---|
| "Cancelled" pill | `cancelled` icon inside the pill |
| "Result pending" pill | `provisional` icon (hourglass) |
| "Perfect" stat | `perfect-score` small moment above the number, when it's above 0 |

### Member, Me and Admin

| Screen | Element | Art |
|---|---|---|
| `renderMember` | Name heading | `leader` icon if they're top of the combined table |
| `renderMe` | "approved" status pill | `accepted` icon |
| `renderAdmin` | Heading | `admin` icon |
| `renderAdmin` | "No pick yet" stat | `closing-soon` icon |
| `renderAdmin` | FIS sync card | `live` icon in the eyebrow |

### App-wide: offline and errors

Paste into `boot()`, before `route()`:

```js
const efNotice = (art, msg) => { view.insertAdjacentHTML("afterbegin", `<div class="card row" id="ef-notice">${efMoment(art, true)}<b>${msg}</b></div>`); };
window.addEventListener("offline", () => efNotice("no-signal", "No signal. Showing what we had."));
window.addEventListener("online", () => { $("#ef-notice")?.remove(); route(); });
window.addEventListener("unhandledrejection", () => efNotice("something-broke", "Something broke. Pull down to try again."));
```

---

## 6. Share cards for WhatsApp

`brand/share/` has five 1080 × 1350 templates. The headline and art are baked in; the app writes the player's details on top. `share/examples/` shows each one filled in.

| Template | Use when | App writes |
|---|---|---|
| `result-perfect.png` | Your pick's `tier === "exact_podium"`. **Only** for this | race line, name, score in the red badge (10, or more with an outsider / double points) |
| `result-points.png` | Any other points above 0 | race line, name, score in the blue badge |
| `result-zero.png` | 0 points | race line, name |
| `standings-leader.png` | You're top of a leaderboard | "After N races · Combined", name, points in the badge |
| `invite.png` | Inviting someone to the league | league name |

**Text zones** (pixels on the 1080 × 1350 card; Barlow Condensed, italic, uppercase):

| Zone | Position | Style |
|---|---|---|
| Race line | x 100, baseline 1112 | 800 weight, 38 px, `#93A3BC` |
| Name | x 100, baseline 1196 | 800 weight, 54 px, `#F2F5FA` |
| Score (in the badge) | centred on x 870, baseline 1218 | 900 weight, 104 px, white |
| League name (invite) | x 100, baseline 1140 | 800 weight, 54 px, `#F2F5FA` |

Drop-in sharer (the fonts come from the theme stylesheet):

```js
async function efShare(template, { race = "", name = "", score = "" }) {
  const img = new Image(); img.src = `${EF}share/${template}.png`; await img.decode();
  await document.fonts.load('italic 900 104px "Barlow Condensed"');
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const t = (s, x, y, size, weight, color, align = "left") => { g.font = `italic ${weight} ${size}px "Barlow Condensed"`; g.fillStyle = color; g.textAlign = align; g.fillText(String(s).toUpperCase(), x, y); };
  if (template === "invite") t(name, 100, 1140, 54, 800, "#F2F5FA");
  else { t(race, 100, 1112, 38, 800, "#93A3BC"); t(name, 100, 1196, 54, 800, "#F2F5FA"); if (score !== "") t(score, 870, 1218, 104, 900, "#FFFFFF", "center"); }
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  const file = new File([blob], "einfaedler.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file] });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}
```

Example, on the race page's "Your pick" card:

```js
const tpl = mine.tier === "exact_podium" ? "result-perfect" : mine.points > 0 ? "result-points" : "result-zero";
// button: <button class="btn ghost sm" id="ef-share">Share</button>
$("#ef-share")?.addEventListener("click", () => efShare(tpl, {
  race: `${race.venue} · ${discName(race.discipline)} · ${genderName(race.gender)}`,
  name: state.profile.display_name,
  score: tpl === "result-zero" ? "" : "+" + mine.points
}));
```

The link preview (`share/og-image.jpg`, 1200 × 630, the Einfädler) needs no code beyond the `og:image` tag in step 2.

---

## 7. Outsider pick and Double points

These two features aren't in the app yet. **[`FEATURES.md`](FEATURES.md) is the full build spec** (rules, scoring, data changes, screens and acceptance checks), with the art already placed:

| Feature | Art |
|---|---|
| Outsider pick (bib 31+, predict their place: 2 exact, 1 within three) | `icons/outsider`, `moments/outsider-hit` (the Underdog with "the flip" trophy), `characters/underdog` |
| Double points (admin marks a race ×2 or ×3) | `icons/multiplier` |

## Spare art (in the pack, not wired in yet)

| Art | Made for |
|---|---|
| `icons/wildcard` | a bonus-question round, if you ever add one |
| `moments/yard-sale`, `icons/dnf` | when your picked skier DNFs (needs DNF data from the FIS sync) |
| `moments/closing-soon` (full size) | a "picks close in under an hour" nudge |
| `icons/notifications` (cowbell), `icons/settings`, `icons/league`, `icons/draft`, `icons/open`, `icons/weather`, `icons/offline`, `icons/podium-pick`, `icons/home`, `icons/under-review` | spare UI icons |
| `characters/*` (all seven) | onboarding, an About page, or as avatars |
| `scenes/scene-ski-cross.jpg` | About / marketing |

## 8. Ground rules

- **One accent per screen.** Red is the main action; blue means "you" or "picked".
- **Scenes sit above text, never behind it.** A big headline over the art lands on the character's face.
- **Perfect Score is only for the exact podium.** Everything else uses Champagne. Badges always show the real number (it can be 12, 20 or 24 once outsiders and double points exist); never bake numbers into the art.
- Characters and moments are transparent, so they work on light and dark backgrounds. The exception is the `offline` icon, whose thin navy signal bars vanish on navy, so give it a light chip or use the `no-signal` moment instead.
