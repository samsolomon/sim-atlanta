# Next steps (stopping point, 2026-11-26)

Where the project stands and what comes next, in priority order. Written at the end of
2026-11-26, right after release 19 went live. All Studio agents are stopped. Each has a handoff in
`docs/handoffs/` with its branch, head and exact next step.

## Live now

**Release 19** (`92e71e45`, Worker version `2d07942e`):
- the north expansion and the Connector repairs (Sweet Auburn, the Jackson Street bridge, Freedom Parkway, the Capitol Gateway lid and tunnel, Ellis);
- loading fixes, so there are no multi-second freezes after ready;
- far-board, light pools, the semi, the Model Lab cleanup and the F-150 in the Lab;
- baked ground for Brookwood South.

**Rollback:** release 18 (`6c5aa4e6`).

## How we work now (decided 2026-11-26)

- **Release train.** Ship whenever main reaches a stopping point and the release is no worse than live. The coordinator deploys without asking, and Sam reviews afterwards in Orca tabs.
- **Checks sized to risk** (`docs/review-charter.md`):
  - CI (`.github/workflows/ci.yml`) runs tests and the build on every PR.
  - Agents self-review with Grok on the Studio before a PR. The coordinator does a final check and gives the merge go.
  - `pnpm test:perf` runs only for new meshes, materials, programs or per-frame code.
  - The full packaging pass and the device A/B run once per release.
- **Budget reserves:** Low geometry 25 MB, High programs 10, High night calls 40. Until a reserve is restored, a PR that adds to a budget already inside its reserve must offset its own cost in the same PR. #708 encodes this.
- **Quiet agents:** they message only for decisions, blockers and completion. A fresh session starts each new task from a handoff.

## Priorities

### 1. Small and ready (release 20)
1. **Remove "Frame the full board" from the menu.** Add a **Retry** link to the top-left area-failure notice, the "Could not load the north section…" messages, so a failed area can still be retried. Update the messages that point at the menu. Sam approved this.
2. **Radio: Next starts playback.** Pressing Next on the radio while it's off should start playing the next track, not just change the track silently. Sam reported this.
3. **Merge the ready PRs:**
   - #708, budget reserves: needs its `test:perf` run.
   - #707, the weekly feed watcher.
   - #711, the integrator handoff.
4. **Park baked ground:** turn it off by default and stop shipping the bake files (1.9 MB Low and 4.0 MB High per visitor for a 0.5 s post-ready gain). Keep the code and the CI bake step for future heavy areas.

### 1b. Live MARTA motion smoothing (high: live trains are the core of the site)
The branch `samsolomon/live-marta-motion` (8 commits, 2026-11-24) was never opened as a PR. It smooths live trains between position fixes: cruise speed carries through known moving fixes, braking has a bounded tail, and a late fix holds the train. Its Codex agent was closed in the 2026-11-26 Studio cleanup, and the branch is on origin.
- Rebase it onto main. Main has changed a lot since: follow, sliced builds, light pools, Connector traffic.
- Check it against the live feed and the replay fixtures.
- Grok, then a device check.

### 1c. PR backlog triage
About 75 older PRs are still open, mostly building skins from 2026-11-24.
- **Approved by Sam but never merged:** #594, #604, #627, #632, #481, #521 and #542, plus #404 for the Model Lab only.
- **Merge path:**
  1. Rebase each.
  2. Run one batch `test:perf`.
  3. Each must offset its own cost under the budget reserves.
  4. The coordinator does the final check.
- **The rest:** sort into merge, rework or close. Many are stale against main.
- **Superseded branches with no PR:** the `study/*` branches from the north expansion, `traffic-wheel-plane`, `aligned-vertices` and `far-landmark-merge`. They can be deleted from origin once confirmed, since copies are in the Studio archive bundle.
- **Branches with real unmerged work and no PR:** `footpath-rail`, `phone-single-pass`, `langdale-hall`, `emory-faculty-office`, `ellis-six-bay-wip`, `wd-grant-building`, `skyline-medium-handoff` and `ansley-tee-legibility`. Check each and open a PR or close it.

