# Handoff: studio-tree-lab → Codex

Updated 2026-11-24 (America/New_York) by Claude Opus session **`orca_session_id:7e7f9596-cbd3-45b2-bbf5-e3441dff0621`**, at coordinator request `msg_b18f8da74c62`. Read my history with `orca agent read` on that id. The previous handoff (Codex `48c0c9e4…`, 2026-11-23, redbud lab) is in git history for this file.

Worktree: `/Users/samsolomon/orca/workspaces/sim-atlanta/studio-tree-lab`. Read AGENTS.md first, then fetch.

## Scope today

Low-tier (phone) cost work on houses and trees, plus Piedmont Park details. The workstream also owns the parked faceted-species prototype.

## Open PRs I own

| PR | Branch @ head | Status |
|---|---|---|
| **#646** House tiles build their near version in the background, never inside a frame | `samsolomon/house-near-budgeted` @ `90b065ed` → main | **Approved** as a fix by the coordinator and by phone-perf after its rerun. **In the lead's queue**: #420 (merged), #654, #613, then #646. |
| **#651** One house per build step | `samsolomon/house-near-one-step` @ `d3a57a3f` → `house-near-budgeted` (stacked) | **Approved** by the coordinator; queued right after #646. Retarget it to main once #646 lands. |
| **#450** Low tier: tree far form, 400 m cells, compacted clumps | `samsolomon/low-tree-cost` @ `5498a015` → main | **Sam approved** ("I'm fine with the tree clumps from afar"). Queued after #651. Rebase it on main after #646 and #651 land, then run build, test and test:perf. |
| #481 Sifly Piazza grove | `samsolomon/sifly-grove` @ `97af9569` | **Held for Sam.** Rebased on 32a13ef0. |
| #521 Piedmont details 1 (Greystone and the pool, path lamps, Active Oval stripes) | `samsolomon/piedmont-details` @ `2b5e4340` | **Held for Sam.** Rebased; added a KNOWN_DETACHED line for Greystone's lakeshore deck (1.33 m, legitimate). |
| #542 Piedmont details 2 (Dockside, shelters, lake benches on low, Peace Monument) | `samsolomon/piedmont-details-2` @ `6c3a3660` → #521 (stacked) | **Held for Sam.** Restacked on the rebased #521. |

Merged today, verified with `gh pr view --json state,mergeCommit`:
- #572: houses stop casting shadows past 9 km; far houses store byte attributes. `97bc75e7`.
- #596: houses past 12 km are one box each. `518a9415`.
- #601: per-house far boxes exported for the far board. `32a13ef0`.

## Merge procedure (lead `orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`, reply to its latest message)

When the lead pings:
1. Rebase #646 on main.
2. Run `pnpm build`, `pnpm test` and `pnpm test:perf`, and report geometry and programs on both tiers.
3. Merge with a merge commit.
4. Quote `gh pr view 646 --json state,mergeCommit`.
5. Then `gh pr edit 651 --base main`, `git rebase --onto origin/main <old #646 head> samsolomon/house-near-one-step`, and the same checks and merge.
6. Then #450.
7. Ping phone-perf (`48e90760…`) when #646 lands; it will ratchet `low-north`'s long-task ceiling from 650 toward 300.

**Gotcha: #613 (far-board buildings, perf-buildings `f4e52674…`) lands just before #646 and conflicts in `World.buildingSteps` (vignette/world.ts).** Keep its order:

```
farBox(); farRing = undefined; if (n++) yield 'buildings';
```

- In #646 alone, that last line is `if (++n % 2 === 0)`; #651 changes it to `if (n++)`.
- The final `farBox()` must run before `yield* b.geometrySteps()`.
- Its `withFarBoxes` parameter stays false for house tiles.
- Check: with `?q=low`, the console line "City far-board mesh" (boxes and tris per area) must match main before and after the rebase.
- Also keep both sides of any `docs/build-log.md` conflict.

## What #646 and #651 do, and the evidence

