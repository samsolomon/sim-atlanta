# Studio Midtown Culture handoff to Claude Opus

**Current worktree:** `studio-midtown-culture`, branch `samsolomon/high-piazza-people`.
**Only active PR:** [#389 — High Museum visitors](https://github.com/samsolomon/sim-atlanta/pull/389), OPEN and held for Sam’s OK. Owner: Claude Opus session `ba45f7e8-2a67-4069-ae27-fc13f736da26`. Coordinator thread for this revision: `msg_fd1939706770`.

### Sam’s requests

> there's a little kind of like courtyard in the middle where they have tables and stuff. It'd be nice to have like people sitting there or people kind of like walking around the High.

> I like the little table models at the High. The only thing I might be a little bit worried about are like where they're positioned. It's kind of hard to see here.

The second request came with a screenshot circling the open paved square, between the Woodruff canopy slab and the High's entrance slab. The coordinator asked for the tables there, checked against photos, umbrellas only if November photos show them, seated figures kept, walkers crossing, and readability at the 250–450 m orbit.

### State (revision 2)

- Twelve tables in three rows of four at local u −48…−34.5, v 17…25 in `fixtures/arts-campus.json`, inside the grove that the leaf-on Esri aerial shows. Sources are in `docs/arts-campus.md`.
- Each table has four red chairs, a warm `#f5ead4` top, and a furled cream umbrella at every other table. `umbrellas: 'open'` in `arts-campus.ts` gives the open variant offered to Sam.
- Ten seats are set by `highSeated(crowd)`. Walker routes avoid the grove, and a test enforces a 1.3 m clearance.
- No new material or batch. Low remains at 90/90 programs.

| View | City camera | Eastern time, Nov 20 2026 |
| --- | --- | --- |
| [Lunch](../log/ui/high-visitors/lunch.jpg) · [Night](../log/ui/high-visitors/night.jpg) | `565,-3965,-101,55,260` | 13:00 · 23:00 |
| [Café grove close-up](../log/ui/high-visitors/tables.jpg) · [open umbrellas](../log/ui/high-visitors/tables-open.jpg) | `520,-3955,-101,50,60` + `&dev&mindist=20` | 13:00 |
| [Before/after](../log/ui/high-visitors/compare-lunch.jpg) · [day/night](../log/ui/high-visitors/day-night.jpg) · [umbrella options](../log/ui/high-visitors/umbrella-options.jpg) | as above | |

Checks:
- `pnpm test`: all passed. Rust passed. Web passed 1,082, with one skip. Python skipped because there is no `.venv`. `east-rail` timed out once under capture load, then passed when rerun alone and in the full rerun.
- `pnpm test:perf`, low: 567 draws, 2,357,089 triangles, 90/90 programs, 393 MB.
- `pnpm test:perf`, high: 1,191 draws, 13,895,605 triangles, 105/140 programs, 500 MB.
- Codex cross-review: no findings.

### Next steps

1. Wait for Sam’s OK and his umbrella choice relayed by the coordinator. If he picks open, change `umbrellas` to `'open'`. Then reshoot lunch, night and close-up at the cameras above, rerun tests and both perf tiers, and update the docs text that says furled.
2. On approval, sync main, keep both build-log entries, rerun checks, merge, and quote `gh pr view 389 --json state,mergeCommit`. A web rebuild is needed, and only the coordinator deploys.
3. Gap for the tree agent: the café grove's deciduous trees, about 6–10 in a grid, at local u −50…−28, v 16…30. Keep crowns clear of the 2.65 m umbrella tops.

Capture helper (not committed): the session scratchpad `cap.py` follows the old `/tmp/high-visit-capture.py` pattern, with a 15 s settle. Blank beige frames still pass the renderer-call check, so inspect every image.

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
