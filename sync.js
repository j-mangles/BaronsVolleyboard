/* VolleyBoard staff sync: anyone with the team link shares the same data.
   No accounts. The team code in the link is the key; the database won't list
   teams, so the data can't be found without it.
   If sync-config.js has no project yet, or the SDK can't load, the app keeps
   working exactly as before (saved on this device only). */
import { firebaseConfig } from './sync-config.js';
import { createSync, revision } from './sync-core.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const CODE_KEY = 'volleyboard_team_code';
const VB = window.VB;
const LABELS = {
  local: 'Saved on this device', connecting: 'Checking team history…', pending: 'Changes waiting to upload', syncing: 'Uploading changes…',
  synced: 'All changes synced with team', offline: 'Offline · saved on this device', error: 'Sync needs attention', conflict: 'Compare two saved versions'
};

let code = null, api = null, engine = null, currentStatus = 'local', lastError = '', currentInfo = {}, loading = false;
const getCode = () => { try { return localStorage.getItem(CODE_KEY); } catch { return null; } };
const setCode = c => { try { c ? localStorage.setItem(CODE_KEY, c) : localStorage.removeItem(CODE_KEY); } catch {} code = c; };
const newCode = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); };
const validCode = c => /^[a-z0-9]{20,40}$/.test(c || '');
const teamLink = () => location.origin + location.pathname + '#team=' + code;

// A team link opened on this device: remember the code and tidy the address bar.
const m = location.hash.match(/team=([a-z0-9]{20,40})/);
if (m) { setCode(m[1]); history.replaceState(null, '', location.pathname + location.search); }
code = getCode();

function statusText() {
  const { rallies = 0, changes = 0 } = currentInfo;
  if (['offline', 'connecting', 'pending', 'syncing'].includes(currentStatus) && changes) {
    const work = rallies ? rallies + (rallies === 1 ? ' rally' : ' rallies') : changes + (changes === 1 ? ' change' : ' changes');
    return (currentStatus === 'offline' ? 'Offline · ' : '') + work + ' awaiting upload';
  }
  return LABELS[currentStatus] || LABELS.local;
}
function paintStatus() {
  const text = statusText();
  for (const el of document.querySelectorAll('#saveStatus, [data-match-sync], [data-sync-dialog-status]')) {
    if (el.textContent !== text) el.textContent = text;
    el.dataset.sync = currentStatus;
  }
}
window.VBRefreshSyncStatus = paintStatus;
function setStatus(kind, err, info = {}) {
  currentStatus = kind; currentInfo = info; lastError = err ? (err.code || err.message || String(err)) : '';
  paintStatus(); renderButton();
  if (dlg.open && code && (kind === 'conflict' || dlg.querySelector('[data-conflicts]'))) renderConflicts();
}

/* ---------- button + dialog ---------- */
const css = document.createElement('style');
css.textContent = `
.vb-acct{font:inherit;font-size:13px;font-weight:700;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:6px 12px;cursor:pointer}
.save-status[data-sync=conflict],.save-status[data-sync=error]{color:var(--red)}
.save-status[data-sync=offline],.save-status[data-sync=connecting]{color:var(--gold)}
#vbSync{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);color:var(--ink);padding:22px;width:min(400px,calc(100vw - 32px))}
#vbSync::backdrop{background:#000a}
#vbSync h2{margin:0 0 6px;font-size:20px}#vbSync p{color:var(--muted);font-size:14px;line-height:1.45;margin:0 0 14px}
#vbSync label{display:grid;gap:5px;font-size:13px;color:var(--muted);margin-bottom:12px}
#vbSync input{font:inherit;font-size:15px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px 12px;width:100%;box-sizing:border-box}
#vbSync .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
#vbSync button{font:inherit;font-size:15px;font-weight:700;border-radius:10px;padding:10px 14px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);cursor:pointer}
#vbSync button.go{background:var(--teal);color:#062a22;border-color:var(--teal)}
#vbSync hr{border:0;border-top:1px solid var(--line);margin:16px 0}
#vbSync .msg{min-height:20px;font-size:14px;color:var(--gold);margin:10px 0 0}
@media(max-width:700px){.top-meta{display:flex!important;gap:8px}.top-meta .save-status{display:none}.vb-acct{padding:6px 10px}}`;
document.head.appendChild(css);