### 2. MARTA timetable expiry (deadline: ship by about Dec 8)
MARTA's published feed ends **2026-12-11**, and no newer feed existed as of 2026-11-26. Sam decided that past a feed's end, City repeats the last published week labelled **inferred**, never scheduled:
- The card reads "Inferred from MARTA's last published timetable (ended Dec 11)".
- The scene word stays honest.
- Fix the notice that says "showing the timetable" when nothing is shown.
- Live MARTA keeps priority.

The coordinator checks the wording before merge. The feed watcher (#707) opens an issue when MARTA publishes a new feed.

### 3. The phone: the boot freeze
The biggest phone problem left is about 10 s of frozen page before ready (iPhone 15 Pro). At 6x it's two single tasks: `stage:terrain` (2.7–3.0 s) and streets and freight (1.2–1.3 s).
- **The fix:** slice them like area builds: yield between landmark builders, and use the existing step forms for terrain, batches and transport.
- **Where to start:** the profile is `~/Developer/sim-atlanta-boot-profile-f0c5ef55/PROFILE.md` on the Studio, and the integrator handoff has the plan.

### 4. The Connector: road kit (`docs/road-kit.md`)
Draft #710 is part 1 (overlaps, merge and diverge with one surface owner). Its next step is in `docs/handoffs/studio-connector-repairs.md`. Then:
- part 2, parapets, at 0 net draw calls (High night is at 629/630);
- part 3, abutments and one profile per structure, which fixes the Ellis to Sweet Auburn 2.2 m step;
- part 4, lane tapers;
- part 5, piers;
- part 6, paint.

**Washington Street bridge:** comes after part 3 (`docs/washington-street-bridge.md`). Sam approved building it.

### 5. Scaling to the full square (`docs/scaling-plan.md`)
- **The finding:** memory is the wall. A phone holds about 20 km² at full detail, which is today's board, and the target is about 1,239 km².
- **In order, before any further expansion:**
  1. Increment 0: a device A/B (draft #709, the `hidelm` switch) to learn whether triangles, glass or shading is the real phone cost.
  2. Restore headroom: night windows, programs phase A, freeing and packing near houses.
  3. Area unload. The plan lists 5 undo gaps in main.
  4. A coarse horizon LOD about 20x lighter per km² than far-board's boxes.
- **Streaming rule (Sam):** the far version may show first, with detail streaming in, but there must **never be empty squares**. Every area always has at least its far or coarse form drawn. Unloading drops an area to far, never to blank, and loading starts from far. Make this a test.
- **Next expansion:** not before road kit parts 1–3 and area unload, or its roads and rail structures will need rework. Realistically release 22 or 23.

### 6. Vehicles (`docs/handoffs/studio-vehicles.md`)
1. **#706, the F-150 in traffic:** a draft. It was reworked to one mesh (0 draws and 0 programs). It needs tests, a City still, Grok and `test:perf`.
2. **Next models,** each in the Model Lab first for Sam's approval: Model Y, Rivian R2, and a Waymo-style robotaxi (an I-Pace-like crossover with a roof dome, no branding). No logos or lettering.

## Open PRs at the stopping point
- **Ready:** #708. (#707 and #711 merged after this list was written.)
- **Drafts:** #706 (F-150 traffic), #709 (`hidelm` switch), #710 (road kit part 1).
- **Older PRs waiting on decisions:** #404, #427, #663, #665, #681, #435 (streaming prototype, approved; to be rebased), #541 (road vehicle variety, partly superseded by the semi and the F-150).

## Known issues (tracked, not blocking)
- **Ellis side walls:** draw as short uneven pieces (road kit part 2).
- **Default view on the iPhone 15 Pro:** a few fps below release 16 (about 23 vs 25), GPU-side.
- **Far-board night windows:** reshuffle slightly at the 14 km switch on stepped buildings.
- **Capitol tunnel nits:** listed in `docs/road-kit.md`.
- **A flaky test:** the road-semi test can time out under heavy load (4.8 s against 5 s).
