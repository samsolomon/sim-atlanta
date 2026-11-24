# Studio Midtown Culture handoff to Claude Opus

**Current worktree:** `studio-midtown-culture`, branch `samsolomon/high-piazza-people`.
**Only active PR:** [#389 — High Museum visitors](https://github.com/samsolomon/sim-atlanta/pull/389), OPEN and held for Sam’s OK. Implementation and captures are at `8981147b12e8757df081c004e3cfb289d330a544`. All work is pushed. No local dev server or review tabs remain.

### Sam’s request

> there's a little kind of like courtyard in the middle where they have tables and stuff. It'd be nice to have like people sitting there or people kind of like walking around the High.

The coordinator identified Sifly Piazza and asked for seats, walks across the paving, up the entry ramp and along the Peachtree lawn path, seeded Atlanta-local attendance, illustrative data, and the existing figure material. The delivery and approval thread is `msg_98d0a74d8c05` on Air terminal `term_09e1b3da-5f48-4755-abf8-92a571a1f474`. The model-switch thread is `msg_7f3854f305d1`. Read predecessor history with `orca agent read --id orca_session_id:dfd2aaae-6c1d-4ea7-a8fb-5f9418755581 --limit 100`.

### What Sam can review

Six tables and eighteen chairs already existed. At Friday lunch the high tier seats six visitors and shows eight walkers. Low uses the existing walker batches. At 23:00 the museum crowd is empty. Positions, clothes and gait reproduce at a pinned clock. The fixture-derived placement and schedule are in `web/src/city/high-visitors.ts`; batching is in `street-figures.ts`. The PR contains the three requested captures.

| View | City camera | Eastern time, Nov 20 2026 |
| --- | --- | --- |
| [Café seats](../log/ui/high-visitors/tables.jpg) | `557,-3963,145,55,48` | 13:00 |
| [Museum at lunch](../log/ui/high-visitors/lunch.jpg) | `565,-3965,-101,55,260` | 13:00 |
| [Museum at full night](../log/ui/high-visitors/night.jpg) | `565,-3965,-101,55,260` | 23:00 |

Reproduce with `pnpm dev --port 5317` and `/?view=city&ui=classic&speed=0&q=high&dev&mindist=20&cam=557,-3963,145,55,48&t=2026-11-20T13:00:00-05:00`. Substitute the overview camera and hour from the table. The Studio helper `/tmp/high-visit-capture.py` captures all three. Inspect the actual image: during Vite reload a blank frame once passed the renderer-call check; the committed captures were inspected.

### Verification and open risks

- `PATH="/opt/homebrew/opt/rustup/bin:$PATH" pnpm test` passed Rust, web (1,080 passed, one skipped) and worker (five passed). The optional Python checks skipped because this worktree lacks `.venv`.
- `pnpm test:perf` passed both tiers with twelve areas. Low measured 567 draws, 2,355,801 triangles, 90/90 programs and 393 MB post-GC heap. High measured 1,189 draws, 13,893,469 triangles, 105/140 programs and 499 MB. Low has zero program headroom. The seating batch uses the shared figure material on high only.
- Claude cross-reviewed the implementation against main and reported no findings. Logs are `/tmp/high-visit-final-tests.log`, `/tmp/high-visit-final-perf.log` and `/tmp/high-visit-review.log`. For new Claude-authored changes use the repo cross-review skill with Codex.
- Attendance and routes are artistic estimates tagged illustrative. The ramp follows the deck rise, and chair height follows the parent table datum. Preserve these if revising placement.

### Next steps in order

1. Check `orca orchestration check` and the approval thread. The coordinator has the PR, screenshots and camera strings. Wait for the coordinator to relay Sam’s explicit OK before merging anything.
2. If Sam requests changes, revise #389, rerun the tests, browser captures, both perf tiers and cross-review as appropriate. Return the revised evidence to the coordinator and retain the hold.
3. After approval, fetch and check mergeability. Resolve any build-log conflict by keeping both entries, then rerun checks on the synced branch. Verify the merge using `gh pr view 389 --json state,mergeCommit` before sending a merge notice. Quote the returned fields, include review image links and camera strings, and use `orca orchestration reply --id <coordinator-message-id> --from <your-session-id>`. Only the coordinator deploys. A web rebuild is required for #389.
4. Await a new assignment after #389. Rhodes Hall #360 and Coda #366 already landed. Phone-perf’s transport heap fix #371 also landed, with 496 MB high in its verification. The Georgia Tech plant stack remains a separate backlog candidate.

---

## Archived predecessor handoff

The material below records the earlier transfer and its historical queue.

# Handoff: studio-midtown-culture → Codex 6.2, 2026-11-23

## Successor update

Rhodes follow-up #360 landed at `ccae1bc1081c11333834c13ff0a1afa42801405f` with Sam’s −50% selection. Coda implementation, source notes and matched captures are on this branch in [docs/coda.md](../coda.md). The plant stack is recorded separately in the art backlog. The handoff below records the state before the successor took over.

## Previous state

Stopping at coordinator's request to migrate models. Current branch:
`samsolomon/tech-square-coda`, based on main `53c29a114eb58791f3dde3cf77571c9fd88b2db6`.
This branch is research-only WIP, **no Coda implementation and no PR**. `docs/coda.md`
contains consulted day/night photo sources and reviewed implementation notes.

Completed and verified with `gh pr view N --json state,mergeCommit`:
- Rhodes Hall #344: MERGED `bd6271605c0d3fc7d42ce5a4631d60024570f7b9`.
- SCAD Atlanta #351: MERGED `1683a0a22e8093465dd6c1da9ffe0bb39edca864`.
- Rhodes tower -25% #355: MERGED `53c29a114eb58791f3dde3cf77571c9fd88b2db6`.
  Full tests passed after syncing main/conflict and final porch exclusion (Python
  pipeline checks skip without `.venv`). Perf low546 calls434MB heap; high1183 calls545MB,
  all ceilings pass. Two Claude review rounds completed; overlap observation fixed.
  Matched high/low night pairs: `docs/log/ui/rhodes-tower-dim/compare-{high,low}-night.jpg`.
  No deployment; only coordinator deploys.

## Next steps — latest Sam correction takes priority

1. **Rhodes stronger uplight options BEFORE Coda.** Coordinator thread `msg_6ad58365f976`:
   Sam says tower still too bright after #355. Prepare a NEW branch/PR from latest main.
   Reduce tower to roughly half original and make a real base-to-top falloff: top and
   crenellations should be in shadow, not a uniformly cream block. Show **two options
   around -50% and -65% of original**, on one matched 21:00 high/low choice sheet.
   Preserve porch AND bay. Compare with existing real night photo in `docs/rhodes-hall.md`.
   Send sheet for Sam to pick; **merge only the selected option** after tests/review.
   Camera `301,-4675,340,60,160`, Nov20 2026 21:00 Eastern, `speed=0`.
   Current code `midtown-culture-rhodes.ts` uses `aRhodesWash`; coefficient .75 and
   `Math.max(.25,1-y/30)` still leave top too bright. Geometry from `porchStart` onward
   is excluded from the multiplier to preserve the western porch beam that overlaps
   the old spatial tower mask. Existing regression pins this beam's original wash.
   Use actual tower geometry ownership if needed so bay/plinth do not change incidentally.
2. Return to this Coda WIP after the selected Rhodes follow-up merges. Main tower way
   714119667, Crum & Forster way42792936, High Performance Computing Center way791413998
   are three separate mapped footprints in `pipeline/prototypes/square-board/midtown-south/context.json`.
   No existing model found by git grep. All lie inside rectangle. Read `docs/coda.md`.
   Keep the public arcade genuinely open; three separate dispatches preserve each footprint.
   AIA ground floor plan and day photos plus lighting designer's actual night photos were
   viewed in fresh Orca research tab. Record estimated dimensions and uncertainty.
   Baseline captures remain to do: attempted `326,-2402,280,60,360` was too close and
   clipped tower top. Choose a wider camera (~500m) and correct bearing to see west facade.
   Night capture guard saw renderer calls0 after12areas; no bad image saved. Recheck on a
   fresh page before diagnosing; may be transient. All final Rhodes captures worked.
3. Add Georgia Tech central utility/Holland plant stack as a **separate backlog candidate**
   in `docs/art-backlog.md`, with https://facilities.gatech.edu/index.php/2016-04/hidden-georgia-tech-holland-plant
   as a starting source. Coordinator clarified handoff's “Coda and its smokestack” was
   mistaken (`msg_8f87ed65f253`). Do not invent a stack at Coda. Model later only after
   verifying it lies inside board.
4. After Coda lands update `docs/rectangle-detail-plan.md`, build-log and source/capture doc.

## Coordination and promises

Coordinator: Air terminal `term_05a952fa-de06-4064-8655-3e98e1caf1e0`.
Direct Studio→Air sends may fail rejected pairing token. Reply threads work:
`orca orchestration reply --id msg_371ef516eb3e --from <YOUR session id> --body '...'`.
Other useful threads: `msg_6ad58365f976` new Rhodes options; `msg_a45f81f0350b` workstream.
Read replies with `orca orchestration check`. Send milestones only: research done,
PR ready with shots, verified merge. Every MERGED notice must quote exact state and
mergeCommit from `gh pr view`. Preserve both build-log entries on conflict and rerun tests.
Every merge notice: captioned BEFORE|AFTER composite, subject ring/arrow, GitHub blob links,
money shot first, camera string. For options, use clearly labelled option sheet.

Traffic owner `orca_session_id:1f9238ff-2c34-4398-9612-0425e769c083` fixed the 21:00 crash
in #354 `b8011c954ba77117a2f2cb07c7dcc0baa6c2b37b`: streetcar endpoint indexed past road
segments, now clamped with missing-owner guard. Do not duplicate its work. If another
frame crash appears, install a window error listener to capture stack; Orca console
alone did not expose it reliably.

Other prior promises: tree agent owns High ginkgo at(612.5,-4001.2), no objects above1.5m
within9m crown. Ground agent owns High stair/turf carving; don't edit those. Parks agent
owns landscape primitives. No other unfinished implementation owed.

## Tools and cleanup

All my servers and browser tabs stopped/closed at handoff. Port5317 was own Vite server.
Use `/Applications/Orca.app/Contents/Resources/bin/orca`.
Rust tests need `PATH="/opt/homebrew/opt/rustup/bin:$PATH" pnpm test`.
Use `pnpm review -- --reviewer claude` (cross-review skill), max2 rounds. Review is against
origin/main, includes untracked files; never run while a temporary before variant is active.
Use Prettier `--single-quote --print-width 120` if needed, avoid whole-file default formatting.

Local helper scripts (not committed): `/tmp/dim-capture.py`, `/tmp/dim-work.py` (temporary
before variant restored in finally), `/tmp/dim-sheets.py`; Pillow at
`/tmp/rhodes-art/bin/python`. Scripts contain old closed browser page IDs; replace them.
Screenshots: wait until12areas and loading text gone, set camera with `__setView`, wait,
then assert `window.__cityDev.renderer.info.render.calls > 0`; inspect actual images.
`ui=classic` is supported escape hatch. `speed=0` works; earlier suspicion was wrong,
actual cause was the fixed traffic crash. Do not commit blank beige images.
Logs in /tmp/dim-tests-porch.log, /tmp/dim-perf-final.log, /tmp/dim-review-final.log.
