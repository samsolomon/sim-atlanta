# Merge train plan after the north expansion

2026-11-25, integrator. **Prepare only: nothing has been merged, rebased or pushed on any listed branch.** Planned against `main` `8678645f` and #682 head `c8e3e34e`. Conflicts come from `git merge-tree` simulations. Check results come from each PR's own description, measured on older mains; GitHub holds no status checks, review decisions or labels for any of these PRs.

## Decisions needed before anything merges

1. **#682 performance.** `pnpm test:perf` passes on `main` and fails on #682: High triangles, calls, programs, geometry and heap, High-night calls and programs, and Low geometry and heap. The default view now mounts R16. With R16's data removed, only High geometry is over (300.9 of 300 MB), with programs at 100 of 100. Choose: defer R16 in the default view, or raise ceilings.
2. **Headroom for the skins.** `main` has 1.4 MB of High geometry, 10 MB of High heap and 20 High-night draws to spare. The 46 building PRs that report a High geometry delta (transcribed from their descriptions) add a net +3.1 MB (+4.6 MB counting only increases), and the 34 that report High-night draws add +26. **The set does not fit even on today's `main`.** #575 (packed landmark vertices) reports about −26 to −27 MB geometry and −27 MB heap on both tiers. It is a draft and is not on Sam's list. I recommend asking to approve it, or else agreeing new ceilings.
3. **Held titles.** #594, #604, #627 and #632 say "held" and are building PRs. Does "building PRs that passed their checks" release them?
4. **Not on Sam's list.** See the last section.

## Already done

#389, #420, #446 and #453 from Sam's approved list are **merged** (24 November).

## Order

Per train head: `tsc` and the footprint/detachment test. At the end of each step: full `pnpm test` and `pnpm test:perf`; stop if a ceiling fails. One PR merges at a time. Every step needs a `web/dist` rebuild; extra needs are marked.

| Step | Contents | Rebase work against #682 | Needs |
| --- | --- | --- | --- |
| 0 | **#682** north expansion | none | `pnpm data` |
| 1 | **#575** (if approved) | Real conflict: `materials/landmark-batch.ts` and its test, plus `city.ts` and `model.ts`. Base branch was merged as #524: retarget to `main`. | A16 look check |
| 2 | Approved infrastructure: **#463**, **#613**, **#435** | below | |
| 3 | Test and ratchet fixes: **#589, #600, #633, #655, #662, #605** (if approved, see item 4) | #589, #600 conflict in `skin-footprint.test.ts`; others clean | |
| 4 | **Trunk fix** `e73af591` as its own PR | Applies cleanly | changes every board's generic trees: matched stills |
| 5 | **Ansley clubhouse**, then **Driving Club** | below | image links in PR bodies |
| 6 | **#368** Route 49 pilot, alone | Real conflicts: `main.ts`, `ui/next/shell.ts` | `pnpm data`, **worker redeploy** |
| 7–9 | Building batches A, B, C | below | |
| 10 | **Task 4** unfinished skins | after the train | |

### Step 2

- **#463** (cap High's pixel ratio at 1.75; draft): conflicts in `city.ts` only. Its text parks it until frame numbers exist after #453, which is now merged. Sam has approved it; I suggest one Air run on the rebased head as the record.
- **#613** (far-board buildings, Low): real conflict in `vignette/world.ts` (and `model.ts`). The #596 and #601 work it waited for is merged. Step 4 edits the same file, so merge #613 first.
- **#435** (streaming prototype, `?stream=1`): real conflict in `core/perf.ts` (plus `city.ts` and the build log), 475 commits behind. It owes a fix recorded on the PR: its stream `changed` hook must set `shadowLodDirty` on Low (#534 is merged). Largest rework of the three.

### Step 5: clubhouses

Both branches sit on about 100 commits of private pre-publication history below `74e0f9f0`. **Do not merge or push the branches as they are.** Cherry-pick onto the new `main`:

1. Ansley: `2ba8555b 5e2ce13a bad39539 8ce270be 12291227 123b039a 2015dc30 03534a0c 18f3c6d8 b0f69ba1` (`e73af591` goes in step 4). `03534a0c` is the boxwood swap that replaced the flower bed. The tip `b0f69ba1` is local on the Studio; origin's `study/ansley-clubhouse` is an older, rewritten `781d7a68`.
2. Driving Club on top: `db13de58 1d022969 c3723284 27e57099 4c3ea535 0e1226cb`. Skip `9aee57f0` (the granite material arrives with `12291227`).