const dlg = document.createElement('dialog'); dlg.id = 'vbSync'; document.body.appendChild(dlg);
const btn = document.createElement('button'); btn.className = 'vb-acct'; btn.type = 'button';
btn.addEventListener('click', openDialog);
function renderButton() {
  const meta = document.querySelector('.top-meta');
  if (meta && !meta.contains(btn)) { meta.querySelector('.edition')?.remove(); meta.appendChild(btn); }
  btn.textContent = code && api ? 'Team sync' : 'Sync';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function openDialog() {
  if (!api && !engine) {
    dlg.innerHTML = `<h2>Team sync</h2><p>${firebaseConfig ? 'Sync couldn’t load. Check the connection and reload.' : 'Sync isn’t set up yet. Everything is saved on this device.'}</p><div class="row"><button data-a="close">Close</button></div>`;
  } else if (code) {
    dlg.innerHTML = `<h2>Team sync is on</h2>
      <p>Roster, matches and saved plays are shared with every device that has the team link. Your whiteboard in progress stays on this device until you save it as a play.</p>
      <label>Team link (send this to coaches)<input id="vbLink" readonly value="${esc(teamLink())}"></label>
      <div class="row"><button class="go" data-a="copy">Copy link</button>${navigator.share ? '<button data-a="share">Share…</button>' : ''}<button data-a="close">Close</button></div>
      <p data-sync-dialog-status role="status"></p><div data-conflicts></div><hr><div class="row"><button data-a="retry">Retry sync</button><button data-a="leave">Stop syncing on this device</button></div>
      <p class="msg">${currentStatus === 'error' || currentStatus === 'denied' ? 'Last error: ' + esc(lastError) : ''}</p>`;
  } else {
    dlg.innerHTML = `<h2>Team sync</h2>
      <p>Share one roster, match history and play library with your coaching staff. Anyone with the team link can see and edit it. It keeps working offline and catches up when you reconnect.</p>
      <label>Got a team link from another coach? Paste it here<input id="vbJoin" placeholder="https://…#team=…" autocomplete="off"></label>
      <div class="row"><button class="go" data-a="join">Join team</button><button data-a="close">Cancel</button></div>
      <hr><p>Setting it up for the first time? This device’s roster, matches and plays become the team’s starting data.</p>
      <div class="row"><button data-a="create">Start team sync</button></div><p class="msg"></p>`;
  }
  paintStatus(); renderConflicts();
  if (!dlg.open) dlg.showModal();
}
function renderConflicts() {
  const root = dlg.querySelector('[data-conflicts]');
  if (!root) return;
  const conflicts = engine?.getConflicts() || [];
  root.innerHTML = conflicts.map(({ key, team, device }) => {
    const title = key === 'team' ? 'Team settings' : (JSON.parse(device || team || '{}').opponent || JSON.parse(device || team || '{}').name || key);
    const summary = json => {
      if (!json) return 'Deleted';
      const d = JSON.parse(json);
      if (key.startsWith('matches/')) return (d.sets || []).map(s => s.home + '–' + s.away).join(', ') + ' · ' + (d.events || []).length + ' recorded actions';
      return key === 'team' ? (d.players || []).length + ' players' : (d.name || 'Saved play');
    };
    return '<section><h3>' + esc(title) + '</h3><p>This device and the team both changed the same record. Download the two versions to compare them.</p><p>This device · ' + esc(summary(device)) + '<br>Team · ' + esc(summary(team)) + '</p><div class="row" data-key="' + esc(key) + '"><button data-a="backup-conflict">Download both</button><button data-a="keep-device">Use this device</button><button data-a="keep-team">Use team version</button></div></section>';
  }).join('');
}
dlg.addEventListener('click', async e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const a = b.dataset.a, msg = t => { const el = dlg.querySelector('.msg'); if (el) el.textContent = t; };
  if (a === 'close') return dlg.close();
  if (a === 'retry') {
    if (!api) { boot(); return; }
    startEngine(); return;
  }
  if (a === 'backup-conflict' || a === 'keep-device' || a === 'keep-team') {
    const key = b.parentElement.dataset.key;
    const record = engine?.getConflicts().find(r => r.key === key);
    if (!record) return;
    if (a === 'backup-conflict') {
      const blob = new Blob([JSON.stringify({ record: key, device: JSON.parse(record.device), team: JSON.parse(record.team) }, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'volleyboard-version-comparison.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } else if (confirm('Keep the ' + (a === 'keep-team' ? 'team' : 'device') + ' version of this record? Download both first if you want to keep a backup.')) {
      engine.resolve(key, a === 'keep-team' ? 'team' : 'device'); openDialog();
    }
    return;
  }
  if (a === 'copy') { const i = dlg.querySelector('#vbLink'); try { await navigator.clipboard.writeText(i.value); msg('Copied.'); } catch { i.select(); msg('Select the link and copy it.'); } return; }
  if (a === 'share') { navigator.share({ title: 'VolleyBoard team link', url: teamLink() }).catch(() => {}); return; }
  if (a === 'join') {
    const v = (dlg.querySelector('#vbJoin').value || '').trim();
    const c = (v.match(/team=([a-z0-9]{20,40})/) || [])[1] || (validCode(v) ? v : null);
    if (!c) return msg('That doesn’t look like a team link. Copy the whole link from the other coach.');
    setCode(c); startEngine(); openDialog(); return;
  }
  if (a === 'create') { setCode(newCode()); startEngine(); openDialog(); return; }
  if (a === 'leave') {
    if (!confirm('Stop syncing on this device? Your data stays here, it just stops updating with the team. You can rejoin with the team link.')) return;
    stopEngine(); setCode(null); setStatus('local'); dlg.close();
  }
});

/* ---------- Firebase wiring ---------- */
function stopEngine() { if (engine) { engine.stop(); engine = null; window.VBSync = null; } }
function startEngine() {
  stopEngine();
  if (!validCode(code) || !VB) return;
  const team = code;
  let backend;
  const live = () => backend ||= api.backend(team);
  engine = createSync({
    backend: {
      online: () => navigator.onLine !== false,
      listenTeam: (...args) => live().listenTeam(...args),
      listen: (...args) => live().listen(...args),
      commit: ops => live().commit(ops)
    },
    bridge: { get state() { return VB.state; }, applied: VB.applyRemote },
    storage: { getItem: k => localStorage.getItem(k + ':' + team), setItem: (k, v) => localStorage.setItem(k + ':' + team, v) },
    onStatus: setStatus
  });
  window.VBSync = engine;
  if (api) engine.start(); else engine.refreshStatus();
}

async function boot() {
  if (loading || api || !firebaseConfig || !VB) return;
  loading = true;
  try {
    const [{ initializeApp }, F] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')]);
    const app = initializeApp(firebaseConfig);
    const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    api = {
      backend(team) {
        const teamRef = F.doc(db, 'teams', team);
        return {
          online: () => navigator.onLine !== false,
          listenTeam(cb, onErr) {
            return F.onSnapshot(teamRef, { includeMetadataChanges: true }, s => {
              if (!s.metadata.fromCache && !s.metadata.hasPendingWrites) cb(s.exists() ? s.data().data : null);
            }, onErr);
          },
          listen(kind, cb, onErr) {
            return F.onSnapshot(F.collection(db, 'teams', team, kind), { includeMetadataChanges: true }, snap => {
              if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) cb(snap.docs.map(d => [d.id, d.data().data]));
            }, onErr);
          },
          async commit(ops) {
            const rejected = [];
            // Transactions compare against the last confirmed version. A second
            // device editing the same record cannot silently erase this edit.
            for (let i = 0; i < ops.length; i += 50) {
              const items = ops.slice(i, i + 50);
              const result = await F.runTransaction(db, async tx => {
                const refs = items.map(o => o.path === 'team' ? teamRef : F.doc(db, 'teams', team, o.path, o.id));
                const previous = await Promise.all(refs.map(ref => tx.get(ref)));
                const conflicts = [];
                items.forEach((o, n) => {
                  const actual = previous[n].exists() ? previous[n].data().data : null;
                  if (actual === o.json) return;
                  if (revision(actual) !== o.base) {
                    conflicts.push([o.path === 'team' ? 'team' : o.path + '/' + o.id, actual]); return;
                  }
                  if (o.op === 'delete') tx.delete(refs[n]);
                  else tx.set(refs[n], { data: o.json, updatedAt: F.serverTimestamp() });
                });
                return conflicts;
              });
              rejected.push(...result);
            }
            return rejected;
          }

        };
      }
    };
    renderButton();
    if (engine) engine.start(); else startEngine();
  } catch (err) {
    console.warn('VolleyBoard sync unavailable', err);
    api = null;
    if (engine) setStatus(navigator.onLine === false ? 'offline' : 'error', err, currentInfo);
  } finally { loading = false; }
}
window.addEventListener('online', () => { if (!api) boot(); else engine?.flushNow(); });
window.addEventListener('offline', () => engine?.refreshStatus());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') engine?.flushNow();
  else if (!api) boot(); else engine?.flushNow();
});
renderButton();
if (firebaseConfig && VB) startEngine();
boot();
