import { STATIONS, ROTATION, DEMO_PEOPLE } from "./data.js";
import { store } from "./storage.js";
import { CONFIG, IS_SHAREPOINT } from "./config.js";
import { initAuth, signIn, signOut as msSignOut, currentUser } from "./auth.js";

// Sandbox facilitator PIN. In SharePoint mode, facilitators are the people with access to the codes list.
const FACILITATOR_PIN = CONFIG.facilitatorPin;
const SESSION_KEY = "ilx-session";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let session = null;               // { personId, name, facilitator }
let passport = { stamps: {}, answers: {} };
let config = { cohort: "", salt: "", hashes: {} };
let codes = {};
let fresh = null;

/* ---------- helpers ---------- */
async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function makeCode() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; let s = "";
  crypto.getRandomValues(new Uint32Array(4)).forEach(n => s += a[n % a.length]);
  return s;
}
function saveSession() { try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {} }
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function fmt(iso, opts = { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) {
  return iso ? new Date(iso).toLocaleString("en-GB", opts) : "";
}
function notice(msg) { const n = $("#notice"); if (!n) return; if (!msg) { n.hidden = true; return; } n.textContent = msg; n.hidden = false; }
function showPanel(id) { $$(".panel").forEach(p => p.classList.toggle("show", p.id === id)); }

/* ---------- stamp graphic ---------- */
function stampSVG(st, at) {
  const date = new Date(at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const id = "arc-" + st.id;
  return `<svg class="stamp ${fresh === st.id ? "fresh" : ""}" style="--rot:${ROTATION[st.id]}deg" viewBox="0 0 120 120" role="img" aria-label="Stamped: ${esc(st.title)}">
    <defs><path id="${id}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
    <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="3"/>
    <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text font-family="Poppins, Arial, sans-serif" font-size="9.5" font-weight="700" letter-spacing="2" fill="currentColor"><textPath href="#${id}">PWS ACADEMY · ILX · ${esc(st.title.toUpperCase())} ·</textPath></text>
    <text x="60" y="58" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="800" fill="currentColor">${st.no}</text>
    <text x="60" y="73" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="7.5" font-weight="700" fill="currentColor">${date}</text>
  </svg>`;
}

/* ---------- passport ---------- */
function renderHolder() {
  const done = STATIONS.filter(s => passport.stamps[s.id]).length;
  $("#holder").textContent = session?.name || "";
  $("#count").textContent = `${done} / ${STATIONS.length}`;
  $("#ringfg").style.strokeDashoffset = String(213.6 * (1 - done / STATIONS.length));
  $("#cohortline").textContent = config.cohort ? `stamps · ${config.cohort}` : "stamps collected";
  return done;
}

function renderPages() {
  const done = renderHolder();
  $("#pages").innerHTML = STATIONS.map(st => {
    const s = passport.stamps[st.id];
    return `<button class="visa" data-id="${st.id}" aria-label="${esc(st.title)}, ${s ? "stamped" : "not stamped yet"}">
      <div class="no">${st.no}<span></span></div>
      <h3>${esc(st.title)}</h3><div class="time">${st.time}</div>
      ${s ? stampSVG(st, s.at) : `<div class="slot" aria-hidden="true"></div><div class="state">Tap to complete</div>`}
    </button>`;
  }).join("");
  $$(".visa").forEach(b => b.onclick = () => openSheet(b.dataset.id));
  const cert = $("#cert"); const was = cert.classList.contains("show");
  const all = done === STATIONS.length;
  cert.classList.toggle("show", all);
  $("#certname").textContent = session?.name || "";
  if (all && !was && fresh) burst();
  fresh = null;
}

function burst() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = $("#confetti"); c.innerHTML = "";
  for (let i = 0; i < 70; i++) {
    const el = document.createElement("i");
    el.style.left = Math.random() * 100 + "%"; el.style.animationDelay = Math.random() * 0.8 + "s";
    c.appendChild(el);
  }
  setTimeout(() => $("#cert").scrollIntoView({ behavior: "smooth", block: "center" }), 300);
}

function openSheet(id) {
  const st = STATIONS.find(s => s.id === id);
  const ans = passport.answers[id] || {};
  const stamped = !!passport.stamps[id];
  const needCode = !!config.hashes[id];
  $("#sheet").innerHTML = `
    <header><div><div class="kicker">Module ${st.no} · ${st.time}</div><h2 id="sheettitle">${esc(st.title)}</h2></div>
      <button class="x" id="close" aria-label="Close">×</button></header>
    <p class="lede">${esc(st.lede)}</p>
    ${st.fields.map(f => `<div class="field"><label for="f-${f.k}">${esc(f.label)}</label>${
      f.type === "area" ? `<textarea id="f-${f.k}" rows="2">${esc(ans[f.k])}</textarea>` : `<input id="f-${f.k}" value="${esc(ans[f.k])}">`}</div>`).join("")}
    ${stamped
      ? `<div class="msg">Stamped ${fmt(passport.stamps[id].at)}. You can still update your answers.</div><div class="row"><button class="btn" id="saveonly">Save answers</button></div>`
      : `<div class="codebox"><div class="field" style="margin:0"><label for="code">${needCode ? "Stamp code from your facilitator" : "Codes aren’t set yet: tap Stamp to practise"}</label>
           <input id="code" maxlength="6" autocomplete="off" ${needCode ? "" : "disabled"}></div><button class="btn" id="stampbtn">Stamp</button></div>
         <div class="row" style="margin-top:12px"><button class="btn ghost" id="saveonly">Save answers for now</button></div>`}
    <div class="msg" id="sheetmsg" role="status"></div>`;
  $("#backdrop").classList.add("open");
  $("#close").onclick = closeSheet;
  const collect = () => Object.fromEntries(st.fields.map(f => [f.k, $("#f-" + f.k).value.trim()]));
  $("#saveonly").onclick = async () => {
    passport.answers[id] = collect(); await persist();
    const m = $("#sheetmsg"); m.className = "msg"; m.textContent = "Saved.";
  };
  const sb = $("#stampbtn");
  if (sb) sb.onclick = async () => {
    const a = collect(); const m = $("#sheetmsg");
    if (st.fields.some(f => !a[f.k])) { m.className = "msg err"; m.textContent = "Complete every answer first."; return; }
    if (needCode) {
      const code = ($("#code").value || "").trim().toUpperCase();
      if (!code) { m.className = "msg err"; m.textContent = "Enter the code your facilitator shows."; return; }
      if (await sha(config.salt + "|" + id + "|" + code) !== config.hashes[id]) {
        m.className = "msg err"; m.textContent = "That code doesn’t match. Check with your facilitator."; return;
      }
    }
    passport.answers[id] = a;
    passport.stamps[id] = { at: new Date().toISOString() };
    fresh = id; closeSheet(); renderPages(); await persist();
  };
  setTimeout(() => $("#sheet textarea, #sheet input")?.focus(), 60);
}
function closeSheet() { $("#backdrop").classList.remove("open"); }

async function persist() {
  if (!session?.personId) return;
  const data = { stamps: passport.stamps, answers: passport.answers, cohort: config.cohort || "", updatedAt: new Date().toISOString() };
  try { localStorage.setItem("ilx-unsaved", JSON.stringify(data)); } catch {}
  try {
    await store.savePassport(session.personId, data);
    try { localStorage.removeItem("ilx-unsaved"); } catch {}
    notice("");
  } catch (e) {
    notice("Couldn’t save to SharePoint just now. Your answers are kept on this device; they’ll save next time you stamp or press Save.");
  }
}

/* ---------- facilitator ---------- */
function renderCodes() {
  $("#cohort").value = config.cohort || "";
  const has = Object.keys(codes).length;
  $("#codes").innerHTML = has
    ? STATIONS.map(st => `<button class="codechip" data-id="${st.id}"><small>${st.no} ${esc(st.title)}</small><b>${esc(codes[st.id] || "····")}</b></button>`).join("")
    : `<p>No codes yet. Generate them for this cohort.</p>`;
  $$(".codechip").forEach(b => b.onclick = () => {
    const st = STATIONS.find(s => s.id === b.dataset.id);
    $("#bigt").textContent = `Stamp code · ${st.no} ${st.title}`;
    $("#bigc").textContent = codes[st.id] || "";
    $("#big").classList.add("open");
  });
}

async function generateCodes() {
  const cohort = $("#cohort").value.trim() || "ILX cohort";
  const salt = makeCode() + makeCode(); const plain = {}, hashes = {};
  for (const st of STATIONS) { plain[st.id] = makeCode(); hashes[st.id] = await sha(salt + "|" + st.id + "|" + plain[st.id]); }
  await store.saveAdminCodes({ codes: plain });
  await store.saveConfig({ cohort, salt, hashes });
  codes = plain; config = { cohort, salt, hashes };
  renderCodes(); renderHolder();
  $("#genmsg").textContent = "New codes are live for this cohort.";
}

async function renderRoster() {
  const rows = await store.listPassports();
  const tb = $("#roster");
  if (!rows.length) { tb.innerHTML = `<tr><td colspan="5">No passports yet. Open one, or load the sample cohort.</td></tr>`; return rows; }
  tb.innerHTML = rows.map(r => {
    const v = r.data || {}; const p = (v.answers || {}).pws || {};
    const n = STATIONS.filter(s => v.stamps?.[s.id]).length;
    const dots = STATIONS.map(s => `<i class="${v.stamps?.[s.id] ? "on" : ""}" title="${esc(s.title)}"></i>`).join("");
    return `<tr><td><b>${esc(r.name)}</b><br><small>${n}/${STATIONS.length}</small></td><td><div class="dots">${dots}</div></td>
      <td>${esc([p.p1, p.p2, p.p3].filter(Boolean).join(" / "))}</td><td>${esc(fmt(v.updatedAt))}</td>
      <td><button class="link" data-report="${r.id}">Readiness Report</button></td></tr>`;
  }).join("");
  $$("[data-report]").forEach(b => b.onclick = () => openReport(rows.find(r => r.id === b.dataset.report)));
  return rows;
}

function openReport(r) {
  const v = r.data || {}; const a = v.answers || {};
  const n = STATIONS.filter(s => v.stamps?.[s.id]).length;
  $("#report").innerHTML = `<div class="paper">
    <div class="phead"><div class="lockup"><img src="assets/pws-logo-white.png" alt="PWS People Work Smart"><div class="div"></div><span>ACADEMY</span></div><div>ILX Readiness Report</div></div>
    <div class="pbody">
      <h2>${esc(r.name)}</h2>
      <div class="meta">${esc(v.cohort || config.cohort || "ILX cohort")} · ${n} of ${STATIONS.length} stamps · Updated ${esc(fmt(v.updatedAt))}</div>
      <div class="stamps">${STATIONS.map(s => `<span class="${v.stamps?.[s.id] ? "on" : ""}">${s.no} ${esc(s.title)}</span>`).join("")}</div>
      ${STATIONS.map(s => `<h3>${s.no} · ${esc(s.title)}</h3><dl>${s.fields.map(f => `<dt>${esc(f.label)}</dt><dd>${esc((a[s.id] || {})[f.k]) || "Not answered"}</dd>`).join("")}</dl>`).join("")}
    </div>
    <div class="pfoot"><button class="btn ghost" id="repx">Close</button><button class="btn" id="repprint">Print or save as PDF</button></div>
  </div>`;
  $("#report").classList.add("open");
  $("#repx").onclick = () => $("#report").classList.remove("open");
  $("#repprint").onclick = () => window.print();
}

async function openWall() {
  const rows = await store.listPassports();
  const notes = rows.map(r => ({ name: r.name, p: ((r.data || {}).answers || {}).pws || {} })).filter(x => x.p.p1 || x.p.p2 || x.p.p3);
  $("#walltitle").textContent = config.cohort ? `${config.cohort}: our 30-second pitches` : "Our 30-second pitches";
  $("#wallgrid").innerHTML = notes.length
    ? notes.map((x, i) => `<div class="note" style="animation-delay:${i * 80}ms"><b>${esc(x.name)}</b>
        ${x.p.p1 ? `<p>PWS helps ${esc(x.p.p1)}</p>` : ""}${x.p.p2 ? `<p>What makes us different is ${esc(x.p.p2)}</p>` : ""}${x.p.p3 ? `<p>I’m proud because ${esc(x.p.p3)}</p>` : ""}</div>`).join("")
    : `<p>No pitches yet. They appear here as people complete Module 01.</p>`;
  $("#wallview").classList.add("open");
}

async function exportCSV() {
  const rows = await store.listPassports();
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Participant", "Cohort", "Stamps", "Updated", ...STATIONS.flatMap(s => s.fields.map(f => `${s.title}: ${f.label}`))];
  const lines = [head.map(q).join(",")].concat(rows.map(r => {
    const v = r.data || {}; const a = v.answers || {};
    return [r.name, v.cohort || "", STATIONS.filter(s => v.stamps?.[s.id]).length + "/" + STATIONS.length, v.updatedAt || "",
      ...STATIONS.flatMap(s => s.fields.map(f => (a[s.id] || {})[f.k] || ""))].map(q).join(",");
  }));
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ILX-readiness-${(config.cohort || "cohort").replace(/[^a-z0-9]+/gi, "-")}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function seedCohort() {
  const sample = {
    pws: { p1: "growing family businesses build great teams", p2: "we pair people with systems and structure", p3: "my work helps a real business grow" },
    client: { c1: "learn my client’s priorities", c2: "sending clear daily updates", c3: "ask my Account Manager early" }
  };
  for (const [i, name] of DEMO_PEOPLE.entries()) {
    const p = await store.addPerson(name);
    const n = [8, 6, 4, 2][i];
    const stamps = {}, answers = {};
    STATIONS.slice(0, n).forEach((s, k) => {
      stamps[s.id] = { at: new Date(Date.now() - (8 - k) * 3600e3).toISOString() };
      answers[s.id] = sample[s.id] || Object.fromEntries(s.fields.map(f => [f.k, "Sample answer"]));
    });
    await store.savePassport(p.id, { stamps, answers, cohort: config.cohort || "Sample cohort", updatedAt: new Date().toISOString() });
  }
  await renderRoster(); renderPeople();
}

/* ---------- sign in ---------- */
async function renderPeople() {
  const people = await store.listPeople();
  $("#people").innerHTML = people.length
    ? people.map(p => `<button class="person" data-id="${p.id}" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join("")
    : `<p>No passports yet on this device.</p>`;
  $$(".person").forEach(b => b.onclick = () => enter({ personId: b.dataset.id, name: b.dataset.name, facilitator: session?.facilitator || false }));
}

async function enter(s) {
  session = s; saveSession();
  config = await store.getConfig();
  passport = (s.personId && await store.getPassport(s.personId)) || { stamps: {}, answers: {} };
  passport.stamps = passport.stamps || {}; passport.answers = passport.answers || {};
  $("#holderCard").hidden = !s.personId;
  $("#signout").hidden = false;
  $("#tabs").hidden = !s.facilitator;
  $('[data-tab="passport"]').hidden = !s.personId;
  if (s.facilitator) { codes = (await store.getAdminCodes()).codes || {}; renderCodes(); await renderRoster(); }
  if (s.personId) { renderPages(); selectTab("passport"); } else selectTab("facil");
}

function selectTab(tab) {
  $$("#tabs button").forEach(x => x.setAttribute("aria-selected", String(x.dataset.tab === tab)));
  showPanel(tab === "passport" ? "p-passport" : "p-facil");
  if (tab === "facil") renderRoster();
}

function signOut() {
  if (IS_SHAREPOINT) { msSignOut(); return; }
  session = null; try { localStorage.removeItem(SESSION_KEY); } catch {}
  $("#holderCard").hidden = true; $("#tabs").hidden = true; $("#signout").hidden = true;
  showPanel("p-signin"); renderPeople();
}

/* ---------- wiring ---------- */
$("#adapterName").textContent = store.name;
if (IS_SHAREPOINT) { const bar = document.querySelector(".sandbox-bar"); if (bar) bar.innerHTML = "Draft build · Storage: " + store.name; }
$("#addForm").onsubmit = async e => {
  e.preventDefault(); const name = $("#newName").value.trim(); if (!name) return;
  const p = await store.addPerson(name); $("#newName").value = "";
  enter({ personId: p.id, name: p.name, facilitator: false });
};
$("#pinForm").onsubmit = e => {
  e.preventDefault();
  if ($("#pin").value === FACILITATOR_PIN) { $("#pin").value = ""; enter({ personId: null, name: "Facilitator", facilitator: true }); }
  else { const m = $("#pinmsg"); m.className = "msg err"; m.textContent = "That PIN isn’t right."; }
};
$$("#tabs button").forEach(b => b.onclick = () => selectTab(b.dataset.tab));
$("#signout").onclick = signOut;
$("#gen").onclick = generateCodes;
$("#export").onclick = exportCSV;
$("#wall").onclick = openWall;
$("#wallx").onclick = () => $("#wallview").classList.remove("open");
$("#bigx").onclick = () => $("#big").classList.remove("open");
$("#seed").onclick = seedCohort;
$("#reset").onclick = async () => { if (confirm("Clear all sandbox passports, codes and people?")) { await store.reset(); signOut(); } };
$("#backdrop").addEventListener("click", e => { if (e.target.id === "backdrop") closeSheet(); });
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  closeSheet(); $("#big").classList.remove("open"); $("#wallview").classList.remove("open"); $("#report").classList.remove("open");
});

// Installable app: register the offline cache where supported.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

// Start
async function boot() {
  if (!IS_SHAREPOINT) {
    $("#msSignin").hidden = true;
    const saved = loadSession();
    if (saved) enter(saved); else { showPanel("p-signin"); renderPeople(); }
    return;
  }
  // SharePoint mode: Microsoft sign-in, live data
  $("#sandboxSignin").hidden = true;
  $("#sandboxTools").hidden = true;
  $("#signout").textContent = "Sign out";
  showPanel("p-signin");
  if (!window.msal) { notice("The Microsoft sign-in library didn’t load. Check your internet connection and refresh."); return; }
  $("#msSignin").hidden = false;
  $("#msSignInBtn").onclick = () => signIn();
  try {
    const account = await initAuth();
    if (!account) return; // wait for the person to press Sign in
    $("#msmsg").textContent = "Signing you in…";
    await store.init();
    const me = currentUser();
    const facilitator = await store.isFacilitator();
    $("#msSignin").hidden = true;
    // Recover answers that failed to save last time
    let unsaved = null; try { unsaved = JSON.parse(localStorage.getItem("ilx-unsaved")); } catch {}
    await enter({ personId: me.id, name: me.name, facilitator });
    if (unsaved && (!passport.updatedAt || unsaved.updatedAt > passport.updatedAt)) {
      passport.stamps = { ...passport.stamps, ...unsaved.stamps }; passport.answers = { ...passport.answers, ...unsaved.answers };
      renderPages(); persist();
    }
  } catch (e) {
    $("#msmsg").textContent = "";
    notice("Couldn’t open your passport: " + (e.message || e) + ". If this keeps happening, tell the facilitator.");
  }
}
boot();
