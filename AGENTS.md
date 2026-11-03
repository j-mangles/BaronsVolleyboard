# VolleyBoard: working rules for coding agents

Courtside scoring and stats app for the Barons volleyball team (coach uses it on iPad and phone during real games). Single page: `index.html` (all CSS and the app script), `sync-core.js` + `sync.js` (Firebase team sync), `tourney.js` (pool standings and Saturday path), `sw.js` (offline cache).

## Every change
1. `git pull origin main` first. Another agent also pushes here.
2. Run the tests: `node test/sync.test.mjs && node test/tourney.test.mjs`. Fix failures before pushing.
3. Bump `CACHE` in `sw.js` on every deploy, or coaches keep the old version offline.
4. Never enter test data on the live site: it syncs to the real team.

## Theming
- Every colour comes from the tokens in the `:root` block at the top of `index.html` (the comment there explains each one). A theme changes only that block. Don't add new hard-coded colours; use a token or `color-mix()` of tokens.
- `--good` / `--bad` mean our point / their point. Keep green-ish for us and red-ish for them in every theme.
- Light themes: swap `--shade` and `--glow` (dark tints then mix toward white, light text toward black) and check `--on-accent` contrast.
- It's used under bright gym lights at arm's length: big tap targets, strong contrast, no motion that slows scoring.
- The whiteboard canvas colours (in the script) are a drawing surface and stay as they are.

## Check it visually
Serve the folder (`python3 -m http.server 8765`), start a match, score a few points, and screenshot the Match, Lineup, Game Day and Tourney tabs at 390×844 and 1024×1366 before you push.

## Coding discipline
Surgical changes, least code that works, state assumptions, verify before pushing (see the `karpathy-coding-guidelines` skill if available).
