/* Podium League · front end
   Plain JS, no build step. Talks to Supabase with the anon key; row-level
   security in the database decides what each person can see and change. */
(function () {
  "use strict";
  const C = window.PL_CONFIG;
  const sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

  const $ = (s, el = document) => el.querySelector(s);
  const view = $("#view"), tabs = $("#tabs"), who = $("#who"), whoName = $("#who-name"), whoRank = $("#who-rank");

  const state = { session: null, profile: null, athletes: null, leaderboard: null, countdownTimer: null };

  // ---------- utilities ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DISC = { DH: "Downhill", SG: "Super-G", GS: "Giant slalom", SL: "Slalom", AC: "Combined", TDC: "Team combined", PAR: "Parallel", PGS: "Parallel GS", PSL: "Parallel SL" };
  const discName = (d) => DISC[d] || d;
  const genderName = (g) => (g === "M" ? "Men" : g === "W" ? "Women" : g);
  const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "time TBC";
  const fmtDateTime = (ts) => ts ? new Date(ts).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "time TBC";
  function countdown(ts) {
    if (!ts) return "time TBC";
    let s = Math.max(0, Math.floor((new Date(ts) - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  const isOpen = (r) => ["scheduled", "postponed"].includes(r.status) && (!r.start_time_utc || new Date(r.start_time_utc) > Date.now());
  let toastTimer;
  function toast(msg, bad = false) {
    const t = $("#toast"); t.textContent = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
  }
  function stopCountdowns() { clearInterval(state.countdownTimer); state.countdownTimer = null; }
  function startCountdowns() {
    stopCountdowns();
    const tick = () => document.querySelectorAll("[data-countdown]").forEach((el) => (el.textContent = countdown(el.dataset.countdown)));
    tick(); state.countdownTimer = setInterval(tick, 1000);
  }
  function athleteName(code) { const a = state.athletes?.find((x) => x.fis_code === code); return a ? a.name : code; }
  function lastName(code) { const n = athleteName(code); const parts = n.split(" "); return parts.length > 1 ? parts.slice(1).join(" ") : n; }

  // ---------- skins ----------
  function applySkin() {
    const today = new Date().toISOString().slice(0, 10);
    const skin = (C.SKINS || []).find((s) => s.from <= today && today <= s.to);
    const root = document.documentElement;
    ["--slate", "--accent", "--accent-ink", "--pale"].forEach((v) => root.style.removeProperty(v));
    if (skin) Object.entries(skin.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    state.skin = skin || null;
    $('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue("--slate").trim() || "#2B3A55";
  }

  // ---------- data ----------
  async function loadProfile() {
    if (!state.session) { state.profile = null; return; }
    const { data } = await sb.from("profiles").select("*").eq("id", state.session.user.id).maybeSingle();
    state.profile = data;
  }
  async function loadAthletes() {
    if (state.athletes) return state.athletes;
    const { data } = await sb.from("athletes").select("fis_code,name,nation,gender,active").order("name");
    state.athletes = data || [];
    return state.athletes;
  }
  async function loadLeaderboard() {
    const { data } = await sb.from("leaderboard").select("*");
    state.leaderboard = data || [];
    return state.leaderboard;
  }
  async function loadRaces(filter) {
    let q = sb.from("races").select("*").eq("season", C.SEASON).order("race_date").order("start_time_utc");
    if (filter) q = filter(q);
    const { data } = await q; return data || [];
  }
  function myRank(kind = "combined_points") {
    if (!state.leaderboard || !state.profile) return "";
    const sorted = [...state.leaderboard].sort((a, b) => b[kind] - a[kind]);
    const i = sorted.findIndex((r) => r.user_id === state.profile.id);
    return i < 0 ? "" : ordinal(i + 1);
  }
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) === 4 ? 0 : n % 10] || "th");

  // ---------- router ----------
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [page, arg] = hash.split("/");
    stopCountdowns();
    if (!state.session) return renderAuth(page === "signup" ? "signup" : "signin");
    if (!state.profile || state.profile.status !== "approved") {
      if (page === "me") return renderMe();
      return renderPending();
    }
    tabs.hidden = false;
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === (page || "home")));
    if (page === "race" && arg) return renderRace(arg);
    if (page === "table") return renderTable(arg);
    if (page === "me") return renderMe();
    if (page === "member" && arg) return renderMember(arg);
    if (page === "admin") return renderAdmin();
    return renderHome();
  }
  window.addEventListener("hashchange", route);

  function setHeader() {
    who.hidden = !state.profile;
    if (state.profile) { whoName.textContent = state.profile.display_name; whoRank.textContent = myRank(); }
    $("#tab-admin").hidden = !state.profile?.is_admin;
  }

  // ---------- auth ----------
  function renderAuth(mode) {
    tabs.hidden = true; who.hidden = true;
    const signup = mode === "signup";
    view.innerHTML = `
      <section class="card slate">
        <h1>${esc(C.LEAGUE_NAME)}</h1>
        <p class="muted">Alpine World Cup ${C.SEASON - 1}/${String(C.SEASON).slice(2)} · podium predictions</p>
      </section>
      <h2>${signup ? "Create your account" : "Sign in"}</h2>
      <form id="auth">
        ${signup ? `<div class="field"><label for="f-name">Display name</label><input class="input" id="f-name" required minlength="2" maxlength="30" autocomplete="nickname"><div class="hint">This is what shows on the leaderboard.</div></div>` : ""}
        <div class="field"><label for="f-email">Email</label><input class="input" id="f-email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="f-pw">Password</label><input class="input" id="f-pw" type="password" required minlength="8" autocomplete="${signup ? "new-password" : "current-password"}">${signup ? '<div class="hint">At least 8 characters.</div>' : ""}</div>
        <div class="error" id="auth-err"></div>
        <button class="btn block" type="submit" id="auth-btn">${signup ? "Sign up" : "Sign in"}</button>
      </form>
      ${signup ? `<div class="card"><p><b>Entry is ${esc(C.BUY_IN)}.</b> After you sign up, pay ${esc(C.PAY_TO)} and your account will be approved. You can't pick until then.</p></div>` : ""}
      <p class="center muted">${signup ? 'Already in? <a href="#/signin"><b>Sign in</b></a>' : 'New here? <a href="#/signup"><b>Create an account</b></a> · <a href="#" id="forgot"><b>Forgot password</b></a>'}</p>`;
    $("#auth").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#auth-btn"), err = $("#auth-err"); btn.disabled = true; err.textContent = "";
      const email = $("#f-email").value.trim(), password = $("#f-pw").value;
      let res;
      if (signup) res = await sb.auth.signUp({ email, password, options: { data: { display_name: $("#f-name").value.trim() } } });
      else res = await sb.auth.signInWithPassword({ email, password });
      btn.disabled = false;
      if (res.error) { err.textContent = res.error.message; return; }
      if (signup && !res.data.session) {
        view.innerHTML = `<section class="card slate"><h2>Check your email</h2><p class="muted">We've sent a confirmation link to ${esc(email)}. Tap it, then come back and sign in.</p></section><p class="center"><a href="#/signin"><b>Back to sign in</b></a></p>`;
      }
    });
    $("#forgot")?.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = $("#f-email").value.trim();
      if (!email) { $("#auth-err").textContent = "Type your email first, then tap Forgot password."; return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      toast(error ? error.message : "Reset link sent. Check your email.", !!error);
    });
  }

  function renderPending() {
    tabs.hidden = true;
    const p = state.profile;
    const banned = p?.status === "banned";
    view.innerHTML = `
      <section class="section">
        <span class="pill ${banned ? "danger" : "warn"}">${banned ? "Account closed" : "Awaiting approval"}</span>
        <h1>${banned ? "This account has been closed." : `You're signed up. Now pay ${esc(C.PAY_TO)}.`}</h1>
        ${banned ? "" : `<p>Once ${esc(C.PAY_TO)} has received your ${esc(C.BUY_IN)} your account will be approved here and you can start picking.</p>`}
      </section>
      ${banned ? "" : `<div class="list">
        <div class="head">How to pay</div>
        <div class="row"><span class="muted">Amount</span><b>${esc(C.BUY_IN)}</b></div>
        <div class="row"><span class="muted">Method</span><b>${esc(C.PAY_METHOD)}</b></div>
        <div class="row"><span class="muted">Reference</span><b>${esc(p?.display_name || "")}</b></div>
        <div class="muted tiny">${esc(C.PAY_REFERENCE_HINT)}</div>
      </div>`}
      <button class="btn ghost block" id="recheck">Check again</button>
      <p class="center muted tiny">Signed in as ${esc(p?.email || state.session.user.email)} · <a href="#" id="signout"><b>Sign out</b></a></p>`;
    $("#recheck").addEventListener("click", async () => { await loadProfile(); setHeader(); route(); if (state.profile?.status !== "approved") toast("Not approved yet."); });
    $("#signout").addEventListener("click", (e) => { e.preventDefault(); sb.auth.signOut(); });
  }

  // ---------- home ----------
  async function renderHome() {
    view.innerHTML = '<div class="spinner"></div>';
    const [races, lb, pickRows] = await Promise.all([
      loadRaces(), loadLeaderboard(),
      sb.from("picks").select("race_id").eq("user_id", state.profile.id).then((r) => r.data || [])
    ]);
    await loadAthletes();
    setHeader();
    const mine = new Set(pickRows.map((r) => r.race_id));
    const open = races.filter(isOpen);
    const nextM = open.find((r) => r.gender === "M"), nextW = open.find((r) => r.gender === "W");
    const next = [nextM, nextW].filter(Boolean).sort((a, b) => new Date(a.start_time_utc || a.race_date) - new Date(b.start_time_utc || b.race_date));
    const finished = races.filter((r) => r.status === "finished").reverse();
    const last = finished[0];
    const upcoming = open.filter((r) => !next.includes(r)).slice(0, 5);

    let lastHtml = "";
    if (last) {
      const { data } = await sb.from("race_scores").select("points,display_name").eq("race_id", last.id);
      const mineScore = (data || []).find((d) => d.display_name === state.profile.display_name);
      const best = (data || []).reduce((m, d) => (d.points > (m?.points ?? -1) ? d : m), null);
      lastHtml = `<section class="section"><div class="eyebrow">Last result</div>
        <a class="card link row" href="#/race/${last.id}">
          <div class="stack"><h3>${esc(last.venue)} · ${esc(last.discipline)} · ${genderName(last.gender)}</h3>
          <span class="muted small">${best ? `Best this race: ${best.points} (${esc(best.display_name)})` : "Scored"}</span></div>
          <span class="big-score">${mineScore ? "+" + mineScore.points : "—"}</span></a></section>`;
    }
    const counts = await Promise.all(next.map((r) => sb.rpc("pick_count", { r: r.id }).then((x) => x.data ?? null)));
    const members = lb.length;

    view.innerHTML = `
      ${state.skin ? `<div class="skin-note">${esc(state.skin.name)}</div>` : ""}
      ${next.length === 0 ? `<section class="card slate"><h2>No races open</h2><p class="muted">The next race will appear here when the calendar updates.</p></section>` : ""}
      ${next.map((r, i) => {
        const picked = mine.has(r.id);
        const first = i === 0;
        return `<section class="section">
          <div class="eyebrow">${first ? "Next race" : "Also open"} · locks in <span data-countdown="${r.start_time_utc || ""}"></span></div>
          <a class="card ${first ? "slate" : ""} link" href="#/race/${r.id}">
            <div class="row"><div class="stack">
              <h${first ? 1 : 3}>${esc(r.venue)}</h${first ? 1 : 3}>
              <span class="${first ? "" : "small"}"><b>${discName(r.discipline)} · ${genderName(r.gender)}</b></span>
              <span class="muted small">${fmtDate(r.race_date)} · run 1 at ${fmtTime(r.start_time_utc)}</span>
            </div>
            <span class="pill ${picked ? "accent" : "score"}">${picked ? "Pick in ✓" : "No pick yet"}</span></div>
            ${first ? `<div class="row divider"><span class="muted small">${counts[i] != null ? `${counts[i]} of ${members} have picked` : ""}</span><span class="btn accent sm">${picked ? "Change pick" : "Make your pick"}</span></div>` : ""}
          </a></section>`;
      }).join("")}
      ${lastHtml}
      ${upcoming.length ? `<section class="section"><div class="eyebrow">Coming up</div><div class="list">
        ${upcoming.map((r) => `<a class="row" href="#/race/${r.id}"><span>${esc(r.venue)} · ${esc(r.discipline)} · ${genderName(r.gender)}</span><span class="muted small">${fmtDate(r.race_date)}</span></a>`).join("")}
      </div></section>` : ""}
      <section class="section"><div class="eyebrow">Top three · combined</div><div class="list">
        ${[...lb].sort((a, b) => b.combined_points - a.combined_points).slice(0, 3).map((m, i) =>
          `<a class="row" href="#/member/${m.user_id}"><span style="display:flex;align-items:center;gap:10px"><span class="rank ${["gold", "silver", "bronze"][i]}">${i + 1}</span>${esc(m.display_name)}</span><span class="num" style="font-size:20px">${m.combined_points}</span></a>`).join("") || '<div class="muted">No scores yet.</div>'}
      </div></section>`;
    startCountdowns();
  }

  // ---------- race: pick or result ----------
  async function renderRace(id) {
    view.innerHTML = '<div class="spinner"></div>';
    const { data: race } = await sb.from("races").select("*").eq("id", id).maybeSingle();
    if (!race) { view.innerHTML = '<p class="muted">Race not found.</p>'; return; }
    await loadAthletes();
    const head = (sub) => `<a href="#/" class="muted small">‹ Races</a>
      <section class="section"><h1>${esc(race.venue)} · ${discName(race.discipline)}</h1>
      <p class="muted">${genderName(race.gender)} · ${fmtDate(race.race_date)} · ${sub}</p></section>`;

    if (isOpen(race)) return renderPickForm(race, head);
    if (race.status === "cancelled") { view.innerHTML = head("cancelled") + '<div class="card"><p>This race was cancelled. No points are scored.</p></div>'; return; }

    const [{ data: results }, { data: scores }] = await Promise.all([
      sb.from("results").select("*").eq("race_id", id).order("position"),
      sb.from("race_scores").select("*").eq("race_id", id)
    ]);
    const pos = (n) => (results || []).filter((r) => r.position === n).map((r) => athleteName(r.athlete_fis_code)).join(" / ");
    const mine = (scores || []).find((s) => s.user_id === state.profile.id);
    const tierText = { exact_podium: "Exact podium → 10 points.", right_three: "Right three skiers, wrong order → 6 points.", per_skier: "2 per exact position, 1 per skier on the podium elsewhere.", pending: "Waiting for the official result." };
    const sorted = (scores || []).sort((a, b) => (b.points ?? -1) - (a.points ?? -1) || a.display_name.localeCompare(b.display_name));
    const hasResult = (results || []).length > 0;

    view.innerHTML = head(hasResult ? "official result" : (race.status === "finished" ? "result pending" : "picks locked")) +
      (hasResult ? `<div class="podium">
          <div><span class="name">${esc(pos(2))}</span><div class="step s2">2</div></div>
          <div><span class="name">${esc(pos(1))}</span><div class="step s1">1</div></div>
          <div><span class="name">${esc(pos(3))}</span><div class="step s3">3</div></div></div>`
        : `<div class="card"><p>${race.status === "finished" ? "The race has finished; the official podium will appear here shortly." : "Picks are locked. The result will appear here after the race."}</p></div>`) +
      (mine ? `<section class="card" style="border-left:4px solid var(--accent)">
          <div class="row"><span class="eyebrow">Your pick</span><span class="big-score">${mine.points != null ? "+" + mine.points : ""}</span></div>
          ${[["p1", "v1"], ["p2", "v2"], ["p3", "v3"]].map(([p, v], i) => `<div class="row"><span><span class="muted">${i + 1} </span>${esc(athleteName(mine[p]))}</span><span class="verdict ${mine[v] || ""}">${mine[v] === "exact" ? "exact" : mine[v] === "podium" ? "on podium" : mine[v] === "miss" ? "miss" : ""}</span></div>`).join("")}
          <div class="muted tiny divider">${tierText[mine.tier] || ""}</div></section>`
        : `<div class="card"><p class="muted">You didn't pick for this race.</p></div>`) +
      `<section class="section"><div class="eyebrow">Everyone's picks · ${sorted.length}</div><div class="list">
        ${sorted.map((s) => `<a class="row" href="#/member/${s.user_id}" ${s.user_id === state.profile.id ? 'style="background:var(--line)"' : ""}>
          <div class="stack"><b>${esc(s.display_name)}${s.user_id === state.profile.id ? ' <span class="muted" style="font-weight:400">(you)</span>' : ""}</b>
          <span class="muted tiny">${[s.p1, s.p2, s.p3].map(lastName).map(esc).join(" · ")}</span></div>
          <span class="num" style="font-size:22px;color:${s.points != null ? "var(--score)" : "var(--muted)"}">${s.points ?? "–"}</span></a>`).join("") || '<div class="muted">No picks were made.</div>'}
      </div></section>`;
  }

  async function renderPickForm(race, head) {
    const { data: existing } = await sb.from("picks").select("*").eq("race_id", race.id).eq("user_id", state.profile.id).maybeSingle();
    const { data: startList } = await sb.from("start_list_entries").select("athlete_fis_code,bib").eq("race_id", race.id);
    const bibs = new Map((startList || []).map((s) => [s.athlete_fis_code, s.bib]));
    const pool = state.athletes.filter((a) => a.gender === race.gender && (bibs.size === 0 ? a.active : bibs.has(a.fis_code)))
      .map((a) => ({ ...a, bib: bibs.get(a.fis_code) }));
    const picks = [existing?.p1 || null, existing?.p2 || null, existing?.p3 || null];
    const count = await sb.rpc("pick_count", { r: race.id }).then((x) => x.data);

    view.innerHTML = head(`run 1 at ${fmtTime(race.start_time_utc)} · locks in <b data-countdown="${race.start_time_utc || ""}"></b>`) + `
      <p class="muted small">Pick who finishes 1st, 2nd and 3rd. Change it as often as you like until the race starts.${count != null ? ` ${count} of ${state.leaderboard?.length ?? "the"} members have picked.` : ""}</p>
      <div id="slots" style="display:flex;flex-direction:column;gap:10px"></div>
      <p class="hint">Names come from ${bibs.size ? "the official FIS start list" : "the World Cup athlete list"}, so your pick always matches the result. Ties count both skiers as correct.</p>
      <div class="error" id="pick-err"></div>
      <button class="btn block" id="save" disabled>Save pick</button>
      <p class="center muted tiny">Your pick stays hidden from the group until the race locks.</p>`;
    startCountdowns();

    const slotsEl = $("#slots");
    function draw() {
      slotsEl.innerHTML = picks.map((code, i) => {
        if (code) {
          const a = pool.find((x) => x.fis_code === code) || state.athletes.find((x) => x.fis_code === code) || { name: code };
          return `<div class="slot"><div class="pos p${i + 1}">${i + 1}</div><div class="chosen"><b>${esc(a.name)}</b><span class="muted tiny">${esc(a.nation || "")}${a.bib ? " · bib " + a.bib : ""}</span></div>
            <button type="button" class="icon-btn" data-clear="${i}" aria-label="Clear ${ordinal(i + 1)} pick"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
        }
        return `<div class="slot" data-slot="${i}"><div class="pos p${i + 1}">${i + 1}</div><label class="sr-only" for="pick-${i}" hidden>${ordinal(i + 1)} place</label><input id="pick-${i}" type="text" placeholder="Type a name" autocomplete="off"><div class="sugg" hidden></div></div>`;
      }).join("");
      $("#save").disabled = !(picks[0] && picks[1] && picks[2]);
    }
    slotsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-clear]"); if (b) { picks[b.dataset.clear] = null; draw(); } });
    slotsEl.addEventListener("input", (e) => {
      const input = e.target.closest("input"); if (!input) return;
      const slot = input.closest("[data-slot]"), i = +slot.dataset.slot, sugg = $(".sugg", slot);
      const q = input.value.trim().toLowerCase();
      slot.classList.add("active");
      if (q.length < 2) { sugg.hidden = true; return; }
      const taken = new Set(picks.filter(Boolean));
      const hits = pool.filter((a) => !taken.has(a.fis_code) && a.name.toLowerCase().includes(q)).slice(0, 6);
      sugg.innerHTML = hits.map((a) => `<button type="button" data-pick="${esc(a.fis_code)}">${esc(a.name)}<span>${esc(a.nation || "")}${a.bib ? " · bib " + a.bib : ""}</span></button>`).join("") || `<button type="button" disabled>No match<span>try the surname</span></button>`;
      sugg.hidden = false;
      sugg.onclick = (ev) => { const b = ev.target.closest("[data-pick]"); if (b) { picks[i] = b.dataset.pick; draw(); const n = slotsEl.querySelector("input"); n?.focus(); } };
    });
    slotsEl.addEventListener("focusout", (e) => { const slot = e.target.closest("[data-slot]"); if (slot) setTimeout(() => { if (!slot.contains(document.activeElement)) { $(".sugg", slot).hidden = true; slot.classList.remove("active"); } }, 150); });
    $("#save").addEventListener("click", async () => {
      const btn = $("#save"); btn.disabled = true; $("#pick-err").textContent = "";
      const row = { user_id: state.profile.id, race_id: race.id, p1: picks[0], p2: picks[1], p3: picks[2] };
      const { error } = await sb.from("picks").upsert(row, { onConflict: "user_id,race_id" });
      btn.disabled = false;
      if (error) { $("#pick-err").textContent = /row-level security/i.test(error.message) ? "Couldn't save: the race may have locked, or your account isn't approved." : error.message; return; }
      toast("Pick saved"); location.hash = "#/";
    });
    draw();
  }

  // ---------- leaderboard ----------
  async function renderTable(kind) {
    kind = ["men", "women", "combined"].includes(kind) ? kind : "combined";
    view.innerHTML = '<div class="spinner"></div>';
    const lb = await loadLeaderboard(); setHeader();
    const key = { men: "men_points", women: "women_points", combined: "combined_points" }[kind];
    const played = { men: "men_races", women: "women_races", combined: "races_played" }[kind];
    const rows = [...lb].sort((a, b) => b[key] - a[key] || a.display_name.localeCompare(b.display_name));
    const totalRaces = Math.max(0, ...rows.map((r) => r[played]));
    view.innerHTML = `<h1>Leaderboard</h1>
      <div class="seg" role="tablist">${["men", "women", "combined"].map((k) => `<button role="tab" aria-selected="${k === kind}" data-kind="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>
      <div class="row muted tiny"><span>After ${totalRaces} race${totalRaces === 1 ? "" : "s"} · ${rows.length} members</span><span>Season ${C.SEASON - 1}/${String(C.SEASON).slice(2)}</span></div>
      <div class="list">
        <div class="tbl head" style="padding-bottom:6px"><span>#</span><span>Name</span><span class="r">Races</span><span class="r">Best</span><span class="r">Pts</span></div>
        ${rows.map((m, i) => `<a class="tbl ${m.user_id === state.profile.id ? "me" : ""}" href="#/member/${m.user_id}">
          <span class="num" style="font-size:18px;color:${["var(--gold)", "#8A94A6", "#C98A4B"][i] || "var(--muted)"}">${i + 1}</span>
          <span style="font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.display_name)}${m.user_id === state.profile.id ? ' <span class="muted" style="font-weight:400">(you)</span>' : ""}</span>
          <span class="r muted small">${m[played]}</span><span class="r muted small">${m.best_race}</span><span class="r num" style="font-size:20px">${m[key]}</span></a>`).join("")}
      </div>
      <p class="muted tiny">Tap a name for their race-by-race picks. Combined adds men's and women's points together.</p>`;
    $(".seg").addEventListener("click", (e) => { const b = e.target.closest("[data-kind]"); if (b) location.hash = "#/table/" + b.dataset.kind; });
  }

  async function renderMember(uid) {
    view.innerHTML = '<div class="spinner"></div>';
    await loadAthletes();
    const [{ data: prof }, { data: rows }] = await Promise.all([
      sb.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
      sb.from("race_scores").select("*").eq("user_id", uid).order("race_date", { ascending: false })
    ]);
    const scored = (rows || []).filter((r) => r.points != null);
    view.innerHTML = `<a href="#/table" class="muted small">‹ Leaderboard</a>
      <h1>${esc(prof?.display_name || "Member")}</h1>
      <div class="grid3">
        <div class="stat"><span class="num">${scored.reduce((s, r) => s + r.points, 0)}</span><span class="eyebrow">Points</span></div>
        <div class="stat"><span class="num">${scored.length}</span><span class="eyebrow">Races</span></div>
        <div class="stat"><span class="num">${Math.max(0, ...scored.map((r) => r.points))}</span><span class="eyebrow">Best</span></div>
      </div>
      <div class="list">${(rows || []).map((r) => `<a class="row" href="#/race/${r.race_id}"><div class="stack"><b>${esc(r.venue)} · ${esc(r.discipline)} · ${genderName(r.gender)}</b><span class="muted tiny">${[r.p1, r.p2, r.p3].map(lastName).map(esc).join(" · ")}</span></div><span class="num" style="font-size:20px;color:${r.points != null ? "var(--score)" : "var(--muted)"}">${r.points ?? "–"}</span></a>`).join("") || '<div class="muted">No picks visible yet. Picks show once each race locks.</div>'}</div>`;
  }

  // ---------- me ----------
  async function renderMe() {
    const p = state.profile;
    view.innerHTML = `<h1>${esc(p?.display_name || "You")}</h1>
      <div class="card"><div class="row"><span class="muted">Email</span><b>${esc(p?.email || state.session.user.email)}</b></div>
        <div class="row"><span class="muted">Status</span><span class="pill ${p?.status === "approved" ? "good" : "warn"}">${esc(p?.status || "pending")}</span></div>
        ${p?.paid_at ? `<div class="row"><span class="muted">Paid</span><b>${new Date(p.paid_at).toLocaleDateString()}</b></div>` : ""}</div>
      <form id="name-form"><div class="field"><label for="dn">Display name</label><input class="input" id="dn" value="${esc(p?.display_name || "")}" minlength="2" maxlength="30" required></div><button class="btn ghost" type="submit">Save name</button></form>
      <form id="pw-form"><div class="field"><label for="npw">New password</label><input class="input" id="npw" type="password" minlength="8" required autocomplete="new-password"></div><button class="btn ghost" type="submit">Change password</button></form>
      <button class="btn danger block" id="signout">Sign out</button>`;
    $("#name-form").addEventListener("submit", async (e) => { e.preventDefault(); const { error } = await sb.from("profiles").update({ display_name: $("#dn").value.trim() }).eq("id", p.id); if (error) return toast(error.message, true); await loadProfile(); setHeader(); toast("Name saved"); });
    $("#pw-form").addEventListener("submit", async (e) => { e.preventDefault(); const { error } = await sb.auth.updateUser({ password: $("#npw").value }); toast(error ? error.message : "Password changed", !!error); if (!error) $("#npw").value = ""; });
    $("#signout").addEventListener("click", () => sb.auth.signOut());
  }

  // ---------- admin ----------
  async function renderAdmin() {
    if (!state.profile?.is_admin) { location.hash = "#/"; return; }
    view.innerHTML = '<div class="spinner"></div>';
    const [{ data: members }, races, { data: log }] = await Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      loadRaces(), sb.from("sync_log").select("*").order("started_at", { ascending: false }).limit(1)
    ]);
    await loadAthletes();
    const pending = (members || []).filter((m) => m.status === "pending");
    const approved = (members || []).filter((m) => m.status === "approved");
    const next = races.filter(isOpen)[0];
    const missing = next ? (await sb.rpc("admin_missing_picks", { r: next.id })).data || [] : [];
    const last = log?.[0];
    const finishedNoResult = races.filter((r) => r.status === "finished");
    const pastNoResult = races.filter((r) => r.start_time_utc && new Date(r.start_time_utc) < Date.now() && r.status !== "finished" && r.status !== "cancelled");

    view.innerHTML = `<div class="row"><h1>Admin</h1><span class="pill" style="background:var(--gold);color:#14213D">Only you</span></div>
      <div class="grid3">
        <div class="stat"><span class="num" style="color:var(--score)">${pending.length}</span><span class="eyebrow">Pending</span></div>
        <div class="stat"><span class="num">${approved.length}</span><span class="eyebrow">Approved</span></div>
        <div class="stat"><span class="num" style="color:var(--warn)">${missing.length}</span><span class="eyebrow">No pick yet</span></div>
      </div>
      <section class="section"><div class="eyebrow">Waiting for approval</div><div class="list" id="pending">
        ${pending.map((m) => `<div class="row"><div class="stack"><b>${esc(m.display_name)}</b><span class="muted tiny">${esc(m.email)} · ${new Date(m.created_at).toLocaleDateString()}</span></div>
          <div style="display:flex;gap:6px"><button class="btn sm" data-approve="${m.id}">Approve</button><button class="btn ghost sm" data-ban="${m.id}" aria-label="Decline">✕</button></div></div>`).join("") || '<div class="muted">Nobody waiting.</div>'}
      </div></section>
      ${next ? `<section class="section"><div class="eyebrow">${esc(next.venue)} ${esc(next.discipline)} · ${genderName(next.gender)} · missing picks</div><div class="card"><div class="chips">${missing.map((m) => `<span class="pill danger">${esc(m.display_name)}</span>`).join("") || '<span class="muted">Everyone has picked.</span>'}</div></div></section>` : ""}
      <section class="section"><div class="eyebrow">FIS sync</div><div class="card">
        <div class="row"><span class="muted">Last run</span><b>${last ? `${fmtDateTime(last.started_at)} · ${last.ok ? "OK" : "Failed"}` : "Never"}</b></div>
        ${last?.message ? `<div class="muted tiny">${esc(last.message)}</div>` : ""}
        <div class="row"><span class="muted">Calendar</span><b>${races.length} races · ${races.filter((r) => r.status === "cancelled").length} cancelled</b></div>
        <div class="row"><span class="muted">Results</span><b>${finishedNoResult.length} scored${pastNoResult.length ? ` · ${pastNoResult.length} awaiting result` : ""}</b></div>
        <div style="display:flex;gap:8px"><button class="btn ghost sm" id="sync">Sync now</button><button class="btn ghost sm" id="fix-toggle">Fix a result</button></div>
        <form id="fix" hidden>
          <div class="field"><label for="fix-race">Race</label><select class="input" id="fix-race">${races.filter((r) => r.status !== "cancelled").map((r) => `<option value="${r.id}" data-gender="${r.gender}">${fmtDate(r.race_date)} · ${esc(r.venue)} ${esc(r.discipline)} ${genderName(r.gender)}</option>`).join("")}</select></div>
          ${[1, 2, 3].map((n) => `<div class="field"><label for="fix-p${n}">${ordinal(n)} (FIS code; separate a tie with a comma)</label><input class="input" id="fix-p${n}" required list="ath-list" placeholder="e.g. 512182"></div>`).join("")}
          <datalist id="ath-list">${state.athletes.map((a) => `<option value="${esc(a.fis_code)}">${esc(a.name)}</option>`).join("")}</datalist>
          <button class="btn" type="submit">Save result</button>
          <div class="hint">This replaces the FIS result for that race and stops the sync overwriting it.</div>
        </form></div></section>
      <section class="section"><div class="eyebrow">Members · ${approved.length}</div><div class="list">
        ${approved.map((m) => `<div class="row"><div class="stack"><b>${esc(m.display_name)}${m.is_admin ? ' <span class="pill ghost">admin</span>' : ""}</b><span class="muted tiny">${esc(m.email)}</span></div>
          <div style="display:flex;gap:6px;align-items:center"><span class="pill ${m.paid_at ? "good" : "warn"}">${m.paid_at ? "Paid" : "Unpaid"}</span>${m.paid_at ? "" : `<button class="btn ghost sm" data-paid="${m.id}">Mark paid</button>`}${m.id === state.profile.id ? "" : `<button class="btn ghost sm" data-ban="${m.id}" aria-label="Remove">✕</button>`}</div></div>`).join("")}
      </div></section>`;

    view.addEventListener("click", async (e) => {
      const ap = e.target.closest("[data-approve]"), bn = e.target.closest("[data-ban]"), pd = e.target.closest("[data-paid]");
      if (ap) { const { error } = await sb.rpc("admin_approve", { target: ap.dataset.approve, mark_paid: true }); toast(error ? error.message : "Approved", !!error); if (!error) renderAdmin(); }
      if (bn) { if (!bn.dataset.confirm) { bn.dataset.confirm = "1"; bn.textContent = "Sure?"; return; } const { error } = await sb.rpc("admin_set_status", { target: bn.dataset.ban, new_status: "banned" }); toast(error ? error.message : "Removed", !!error); if (!error) renderAdmin(); }
      if (pd) { const { error } = await sb.from("profiles").update({ paid_at: new Date().toISOString() }).eq("id", pd.dataset.paid); toast(error ? error.message : "Marked paid", !!error); if (!error) renderAdmin(); }
    }, { once: true });
    $("#sync").addEventListener("click", async () => {
      const b = $("#sync"); b.disabled = true; b.textContent = "Syncing…";
      const { data, error } = await sb.functions.invoke("sync-fis", { body: {} });
      b.disabled = false; b.textContent = "Sync now";
      toast(error ? "Sync failed: " + error.message : (data?.message || "Sync complete"), !!error);
      if (!error) renderAdmin();
    });
    $("#fix-toggle").addEventListener("click", () => { $("#fix").hidden = !$("#fix").hidden; });
    $("#fix").addEventListener("submit", async (e) => {
      e.preventDefault();
      const split = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await sb.rpc("admin_override_result", { r: $("#fix-race").value, pos1: split($("#fix-p1").value), pos2: split($("#fix-p2").value), pos3: split($("#fix-p3").value) });
      toast(error ? error.message : "Result saved", !!error); if (!error) renderAdmin();
    });
  }

  // ---------- boot ----------
  async function boot() {
    applySkin();
    const { data } = await sb.auth.getSession();
    state.session = data.session;
    await loadProfile(); setHeader(); route();
    sb.auth.onAuthStateChange(async (event, session) => {
      state.session = session; state.leaderboard = null;
      if (event === "PASSWORD_RECOVERY") { location.hash = "#/me"; }
      await loadProfile(); setHeader(); route();
    });
  }
  boot();
})();
