/* Shared team data is stored in the regular device save. A small, team-specific
   record of the last confirmed revisions lets us reconstruct the upload queue
   on reload, including deliberate deletions and edits made before connecting. */
export const KINDS = ['matches', 'plays'];
const REVISION_KEY = 'volleyboard_sync_revisions_v1';
const OLD_KNOWN_KEY = 'volleyboard_sync_known';

export function teamPayload(s) {
  return JSON.stringify({ teamName: s.teamName, players: s.players, defaultLineup: s.defaultLineup, tourney: s.tourney || null });
}

// Two independent 32-bit checks plus length identify an exact saved JSON version.
// This avoids storing a second full season of match data in iPad localStorage.
export function revision(json) {
  if (json == null) return null;
  let a = 2166136261, b = 5381;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b, 33) ^ c;
  }
  return json.length + '-' + (a >>> 0).toString(36) + '-' + (b >>> 0).toString(36);
}

function pointCount(key, json) {
  if (!json || !key.startsWith('matches/')) return 0;
  return (JSON.parse(json).events || []).filter(e => e && (e.dh === 1 || e.da === 1)).length;
}
function read(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function snapshot(state) {
  const docs = new Map([['team', teamPayload(state)]]);
  for (const kind of KINDS) for (const item of state[kind] || []) {
    if (item?.id) docs.set(kind + '/' + item.id, JSON.stringify(item));
  }
  return docs;
}

export function createSync({ backend, bridge, storage, onStatus = () => {}, debounceMs = 700 }) {
  const confirmed = new Map(read(storage, REVISION_KEY, []));
  const legacy = read(storage, OLD_KNOWN_KEY, {});
  const conflicts = new Map(), localRevisions = new Map();
  let local = snapshot(bridge.state), timer = null, flight = null, sent = new Map();
  let ready = false, active = true, generation = 0, stops = [], storageError = null;
  let revisionsChanged = false;

  function saveRevisions() {
    if (!revisionsChanged) return;
    try {
      storage.setItem(REVISION_KEY, JSON.stringify([...confirmed]));
      revisionsChanged = false; storageError = null;
    } catch (err) { storageError = err; }
  }
  function remember(key, json) {
    const sig = revision(json);
    if (confirmed.has(key) && confirmed.get(key)[0] === sig) return;
    confirmed.set(key, [sig, pointCount(key, json)]);
    revisionsChanged = true;
  }
  function localRevision(key, json) {
    const cached = localRevisions.get(key);
    if (cached?.json === json) return cached.sig;
    const sig = revision(json);
    localRevisions.set(key, { json, sig }); return sig;
  }
  function dirtyEntries() {
    const entries = [];
    for (const [key, [base, previousCount]] of confirmed) {
      const json = local.get(key) ?? null;
      if (localRevision(key, json) !== base || conflicts.has(key)) entries.push({ key, base, json, previousCount });
    }
    return entries;
  }
  function details() {
    const entries = dirtyEntries();
    return {
      changes: entries.length,
      rallies: entries.reduce((n, e) => n + Math.max(0, pointCount(e.key, e.json) - e.previousCount), 0),
      conflicts: conflicts.size
    };
  }
  function report(err) {
    const info = details();
    const status = storageError || err ? 'error' : conflicts.size ? 'conflict' :
      !backend.online() ? 'offline' : !ready ? 'connecting' :
      flight ? 'syncing' : info.changes ? 'pending' : 'synced';
    onStatus(status, storageError || err, info);
  }
  function apply(key, json) {
    const s = bridge.state, [kind, id] = key.split('/');
    if (kind === 'team') {
      if (json == null) return;
      const t = JSON.parse(json);
      s.teamName = t.teamName; s.players = t.players || []; s.defaultLineup = t.defaultLineup || [];
      if ('tourney' in t) s.tourney = t.tourney;
    } else {
      const index = s[kind].findIndex(item => item.id === id);
      if (json == null) {
        if (index >= 0) s[kind].splice(index, 1);
        if (kind === 'matches' && s.currentMatchId === id) { s.currentMatchId = null; s.matchUndo = []; }
      } else if (index >= 0) s[kind][index] = JSON.parse(json);
      else s[kind].push(JSON.parse(json));
    }
    if (json == null) local.delete(key); else local.set(key, json);
  }
  function receive(key, json) {
    const device = local.get(key) ?? null;
    if (device === json || (sent.has(key) && sent.get(key) === json)) {
      remember(key, json); conflicts.delete(key); return false;
    }
    if (!confirmed.has(key)) {
      const [kind, id] = key.split('/');
      if (json == null && !(legacy[kind] || []).includes(id)) {
        remember(key, null); return false; // first upload from this device
      }
      // Older builds retained IDs but no confirmed revision. If both copies
      // differ, preserve them for review instead of assuming the cloud is newer.
      if (device != null && kind !== 'team' && (json != null || (legacy[kind] || []).includes(id))) {
        remember(key, null); conflicts.set(key, json); return false;
      }
    } else {
      const base = confirmed.get(key)[0];
      if (revision(device) !== base) {
        if (revision(json) !== base) conflicts.set(key, json);
        else conflicts.delete(key);
        return false;
      }
    }
    remember(key, json); conflicts.delete(key); apply(key, json); return true;
  }

  function schedule(delay = debounceMs) {
    clearTimeout(timer);
    if (active && ready && backend.online()) timer = setTimeout(flush, delay);
  }
  function changed() {
    if (!active) return;
    const next = snapshot(bridge.state);
    for (const key of new Set([...local.keys(), ...next.keys()])) {
      if (local.get(key) !== next.get(key) && !confirmed.has(key)) remember(key, local.get(key) ?? null);
    }
    local = next; saveRevisions(); report(); schedule();
  }
  async function flush() {
    clearTimeout(timer);
    if (!active || !ready || !backend.online() || flight) { if (active) report(); return flight; }
    const entries = dirtyEntries().filter(e => !conflicts.has(e.key));
    if (!entries.length) { report(); return; }
    const epoch = generation;
    const ops = entries.map(({key, json, base}) => {
      const [path, id] = key.split('/');
      return { path, id, json, base, op: json == null ? 'delete' : 'set' };
    });
    sent = new Map(entries.map(e => [e.key, e.json]));
    flight = Promise.resolve().then(() => backend.commit(ops));
    report();
    let failure;
    try {
      const rejected = new Map((await flight) || []);
      if (!active || generation !== epoch) return;
      for (const e of entries) {
        if (rejected.has(e.key)) {
          sent.delete(e.key);
          if (receive(e.key, rejected.get(e.key))) bridge.applied();
        } else {
          // A listener can already have delivered a later remote edit. Keep it.
          const baseNow = confirmed.get(e.key)?.[0];
          if (baseNow === e.base || baseNow === revision(e.json)) {
            remember(e.key, e.json);
            if (conflicts.has(e.key) && conflicts.get(e.key) === e.json) conflicts.delete(e.key);
          }
        }
      }
      saveRevisions();
    } catch (err) { failure = err; }
    finally {
      if (active && generation === epoch) {
        flight = null; sent.clear(); report(failure);
        if (!failure && dirtyEntries().some(e => !conflicts.has(e.key))) schedule(0);
      }
    }
  }

  function start() {
    if (stops.length) return;
    active = true; ready = false; const epoch = ++generation;
    const streams = new Map();
    const valid = () => active && generation === epoch;
    function stream(kind, docs) {
      if (!valid()) return;
      const prev = streams.get(kind);
      streams.set(kind, docs);
      if (!ready && streams.size < 3) return;
      let touched = false;
      if (!ready) {
        const all = new Map([...streams.values()].flatMap(s => [...s]));
        for (const key of new Set([...all.keys(), ...local.keys(), ...confirmed.keys()]))
          touched = receive(key, all.get(key) ?? null) || touched;
        ready = true;
      } else {
        for (const key of new Set([...prev.keys(), ...docs.keys()])) {
          if (prev.get(key) !== docs.get(key)) touched = receive(key, docs.get(key) ?? null) || touched;
        }
      }
      if (touched) bridge.applied();
      saveRevisions(); report(); schedule(0);
    }
    const fail = err => { if (valid()) report(err); };
    report();
    stops.push(backend.listenTeam(json => stream('team', new Map([['team', json]])), fail));
    for (const kind of KINDS)
      stops.push(backend.listen(kind, docs => stream(kind, new Map(docs.map(([id, json]) => [kind + '/' + id, json]))), fail));
  }
  return {
    get ready() { return ready; }, changed, start,
    refreshStatus: () => report(),
    flushNow() { clearTimeout(timer); return flush(); },
    getConflicts() { return [...conflicts].map(([key, team]) => ({ key, team, device: local.get(key) ?? null })); },
    resolve(key, choice) {
      if (!conflicts.has(key) || !['team', 'device'].includes(choice)) return;
      const team = conflicts.get(key); remember(key, team); conflicts.delete(key);
      if (choice === 'team') { apply(key, team); bridge.applied(); }
      saveRevisions(); report(); schedule(0);
    },
    stop() {
      active = false; ready = false; ++generation; clearTimeout(timer);
      stops.forEach(fn => fn()); stops = []; flight = null; sent.clear();
      onStatus('local');
    }
  };
}
