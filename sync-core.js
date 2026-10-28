/* VolleyBoard sync engine.
   Shared team data: team name, roster, default lineup, matches, saved plays.
   Stays on each device: current tab, whiteboard in progress, selections, undo.
   The backend is swappable (Firebase in sync.js, a fake one in the tests). */

export const KINDS = ['matches', 'plays'];
const KNOWN_KEY = 'volleyboard_sync_known';

export function teamPayload(s) {
  return JSON.stringify({ teamName: s.teamName, players: s.players, defaultLineup: s.defaultLineup });
}

export function createSync({ backend, bridge, storage, onStatus = () => {}, debounceMs = 700 }) {
  const last = { team: null, matches: new Map(), plays: new Map() };
  let ready = false, timer = null, flushing = null, again = false, stops = [];

  const readKnown = () => {
    try { const k = JSON.parse(storage.getItem(KNOWN_KEY) || '{}'); return { matches: new Set(k.matches || []), plays: new Set(k.plays || []) }; }
    catch { return { matches: new Set(), plays: new Set() }; }
  };
  const saveKnown = () => {
    try { storage.setItem(KNOWN_KEY, JSON.stringify({ matches: [...last.matches.keys()], plays: [...last.plays.keys()] })); } catch {}
  };

  function upsert(kind, id, json) {
    const s = bridge.state, item = JSON.parse(json), arr = s[kind];
    const i = arr.findIndex(x => x.id === id);
    if (i >= 0) arr[i] = item; else arr.push(item);
  }
  function remove(kind, id) {
    const s = bridge.state;
    s[kind] = s[kind].filter(x => x.id !== id);
    if (kind === 'matches' && s.currentMatchId === id) { s.currentMatchId = null; s.matchUndo = []; }
  }
  function applyTeam(json) {
    const t = JSON.parse(json), s = bridge.state;
    s.teamName = t.teamName; s.players = t.players || []; s.defaultLineup = t.defaultLineup || [];
  }

  // First snapshot of each stream: merge cloud with whatever this device already has.
  function merge(initial) {
    const known = readKnown();
    if (initial.team) { applyTeam(initial.team); last.team = initial.team; }
    for (const kind of KINDS) {
      const cloudIds = new Set();
      for (const [id, json] of initial[kind]) { cloudIds.add(id); last[kind].set(id, json); upsert(kind, id, json); }
      // Synced before but gone from the cloud = another coach deleted it.
      for (const item of [...bridge.state[kind]]) {
        if (!cloudIds.has(item.id) && known[kind].has(item.id)) remove(kind, item.id);
      }
    }
  }

  function onRemoteTeam(json) {
    if (json == null || json === last.team) return;
    last.team = json; applyTeam(json); bridge.applied();
  }
  function onRemoteChanges(kind, changes) {
    let touched = false;
    for (const c of changes) {
      if (c.type === 'removed') {
        if (!last[kind].has(c.id) && !bridge.state[kind].some(x => x.id === c.id)) continue;
        last[kind].delete(c.id); remove(kind, c.id); touched = true;
      } else {
        if (last[kind].get(c.id) === c.json) continue;
        last[kind].set(c.id, c.json); upsert(kind, c.id, c.json); touched = true;
      }
    }
    if (touched) { saveKnown(); bridge.applied(); }
  }

  function diff() {
    const s = bridge.state, ops = [];
    const tp = teamPayload(s);
    if (tp !== last.team) { ops.push({ op: 'set', path: 'team', json: tp }); last.team = tp; }
    for (const kind of KINDS) {
      const seen = new Set();
      for (const item of s[kind]) {
        if (!item || !item.id) continue;
        seen.add(item.id);
        const j = JSON.stringify(item);
        if (last[kind].get(item.id) !== j) { ops.push({ op: 'set', path: kind, id: item.id, json: j }); last[kind].set(item.id, j); }
      }
      for (const id of [...last[kind].keys()]) {
        if (!seen.has(id)) { ops.push({ op: 'delete', path: kind, id }); last[kind].delete(id); }
      }
    }
    return ops;
  }

  async function flush() {
    if (!ready) return;
    if (flushing) { again = true; return flushing; }
    const ops = diff();
    saveKnown();
    if (!ops.length) { onStatus(backend.online() ? 'synced' : 'offline'); return; }
    onStatus(backend.online() ? 'syncing' : 'offline');
    flushing = backend.commit(ops)
      .then(() => onStatus(backend.online() ? 'synced' : 'offline'))
      .catch(err => {
        // Forget what we thought we sent so the next change retries it.
        for (const o of ops) {
          if (o.path === 'team') last.team = null;
          else if (o.op === 'set') last[o.path].delete(o.id);
          else last[o.path].set(o.id, '\u0000unsent');
        }
        onStatus('error', err);
      })
      .finally(() => { flushing = null; if (again) { again = false; flush(); } });
    return flushing;
  }

  return {
    get ready() { return ready; },
    changed() {
      if (!ready) return;
      clearTimeout(timer);
      onStatus(backend.online() ? 'pending' : 'offline');
      timer = setTimeout(flush, debounceMs);
    },
    flushNow() { clearTimeout(timer); return flush(); },
    start() {
      const initial = { team: undefined, matches: null, plays: null };
      let waiting = 3;
      onStatus('connecting');
      const firstDone = () => {
        if (--waiting) return;
        merge(initial); ready = true; saveKnown();
        bridge.applied();
        flush();
      };
      stops.push(backend.listenTeam(json => {
        if (!ready && initial.team === undefined) { initial.team = json; firstDone(); }
        else onRemoteTeam(json);
      }, err => onStatus('error', err)));
      for (const kind of KINDS) {
        let first = true;
        stops.push(backend.listen(kind, (docs, changes) => {
          if (first) { first = false; initial[kind] = docs; firstDone(); }
          else onRemoteChanges(kind, changes);
        }, err => onStatus('error', err)));
      }
    },
    stop() {
      clearTimeout(timer); stops.forEach(f => { try { f(); } catch {} }); stops = [];
      ready = false; last.team = null; last.matches.clear(); last.plays.clear();
      onStatus('local');
    }
  };
}
