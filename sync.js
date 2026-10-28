/* VolleyBoard staff sync: Firebase sign-in + Firestore, wired to sync-core.js.
   If sync-config.js has no project yet, or the SDK can't load, the app keeps
   working exactly as before (saved on this device only). */
import { firebaseConfig, TEAM_ID } from './sync-config.js';
import { createSync } from './sync-core.js';

const V = '10.14.1', SDK = `https://www.gstatic.com/firebasejs/${V}/`;
const VB = window.VB;
const statusEl = () => document.getElementById('saveStatus');
const LABELS = {
  local: '● Saved on device', connecting: '● Connecting…', pending: '● Saving…', syncing: '● Syncing…',
  synced: '● Synced with staff', offline: '● Offline: will sync', error: '● Sync problem', denied: '● Not on staff list'
};
let currentStatus = 'local', lastError = '';
function setStatus(kind, err) {
  if (kind === 'error' && err && /permission/i.test(err.code || err.message || '')) kind = 'denied';
  currentStatus = kind; lastError = err ? (err.code || err.message || String(err)) : '';
  const el = statusEl(); if (el) { el.textContent = LABELS[kind] || LABELS.local; el.dataset.sync = kind; }
  renderAccount();
}

/* ---------- account button + dialog ---------- */
let auth = null, user = null, api = null;
const css = document.createElement('style');
css.textContent = `
.vb-acct{font:inherit;font-size:13px;font-weight:700;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:6px 12px;cursor:pointer}
.save-status[data-sync=denied],.save-status[data-sync=error]{color:var(--red)}
.save-status[data-sync=offline],.save-status[data-sync=connecting]{color:var(--gold)}
#vbSync{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);color:var(--ink);padding:22px;width:min(380px,calc(100vw - 32px))}
#vbSync::backdrop{background:#000a}
#vbSync h2{margin:0 0 6px;font-size:20px}#vbSync p{color:var(--muted);font-size:14px;line-height:1.45;margin:0 0 14px}
#vbSync label{display:grid;gap:5px;font-size:13px;color:var(--muted);margin-bottom:12px}
#vbSync input{font:inherit;font-size:16px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
#vbSync .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
#vbSync button{font:inherit;font-size:15px;font-weight:700;border-radius:10px;padding:10px 14px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);cursor:pointer}
#vbSync button.go{background:var(--teal);color:#062a22;border-color:var(--teal)}
#vbSync .link{background:none;border:0;padding:4px 0;color:var(--blue);font-weight:600;font-size:14px}
#vbSync .msg{min-height:20px;font-size:14px;color:var(--gold);margin:10px 0 0}`;
document.head.appendChild(css);

