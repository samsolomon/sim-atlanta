## Codex continuation — 2026-11-23

Current main d1411a9e is merged. Terrace placement verified in City; the actual loop
exports eight trees, correcting the earlier seven. Captioned day/night Prado and
1180 sheets, plus low Prado and winter far-detail comparisons, are under
`docs/log/ui/tree-species/rollout/`. Current measurements and cameras are in
`docs/tree-species.md`; they supersede the original numbers below.

Cross-review round 1 found the preview omitted the batch; fixed in preview.ts.
Round 2 has no blocking findings. It retains a plausible plantings-only lifecycle
case; document it in the PR. The preview page itself stalls at loading with the
available staged data, so its rendered check remains an explicit visual risk.

Phone-perf successor dd052a89 accepts the paired current-main count gate; full
sign-off awaits the winter evidence and final PR. Coordinator reply route is
`orca orchestration reply --id msg_243e0a655e24 --from orca_session_id:752c9656-15cc-4501-99e1-e59257d6fdcb`.
Direct `--on air` send rejects the pairing token. No merge until phone-perf's
PR-thread sign-off, coordinator A16 check and Sam seeing the sheets. No deployment.

---

# Handoff: studio-tree-species (Claude, orca session 6b76e039) — 2026-11-23

## State
- **Open: City tree rollout, draft PR on `samsolomon/studio-rollout-city`. Do not merge yet.** It needs phone-perf's sign-off in the PR thread and the coordinator's A16 default and pan check (condition 3).
- **Merged today** (all tree-species): #193 framework + ginkgo lab · #203/#210/#217 High Museum ginkgo (trunk at the lawn path's end) · #221 ginkgo A–D · #225 species mixes · #236/#251 foliage ink mask (`inkFoliageMesh`, `FoliageMaskPass`) · #258/#275/#280 ginkgo plumes, brightness, core · #304/#306 generic branch gate + compaction · #322 species `setDetail` · #324 rollout engine (`trees/rollout.ts`, no City change).
- **Dev server:** vite on 5471 (stopped at handoff). Port 5461 is studio-materials' vite, so don't use it. The compositor for captioned sheets is `python3 -m http.server` in the scratchpad `compose/` dir (stopped).

## Rollout branch: what it does
- **`trees/rollout-city.ts`:**
  - `rolloutRow` plans a canopy row once from its full crown list, then cuts it to the tier.
  - `RolloutBatch` (`rolloutBatch` singleton) draws every row's species as ONE set of looks for the whole City. This is the fix for draw calls: the per-row version was +76 at low and +498 at high, and the batch adds +9 and +35.
  - The batch replays season, detail, night and wet state, uses a shared carpet, and hides leaf tips unless a tree is tipped.
  - Limbs don't cast shadows.
  - Low detail uses one size class per look, so a specimen draws as the mature form, scaled to its size.
  - Each mesh gets a real bounding sphere.
- **Wiring:**
  - `terrain/model.ts`: `options.rollout`, `crownSize` and the `replacedTree` merge.
  - `square-board/sections.ts`: `loadPlaces` for the Ansley Park test.
  - `city/city.ts`: `scene.add(rolloutBatch.group)` and `rolloutBatch.update`.
- **1180 Peachtree:**
  - `midtown-skyline-symphony.ts` (the skyline agent's file) now exports its terrace crape spots as `terraceTrees`; the stand-in function is removed.
  - `createSkylineLandmark` hands them on as world `plantings`, and `rolloutPlantings` draws them at terrace height.
  - **Not verified visually.** My 1180 camera (`cam=650,-3672,250,55,160&dev&mindist=60`) didn't frame the terrace. Check it, and tell the skyline agent.

## Measured
`test:perf` default view, 2026-11-20 14:00. Before is main at 983fac44 plus #325.

| | Before | After |
|---|---|---|
| Low calls / triangles | 529 / 3.352M | 538 / 3.397M (+45k) |
| Low skyline (`cam=150,500,0,66,1900`) | 225 / 2.568M | 234 / 2.615M |
| High calls / triangles | 1130 / 13.27M | 1165 / 13.68M |

`__perf.report()` trees category: 58 meshes, 897k triangles, 5.5 MB geometry, 0 textures → 66 meshes, 885k triangles, 5.1 MB geometry, 5.3 MB textures (the leaf atlases).

## Sam's decisions (2026-11-23)
- **Picks:** crape myrtle A, loblolly A, sweetgum A, Japanese maple A. Oaks are A too, but their rollout is a later PR. Magnolia stays out until its gloss is picked.
- **Coordinator's conditions:**
  - mature plus specimen sizes
  - the Ansley skew (about 40% of generic crowns at specimen size)
  - facing street-oak pairs, applied to the generic crowns
  - the island rule
  - loblolly never curbside, sweetgum not in street strips, Japanese maple never a street tree
  - crape myrtle replaces the seven 1180 stand-ins
  - matched day and night shots at 1180 Peachtree and The Prado
- **Ginkgo:** Sam picked C4 with plumes. The High Museum tree in City still draws the old `createTrees` ginkgo. Putting C4 there waits on Sam's OK. The prepared code was never committed: it swapped `createTrees` for `createGinkgoVariant(..., 'C4')` in `terrain/model.ts`.

## Next steps, in order
1. Verify the 1180 terrace crape myrtles in a browser, at high and low.
2. Make the captioned before/after sheets: The Prado (day, night, low) and 1180 (day, night). Raw captures are in `scratchpad/compose/img/ro-*`; regenerate them if the scratchpad is gone.
3. Run the `code-review` skill on the branch and fix what it finds.
4. Update `docs/tree-species.md` (the rollout is built and its numbers measured) and add a build-log entry.
5. Ping phone-perf with the numbers above, then ask the coordinator for the A16 check. Merge only after both sign off.

## Promises owed
- **Phone-perf** (orca session 3126b1a7): the PR reports default, skyline and pan calls and triangles, plus trees memory before and after, and passes `test:perf`. The carpet drops under farTrees. Pan figure not done yet.
- **Tree-lab** (studio-tree-lab, uds socket 31243): tell them when the rollout merges, and ask them to review the looks in City. I told them I'd do the bounding spheres and one-form-per-look outside `looks.ts`, which `rollout-city.ts` now does.
- **Coordinator:** when the rollout merges, re-measure the ginkgo with tree-lab's `__lab.crownStats`.

## Rules that bit me
- **Merging:** don't auto-merge PRs that need an outside sign-off. The merge loop merges on CLEAN.
- **Stash:** with `git stash`, always use a named push and apply by SHA, because the stash is shared across worktrees.
- **Fetch stubs:** tests stub `fetch` and can throw synchronously, so wrap new fetches in `Promise.resolve().then(...)`.
- **Ink mask:** `FoliageMaskPass` redraws registered foliage, so per-row meshes multiply draw calls.
