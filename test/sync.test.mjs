import assert from 'node:assert/strict';
import { createSync, revision } from '../sync-core.js';

const tick = () => new Promise(r => setTimeout(r, 5));
function cloud() {
  const c = { team: null, matches: new Map(), plays: new Map(), subs: [] };
  c.backend = (dev) => ({
    online: () => dev.online,
    listenTeam(cb) { const s = { dev, kind: 'team', cb }; c.subs.push(s); setTimeout(() => cb(c.team), 1); return () => c.subs.splice(c.subs.indexOf(s), 1); },
    listen(kind, cb) { const s = { dev, kind, cb }; c.subs.push(s); setTimeout(() => cb([...c[kind]], []), 1); return () => c.subs.splice(c.subs.indexOf(s), 1); },
    async commit(ops) {
      if (dev.deny) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
      if (!dev.online) throw Error('Cannot acknowledge offline writes');
      if (dev.hold) await dev.hold;
      const accepted = [], conflicts = [];
      for (const o of ops) {
        const before = o.path === 'team' ? c.team : c[o.path].get(o.id) ?? null;
        if (before === o.json) continue;
        if (revision(before) !== o.base) conflicts.push([o.path === 'team' ? 'team' : o.path + '/' + o.id, before]);
        else accepted.push(o);
      }
      apply(accepted, dev);
      return conflicts;
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
  c.reconnect = dev => { dev.online = true; return dev.sync.flushNow(); };
  return c;
}
function device(c, state, storage = new Map()) {
  const dev = { online: true, queue: [], applied: 0, statuses: [] };
  dev.state = state;
  const st = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
  dev.storage = storage;
  dev.sync = createSync({ backend: c.backend(dev), bridge: { get state() { return dev.state; }, applied: () => dev.applied++ }, storage: st, onStatus: (s, err, info) => { dev.statuses.push(s); dev.info = info; }, debounceMs: 1 });
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
// 9. Close before the upload timer fires, reopen, and recover the exact match.
const matchId = 'test-match';
const first = {id:'first', dh:1, da:0}, second = {id:'second', dh:0, da:1};
const t = cloud(), score = device(t, fresh({matches:[{id:matchId, events:[first]}]}));
score.sync.start(); await tick(); await tick();
score.state.matches[0].events.push(second); score.sync.changed();
assert.equal(score.info.rallies, 1);
score.sync.stop();
assert.equal(JSON.parse(t.matches.get(matchId)).events.length, 1);
const reopened = device(t, structuredClone(score.state), score.storage);
reopened.sync.start(); await tick(); await tick();
assert.deepEqual(JSON.parse(t.matches.get(matchId)).events,[first,second]);
assert.equal(reopened.statuses.at(-1),'synced');

// 10. A rally entered before any server snapshot exists is durable as well.
reopened.sync.stop();
const opening = device(t, structuredClone(reopened.state), reopened.storage);
opening.sync.start();
opening.state.matches[0].events.push({id:'third', dh:1, da:0}); opening.sync.changed();
await tick(); await tick();
assert.equal(JSON.parse(t.matches.get(matchId)).events.length,3);

// 11. Locally queued changes and in-flight changes only clear after the server
// responds. Edits made while an earlier commit is pending must upload afterwards.
let release; opening.hold = new Promise(resolve => {release=resolve;});
opening.state.matches[0].note = 'first'; opening.sync.changed(); await tick();
assert.equal(opening.statuses.at(-1),'syncing');
opening.state.matches[0].note = 'second'; opening.sync.changed(); await tick();
assert.notEqual(opening.statuses.at(-1),'synced');
release(); await tick(); await tick(); delete opening.hold;
assert.equal(JSON.parse(t.matches.get(matchId)).note,'second');
assert.equal(opening.statuses.at(-1),'synced');

// 12. Two devices change the same record. Keep both versions visible for a
// decision and continue syncing unrelated matches while that decision is pending.
const reader = device(t, fresh()); reader.sync.start(); await tick(); await tick();
opening.online = false;
opening.state.matches[0].note = 'courtside correction'; opening.sync.changed();
await edit(reader, s => { s.matches[0].note = 'desk correction'; });
await t.reconnect(opening); await tick();
assert.equal(opening.statuses.at(-1),'conflict');
const conflict = opening.sync.getConflicts()[0];
assert.equal(JSON.parse(conflict.team).note,'desk correction');
assert.equal(JSON.parse(conflict.device).note,'courtside correction');
await edit(opening, s=>{s.plays.push({id:'safe-play', name:'Safe play'});});
assert.ok(t.plays.has('safe-play'));
opening.sync.resolve(conflict.key,'device'); await tick(); await tick();
assert.equal(JSON.parse(t.matches.get(matchId)).note,'courtside correction');
assert.equal(reader.state.matches[0].note,'courtside correction');

// 13. The app saved edits while the SDK was unavailable and no engine existed.
// Its last confirmed revision still distinguishes the newer on-device data.
opening.sync.stop(); opening.state.matches[0].note='saved while SDK unavailable';
const later = device(t, opening.state, opening.storage); later.sync.start(); await tick(); await tick();
assert.equal(JSON.parse(t.matches.get(matchId)).note,'saved while SDK unavailable');
console.log('sync tests passed');
