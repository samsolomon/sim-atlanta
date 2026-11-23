# Handoff: studio-tree-lab (tree species looks in the Model Lab)

Written 2026-11-23 by the Claude tree-lab agent, for its Codex successor.

## State
- Worktree `studio-tree-lab`; all work is merged. No open PRs. This doc lands on its own small branch, `samsolomon/studio-tree-lab-handoff`.
- Merged today: #325 (pair 5: American elm and flowering dogwood, plus `setDetail`/`{ carpet: false }` for the rollout) and #333 (magnolia gloss round 2: leaf specks, and the `Habit.cone` envelope).
- Code: `web/src/trees/looks.ts` (createLook, options, calendars), `foliage-kit.ts` (cards, shaders, blooms, specks), `broadleaf.ts` (habits, masses, envelope), species files `oaks.ts`, `pine-poplar.ts`, `maple-sweetgum.ts`, `magnolia-crape.ts`, `japanese-maple.ts`, `elm-dogwood.ts`, registry `looks-index.ts`, lab `web/src/models/main.ts`.
- Docs: `docs/tree-species.md` (every species section, the brightness table, Sam's picks) and `docs/build-log.md`. Sheets go in `docs/log/ui/tree-species/`.

## Sam's decisions (all 23 Nov 2026)
- Picks (lab defaults): **A** for willow oak, water oak, tulip poplar, red maple, sweetgum, crape myrtle, loblolly (tiered tufts), Japanese maple, and **American elm**. **C4** for the ginkgo. The shared crown fixes (crowning tuft, edge-on fade, outline clamp) are the base for every species.
- The elm goes to City in the *next* rollout round, with the oaks, not the current one.
- Magnolia: pending. Round 2 sheet: `options-magnolia-gloss-2.jpg` (A dark cone; A1, A2 and A3 at speck densities 5, 10 and 18%).
- Dogwood: direction A, drop C. Round 2 is owed (below).
- Rules: crown brightness within about 5% of the generic canopy (0.248/0.806), measured with `__lab.crownStats()`; the magnolia is deliberately darker. Budget 196/156 triangles per tree. Everything is `illustrative`.

## Next steps, in order
1. **Dogwood round 2** (coordinator msg_850e71480ea2):
   - A at eye level in bloom is broken: cards float above the crown, the green is lopsided, and the trunk is a thin black spike.
   - The bloom reads grey-beige; it should be true white in sun with no glow at night. Check the shade, grade and `bloomLift`.
   - The tiers don't read. Make it lower and wider (spread > height), with a short trunk forking at 1–1.5 m and three flat, separated tiers that also show in summer.
   - Winter is too sparse: add fine horizontal twigs within budget.
   - Sheet: A at eye level matched to the Atlanta reference, then rows for bloom, summer, fall, winter, night and low tier.
2. **Pair 6, white oak.** Research is in `docs/handoffs/studio-tree-lab-white-oak.md`. Use the same deliverable as the other pairs: 2–3 options, four sizes, a calendar, a sheet with cited photos, triangles and draws, and brightness.
3. Act on Sam's magnolia pick when it comes: set it as the default, and drop the unpicked variants if he says so.

## Promises to other agents
- Tree-species (`orca_session_id:6b76e039-f4f6-472d-b827-e2a3fdf94a0a`, Claude name studio-tree-species-ee) is wiring the looks into City. I told it to add real bounding spheres and a one-form-per-look option (`{ forms: 'mature' }`) in its own wiring PR, and to ping tree-lab about any looks API problems. Answer those pings.
- The coordinator (`term_05a952fa…` on the Air) wants one merge notice per PR, sent with `orca orchestration reply`, with GitHub blob links to the sheets, money shot first.

## Servers and tools
- Vite dev on :5833 (`web/`), and a capture receiver `recv.mjs` on :5199 that also serves `sheet.html` to compose sheets. Both are stopped at handoff. The scripts lived in the session scratchpad, which is temporary. To rebuild them: the lab exposes `__lab.render()`, `__lab.view('Eye level')`, `__lab.camera` and `__lab.controls`; capture by drawing the WebGL canvas to a 2D canvas and posting a JPEG.
- Brightness: `/models.html?size=mature&t=2026-07-01T12:00:00-04:00&v=<id>&variant=A&tier=high|low`, then `__lab.crownStats()`.

## Rules that bit
- Squash only against `git merge-base HEAD origin/main`. A `reset --soft origin/main` after main moved once swept other agents' files into a commit.
- `docs/build-log.md` conflicts on almost every rebase. Keep both sides.
- Derivatives (`dFdx`) are undefined after a `discard`: compute them first. Any visibility change belongs in the shared visibility patch (`userData.maskShader`), or the ink mask and crownStats disagree with what is drawn.
- Budget tests count limbs per tier mass: adding a tier can overflow 196.
- No CI checks run on PRs: run `pnpm test` (or tsc plus vitest in `web/`) yourself before merging.
