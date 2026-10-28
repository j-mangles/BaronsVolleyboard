# VolleyBoard

Barons volleyball coaching app: court whiteboard, Game Day scoring and stats. Works offline once installed to a home screen. Rosters and match data are stored only on the device.

Live at https://j-mangles.github.io/BaronsVolleyboard/

## Team sync

Tap **Sync** (top right) → **Start team sync** on one device, then send the team link to the other coaches. Everyone with the link shares the roster, matches and saved plays through Firebase; the whiteboard in progress, current tab and undo history stay on each device. There are no accounts: the code in the link is the key, and the database rules (`firestore.rules`, pasted into Firebase console → Firestore → Rules) don't allow listing teams. The project config in `sync-config.js` is not secret.

`node test/sync.test.mjs` runs the sync tests.