- `HouseTile.update()` (called inside three's render) no longer builds anything.
- A tile within `PREBUILD_M` = 1.4 × `SWITCH_M` (1.4 km) queues. The nearest queued tile builds through `runBudgeted`:
  - 3 ms a frame normally;
  - 6 ms once it is inside the switch;
  - 1 ms while dragging.
- There is one frame between tiles. A tile beyond 1.54 km, or a disposed one, drops its build.
- The far version shows until the near one is complete.
- `Builder.geometrySteps` (vignette/geom.ts) slices the buffer copy and flat normals; it is byte-identical to `computeVertexNormals` (tested).
- `window.__houseNearStats` reports the longest slice and step.

Evidence:
- route:north long tasks at 6x: main 310-463 ms with 7-9 tasks over 100 ms; #646 70-92 ms with none over 100 (my runs and phone-perf's rerun).
- Zoomout is unchanged (no near builds on that route).
- Near-build latency at a 700 m orbit is 1.4-1.8 s.
- #651's slice is 10-12 ms at 6x and its step 7.5-9.6 ms.
- The coordinator agreed to hold yielding inside `dressRoof` unless the A16 asks.
- Pending and built close-ups, plus day and night matched views, are in `docs/log/perf/house-near/` and the #646 body.

Harness: phone-perf's #593 (`samsolomon/perf-long-tasks`). Until it is on main, merge it locally. Then:

```
PERF_JSON=out.json node scripts/perf-run.mjs --viewport 384x692@1 --cpu 6 '<preview>/?view=city&q=low&t=2026-11-20T14:00:00-05:00&perf=run&motion=route:north'
```

Read `summary.longestTaskMs`, `longTasksOver100` and `longTasks`, plus `--eval 'JSON.stringify(window.__houseNearStats)'`. A dev server is too slow to boot under 6x; use frozen `vite build` + `vite preview` outDirs. A `--mode development` bundle fails to load the City.

## Agreements with other agents

- **One house far form** (perf-buildings, coordinator-approved). The far-board mesh (#613) owns the single threshold (9 km to the area box, back at 0.9×). It takes `houseLod().boxes` (`HouseFarBox` = FarBox + `roof`) as its house input and hides `houses.group` past it. #596's 12 km far-far mesh remains only as the `farboard=off` fallback. perf-buildings swaps its input after #601; that's its branch.
- Streaming agent: far-canopy interface and per-area treeLevel override agreed earlier; it owns the streaming flag.

## Sam's decisions that bear on this area (relayed by the coordinator today)

- **Tree far form:** approved (#450).
- **Far shadows:** house shadows off past 9 km on low (#572, merged). Far-form tree shadows are also at 9 km in #450 (moved from 2.5 km after the 2.6/4/6 km re-check the coordinator asked for).
- **Far-board** is perf-buildings' (#613); houses feed it, as agreed above.
- The coordinator's handoff message also names flat glass, landmark LOD, the streaming flag, the 0.45 shade floor, 1075 glass B, expansion paused, and generic buildings as the priority. None of those were decided inside this workstream; read `msg_b18f8da74c62` and the coordinator's thread for their details rather than relying on me.
- Standing rules: nothing merges without the coordinator relaying Sam's OK, unless the coordinator explicitly clears it as a fix or as look-neutral. Add no new shader programs on low. Screenshots go inline in PR bodies, with blob links in status replies. Run `pnpm build` before every merge.

## Coordinator's open rulings

- #646 and #651 merge as fixes after phone-perf's rerun (done), then #450.
- #481, #521 and #542 stay held for Sam.
- If zoomout's 100-177 ms tasks ever repeat on a quiet Studio, find them. Phone-perf's rerun called it noise.

## Next steps, in order

1. Merge #646, #651 and #450 when the lead pings (procedure above).
2. Keep #481, #521 and #542 rebased whenever main moves; they stay held.
3. Optional, only if the A16 asks: yield inside `dressRoof` (residential.ts `finishFor().dressRoof`), which is one house's full detail at about 1.5-2 ms at 1x.
4. The faceted-species prototype stays parked at `be2baf0b` (`samsolomon/faceted-species-preview`); Sam chose generic low-poly trees everywhere, with species behind `?trees=species`.

## Shared-Studio rules (hard-won)

- Never `pkill` or `killall` by pattern. Kill only the PIDs you started.
- Drive only a Chrome you launched: `scripts/chrome-cdp.mjs launchChrome`, own profile, port 0. Check the page URL before acting, and close it by PID.
- Studio load runs 18-32: run 3+ alternating arms for any perf claim.
- cargo: `export PATH="$HOME/.cargo/bin:/opt/homebrew/opt/rustup/bin:$PATH"`. There is no repo `.venv` here, so pipeline tests skip and no Pillow is installed.
- Never use bare `git stash`. If you must stash, push with a unique `-m` tag and apply and drop by SHA.
- Use `orca orchestration reply --id <their msg id>` (never your own id).

## State at handoff

All branches above are pushed. No dev servers, previews or browsers of mine are running, and my scratch worktrees are removed. This handoff lives on `samsolomon/studio-tree-lab-handoff-1124` (off main `a49825cb`). It is not a PR; open one only if the coordinator wants it on main.
