/* Historical serving edits are overlays. Rally scores and original court snapshots stay intact. */
(function (root) {
  'use strict';
  const owns = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const teamSide = side => side === 'home' || side === 'away';
  const homeServe = action => ['ace', 'serveError', 'serveIn'].includes(action);
  const isRally = e => (e.dh === 1 && e.da === 0) || (e.da === 1 && e.dh === 0);
  const mod6 = n => ((n % 6) + 6) % 6;

  function context(match, event, config = match.serviceReview?.[event.setIndex] || {}, fix = event.serveFix || {}) {
    const raw = event.rallyContext || {};
    const replay = config.opening?.events?.[event.id];
    const base = replay?.side ?? raw.serving;
    const recorded = config.flip && teamSide(base) ? (base === 'home' ? 'away' : 'home') : base;
    let side = fix.side || recorded || null;
    if (homeServe(event.action)) side = 'home';
    // Older versions permitted manual review of an opponent ace. Respect that edit.
    if (replay && event.action === 'oppAce' && !fix.side) side = 'away';
    let serverId = owns(fix, 'serverId') ? fix.serverId :
      (homeServe(event.action) && event.playerId) || (replay && owns(replay, 'serverId') ? replay.serverId :
        (raw.serving === 'home' ? raw.serverId : null));
    if (side !== 'home') serverId = null;
    const rotation = replay?.rotation ?? raw.rotation ?? event.rotation;
    return { side, serverId:serverId || null, rotation:Number.isInteger(rotation) ? rotation : null };
  }

  function openingConfig(match, set, openingSide) {
    if (!teamSide(openingSide)) throw new Error('Select the opening serving side.');
    const events = {}, notes = new Set(), score = [0, 0];
    const lineup = (match.lineupEvents || []).filter(e => e.setIndex === set);
    const liberos = new Set();
    for (const e of lineup) {
      if (['liberoIn', 'liberoSwitch'].includes(e.type)) liberos.add(e.inId);
      if (['liberoOut', 'liberoSwitch'].includes(e.type)) liberos.add(e.outId);
    }
    if (match.regulation?.setIndex === set) for (const id of match.regulation.liberos || []) liberos.add(id);
    const manual = new Map();
    for (const e of lineup) {
      if (!Array.isArray(e.score) || !(e.type === 'serve' || (e.type === 'rotate' && e.source === 'manual'))) continue;
      const key = e.score.join('-');
      if (!manual.has(key)) manual.set(key, []);
      manual.get(key).push(e);
    }

    let side = openingSide, offset = 0, requiredNextRotation = null, count = 0, lastScore;
    for (const e of match.events || []) {
      if (e.setIndex !== set) continue;
      if (e.dh < 0 || e.da < 0) {
        notes.add('Replay stops at the score adjustment. Review later rallies individually.');
        break;
      }
      const point = isRally(e);
      if (!(point || e.action === 'serveIn' || e.action === 'passRating')) continue;
      if (!e.id) {
        notes.add('Replay stops at a legacy entry without a rally ID. Review the remaining entries individually.');
        break;
      }
      const raw = e.rallyContext || {}, fix = e.serveFix || {}, key = score.join('-');
      if (count && lastScore !== key) {
        for (const change of manual.get(key) || []) {
          if (change.type === 'serve' && teamSide(change.serving)) side = change.serving;
          if (change.type === 'rotate') { requiredNextRotation = null; offset = 0; }
        }
      }
      lastScore = key;
      const rawRotation = Number.isInteger(raw.rotation) ? raw.rotation : e.rotation;
      if (Number.isInteger(rawRotation) && requiredNextRotation !== null) {
        offset = requiredNextRotation - rawRotation;
        requiredNextRotation = null;
      }
      const rotation = Number.isInteger(rawRotation) ? rawRotation + offset : null;
      const overlay = {};
      if (rotation !== rawRotation && Number.isInteger(rotation)) overlay.rotation = rotation;
      if (e.action === 'passRating') {
        if (owns(overlay, 'rotation')) events[e.id] = overlay;
        continue;
      }
      let actual = side;
      if (homeServe(e.action)) actual = 'home';
      else if (fix.side) actual = fix.side;
      else if (e.action === 'oppAce') actual = 'away';
      else if (fix.serverId) actual = 'home';
      if (!count && actual !== openingSide) notes.add('The first rally has an explicit serve or a manual correction. That entry takes priority.');
      if (actual !== raw.serving || e.action === 'oppAce') overlay.side = actual;
      if (actual === 'home' && (raw.serving !== 'home' || mod6(offset) !== 0)) {
        const slots = raw.lineup;
        const candidate = Array.isArray(slots) && slots.length === 6 && (offset === 0 || Number.isInteger(rotation)) ? slots[mod6(offset)] : null;
        overlay.serverId = candidate && !liberos.has(candidate) ? candidate : null;
        if (!overlay.serverId && !homeServe(e.action) && !owns(fix,'serverId')) notes.add('Some serves have no reliable player assignment.');
      }
      if (Object.keys(overlay).length) events[e.id] = overlay;
      if (!point) { side = actual; continue; }
      count++;
      // Only adjust rotations where the correction changes whether we won a side-out.
      // The next actual court snapshot includes intervening subs and libero replacements.
      if (e.dh === 1 && teamSide(actual) && (actual === 'away') !== (raw.serving === 'away') && Number.isInteger(rotation)) {
        requiredNextRotation = rotation + (actual === 'away' ? 1 : 0);
      }
      score[0] += e.dh; score[1] += e.da;
      side = e.dh === 1 ? 'home' : 'away';
    }
    return {opening:{side:openingSide, events}, notes:[...notes], count};
  }

  function snapshot(match, set) {
    const fixes = (match.events || []).filter(e => e.setIndex === set && e.serveFix).map(e => [e.id, {...e.serveFix}]);
    return {config:match.serviceReview?.[set] ? JSON.parse(JSON.stringify(match.serviceReview[set])) : null, fixes};
  }

  function restore(match, set, saved) {
    match.serviceReview ||= {};
    if (saved.config) match.serviceReview[set] = saved.config;
    else delete match.serviceReview[set];
    const fixes = new Map(saved.fixes);
    for (const e of match.events || []) if (e.setIndex === set) {
      if (fixes.has(e.id)) e.serveFix = fixes.get(e.id);
      else delete e.serveFix;
    }
  }

  function preview(match, set, choice) {
    const before = snapshot(match, set), reset = choice === 'reset', changes = [];
    const replay = reset ? null : openingConfig(match, set, choice);
    const after = reset ? {config:null, fixes:[]} : {
      config:{...before.config, flip:false, reviewed:false, opening:replay.opening}, fixes:before.fixes
    };
    let rally = 1, tracked = 0;
    for (const e of match.events || []) {
      if (e.setIndex !== set) continue;
      if (!(isRally(e) || e.action === 'serveIn' || e.action === 'passRating')) continue;
      tracked++;
      const from = context(match,e), to = context(match,e,after.config || {},reset ? {} : e.serveFix || {});
      if (from.side !== to.side || from.serverId !== to.serverId || from.rotation !== to.rotation || (reset && e.serveFix)) {
        changes.push({id:e.id, rally, action:e.action, from, to});
      }
      if (isRally(e)) rally++;
    }
    return {before, after, changes, notes:replay?.notes || [], count:replay?.count ?? tracked};
  }

  root.VBServeReview = {context, preview, snapshot, restore};
})(globalThis);
