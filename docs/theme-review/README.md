# VolleyBoard theme review evidence

These screenshots belong to the three independent token-only theme PRs. This branch stores review artifacts so each theme PR changes only the existing `:root` block in `index.html`.

Each palette was exercised on phone (390 × 844) and iPad portrait (1024 × 1366): start a local match, choose serving, score to 18–16, attribute a kill, undo, enter a sample tournament set and select a Saturday finishing position. Match, Tourney, Lineup and Game Day were captured. Demo team/opponent/players and synthetic scores exist only in isolated browser localStorage. External traffic and service workers were blocked; no live site or Firebase team was modified.

`measurements.json` records sampled control/navigation text contrast. Minimum sampled ratios are Broadcast Blue 5.16:1, Gym Contrast 5.18:1 and Barons Green 5.30:1. This is a targeted browser check, not a complete accessibility audit or a physical gym glare test. Tap targets, layout, labels, fonts, application logic and whiteboard drawing colours remain unchanged.

Design-taste app sheets informed the palette choices: monitoring/data-terminal (seed 1805820661) and true-black-flat (seed 1489917215), with a Barons brand-colour adaptation for the third. The light accent-ladder sheet (seed 1783550936) was considered but not applied: the existing quick-score labels are fixed white, so a fully light palette requires CSS changes outside the authorized block. The user's token-only requirement takes precedence over the sheets' layout and typography changes.

Design-taste lint and app inspection were run. Existing emoji navigation, scoreboard gradient, small labels, differing panel heights, strong semantic accents, and tournament number alignment remain because removing those would change application CSS outside the theme block. No general design-gate pass is claimed. Token changes were checked separately against actual computed control contrast, responsive overflow and the unchanged source outside `:root`.

Both repository test scripts passed for each theme. The service-worker cache was not bumped: these are unmerged review PRs, not deployments. Before any later deployment, follow AGENTS.md's cache-bump rule.

All requested Match/Tourney screenshots and the additional Lineup/Game Day checks are included at both sizes. No photographs or external design assets were added.
