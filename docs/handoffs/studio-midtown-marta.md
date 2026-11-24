# Handoff: studio-midtown-marta — Codex to 6.2, 2026-11-23

## Current state

- Branch: `samsolomon/north-ave-underpass`, pushed WIP. **No North Ave PR yet. Do not merge as-is.**
- Arts Center fix #339 is merged, verified with `gh pr view 339 --json state,mergeCommit`:
  `MERGED`, `6c4d2f85d97850ad148443419acd5bc55f39033c`.
- Tree rollout failure was stale data. `node scripts/stage-square-board.mjs --midtown`
  restored all 10 tests; no tree code fix needed.
- North Ave evidence is in `docs/north-ave-underpass.md`, with NBI record, lidar
  summary, Wayback metadata and a reproducible survey script. Commercial images
  remain outside git; only the public-domain lidar plot is committed.

## Sam's approved option C (coordinator msg_f7745baf5c72)

Build reported two-span Marietta concrete slab (4.69 m reported clearance), one
continuous active-rail cover without invented joints, three disconnected disused
strips/gaps. Disused and rail soffit clearance (4.5 m) are inferred, docs only.
Rail over the crossing at <=1.5% grade; low North Ave road in shared trench;
supports outside lanes/shoulders. About +5k triangles and <=2 draws at low,
shared materials/no new textures, measured with `__perf.report` plus `test:perf`.
Matched day/night before/after including target (-783,-1860), and an under-deck
close-up. Merge after review; only coordinator deploys. Option D can split the
active cover later if photographs establish joints.

## Implementation WIP

`web/src/terrain/north-ave.ts` shares survey axis, floor, five cover groups,
OpenSlots, inferred rail profile and road heights. `model.ts` adds its slots;
`transport.ts` uses rail grades, road height queries, and draws structures into
its existing batch (no new draw). `north-ave.test.ts` checks actual rail fixtures,
trench holes and structure budget. `ground-contact.test.ts` provisionally removes
GRADED_CUTS; its **both-tier audits pass on current WIP**.

Current rail profile is linear between raw DEM anchors at cross-axis t=-40/+40 m,
not the initial +/-120 m. Ground outside stays on the existing pipeline. Tests
sample the crossing/approaches to |t|<39, finding <=1.5%. Turnout fragments without
both anchors fall back to the common formation at the missing anchor. This needs
careful seam/turnout review. The common deck top and separate track grades also
need an under-deck/top-of-rail visual check for intersection.

Important experiment history (do not resurrect blindly):
- A terrain blend over +/-120 m failed the grade test (2.49%). Linear anchors fixed it.
- Disabling ballast drape across the graded region left 8 high-tier penetrations
  (worst 3.6 cm). Forced tiny yields fixed them but were expensive.
- Convex hull yields per track and then finer cutting samples also passed but cost
  too much. Both are removed now; `cutting.ts` is unchanged. Latest +/-40 m scope
  passes with original cutting sampling and no special extra yields.

## Verification and next steps, in order

1. Measure current WIP low-tier delta. Last measured **older +/-120 m** version was
   1,610,306 triangles /83 draws vs baseline 1,596,587 /83 at
   `?view=city&q=low&cam=-783,-1860,235,55,350&t=2026-11-20T14:00:00-05:00`.
   That +13,719 **failed local cap**. Latest +/-40 m version is NOT yet measured;
   do not reuse old number as its result. Direct structure builder is <4k tris.
   Files `/tmp/north-ave-before-perf.json`, `/tmp/north-ave-after-perf.json` hold
   older reports; distinguish versions.
2. Finish functional/visual checks: road approaches and width transitions,
   Marietta surface/stripes (currently plain concrete deck), rail/deck clearance,
   pier lane/shoulder clearance, underdeck close-up, no ballast floating or seams.
   Current support placement is reserved median and outer sidewalk abutments;
   it lacks an independent actual-geometry clearance test. Add meaningful tests.
3. Capture valid matched before/after day/night. **The initial BEFORE screenshot
   was blank and is unusable.** No valid comparison is committed. A valid WIP
   overview showed all five cover groups, but final captures remain to be made.
   Use a safe baseline snapshot (back up modified files before temporary swaps).
4. Full `pnpm test`, `pnpm audit:ground --url ...`, `pnpm test:perf`, cross-review
   (Claude through `pnpm review`), triage, build-log/screenshots, PR, merge.
   Rebase build-log conflicts by retaining both entries and rerun tests afterward.
   Verify `gh pr view <n> --json state,mergeCommit` before announcing MERGED.

Latest checks:
- `pnpm --filter web exec vitest run src/terrain/north-ave.test.ts src/terrain/ground-contact.test.ts`:
  5 passed, including both-tier full board ground contact (~7.4s total).
- `tsc --noEmit`: passed before latest scope change; final run result is in
  `/tmp/north-ave-tsc.log` (check at takeover).
- Full pnpm test passed on the immediately preceding wider-profile version;
  **rerun for final version**. `/tmp/north-ave-fulltest.log`.
- No North Ave cross-review, full browser audit or test:perf yet.

## Coordination and tools

Our session: `orca_session_id:dd2c7465-6831-4447-b009-9e8aa68d6cf0`.
Coordinator is Claude on Air, terminal `term_05a952fa-de06-4064-8655-3e98e1caf1e0`.
Direct `send --on air` rejects pairing token. Reply thread works:
`orca orchestration reply --id msg_f7745baf5c72 --from <your-session> --body '...'`.
Migration request: msg_de263cd1e0a1. Use `orca orchestration check` for replies.
Only promises outstanding are finishing option C and sending verified merge/evidence.

Vite :5297 was ours; stopped for handoff. Review tab closed. No other owned servers.
Use `pnpm --filter web exec vite --port 5297 --strictPort` (root pnpm dev with
extra `--` ignores intended port). Chrome/Orca screenshots can capture a stale
loading frame: switch to own tab, wait all 12 areas, await two animation frames,
then inspect every saved image. HMR may leave renderer null; reload the page.
For perf: `window.__perf.report()`. Current camera API:
`window.__setView(bearing,tilt,distance,x,z,zoom=1)` with `&dev&mindist=20`.

Cargo PATH: `$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin`.
No local .venv. Read-only use of `../studio-midtown-skyline/.venv/bin/python` works;
matplotlib installed only into `/tmp/marta-research-libs`, use PYTHONPATH for survey.
Survey raw extracts and winter mosaic are under `/tmp/north-ave-*`; do not commit
commercial aerial imagery. Existing EPT cache is data/raw/ept (gitignored).