const dlg = document.createElement('dialog'); dlg.id = 'vbSync'; document.body.appendChild(dlg);
const btn = document.createElement('button'); btn.className = 'vb-acct'; btn.type = 'button';
btn.addEventListener('click', openDialog);
function placeButton() {
  const meta = document.querySelector('.top-meta'); if (!meta || meta.contains(btn)) return;
  const ed = meta.querySelector('.edition'); if (ed) ed.remove();
  meta.appendChild(btn);
}
function renderAccount() {
  placeButton();
  btn.textContent = !auth ? 'Sync' : user ? (user.email || 'Signed in').split('@')[0] : 'Sign in to sync';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function openDialog() {
  if (!auth) {
    dlg.innerHTML = `<h2>Staff sync</h2><p>${firebaseConfig ? 'Sync couldn’t load. Check the connection and reload.' : 'Sync isn’t set up yet. Everything is saved on this device.'}</p><div class="row"><button value="close">Close</button></div>`;
  } else if (user && !user.emailVerified) {
    dlg.innerHTML = `<h2>Check your email</h2><p>We sent a link to <b>${esc(user.email)}</b>. Tap it, then come back and press Done.</p>
      <div class="row"><button class="go" data-a="recheck">Done</button><button data-a="resend">Resend link</button><button data-a="out">Sign out</button></div><p class="msg"></p>`;
  } else if (user) {
    const note = currentStatus === 'denied'
      ? 'This account isn’t on the staff list yet. Ask the head coach to add your email.'
      : 'Roster, matches and saved plays are shared with the coaching staff. Your whiteboard in progress stays on this device until you save it as a play.';
    dlg.innerHTML = `<h2>Staff sync</h2><p>Signed in as <b>${esc(user.email)}</b>.</p><p>${note}</p>
      <div class="row"><button value="close" class="go">Close</button><button data-a="out">Sign out</button></div><p class="msg">${currentStatus === 'error' ? esc(lastError) : ''}</p>`;
  } else {
    dlg.innerHTML = `<h2>Sign in to sync</h2><p>Coaches on the staff list share the same roster, matches and plays on every device. It still works offline and catches up when you reconnect.</p>
      <form method="dialog" id="vbForm"><label>Email<input id="vbEmail" type="email" autocomplete="username" required></label>
      <label>Password<input id="vbPass" type="password" autocomplete="current-password" minlength="6" required></label>
      <div class="row"><button class="go" data-a="in">Sign in</button><button data-a="up">Create account</button><button value="close" formnovalidate>Cancel</button></div></form>
      <button class="link" data-a="reset">Forgot password?</button><p class="msg"></p>`;
  }
  if (!dlg.open) dlg.showModal();
}
dlg.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.value === 'close') { e.preventDefault(); dlg.close(); return; }
  const a = b.dataset.a; if (!a) return;
  e.preventDefault();
  const msg = t => { const m = dlg.querySelector('.msg'); if (m) m.textContent = t; };
  const email = dlg.querySelector('#vbEmail')?.value.trim(), pass = dlg.querySelector('#vbPass')?.value;
  try {
    if (a === 'in' || a === 'up') {
      if (!email || !pass) return msg('Enter your email and a password (6+ characters).');
      b.disabled = true; msg(a === 'in' ? 'Signing in…' : 'Creating account…');
      if (a === 'in') await api.signIn(auth, email, pass);
      else { const c = await api.signUp(auth, email, pass); await api.verify(c.user); }
    } else if (a === 'reset') {
      if (!email) return msg('Type your email above first.');
      await api.reset(auth, email); msg('Password reset email sent.');
      return;
    } else if (a === 'resend') { await api.verify(user); msg('Sent again.'); return; }
    else if (a === 'recheck') {
      await user.reload(); await user.getIdToken(true);
      if (!auth.currentUser.emailVerified) return msg('Not verified yet. Tap the link in the email first.');
      onUser(auth.currentUser, true);
    } else if (a === 'out') { await api.signOut(auth); dlg.close(); return; }
    openDialog();
  } catch (err) {
    b.disabled = false;
    const code = err.code || '';
    msg(code.includes('invalid-credential') || code.includes('wrong-password') ? 'Email or password is wrong.'
      : code.includes('email-already-in-use') ? 'That email already has an account. Use Sign in.'
      : code.includes('weak-password') ? 'Use a password with at least 6 characters.'
      : code.includes('network') ? 'No connection. Try again when you’re online.'
      : 'Couldn’t do that: ' + (code || err.message));
  }
});

/* ---------- Firebase wiring ---------- */
let engine = null;
function onUser(u, force) {
  const same = user && u && user.uid === u.uid && !force;
  user = u; renderAccount();
  if (same) return;
  if (engine) { engine.stop(); engine = null; window.VBSync = null; }
  if (u && u.emailVerified) {
    engine = createSync({ backend: api.backend, bridge: { get state() { return VB.state; }, applied: VB.applyRemote }, storage: localStorage, onStatus: setStatus });
    window.VBSync = engine;
    engine.start();
  } else setStatus('local');
}

async function boot() {
  renderAccount();
  if (!firebaseConfig || !VB) return;
  try {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')
    ]);
    const app = initializeApp(firebaseConfig);
    auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence] });
    const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    const teamRef = F.doc(db, 'teams', TEAM_ID);
    const col = kind => F.collection(db, 'teams', TEAM_ID, kind);
    const who = () => (auth.currentUser && auth.currentUser.email) || '';
    api = {
      signIn: A.signInWithEmailAndPassword, signUp: A.createUserWithEmailAndPassword,
      verify: u => A.sendEmailVerification(u, { url: location.href.split('#')[0] }),
      reset: A.sendPasswordResetEmail, signOut: A.signOut,
      backend: {
        online: () => navigator.onLine !== false,
        listenTeam(cb, onErr) {
          return F.onSnapshot(teamRef, s => { if (s.metadata.hasPendingWrites) return; cb(s.exists() ? s.data().data : null); }, onErr);
        },
        listen(kind, cb, onErr) {
          return F.onSnapshot(col(kind), snap => {
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
              const ref = o.path === 'team' ? teamRef : F.doc(db, 'teams', TEAM_ID, o.path, o.id);
              if (o.op === 'delete') batch.delete(ref);
              else batch.set(ref, { data: o.json, updatedAt: F.serverTimestamp(), by: who() });
            }
            if (navigator.onLine === false) batch.commit().catch(() => {}); // queued locally, sends on reconnect
            else await batch.commit();
          }
        }
      }
    };
    window.addEventListener('online', () => engine && engine.flushNow());
    window.addEventListener('offline', () => engine && setStatus('offline'));
    A.onAuthStateChanged(auth, u => onUser(u));
  } catch (err) {
    console.warn('VolleyBoard sync unavailable', err);
    auth = null; renderAccount();
  }
}
boot();