Simulated: the only conflict is `docs/build-log.md` for each (keep both entries). The 45 images in the two replayed ranges are all City renders. Re-audit the replayed range before pushing. Neither clubhouse has a performance result on a clean base.

### Step 6: #368

597 commits behind and 45 files. Keep its bearing-sign fix (`projectFix` had north and south swapped) and its descriptor-first claim order. Its worker change only forwards trip id and start date from the same cached upstream feed. It reported 98 of 100 High programs on an old base; #682 measures 101, so run `test:perf` before merging.

### Steps 7–9: building PRs

All passed `pnpm test:perf` in their descriptions unless noted (#627 did not run it). Rebase each on the train head, keep both build-log entries, re-run the footprint test. Stacked: retarget **#652** to `main` before merging **#624**. Insert a `test:perf` checkpoint **every 8 to 10 PRs**, and merge negative deltas first (#544, #604, #594, #637, #643, #645).

| Batch | Conflicts | PRs |
| --- | --- | --- |
| A | none | #568, #606, #629, #636, #641, #650, #657 |
| B | build log only | #533, #563, #602, #609, #617, #620, #630, #634, #635, #637, #640, #642, #643, #645, #648, #653, #658, #659, #660, #661, #664 |
| C | `model.ts`, `city.ts` or the skyline fixture (one at a time) | #539, #544, #560, #591, #607, #618, #626, #628, #624 → #652 |
| Needs a review first (none recorded in the description) | mixed | #573, #578, #587, #595, #598, #610, #612, #614 |
| Held titles (item 3) | mixed | #594, #604, #627, #632 (no review recorded) |
| Re-run first | build log | #665 (`low-zoomout` did not settle, so no result) |

#629 and #652 did not re-run `test:perf` because they change no geometry.

## Close

| PR | Reason |
| --- | --- |
| **#482** frame pacing | Its own title and body: parked, do not merge; the A16 showed a net loss. |
| **#476** Connector seam links (recommended, needs your OK) | Held on the Williams seam investigation, 733 commits behind, 103 files, real conflicts with #682 in `transport.ts`, `bridge-approaches.ts` and their test, and Sam saw little change. Reopen as a small PR once the two-board seam fix lands. |

I found no PR whose merge would add nothing to `main`.

## Hold: not on Sam's list

- **Excluded:** #541 car types (in progress).
- **Needs Sam:** #404 Xpress coach, #409 bus plan (docs), #450 Low tree cost (overlaps the tree proposal), #611 and #621 slicing (titled held), #654 MSAA (a visible choice with an fps cost).
- **Needs your call:** #427 downtown paving (`ground-map.ts` conflicts with #682), #481 grove trees, #521 → #542 Piedmont Park details (retarget #542 first), #592 traffic frame cost (real conflicts in `road-traffic.ts` and `perf.ts`), #646 → #651 house build hitch (retarget #651 first), #663 downtown rail portals, and the step 3 fixes.
- **Other drafts:** #667 search metadata (awaits independent review), #681 street-level camera (opened today), #679 NCR garden (Task 4).

## Follow-up, not started: live steering on all 81 bus routes

Extend #368's steering and per-trip timetable fallback from Route 49, reusing its descriptor-first claim order.

- **Data:** the feed has 81 bus routes, 40,026 trips and 2.0 M stop times; Route 49 has 658 trips and 27,632. Its packed timetable is 116 KB (16 KB gzipped). Scaled by 61 to 150 times (trips, stop times, shape points), one file would be **about 7–17 MB, 1–2.4 MB gzipped**. That is an extrapolation. It needs splitting by route and service day, loaded on demand.
- **Code:** generalize the Rust packer and the one-route checks in `buses.ts` and `city.ts`; add loading and eviction per route; cap and measure drawn buses. The worker needs no new upstream calls.
- **Size:** large. About three PRs: packed and split data with contract tests; client loading and steering for all routes; performance and fallback checks on both tiers.

## Task 4 note

All nine named branches exist; each conflicts only in `docs/build-log.md` or not at all. Several origin tips are newer than the commits in the assignment (for example `30-allen-plaza-skin` `87d4324a`, `american-hotel` `3f897a1e`, `150-carnegie-garage` `d921686e`), so read each handoff before reusing a prior review.
