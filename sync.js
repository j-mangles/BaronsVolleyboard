/* VolleyBoard staff sync: anyone with the team link shares the same data.
   No accounts. The team code in the link is the key; the database won't list
   teams, so the data can't be found without it.
   If sync-config.js has no project yet, or the SDK can't load, the app keeps
   working exactly as before (saved on this device only). */
import { firebaseConfig } from './sync-config.js';
import { createSync } from './sync-core.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const CODE_KEY = 'volleyboard_team_code';
const VB = window.VB;
const LABELS = {
  local: '● Saved on device', connecting: '● Connecting…', pending: '● Saving…', syncing: '● Syncing…',
  synced: '● Synced with team', offline: '● Offline: will sync', error: '● Sync problem', denied: '● Sync problem'
};

let code = null, api = null, engine = null, currentStatus = 'local', lastError = '';
const getCode = () => { try { return localStorage.getItem(CODE_KEY); } catch { return null; } };
const setCode = c => { try { c ? localStorage.setItem(CODE_KEY, c) : localStorage.removeItem(CODE_KEY); } catch {} code = c; };
const newCode = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); };
const validCode = c => /^[a-z0-9]{20,40}$/.test(c || '');
const teamLink = () => location.origin + location.pathname + '#team=' + code;

// A team link opened on this device: remember the code and tidy the address bar.
const m = location.hash.match(/team=([a-z0-9]{20,40})/);
if (m) { setCode(m[1]); history.replaceState(null, '', location.pathname + location.search); }
code = getCode();

function setStatus(kind, err) {
  currentStatus = kind; lastError = err ? (err.code || err.message || String(err)) : '';
  const el = document.getElementById('saveStatus');
  if (el) { el.textContent = LABELS[kind] || LABELS.local; el.dataset.sync = kind; }
  renderButton();
}

/* ---------- button + dialog ---------- */
const css = document.createElement('style');
css.textContent = `
.vb-acct{font:inherit;font-size:13px;font-weight:700;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:6px 12px;cursor:pointer}
.save-status[data-sync=denied],.save-status[data-sync=error]{color:var(--red)}
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
#vbSync .msg{min-height:20px;font-size:14px;color:var(--gold);margin:10px 0 0}`;
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
  if (!api) {
    dlg.innerHTML = `<h2>Team sync</h2><p>${firebaseConfig ? 'Sync couldn’t load. Check the connection and reload.' : 'Sync isn’t set up yet. Everything is saved on this device.'}</p><div class="row"><button data-a="close">Close</button></div>`;
  } else if (code) {
    dlg.innerHTML = `<h2>Team sync is on</h2>
      <p>Roster, matches and saved plays are shared with every device that has the team link. Your whiteboard in progress stays on this device until you save it as a play.</p>
      <label>Team link (send this to coaches)<input id="vbLink" readonly value="${esc(teamLink())}"></label>
      <div class="row"><button class="go" data-a="copy">Copy link</button>${navigator.share ? '<button data-a="share">Share…</button>' : ''}<button data-a="close">Close</button></div>
      <hr><div class="row"><button data-a="leave">Stop syncing on this device</button></div>
      <p class="msg">${currentStatus === 'error' || currentStatus === 'denied' ? 'Last error: ' + esc(lastError) : ''}</p>`;
  } else {
    dlg.innerHTML = `<h2>Team sync</h2>
      <p>Share one roster, match history and play library with your coaching staff. Anyone with the team link can see and edit it. It keeps working offline and catches up when you reconnect.</p>
      <label>Got a team link from another coach? Paste it here<input id="vbJoin" placeholder="https://…#team=…" autocomplete="off"></label>
      <div class="row"><button class="go" data-a="join">Join team</button><button data-a="close">Cancel</button></div>
      <hr><p>Setting it up for the first time? This device’s roster, matches and plays become the team’s starting data.</p>
      <div class="row"><button data-a="create">Start team sync</button></div><p class="msg"></p>`;
  }
  if (!dlg.open) dlg.showModal();
}
dlg.addEventListener('click', async e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const a = b.dataset.a, msg = t => { const el = dlg.querySelector('.msg'); if (el) el.textContent = t; };
  if (a === 'close') return dlg.close();
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
  if (!api || !validCode(code)) return;
  engine = createSync({
    backend: api.backend(code),
    bridge: { get state() { return VB.state; }, applied: VB.applyRemote },
    storage: { getItem: k => localStorage.getItem(k + ':' + code), setItem: (k, v) => localStorage.setItem(k + ':' + code, v) },
    onStatus: setStatus
  });
  window.VBSync = engine;
  engine.start();
}

async function boot() {
  renderButton();
  if (!firebaseConfig || !VB) return;
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
            return F.onSnapshot(teamRef, s => { if (s.metadata.hasPendingWrites) return; cb(s.exists() ? s.data().data : null); }, onErr);
          },
          listen(kind, cb, onErr) {
            return F.onSnapshot(F.collection(db, 'teams', team, kind), snap => {
              const docs = snap.docs.map(d => [d.id, d.data().data]);
              const changes = snap.docChanges().filter(c => !c.doc.metadata.hasPendingWrites)
                .map(c => ({ type: c.type, id: c.doc.id, json: c.type === 'removed' ? null : c.doc.data().data }));
              cb(docs, changes);
            }, onErr);
          },
          async commit(ops) {
            for (let i = 0; i < ops.length; i += 400) {
              const batch = F.writeBatch(db);
              for (const o of ops.slice(i, i + 400)) {
                const ref = o.path === 'team' ? teamRef : F.doc(db, 'teams', team, o.path, o.id);
                if (o.op === 'delete') batch.delete(ref);
                else batch.set(ref, { data: o.json, updatedAt: F.serverTimestamp() });
              }
              if (navigator.onLine === false) batch.commit().catch(() => {}); // queued on the device, sent on reconnect
              else await batch.commit();
            }
          }
        };
      }
    };
    window.addEventListener('online', () => engine && engine.flushNow());
    window.addEventListener('offline', () => engine && setStatus('offline'));
    renderButton();
    startEngine();
  } catch (err) {
    console.warn('VolleyBoard sync unavailable', err);
    api = null; renderButton();
  }
}
boot();
