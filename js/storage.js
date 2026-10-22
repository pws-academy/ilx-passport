/*
  Storage adapters. The app talks only to this interface:
    getConfig() / saveConfig(config)          cohort name, salt, hashed codes
    getAdminCodes() / saveAdminCodes(data)    plain codes (facilitators only)
    getPassport(id) / savePassport(id, data)  one person's passport
    listPassports()                           everyone's passports (facilitators only)
    isFacilitator()
*/
import { CONFIG, IS_SHAREPOINT } from "./config.js";
import { getToken, currentUser } from "./auth.js";

/* ---------------- SANDBOX: this browser only ---------------- */
const KEY = "ilx-sandbox-v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };

export const LocalAdapter = {
  name: "Sandbox (this browser only)",
  mode: "sandbox",
  async init() {},
  async getConfig() { return load().config || { cohort: "", salt: "", hashes: {} }; },
  async saveConfig(c) { const db = load(); db.config = c; save(db); },
  async getAdminCodes() { return load().admin || { codes: {} }; },
  async saveAdminCodes(d) { const db = load(); db.admin = d; save(db); },
  async getPassport(id) { return (load().passports || {})[id] || null; },
  async savePassport(id, data) { const db = load(); db.passports = db.passports || {}; db.passports[id] = data; save(db); },
  async listPassports() {
    const db = load(); const people = db.people || {};
    return Object.entries(db.passports || {}).map(([id, data]) => ({ id, name: people[id] || "Participant", data }));
  },
  async listPeople() { return Object.entries(load().people || {}).map(([id, name]) => ({ id, name })); },
  async addPerson(name) {
    const db = load(); db.people = db.people || {};
    const hit = Object.entries(db.people).find(([, n]) => n.toLowerCase() === name.toLowerCase());
    if (hit) return { id: hit[0], name: hit[1] };
    const id = "p_" + Math.random().toString(36).slice(2, 10);
    db.people[id] = name; save(db); return { id, name };
  },
  async isFacilitator() { return false; },
  async reset() { localStorage.removeItem(KEY); }
};

/* ---------------- SHAREPOINT: live data via Microsoft Graph ----------------
   Each list has: Title (single line), PersonName (single line), Payload (multiple lines, plain text).
   ILX_Passports: one item per person, Title = their Microsoft account id.
   ILX_Config: one item, Title = "cohort".   ILX_Codes: one item, Title = "codes".
*/
const GRAPH = "https://graph.microsoft.com/v1.0";
let siteId = null;
const listIds = {};
const itemCache = {};

async function graph(path, opts = {}) {
  const token = await getToken();
  const res = await fetch(GRAPH + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const err = new Error(`Graph ${res.status}`);
    err.status = res.status;
    try { err.detail = await res.json(); } catch {}
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const q = s => String(s).replace(/'/g, "''");

async function findItem(listKey, title) {
  const listId = listIds[listKey];
  if (!listId) { const e = new Error("No access to list " + listKey); e.status = 403; throw e; }
  const r = await graph(`/sites/${siteId}/lists/${listId}/items?$expand=fields($select=Title,PersonName,Payload)&$filter=fields/Title eq '${q(title)}'&$top=1`);
  return (r.value && r.value[0]) || null;
}

async function upsert(listKey, title, payload, personName) {
  const listId = listIds[listKey];
  const fields = { Title: title, Payload: JSON.stringify(payload) };
  if (personName) fields.PersonName = personName;
  const cacheKey = listKey + "|" + title;
  let id = itemCache[cacheKey];
  if (!id) { const hit = await findItem(listKey, title); if (hit) id = hit.id; }
  if (id) {
    await graph(`/sites/${siteId}/lists/${listId}/items/${id}/fields`, { method: "PATCH", body: JSON.stringify(fields) });
  } else {
    const created = await graph(`/sites/${siteId}/lists/${listId}/items`, { method: "POST", body: JSON.stringify({ fields }) });
    id = created.id;
  }
  itemCache[cacheKey] = id;
}

const parse = item => { try { return JSON.parse(item.fields.Payload || "null"); } catch { return null; } };

export const SharePointAdapter = {
  name: "SharePoint (PWS Microsoft 365)",
  mode: "sharepoint",
  async init() {
    const u = new URL(CONFIG.siteUrl);
    const site = await graph(`/sites/${u.host}:${u.pathname}`);
    siteId = site.id;
    const lists = await graph(`/sites/${siteId}/lists?$select=id,displayName&$top=200`);
    const wanted = CONFIG.lists;
    for (const l of lists.value || []) {
      for (const [k, name] of Object.entries(wanted)) if (l.displayName === name) listIds[k] = l.id;
    }
    if (!listIds.passports || !listIds.config) throw new Error("Lists not found. Check list names in config.js and that you have access.");
  },
  async getConfig() {
    const it = await findItem("config", "cohort");
    return (it && parse(it)) || { cohort: "", salt: "", hashes: {} };
  },
  async saveConfig(c) { await upsert("config", "cohort", c); },
  async getAdminCodes() {
    const it = await findItem("codes", "codes");
    return (it && parse(it)) || { codes: {} };
  },
  async saveAdminCodes(d) { await upsert("codes", "codes", d); },
  async getPassport(id) {
    const it = await findItem("passports", id);
    if (it) itemCache["passports|" + id] = it.id;
    return it ? parse(it) : null;
  },
  async savePassport(id, data) {
    const me = currentUser();
    await upsert("passports", id, data, me ? me.name : "");
  },
  async listPassports() {
    const out = [];
    let path = `/sites/${siteId}/lists/${listIds.passports}/items?$expand=fields($select=Title,PersonName,Payload)&$top=500`;
    while (path) {
      const r = await graph(path);
      for (const it of r.value || []) out.push({ id: it.fields.Title, name: it.fields.PersonName || "Participant", data: parse(it) || {} });
      path = r["@odata.nextLink"] ? r["@odata.nextLink"].replace(GRAPH, "") : null;
    }
    return out;
  },
  async isFacilitator() {
    // Facilitators are the only people with access to the codes list (set in SharePoint).
    if (!listIds.codes) return false;
    try { await graph(`/sites/${siteId}/lists/${listIds.codes}/items?$top=1`); return true; }
    catch { return false; }
  },
  async listPeople() { return []; },
  async addPerson() { throw new Error("Sign-in handles people in SharePoint mode"); },
  async reset() {}
};

export const store = IS_SHAREPOINT ? SharePointAdapter : LocalAdapter;
