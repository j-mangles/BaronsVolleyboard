import assert from 'node:assert/strict';
import { createSync } from '../sync-core.js';

const tick = () => new Promise(r => setTimeout(r, 5));
function cloud() {
  const c = { team: null, matches: new Map(), plays: new Map(), subs: [] };
  c.backend = (dev) => ({
    online: () => dev.online,
    listenTeam(cb) { const s = { dev, kind: 'team', cb }; c.subs.push(s); setTimeout(() => cb(c.team), 1); return () => c.subs.splice(c.subs.indexOf(s), 1); },
    listen(kind, cb) { const s = { dev, kind, cb }; c.subs.push(s); setTimeout(() => cb([...c[kind]], []), 1); return () => c.subs.splice(c.subs.indexOf(s), 1); },
    async commit(ops) {
      if (dev.deny) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
      if (!dev.online) { dev.queue.push(...ops); return; }
      apply(ops, dev);
    }
  });
  function apply(ops, dev) {
    const byKind = {};
    for (const o of ops) {
      if (o.path === 'team') { c.team = o.json; for (const s of c.subs) if (s.kind === 'team' && s.dev !== dev) s.cb(c.team); continue; }
      if (o.op === 'delete') c[o.path].delete(o.id); else c[o.path].set(o.id, o.json);
      (byKind[o.path] ||= []).push({ type: o.op === 'delete' ? 'removed' : 'modified', id: o.id, json: o.op === 'delete' ? null : o.json });
    }
    for (const [k, ch] of Object.entries(byKind)) for (const s of c.subs) if (s.kind === k && s.dev !== dev) s.cb([...c[k]], ch);
  }
  c.reconnect = dev => { dev.online = true; const q = dev.queue.splice(0); apply(q, dev); };
  return c;
}
function device(c, state, storage = new Map()) {
  const dev = { online: true, queue: [], applied: 0, statuses: [] };
  dev.state = state;
  const st = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  dev.storage = storage;
  dev.sync = createSync({ backend: c.backend(dev), bridge: { get state() { return dev.state; }, applied: () => dev.applied++ }, storage: st, onStatus: s => dev.statuses.push(s), debounceMs: 1 });
  return dev;
}
const fresh = (extra = {}) => ({ teamName: 'Barons', players: [{ id: 'p1', name: 'A' }], defaultLineup: ['p1'], matches: [], plays: [], currentMatchId: null, matchUndo: [], ...extra });
const edit = async (dev, fn) => { fn(dev.state); dev.sync.changed(); await tick(); await dev.sync.flushNow(); await tick(); };

const c = cloud();
// 1. First coach signs in with existing local data: it uploads.
const A = device(c, fresh({ matches: [{ id: 'm1', opp: 'Stonewall', events: [[1, 2]] }], plays: [{ id: 'pl1', name: 'Serve receive', strokes: [[0, 0], [1, 1]] }] }));
A.sync.start(); await tick(); await tick();
assert.equal(c.matches.size, 1); assert.equal(c.plays.size, 1); assert.ok(c.team.includes('Barons'));

// 2. Second coach with their own local match merges: keeps theirs, gets A's.
const B = device(c, fresh({ teamName: 'Old name', matches: [{ id: 'm2', opp: 'Selkirk' }] }));
B.sync.start(); await tick(); await tick();
assert.deepEqual(B.state.matches.map(m => m.id).sort(), ['m1', 'm2']);
assert.equal(B.state.teamName, 'Barons', 'cloud roster/team wins on first merge');
assert.equal(c.matches.size, 2);
assert.deepEqual(A.state.matches.map(m => m.id).sort(), ['m1', 'm2'], 'A receives B\'s match live');

// 3. Live edit flows across; nested arrays survive (stored as JSON).
await edit(A, s => { s.matches[0].score = '25-20'; s.players.push({ id: 'p2', name: 'B' }); });
assert.equal(B.state.matches.find(m => m.id === 'm1').score, '25-20');
assert.equal(B.state.players.length, 2);
assert.deepEqual(JSON.parse(c.plays.get('pl1')).strokes, [[0, 0], [1, 1]]);

// 4. Delete propagates, and clears B's current match if it was open.
B.state.currentMatchId = 'm2';
await edit(A, s => { s.matches = s.matches.filter(m => m.id !== 'm2'); });
assert.ok(!c.matches.has('m2')); assert.ok(!B.state.matches.some(m => m.id === 'm2')); assert.equal(B.state.currentMatchId, null);

// 5. Device that was offline/closed while another coach deleted: deletion applies on next start.
B.sync.stop();
const bStorage = B.storage, bState = B.state;
await edit(A, s => { s.plays = []; });
const B2 = device(c, bState, bStorage); B2.sync.start(); await tick(); await tick();
assert.equal(B2.state.plays.length, 0, 'remote delete honoured after restart');
assert.equal(c.plays.size, 0, 'old local copy not re-uploaded');

// 6. Offline scoring queues then syncs on reconnect.
A.online = false;
await edit(A, s => { s.matches[0].score = '25-22'; });
assert.equal(JSON.parse(c.matches.get('m1')).score, '25-20');
assert.equal(A.statuses.at(-1), 'offline');
c.reconnect(A); await tick();
assert.equal(B2.state.matches.find(m => m.id === 'm1').score, '25-22');

// 7. Not on staff list: error reported, and the change is retried later rather than lost.
A.deny = true;
await edit(A, s => { s.teamName = 'Barons Varsity'; });
assert.equal(A.statuses.at(-1), 'error');
A.deny = false;
await edit(A, s => { s.matches[0].note = 'x'; });
assert.equal(JSON.parse(c.team).teamName, 'Barons Varsity', 'failed write retried');

// 8. No pointless writes when nothing changed.
const before = c.matches.get('m1');
let writes = 0; const orig = A.sync; A.sync.changed(); await tick(); await A.sync.flushNow();
assert.equal(c.matches.get('m1'), before);
console.log('sync tests passed');
