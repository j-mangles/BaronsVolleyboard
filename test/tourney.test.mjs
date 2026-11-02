// Live tourney logic: pool standings, tiebreaks, Saturday path tracking, and matching scored matches.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { teamPayload } from '../sync-core.js';

const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL('../tourney.js', import.meta.url), 'utf8'), ctx);
const T = ctx.window.VBTourney;
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
const k = (a, b) => T.gameKey('S', a, b);

// Westgate (1) sweeps; Edward Schreyer (4, us) beats 2 and 3 2-0 and splits nothing else.
const res = {
  [k(1, 4)]: { sets: [[25, 20], [25, 22]] },
  [k(2, 3)]: { sets: [[25, 18], [18, 25]] },
  [k(1, 3)]: { sets: [[25, 10], [25, 12]] },
  [k(2, 4)]: { sets: [[20, 25], [21, 25]] },
  [k(1, 2)]: { sets: [[25, 15], [25, 16]] },
  [k(3, 4)]: { sets: [[15, 25], [19, 25]] },
};
let st = T.standings('S', res);
assert.equal(st.complete, true);
same(st.rows.map(r => r.seed), [1, 4, 2, 3]);
assert.equal(st.rows[1].sw, 4); assert.equal(st.rows[1].sl, 2);
assert.equal(T.placeOf('S', 4, res), 2);

// Two-team tie on sets is decided head-to-head, even against a better points ratio.
const tie = {
  [k(1, 2)]: { sets: [[25, 23], [25, 23]] },   // 1 beats 2 twice, narrowly
  [k(1, 3)]: { sets: [[10, 25], [10, 25]] },   // 1 is crushed by 3
  [k(2, 3)]: { sets: [[25, 5], [25, 5]] },     // 2 crushes 3
  [k(1, 4)]: { sets: [[25, 20], [25, 20]] },
  [k(2, 4)]: { sets: [[25, 20], [25, 20]] },
  [k(3, 4)]: { sets: [[20, 25], [20, 25]] },
};
st = T.standings('S', tie);
// 1 and 2 both have 4 sets; 2 has the better ratio, but 1 won the head-to-head.
same(st.rows.slice(0, 2).map(r => r.seed), [1, 2]);
assert.equal(st.rows[0].tiebreak, 'head-to-head');

// Partial results: not complete, counts games.
st = T.standings('S', { [k(1, 4)]: res[k(1, 4)] });
assert.equal(st.complete, false); assert.equal(st.games, 1);
// Half-entered game (one set) doesn't count as a finished game.
assert.equal(T.standings('S', { [k(1, 4)]: { sets: [[25, 20], [null, null]] } }).games, 0);

// Saturday run: finish 2nd in S → BA1 first; win it, then BA13 is next.
let run = T.saturdayRun(2, {});
assert.equal(run.next.game.id, 'BA1'); assert.equal(run.played.length, 0);
run = T.saturdayRun(2, { BA1: 'W' });
assert.equal(run.next.game.id, 'BA13');
run = T.saturdayRun(2, { BA1: 'L' });
assert.equal(run.next.game.id, 'BA9');

// A scored match vs Westgate on Friday fills our game; other dates and opponents don't.
const m = { opponent: 'Westgate Mennonite', date: T.fridayDate, sets: [{ home: 20, away: 25, winner: 'away' }, { home: 25, away: 23, winner: 'home' }] };
same(T.fromMatch(m, 'Westgate'), [[20, 25], [25, 23]]);
assert.equal(T.fromMatch({ ...m, date: '2026-10-01' }, 'Westgate'), null);
assert.equal(T.fromMatch(m, 'Gladstone'), null);

// Tournament results ride along with the shared team data.
assert.ok(JSON.parse(teamPayload({ teamName: 'B', players: [], defaultLineup: [], tourney: { res: res, sat: { BA1: 'W' }, place: null } })).tourney.sat.BA1 === 'W');
console.log('tourney tests passed');
