# VolleyBoard

Barons volleyball coaching app: court whiteboard, Game Day scoring and stats. Works offline once installed to a home screen. Rosters and match data are stored only on the device.

Live at https://j-mangles.github.io/BaronsVolleyboard/

## Staff sync

Coaches sign in (top right) with an email and password. Roster, matches and saved plays sync through Firebase; the whiteboard in progress, current tab and undo history stay on each device. Who has access is controlled by the email list in `firestore.rules` (paste it into Firebase console → Firestore → Rules). The project config in `sync-config.js` is not secret.

`node test/sync.test.mjs` runs the sync tests.
