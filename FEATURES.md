# Feature spec: Outsider pick and Double points

Two features the art pack already has art for. This is written to be handed straight to whoever builds them (you or your Claude). It assumes the app as it stands at commit `374903e`: plain JS in `app.js`, data in Supabase, and scoring done in the database (the `race_scores` view, which returns `points`, `tier`, `v1`–`v3` per pick).

The database schema isn't in this repo, so the SQL below is a sketch: match it to your real table, view and function names. Keep the scoring in the database, where it lives now, so every screen and the leaderboard agree.

Build Outsider first, then Double points. Double points multiplies whatever the race scores, including the outsider.

---

## 1. Outsider pick

### What it is

On top of the podium, each player can pick **one outsider**: a skier starting with **bib 31 or higher**, plus the **finishing place** they think that skier will get (1 to 30). It rewards knowing the field beyond the favourites. The bib-47 Underdog is the character for it.

### Rules

| Rule | Detail |
|---|---|
| Eligible skiers | Bib **31 or higher** on that race's start list (`start_list_entries.bib`), first run. Bib 30 is not eligible. |
| When it opens | Only once the start list is published (there's no bib to check before that). Until then, show "Outsider opens when the start list is out." |
| Optional | Players can skip it. A half-filled outsider (skier but no place, or place but no skier) is rejected on save with a clear message. |
| Overlap | The outsider **may** also be one of your podium picks (it scores both). |
| Locks | Same time as the podium pick (run 1 start). Hidden from others until then, like the podium. |
| Scoring | **Exact place: 2 points.** **Within 3 places: 1 point**, and only if the skier finishes inside the top 30. Otherwise 0. The two awards don't stack (max 2). |
| Non-finishers | DNF, DNS, DSQ, or outside the top 30 score 0. |
| Ties | If the outsider ties for a place, their place is the shared position (tied 12th = 12th). |
| Max per race | Podium 10 + outsider 2 = **12**. |
| Perfect Podium | Still means the **exact podium** (`tier = exact_podium`), whatever the outsider did. |
| Start-list changes | If a bib changes after a player picked (corrected start list), don't silently re-score: mark the outsider "under review" and let an admin decide. |

Examples (outsider picked: bib 41, predicted 12th):

| Finishes | Points |
|---|---|
| 12th | 2 (exact) |
| 9th or 15th | 1 (within 3) |
| 16th | 0 (4 away) |
| 29th, predicted 30th | 1 |
| 31st, predicted 30th | 0 (outside the top 30) |
| DNF | 0 |

### Data changes (sketch)

```sql
-- picks: the outsider and their predicted place
alter table picks add column outsider text references athletes(fis_code);
alter table picks add column outsider_pos smallint check (outsider_pos between 1 and 30);
alter table picks add constraint outsider_both_or_neither
  check ((outsider is null) = (outsider_pos is null));

-- results must hold the full top 30, not just the podium:
-- check that sync-fis stores positions 1–30 and that admin_override_result keeps them.
```

**Validation on save** (in the RLS policy or a trigger on `picks`): the outsider's bib on that race's start list is `>= 31`.

**Scoring:** extend whatever builds `race_scores` so each row also returns:

| Column | Meaning |
|---|---|
| `outsider_points` | 0, 1 or 2 |
| `outsider_verdict` | `exact`, `near`, `miss`, `review` or null (no outsider) |
| `points` | podium points **+** `outsider_points` (the total, so the leaderboard keeps working) |

### Screens (`app.js`)

| Where | Change | Art |
|---|---|---|
| `renderPickForm()` | A fourth slot under the three podium slots: "Outsider (bib 31+)", a name search limited to bib ≥ 31 from `start_list_entries`, plus a place picker 1–30. Show "+2 exact · +1 within 3" under it. | `icons/outsider.webp` on the slot |
| `renderRace()`, Your pick card | An "Outsider" row: name, bib, predicted vs actual place, and `+2` / `+1` / `0`. | `icons/outsider.webp` on the row |
| `renderRace()`, Your pick card | If `outsider_verdict === "exact"`, show the **Outsider Hit** moment (the Underdog with "the flip" trophy) beside the result art. | `moments/outsider-hit.webp` |
| `renderRace()`, Everyone's picks | Add the outsider surname with a small `icons/outsider.webp` after the podium names. | |
| Home, Last result | If you hit the outsider exactly, a small "Outsider hit +2" line under the score. | `icons/outsider.webp` |
| How it works (sign-up step 1) | Add one line: "Pick an outsider too (bib 31+) and their finishing place: 2 for exact, 1 within three places." | |

Paste-in helper for the Your pick card (uses the helpers from `ART-KEY.md`):

```js
function efOutsider(s) {
  if (!s?.outsider) return "";
  const pts = s.outsider_points ?? null;
  return `<div class="row"><span>${efIcon("outsider")} <b>${esc(athleteName(s.outsider))}</b> <span class="muted small">picked ${ordinal(s.outsider_pos)}</span></span>
    <span class="verdict ${s.outsider_verdict === "exact" ? "exact" : s.outsider_verdict === "near" ? "podium" : "miss"}">${pts == null ? "" : pts > 0 ? "+" + pts : "0"}</span></div>
    ${s.outsider_verdict === "exact" ? efMoment("outsider-hit", true) : ""}`;
}
```

### Acceptance checks

- Bib 30 can't be picked as the outsider; bib 31 can.
- Outsider predicted 12th: finishes 12th = 2, 15th = 1, 16th = 0, DNF = 0.
- Predicted 30th, finishes 31st = 0.
- An exact podium plus an exact outsider = 12 and still shows Perfect Podium.
- Saving a skier without a place (or a place without a skier) is refused with a message.
- Other players can't see your outsider until the race locks.

---

## 2. Double points

### What it is

An admin can mark a race as **×2** (or ×3 for something special, like Kitzbühel or the Finals). Everything that race scores, podium plus outsider, is multiplied. It suits the event weeks you already have in `SKINS`.

### Rules

| Rule | Detail |
|---|---|
| Who sets it | Admins only, from the Admin screen. |
| When | Before the race locks. Once run 1 starts the multiplier is frozen (refuse changes, so nobody can boost a race after seeing the result). |
| Values | 1 (normal), 2 or 3. |
| What it multiplies | The race total: podium + outsider. Applied once. |
| Max | ×2: podium 20 + outsider 4 = **24**. ×3: 36. |
| Perfect Podium | Still the exact podium. It just shows the bigger number (+20 or +24). |
| Cancelled races | Score 0 whatever the multiplier. |
| Leaderboard | Totals and "Best" use the multiplied points. |
| Announce it | Players should know before they pick: show it everywhere the race appears. |

### Data changes (sketch)

```sql
alter table races add column multiplier smallint not null default 1 check (multiplier in (1, 2, 3));
-- in race_scores:  points = (podium_points + outsider_points) * races.multiplier
-- also return base_points (before the multiplier) so the screen can show "6 × 2 = 12"
-- an admin-only RPC to set it, refusing once start_time_utc <= now():
--   admin_set_multiplier(r uuid, m smallint)
```

### Screens (`app.js`)

| Where | Change | Art |
|---|---|---|
| Home, Next race and Also open cards | A "×2" pill next to the discipline line. | `icons/multiplier.webp` in the pill |
| Home, Coming up list | "×2" after the race name. | `icons/multiplier.webp` |
| `renderRace()` header (`head()`) | "×2 double points" under the title. | `icons/multiplier.webp` |
| `renderPickForm()` | A line above the slots: "Double points: everything you score here counts twice." | `icons/multiplier.webp` |
| `renderRace()`, Your pick card | The badge shows the multiplied total; underneath, "6 × 2". | |
| `renderPastRaces()` | "×2" next to the race name. | `icons/multiplier.webp` |
| `renderAdmin()` | Per upcoming race: a ×1 / ×2 / ×3 toggle, disabled once the race has locked. | `icons/multiplier.webp` |

```js
const efMult = (r) => r.multiplier > 1 ? ` <span class="pill score">${efIcon("multiplier")}×${r.multiplier}</span>` : "";
// e.g. in renderHome:  <b>${discName(r.discipline)} · ${genderName(r.gender)}</b>${efMult(r)}
```

### Acceptance checks

- Exact podium in a ×2 race = 20 and shows Perfect Podium with +20.
- Exact podium + exact outsider in a ×2 race = 24.
- 6 points in a ×2 race shows +12, with "6 × 2".
- The multiplier can't be changed after the race locks.
- A cancelled ×2 race scores 0.
- Leaderboard totals include the multiplied points.

---

## Share cards with these features

The share templates in `share/` already cope: **all of them, including Perfect Podium, have a blank badge the app fills with the real score**, so +12, +20 or +24 just work. When `outsider_verdict === "exact"`, add "+ OUTSIDER HIT" to the race line on the card.
