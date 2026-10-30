/* Tournament data + views for the Tourney tab.
   Source: "2026 DIG BOYS Draw" (.docx) and "2026 Boys 16 Team Brackets" (.xlsx). */
(function () {
  'use strict';
  const MAP = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q + ', Brandon, MB');
  const VENUES = {
    'Neelin': { name: 'Neelin High School', map: MAP('Neelin High School') },
    'Green Acres': { name: 'Green Acres School', map: MAP('Green Acres School') },
    'Earl Oxford': { name: 'Earl Oxford School', map: MAP('Earl Oxford School') },
    'New Era': { name: 'New Era School', map: MAP('New Era School') },
    'Maryland': { name: 'Maryland Park School', map: MAP('Maryland Park School') },
    'JR Reid': { name: 'J.R. Reid School', map: MAP('J.R. Reid School') },
    'Crocus #2': { name: 'Crocus Plains (gym 2)', map: MAP('Crocus Plains Regional Secondary School') },
    'Massey': { name: 'Vincent Massey High School', map: MAP('Vincent Massey High School') },
    'BU HLC #1': { name: 'Brandon University HLC, court 1', map: MAP('Brandon University Healthy Living Centre') },
    'BU HLC #2': { name: 'Brandon University HLC, court 2', map: MAP('Brandon University Healthy Living Centre') }
  };
  const AM = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'];
  const PM = ['3:30 PM', '4:30 PM', '5:30 PM', '6:30 PM', '7:30 PM', '8:30 PM'];
  const RR = [[1, 4], [2, 3], [1, 3], [2, 4], [1, 2], [3, 4]];
  const P = (session, venue, teams) => ({ session, venue, teams });
  const pools = {
    M: P('AM', 'Neelin', ['Neelin', 'St. Maurice', 'Neepawa', 'Frontier']),
    N: P('AM', 'Green Acres', ['Glenboro', 'John Taylor', 'Carberry', 'Boissevain']),
    O: P('PM', 'Green Acres', ['Collège Béliveau', 'Calvin Christian', 'Margaret Barbour', 'Pembina Trails']),
    P: P('PM', 'Neelin', ['Léo Rémillard', 'Niverville', 'Portage', 'Landmark']),
    Q: P('AM', 'JR Reid', ['Rivers', 'Goose Lake', 'Greenall', 'Wawanesa']),
    R: P('AM', 'Earl Oxford', ['R.D. Parker', 'Elm Creek', 'Major Pratt', 'Miami']),
    S: P('PM', 'Maryland', ['Westgate', 'Gladstone', 'Erickson', 'Edward Schreyer']),
    T: P('AM', 'New Era', ['Elton', 'Swan Valley', 'Neelin JV', 'Hapnot']),
    U: P('PM', 'Earl Oxford', ['Steinbach', 'Green Valley', 'Alonsa/McCreary', 'Dauphin']),
    V: P('AM', 'Crocus #2', ['Lorette', 'Rosenort', 'Crocus', 'St. Claude']),
    W: P('PM', 'JR Reid', ['St. John\'s', 'W.C. Miller', 'Morden', 'Nelson House']),
    X: P('PM', 'New Era', ['Killarney', 'Linden Christian', 'Louis-Riel', 'St. Joachim'])
  };
  // Saturday games. Refs: "2S" = 2nd in pool S; "W:BA1"/"L:BA1" = winner/loser of game BA1.
  const G = (id, time, venue, a, b) => ({ id, time, venue, a, b });
  const sat = [
    G('BA1', '8:00 AM', 'Massey', '1V', '2S'), G('BA3', '9:00 AM', 'Massey', '1S', '1O'), G('BA5', '10:00 AM', 'Massey', '1P', '1T'), G('BA7', '11:00 AM', 'Massey', '1N', '1W'),
    G('BA9', '12:00 PM', 'Massey', 'L:BA1', 'L:BA3'), G('BA11', '1:00 PM', 'Massey', 'L:BA5', 'L:BA7'), G('BA13', '2:00 PM', 'Massey', 'W:BA1', 'W:BA3'), G('BA15', '3:00 PM', 'Massey', 'W:BA5', 'W:BA7'),
    G('BA17', '4:00 PM', 'Massey', 'W:BA9', 'W:BA11'), G('BA19', '5:00 PM', 'Massey', 'W:BA13', 'W:BA15'), G('BA21', '6:00 PM', 'Massey', 'W:BA17', 'W:BA18'),
    G('BA2', '8:00 AM', 'Neelin', '1R', '2O'), G('BA4', '9:00 AM', 'Neelin', '1Q', '1U'), G('BA6', '10:00 AM', 'Neelin', '1M', '2U'), G('BA8', '11:00 AM', 'Neelin', '2P', '1X'),
    G('BA10', '12:00 PM', 'Neelin', 'L:BA2', 'L:BA4'), G('BA12', '1:00 PM', 'Neelin', 'L:BA6', 'L:BA8'), G('BA14', '2:00 PM', 'Neelin', 'W:BA2', 'W:BA4'), G('BA16', '3:00 PM', 'Neelin', 'W:BA6', 'W:BA8'),
    G('BA18', '4:00 PM', 'Neelin', 'W:BA10', 'W:BA12'), G('BA20', '5:00 PM', 'Neelin', 'W:BA14', 'W:BA16'), G('BA22', '6:00 PM', 'Neelin', 'W:BA19', 'W:BA20'),
    G('BB1', '8:00 AM', 'BU HLC #1', '4P', '3U'), G('BB5', '9:00 AM', 'BU HLC #1', '3O', '2V'), G('BB9', '10:00 AM', 'BU HLC #1', 'L:BB1', 'L:BB3'), G('BB13', '11:00 AM', 'BU HLC #1', 'W:BB1', 'W:BB3'),
    G('BB17', '12:00 PM', 'BU HLC #1', 'W:BB9', 'W:BB11'), G('BB10', '1:00 PM', 'BU HLC #1', 'L:BB2', 'L:BB4'),
    G('BB2', '8:00 AM', 'BU HLC #2', '2Q', '3P'), G('BB7', '9:00 AM', 'BU HLC #2', '2M', '2R'), G('BB11', '10:00 AM', 'BU HLC #2', 'L:BB5', 'L:BB7'), G('BB15', '11:00 AM', 'BU HLC #2', 'W:BB5', 'W:BB7'),
    G('BB19', '12:00 PM', 'BU HLC #2', 'W:BB13', 'W:BB15'), G('BB14', '1:00 PM', 'BU HLC #2', 'W:BB2', 'W:BB4'),
    G('BB3', '8:00 AM', 'New Era', '2W', '2T'), G('BB4', '9:00 AM', 'New Era', '2N', '2X'), G('BB6', '10:00 AM', 'New Era', '3N', '3T'), G('BB8', '11:00 AM', 'New Era', '2O', '3S'),
    G('BB12', '12:00 PM', 'New Era', 'L:BB6', 'L:BB8'), G('BB16', '1:00 PM', 'New Era', 'W:BB6', 'W:BB8'), G('BB18', '2:00 PM', 'New Era', 'W:BB10', 'W:BB12'), G('BB20', '3:00 PM', 'New Era', 'W:BB14', 'W:BB16'),
    G('BB21', '4:00 PM', 'New Era', 'W:BB17', 'W:BB18'), G('BB22', '5:00 PM', 'New Era', 'W:BB19', 'W:BB20'),
    G('BC1', '8:00 AM', 'Maryland', '3R', '3W'), G('BC3', '9:00 AM', 'Maryland', '4U', '4V'), G('BC5', '10:00 AM', 'Maryland', '4S', '3Q'), G('BC7', '11:00 AM', 'Maryland', '3M', '4X'),
    G('BC9', '12:00 PM', 'Maryland', 'L:BC1', 'L:BC3'), G('BC11', '1:00 PM', 'Maryland', 'L:BC5', 'L:BC7'), G('BC13', '2:00 PM', 'Maryland', 'W:BC1', 'W:BC3'), G('BC15', '3:00 PM', 'Maryland', 'W:BC5', 'W:BC7'),
    G('BC17', '4:00 PM', 'Maryland', 'W:BC9', 'W:BC11'), G('BC19', '5:00 PM', 'Maryland', 'W:BC13', 'W:BC15'), G('BC22', '6:00 PM', 'Maryland', 'W:BC19', 'W:BC20'),
    G('BC2', '8:00 AM', 'JR Reid', '4Q', '4R'), G('BC4', '9:00 AM', 'JR Reid', '4W', '3V'), G('BC6', '10:00 AM', 'JR Reid', '4N', '4T'), G('BC8', '11:00 AM', 'JR Reid', '4M', '3X'),
    G('BC10', '12:00 PM', 'JR Reid', 'L:BC2', 'L:BC4'), G('BC12', '1:00 PM', 'JR Reid', 'L:BC6', 'L:BC8'), G('BC14', '2:00 PM', 'JR Reid', 'W:BC2', 'W:BC4'), G('BC16', '3:00 PM', 'JR Reid', 'W:BC6', 'W:BC8'),
    G('BC18', '4:00 PM', 'JR Reid', 'W:BC10', 'W:BC12'), G('BC20', '5:00 PM', 'JR Reid', 'W:BC14', 'W:BC16'), G('BC21', '6:00 PM', 'JR Reid', 'W:BC17', 'W:BC18')
  ];
  const byId = Object.fromEntries(sat.map(g => [g.id, g]));
  const T = {
    name: 'Neelin Dig Boys Tournament', city: 'Brandon',
    days: ['Fri Nov 6', 'Sat Nov 7'], fridayDate: '2026-11-06', saturdayDate: '2026-11-07',
    us: { pool: 'S', seed: 4 }, venues: VENUES, pools, sat, byId, AM, PM, RR
  };
  const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
  const side = id => ({ A: 'A side', B: 'B side', C: 'C side' })[id[1]];
  T.ord = ord;
  T.side = side;
  T.finalLabel = id => id.endsWith('22') ? side(id) + ' final' : id.endsWith('21') ? side(id) + ' consolation final' : null;
  T.ourTeam = () => pools[T.us.pool].teams[T.us.seed - 1];
  T.friday = () => {
    const pool = pools[T.us.pool], times = pool.session === 'AM' ? AM : PM, me = T.us.seed;
    return RR.map(([a, b], i) => ({ time: times[i], venue: pool.venue, a, b, ours: a === me || b === me, opp: a === me ? b : b === me ? a : null }));
  };
  // Who could fill this slot? Returns a short human description.
  T.describe = function describe(ref) {
    if (/^\d[A-Z]$/.test(ref)) { const n = +ref[0], p = ref[1]; return ord(n) + ' in Pool ' + p; }
    const [k, id] = ref.split(':'); return (k === 'W' ? 'winner of ' : 'loser of ') + id;
  };
  T.candidates = function cand(ref) {
    if (/^\d[A-Z]$/.test(ref)) { const n = +ref[0], p = ref[1]; return [ord(n) + ' ' + p]; }
    const g = byId[ref.split(':')[1]]; return g ? [...cand(g.a), ...cand(g.b)] : [];
  };
  // Path tree for our team if we finish `place` in our pool.
  T.path = function (place) {
    const start = place + T.us.pool;
    const first = sat.find(g => g.a === start || g.b === start);
    const walk = (g, depth) => {
      if (!g || depth > 4) return null;
      const win = sat.find(x => x.a === 'W:' + g.id || x.b === 'W:' + g.id);
      const lose = sat.find(x => x.a === 'L:' + g.id || x.b === 'L:' + g.id);
      const tag = (x, ref) => x && Object.assign({}, x, { from: g.id, oppRef: x.a === ref ? x.b : x.a });
      return { game: g, win: win && walk(tag(win, 'W:' + g.id), depth + 1), lose: lose && walk(tag(lose, 'L:' + g.id), depth + 1) };
    };
    return first ? walk(Object.assign({}, first, { oppRef: first.a === start ? first.b : first.a }), 0) : null;
  };
  window.VBTourney = T;
})();
