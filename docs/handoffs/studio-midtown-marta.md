# Studio Midtown MARTA handoff

**Closed on 2026-11-27: #427 merged with step 1 only** (batch 1; see `integrator-merge-batches.md`). The notes below are the earlier held state. Coordinator: `term_09e1b3da-5f48-4755-abf8-92a571a1f474` on Sam’s MacBook Air. Reply to its latest message with `orca orchestration reply --id <msg> --from <your session id>`.

## #427, landuse paving (merged; step 2 stays off)

The green ground at the Robinson College doors is a board-wide gap. The ground map’s base sage `#b5bd97` shows wherever a building line sits more than 2.5 m past the kerb, because landuse polygons had no colour.

- Step 1 (on) paints commercial and retail landuse in `PAL.sidewalk` beneath mapped lawns.
- Step 2 (`PAVE_CAMPUS_LANDUSE`, off) adds university, institutional, hospital and religious landuse.
- Robinson’s doors are on Georgia State’s university polygon, so only step 2 fixes Sam’s view. Step 2 also paves open GSU ground.
- Sam chooses step 1 only or both. The coordinator asked for this split: “campuses have real lawns”.
- If Sam picks both, set the flag to `true`. Then update the test assertion `expect(PAVE_CAMPUS_LANDUSE).toBe(false)` and reshoot the door and campus views.
- Ground-contact (`orca_session_id:a761d59f-dbff-4e39-95d4-51790b17cb47`) owns `web/src/terrain`. It agreed to this change and is working on #418 (deck landings), which doesn’t overlap.
- Cameras and comparisons are in `docs/log/ui/landuse-paving/README.md`. The composites came from the scratchpad scripts `lu/shoot.sh`, `lu/shoot2.sh` and `lu/comp2.py`. They swap `ground-map.ts` between main, step 1 and step 2 on a dev server, and the first shot after each swap can come out blank.

## Merged this session

| PR | Merge commit | What |
|---|---|---|
| #384 | `4981bd3c` | Empire Building / Robinson College skin |
| #397 | `bae6e381` | Marriott Marquis piers splay symmetrically, which ends the cream streaks |
| #405 | `43ab33a2` | Robinson’s arch pediments sit below the springline (SAH image 4) |

## Standing rules from the coordinator

- Nothing merges without the coordinator relaying Sam’s OK.
- Run `pnpm build`, `pnpm test` and `pnpm test:perf` on the final rebased head right before merging, and quote `gh pr view <n> --json state,mergeCommit` afterwards.
- Embed captioned before/after images inline in the PR body (day, night and close, with the camera string under each). List direct blob URLs at the commit in the status reply.
- Kill orphaned `vite preview` and headless Chrome after perf or composite runs.
- Low tier: add no new shader programs (79/85 on main at the time of writing).

## Environment notes

- Run `PATH="$(brew --prefix rustup)/bin:$PATH"` before `pnpm test`.
- `pnpm test` needs a `.venv`: symlink `../studio-midtown-skyline/.venv` and remove it afterwards.
- `east-rail.test.ts` (King Memorial) can time out under heavy Studio load but passes alone.
- The dev server port is 5297. Start it with a 2 h background timeout.
- `git fetch` from other worktrees moves `origin/main` mid-rebase. Check for conflict markers before running tests.

At handoff no dev server was running and no Orca tabs were open.
