# Handoff: studio-amtrak-livery (rolling stock)

Claude agent `orca_session_id:e5348118-da22-4978-9d69-ad882db9e7a9` → Codex, 2026-11-23. The full history is readable with `orca agent read`; this note covers only what is not obvious from it.

## State

- **Open PR [#291](https://github.com/samsolomon/sim-atlanta/pull/291)**, branch `samsolomon/freight-loco-detail`. Freight PR 1 of 4: a detailed GE AC4400CW/CM44AC locomotive in CSX-like and NS-like schemes, with lit lamps. Status:
  - Rebased on `main` (2026-11-23 evening) and self-reviewed. Waiting for the coordinator's "merge when green".
  - `contract.test.ts` failed locally only because the borrowed pipeline data lacks `ga/routes.json`.
  - Run `pnpm data` (or borrow complete data) and re-run `pnpm test` before merging.
- **Parked WIP branch `samsolomon/freight-lookalikes`** (pushed, WIP commit `1b3b574d`, not a PR). It has rough code for six car types (blue boxcar, tank, covered hopper, gondola, autorack, double-stack) and lab entries `es44acNs` and `freightCars`. It predates #291 and conflicts with it.
  - Reuse `carBody()` from it for PR 3. Don't merge the branch.
- **Merged today:**
  - Charger #219, Crescent cars #230, AIRO lab #234.
  - S70 streetcar: #260 (first model), #272 and #277 (repaints), and #285, which Sam approved as final.
- **Dev servers:** none running; the vite server on :5641 is stopped. One Orca lab tab is open (page `8eb3d459-…`); close it if it's still there.

## Sam's decisions (all 2026-11-23)

- **Crescent:** Phase VII Charger by default, with Phase VI as a lab variant. Amfleet II is a mix of Phase VI and VII. Viewliner II wears Phase IIIB. The 0.41 m roof step is real and stays. AIRO is lab-only.
- **Streetcar:**
  - Done as of #285: deep indigo (input `#5a5694`), and three broad straight stripes per cab section (lime, cyan, violet), with the centre section plain.
  - Don't reopen it without Sam.
- **MARTA:** keep the CQ400 for every train. **Do not** model the CQ310/311/312 or date-gate City. The car row on the card stays `illustrative` (confirmed at `card.ts:60` and `:135`).
- **Freight scope**, in small PRs, each with dated photos, lab day and night views, and triangle counts:
  1. Detail the existing locomotive (#291).
  2. New locomotives: an NS-like ES44AC/AC44C6M (partly covered by #291's NS scheme), an SD70ACe or SD70M-2, a CSX-like ES44AH or AC44CW, and a GP38-2 switcher.
  3. Car types: double-stack well cars with varied containers, covered hoppers, open hoppers or gondolas (coal and scrap), black DOT-117 tank cars, autoracks, centerbeam/lumber cars, and boxcars in several colours. Each needs weathering and visible trucks, and should be instanced.
  4. City consists (an intermodal, a manifest and a unit train), with the freight card updated and kept `illustrative`.
  - Then road-vehicle variety: City uses only 3 of the 8 types in `vignette/vehicles.ts`. Pickups, vans and tractor-trailers already exist in code.
- **General:** no logos, wordmarks or numbers. Use Commons photos for references. Sam's screenshots are reference only and must not be committed.

## Next steps

1. Merge #291 once the coordinator approves and tests pass.
2. Freight PR 2: new locomotives.
3. Freight PR 3: car types.
4. Freight PR 4: City consists.
   - Also fix #291's plausible finding: `cityFreightCard` picks the scheme by a regex on the line name. Carry `userData.livery` instead.
5. Road-vehicle variety.

## Promises to other agents

- **`orca_session_id:84ff6fd9-a68e-4888-aa2a-4477f88e5ff0`** (studio-midtown-marta, places the streetcar in City): keep the `s70Sections()` / `S70_LAYOUT` / `s70Material` interface in `web/src/vignette/streetcar.ts` stable. Its kinematics are in `docs/atlanta-streetcar.md`. I told them the legacy-car work was cancelled and that `trains.ts` and `midtown-marta-rail.ts` won't change.
- **`orca_session_id:d577649d-8640-473a-8c9b-461abf2b616a`** (studio-ui-a2c): new lab fieldsets go in `web/src/models/lab-markup.ts`, not `models.html`. `window.__lab.render()` and `resize()` must stay; the captures use them.

## Repo rules and tooling that bit me

- **Colour grade.** It crushes dark blues and greys: input `#403d78` renders as near-black navy. Calibrate by sampling a fixed lit patch in a rendered frame, not by guessing.
  - CSX-like body: input `#76889a`.
  - S70 body: input `#5a5694`, which renders as `#28217b`.
- **Captures.** Full-size canvas captures come from `scratchpad/tools/cap.mjs`: `orca eval` with `__lab.camera`, then `__lab.render()`, then `toDataURL`. Composites come from `compose.py` (Pillow venv in the scratchpad). The scratchpad may be cleared; both are small to rewrite.
- **Merge conflicts.** `origin/main` moves constantly, and nearly every PR conflicts in `docs/build-log.md` (both sides append). Resolve by keeping both entries.
  - **Never** `git reset --soft origin/main` to squash after `main` has moved. It stages a revert of other agents' work. Squash onto `git merge-base`.
- **Pipeline data.** This worktree has no pipeline data (`web/public/data` holds only `ga/.gitkeep`). I borrowed `studio-amtrak-stock`'s data with a temporary symlink and always restored it. Don't commit the symlink.
- **Rust tests.** `cargo` isn't on PATH. Use `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"`.
- **Cross-review.** `pnpm review` (Codex) wasn't available to me, so I self-reviewed with the `code-review` skill. As Codex you can run `pnpm review` and have Claude review your work.
- **Merge notices.** Every one leads with GitHub blob links to the captioned photo/before/after composites, money shot first.

## Codex continuation — 2026-11-23

- #291 merged at `8fb88467`; Sam approved the updated freight train.
- #342 merged at `a1bafa0e`: Brookwood regression now uses a recorded timetable
  fixture. Fresh Amtrak data starts November 22, so pre-November-22 review cameras
  no longer show the Crescent after the next `pnpm data`. Use covered dates for
  future release checks; never extend feed validity to preserve old screenshots.
- Freight PR 2 is on `samsolomon/freight-locomotive-variety`: ES44AC/ES44AH,
  SD70ACe and GP38-2 lab studies. References/cameras: `docs/freight-variety.md`.
  City still uses the approved CM44AC-family units pending PR 4.

### Queue update from Sam — after #347

Prioritize the purple articulated MARTA bus before the remaining freight-car work.
Identify the actual service, make/model, 60 ft configuration, and routes entering
or inside the board; do not assume Summerhill BRT or a particular Xcelsior variant.
Gather dated day and, if available, night photos. Send the coordinator one summary
with photo links before modelling. Then add a logo-free model beside the XN40 in
the lab, including a joint that bends on curves, reference livery colours, and a
phone performance cost note. Coordinate its vehicle-type ID with the connector
agent before integration. Coordinator thread: `msg_8f9a7007f319`.
#347 remains awaiting Sam's approval of the revised colour/silhouette sheets.

### Connector agreement and merge reporting

Connector: `orca_session_id:1f9238ff-2c34-4398-9612-0425e769c083`, thread
`msg_98ec3c022c8c`. Traffic remains a plan pending Sam's GPS/signals decision.
Use a sourced manufacturer/model slug for art/lab and `marta:vt:<slug>` for the
future VehicleType. LiveBus has no type or trip ID; never assign articulation
by route alone. Pin the GTFS edition when investigating route coverage.

Proposed model boundary: separate front/rear/bellows geometry, shared material,
low detail variants, dimensions, section-local axles and origins, matching hitch
anchors, articulation limit. Coordinates: +z forward, y up, ground origin,
curb side -x. Lab starts with explicit joint angle; motion owns section poses
{x,y,z,yaw,pitch}, joint angle and collision footprints. Propose front axle s
as progress reference. Preserve rigid axle/hitch distances and coincident joints;
do not independently sample two body centres along the path. Seek history must
be deterministic; sparse live fixes do not establish a driven curve.

Proposed phone target (not measured): articulated total <=1,500 low-tier triangles
and <=3 shared instanced batches for front/rear/bellows, not per-bus calls.
Existing rigid XN40 is 6,140 triangles; connector proposes <=1,000 at low tier.
Send sourced ID/dimensions and export proposal to connector before integration.

Before any MERGED notice, run `gh pr view <n> --json state,mergeCommit` and quote
both returned values. A failed merge is not a merge. Resolve build-log append
conflicts by retaining both entries, then rerun tests.

## READY FOR 6.2 — 2026-11-23 (Codex handoff)

Current branch: `samsolomon/marta-articulated-bus`, based on merged #347.
No bus PR yet. Push contains a compiling, unintegrated XE60 geometry WIP plus
research and reviewed plan; it does not change any user-visible model yet.

### Completed since the earlier notes

- #347 **verified MERGED** using `gh pr view 347 --json state,mergeCommit`:
  `8b78ddabeaf7dbbbc6b8445e1d38a0173826bf76`. GP38-2 and ES44AH both navy
  YN3. GP reference replaced with Mark Levisay, 2513, November 10 2014.
  Rebased full tests passed (959 web, one existing skip; Rust/pipeline/worker
  passed), both performance tiers passed; final Claude review no findings.
  Coordinator notified with screenshots/cameras and web-rebuild-only requirement.
- Research summary sent to coordinator **before modelling**, then clarified Phase
  One purple buses 7108–7112 are XN40 rigid CNG, not articulated XN60.
- Coordinator explicitly requested **both** XE60 and a cheap purple Rapid XN40
  livery in one lab PR (`msg_3443a83811b5`). XE60 copy: bought for A-Line,
  return to revenue service unverified. No claim the bus is currently running.

### Current WIP and next steps (in order)

1. Read `docs/marta-rapid-buses.md` (all sources, dates, uncertainty, dimensions)
   and `docs/plans/marta-rapid-buses.md` (architect/product reviews applied).
2. Inspect `web/src/vignette/xe60.ts`: front/rear/bellows geometries, shared shader
   with explicit angle and per-instance angle option, `XE60_LAYOUT`/`xe60Pose`.
   Four focused tests pass; `pnpm --filter web exec tsc --noEmit` passed.
   **No browser render, full suite, or cross-review yet for this branch.**
3. Finish prototype integration: matching shadow/depth deformation for bellows,
   a preview owner disposing shared geometry/material once, lab `xe60` entry,
   angle slider/output/Straight reset in `lab-markup.ts`, existing Detail controls.
   Check geometry proportions and joint closure at +/-35deg in browser, correct
   any problems before claiming it finished. Current high/low model is preliminary.
4. Add `xn40Rapid` art/livery option to existing `busGeometry` without changing
   default XN40. Current BusLivery fields map old slashes: merely changing colours
   will not draw Rapid's thin blue/gold/orange belt correctly. Use an optional
   Rapid paint style, purple CNG pod, lavender diagonal lower accents, no logos.
5. Confirm IDs/exports with connector, measure exact low/high triangles/bytes and
   batches. Proposed low target <=1500 total / <=3 shared instanced batches.
   Do not claim measured phone FPS from triangle counts. No City motion changes.
6. Capture matched day/night straight/bent XE60 and XN40 Rapid with source links;
   no reliable exact-fleet night photo found. Photo publication dates known,
   actual capture dates not known. Do not call these Commons/CC assets.
7. Full pnpm test/build, browser + perf as appropriate, cross-review, open one lab
   PR; send coordinator shots/cameras and await visual merge approval for buses.
8. Remaining freight car library and City consists come after this bus task.

### What is owed / coordination

- Coordinator thread `msg_3443a83811b5`: both variants and one lab PR.
- Connector `orca_session_id:1f9238ff-2c34-4398-9612-0425e769c083`, thread
  `msg_98ec3c022c8c`: exact dimension/export proposal after validation; proposed
  `xe60` / `marta:vt:xe60`, and `xn40Rapid` livery on `marta:vt:xn40`. Already
  told them Phase One uses XN40 and not to infer XE60 from the route alone.
- Model move coordinator thread `msg_e265027a749f`; send READY FOR 6.2 when pushed.
- Direct Air send fails pairing; use orchestration reply threads as documented.

### Scratch/tools

`/tmp/marta-articulated/`: `xe60-side.jpg` (MARTA/Urbanize published Jan5 2026),
`xe60-front.png` (CBS Jan27 2026), `phase-one.jpg` (official 7108). Links in research.
Previous freight captures/scripts in `/tmp/freight-pr2/`. `.venv` has Pillow and
pipeline dependencies. Rust PATH still needs stable-aarch64-apple-darwin/bin.
Complete generated data is present and ignored; don't regenerate to fix old dates.
No dev server running. Research tabs are closed at handoff. Do not edit main.

## CURRENT — Codex to Claude Opus, 2026-11-23 evening

Resume in this worktree on `samsolomon/covered-grain-hopper`. Read the current freight plan in [freight-consists.md](../freight-consists.md). The rolling-stock workstream owns the freight car library, City consist selection and Model Lab freight. The separate Route 49 bus simulation belongs to connector session `ba90dfab-f23c-404e-bc66-ec95b0d8b30a`. Only the coordinator deploys.

### Sam’s decisions and original words

Sam on freight, relayed in `msg_577fa8b0e743`: “some [locomotives] have a car attached to them and others are on their own. I'd kind of expect all the locomotives to be on their own... whatever is at the front of the train should probably always be forwards... options where there's one, two, or maybe three locomotives depending on the size, we could have those rotating. And I'd like us to plan models for a handful of different rail cars, and maybe we can kind of mix and match some of them. I'm open to ideas.”

Coordinator in `msg_606fd5555f40`: “Sam approves the freight direction as briefed: lead facing forward, 1-3 units by length, railroad-consistent power, a shared car kit, recipes for unit, intermodal and manifest trains, seeded per passage. Write docs/freight-consists.md, then start building in your proposed order without waiting for another plan sign-off. Use one PR per car type or small group, each with Model Lab and City captures by day and night, and test:perf for both tiers. Each still holds for Sam's look before merging.”

Sam on Part A, via `msg_c2d2091ed0e6`: “The separate train model and boxcar look good.” Approval applies to #390 only. **Every car PR still needs Sam’s OK relayed by the coordinator.**

Earlier bus decisions are complete: #358 added the XE60 / Rapid XN40; #364 and #369 revised the roof. Sam on #369: “bus looks better, I am good with it.” The approved side-by-side is in docs/log/rapid-buses/roof-profiles.jpg; both use the XN40 dome profile. XE60 return to revenue service remains unverified.

### Work and verification

- Part A #390 on `samsolomon/standalone-freight-lab` separates all six locomotive entries and the existing boxcar. Includes the eight-car plan. Before/after in docs/log/freight/standalone/. All freight Lab cameras after: position [-19,6.8,18], target [0,2,0], vertical FOV 38°. Original CM44AC camera [-32,12,36], target [0,2,1], FOV 41°. Claude cross-review had no findings.
- First car WIP on `samsolomon/covered-grain-hopper`, commits acb67004 and 0af27f8f, pushed. **No hopper PR open.** Brookwood Main 2 now shows three covered hoppers behind the two NS-like locomotives, then five existing boxcars. Standalone Lab entry `freightGrainHopper`. Updated the existing illustrative NS card. Same wheel/truck/coupler construction as the boxcar, narrow through sill. The hopper has a curved shell, three tapered gravity bays, trough hatch, roof walks and end ladders.
- Reference for final notes: Greenbrier 5400, October 2019, https://www.gbrx.com/wp-content/uploads/2021/06/5400cf-Covered-Hopper-Railcar.pdf . Length 58′8″, width 10′8″, height 15′6″. Model length 17.8816 m, half-width 1.625 m, crown about 4.725 m. Truck centres 13.4 m estimated. Doraville and Inman photo references in plan. Document these in final car PR.
- Measured **660 low / 1,000 high triangles per hopper**. Full suite passed on WIP (1,076 web plus one skip, worker/Rust/pipeline pass), and pnpm build passed. Browser captures in docs/log/freight/grain-hopper/. Lab high, same camera as Part A. City high: `/?view=city&q=high&cam=-180,-4975,115,58,125&dev&mindist=20&t=2026-11-23T14:03:00-05:00&speed=0`; night 22:03:00 ET. Both show three cars clear of the station, which occluded the previous camera.
- **Blocking perf result for hopper**: full-board perf completed on both tiers, high passed (105 programs, 1,191 calls); low failed only programs (91 vs ceiling 90, 562 calls). Log /tmp/hopper-perf. Current WIP always instances Brookwood on low, introducing a candidate new combination of instancing and clipping planes. Check a baseline with the same staged data. Do not raise the ceiling or declare this ready.

### Next steps in order

1. Sync the hopper branch with origin/main after #390. Resolve build-log append conflicts retaining both sides. Preserve other agents’ changes.
2. Finish the first car. Identify the additional low-tier shader with renderer program signatures. Reuse a compiled instanced Lambert/clipping combination, preserving Brookwood board edges, shadows, picking, and Crescent priority. Existing low tier previously used separate non-instanced cars for this reason. Render a matching selection when explicitly testing count; the stock perf clock may be outside the passage. Check the car and glancing light in Lab high/low; verify shadow and wheel contact, photo proportions, 3 bays, and the local +z axis. Add regression coverage for the new geometry envelope, triangle ceiling, light attribute and consist selection. Clean up WIP naming/formatting, including detail argument and branching. Add dated source and build-log entry.
3. Recheck pnpm test/build, browser and pnpm test:perf on the final code. Rust PATH: export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH". Use cross-model review (Claude author -> Codex). Open one car PR; send comparison/camera/measurements to coordinator and **hold merge** until Sam approves. No hopper review has run yet.
4. Continue the approved plan in its documented build order: existing boxcar variants, intermodal well, tank, gondola, centerbeam, autorack, open coal hopper. Seeded passage recipes, 1–3 correctly oriented power units, occasional foreign trailing unit and optional long-train DPU. Keep card illustrative, IDs stable and clipping/selection correct. One PR per car or small group, day/night Lab and City shots, both perf tiers, await Sam’s eye on every merge. No extra plan sign-off required.

Current Air coordinator terminal is term_09e1b3da-5f48-4755-abf8-92a571a1f474. Reply to an incoming coordinator message from **your** session; direct send from Studio has a pairing-token failure. Check replies. Quote actual `gh pr view <n> --json state,mergeCommit` before every MERGED notice. Do not deploy. All my browser tabs closed and my dev server stopped. Temp capture helpers /tmp/hopper-shots.py and /tmp/solo-capture.py refer to closed page IDs; create fresh tabs and update them.

#390 final verification: `gh pr view 390 --json state,mergeCommit` returned `{"mergeCommit":{"oid":"13630a38d817a98c0bb89d7a3c180050aa94a362"},"state":"MERGED"}`. Fresh full tests and build passed after syncing main. Coordinator notified. No Part A merge work remains.

## Claude Opus continuation — 2026-11-23 night (session bceb5cfc)

- **PR #394** (`samsolomon/covered-grain-hopper`) opened and **held for Sam's OK**. 91/90 was the WIP's
  low-tier instancing, not the car: low draws per-car meshes with the shared freight Lambert again
  (90/90 low, 567 calls; high 105, 1,191). Codex review: no findings. Coordinator thread `msg_b0d56579dbfd`
  (reply `msg_45eb50b51160`).
- Freight wheels now start a quarter turn (vertex on rail); this also touched the approved boxcar.
- Open for PR 4: low-tier instancing of long consists needs a #391-freed program slot.
- Next: boxcar variants on `samsolomon/boxcar-variants`, stacked on #394 (retarget to main before merging #394's base).
- Capture: `orca tab create --json --url ...`, `orca eval --page <id>`, `orca screenshot --page <id>`;
  Lab canvas via `__lab.setNight/view/render` + `toDataURL`.

### Update — 2026-11-23 late (Opus session bceb5cfc)

- **Merged:**
  - #394, covered hopper: `82d49b85`.
  - #396, boxcar paints oxide/faded/blue: `64a207c2`. Navy was greyed to `#3b4859` on review.
- **#404 Xpress coach pass 1** (`samsolomon/xpress-coach`), Lab only, **held for Sam**. It is an MCI D45 CRT LE look-alike at 4,124 high / 814 low triangles on the shared `busMaterial`.
  - Pass 2 follows Sam's notes: refine proportions, then check the low tier.
  - Plausible: far-night Lab speckle. The XN40 shows the same; recheck in City.
  - Sources: `docs/xpress-coach.md`.
- **#391 freed 5 low programs (85/90).** Low-tier freight instancing for the City consists PR may use one. Each instanced and clipped material costs one program.
- **Next:** intermodal well car (plan order 3) on `samsolomon/intermodal-well`.
- **Cameras:**
  - Downtown freight: `/?view=city&q=high&cam=-445,-790,290,45,150&dev&mindist=20&t=2026-11-23T14:05:00-05:00&speed=0`. Night is `T22:08:18`; the downtown cycle differs from Brookwood's.
  - Brookwood: `cam=-140,-5010,115,58,110` at `14:03` and `22:03`.
- **Captures:** Lab captures use `__lab.camera` / `__lab.controls` set directly. The view presets glide, so they render mid-transition. City captures use `orca screenshot` after the scene draws.
- **Perf:** park your City tab on `about:blank` before `pnpm test:perf`. One low run timed out while a City tab was rendering.

### Update — 2026-11-23 night (Opus session bceb5cfc)

**Held for Sam:**
- **#404** Xpress coach, pass 2. It is now an MCI D4500 (`samsolomon/xpress-coach`). The coordinator says it reads well; Sam looks in the morning.
- **#424** City freight consists plus the 53 ft well car (`samsolomon/intermodal-well`).

**Merged:** #394 hopper (`82d49b85`), #396 boxcar paints (`64a207c2`).

**Standing rules from the coordinator:**
- Screenshots go inline in each PR, with the cam under each image; image URLs go in the reply.
- Run `pnpm build` on the final rebased head right before merging.
- Kill only PIDs you started. `pkill -f perf-budget` kills other worktrees' perf runs; I did this once and apologised.

**Consists design.** `web/src/city/freight-consist.ts` holds the pure planner. `FreightBatches` is always instanced, and poses change kind per passage.
- Downtown uses fixed 15-minute slots from `ENTRY_MS` and alternates direction.
- Brookwood uses 20-minute slots.
- The card refreshes through `CityView.freightPassage()`.
- A new car type goes into `MANIFEST_CARS` or a recipe. Watch `MAX_CAR_KINDS`.

**Perf findings:**
- Low instancing costs +2 programs.
- A swept night clock (`t=…22:02&speed=60`) already reaches 91 low programs before this change.

**Lab:** the near plane is adaptive beyond 60 m (`fitNearPlane` in `models/main.ts`).

**Next in plan order:** tank (DOT-117 family), open mill gondola, centerbeam, autorack, open coal hopper. Add each to the manifest or unit recipes. The downtown double-stack clearance check is still open.

### Update — 2026-11-24 early (Opus session bceb5cfc)

**Held for Sam.** The coordinator has seen all three:
- **#404**: Xpress coach, pass 2 (MCI D4500).
- **#424**: City freight consists, the 53 ft well car, and the clip-plane padding.
- **#436**: DOT-117 tank car. It is stacked on #424, so retarget it to `main` after #424 merges.

**Clip-plane padding.** `FREIGHT_CLIP_PLANES = 6` saves 1–2 low programs at every clock, and the night sweep now passes (85/85). Road traffic is a padding candidate but has not been changed.

**`CONSIST_VERSION = 2`** since the tank landed. Bump it whenever a recipe or car list changes.

**Camera recipe.** Pick review times by listing passages with a throwaway vitest that calls `norcrossPassage(slot)` and `planPassage(DOWNTOWN_PROFILE, slot, 'csx:downtown')`, then reuse the same phase:
- Downtown:
  - cam `640,450,150,50,230`, slot start +2 min;
  - "up" slots look like 15:12 ET.
- Brookwood:
  - cam `-330,-4830,115,58,230`;
  - "down" slots at +4 min (as at 14:44);
  - "up" slots at +2.5 min (as at 22:22:30).

**Flaky tests under perf load:** `east-rail` and `square-board/sections` hit 5 s timeouts. Both pass alone.

**Next in plan order:** open mill gondola, centerbeam, autorack, open coal hopper; DPU after those. The downtown double-stack clearance check is still open.

**Environment:** no dev server is running; vite on :5647 stopped at its 2 h limit. One Orca tab, `004ae663`, is parked on about:blank.

### Update — 2026-11-24 morning (Opus session bceb5cfc)

**Freight plan complete.** All eight cars are built. Everything is held for Sam unless marked otherwise.

| PR | Contents | Branch |
| --- | --- | --- |
| #424 | Consists, 53 ft well, clip padding, freight boot template; closes `Illustrative freight` | `intermodal-well` |
| #436 | Tank | `tank-car` |
| #443 | Gondola | `mill-gondola` |
| #456 | Centerbeam | `centerbeam` |
| #492 | Autorack, Brookwood only | `autorack` |
| #496 | Coal hopper | `coal-hopper` |
| #404 | Xpress coach, MCI D4500, pass 2 | `xpress-coach` |
| #467 | Crescent and CQ400 boot templates; CQ400 padded to 5 clip planes; closes `stockNight` and `cq400` | `prewarm-stock`, held for the coordinator |

**Merge order.** The freight PRs are a stack: #424 → #436 → #443 → #456 → #492 → #496.
- Retarget each to `main` as its base merges.
- Keep the stack rebased on `main`.
- #424 and #467 both set program ceilings in `perf-budget.json`, so whichever merges second must rebase and re-measure.

**Perf baseline** (#424 on `main` `cd33324b`):

| Tier | Programs | Calls |
| --- | --- | --- |
| Low | 85/87 (main 84 to 85) | 415/460 |
| High | 98/100 (main 101) | — |
| High-night | 97/99 | — |

- The extra low program is the instanced freight Lambert. Nothing else can share it, and it saves about 30 draws.
- If you hit `__scene hook missing` in `program-sweep`, rerun until #480 lands.

**`CONSIST_VERSION` is 6.**
- `DOWNTOWN_PROFILE` excludes autoracks.
- Downtown intermodal weight is 0.
- The reason is the 41–70 m kinks in the downtown cut, at (−372, −605) and (−8, −54). That follow-up is recorded in #492.

**Next:**
- Road-vehicle variety: City uses 3 of the 8 types in `vignette/vehicles.ts`. Alternatively, do the downtown curvature follow-up first; I asked the coordinator which.
- Distributed power (DPU) remains deferred.

### Update — 2026-11-24, after #467 and #512 (Opus session bceb5cfc)

- **#467 merged** as `23cc47a0`. It added Crescent and CQ400 boot templates, padded CQ400 to 5 clip planes, and set program ceilings to low 86 and high/high-night 100. #424 must rebase onto it and re-measure, because both touch `perf-budget.json`.
- **#512: freight curvature, held for the coordinator. Needs `pnpm data`.**
  - `bake()` now fillets the `freightS` runs to a 150 m minimum radius.
  - Pinned: run ends and shared vertices.
  - The largest shift is 0.16 m.
  - Ground-contact (a761d59f) owns `web/src/terrain` and approved it.
  - The raw Overture extracts came from `studio-rectangle-default/data/raw` and were copied into this worktree's gitignored `data/raw`.
  - This worktree's scene data is back to main's original. Regenerate the smoothed data with `.venv/bin/python pipeline/scripts/terrain_transport.py`.
- **Once #512 lands:** drop `DOWNTOWN_PROFILE.exclude` (autorack) and set the downtown intermodal weight above 0 in the stack, after re-measuring car-pose curvature.
- **Merge queue:** the skyline lead (studio-midtown-skyline) hands out merge slots. Ask for one and wait for "your turn".
- **Next:** road-vehicle variety.

### Update — 2026-11-24 morning, later (Opus session bceb5cfc)

- **#512 merged** (`6f994bfa`): freight centreline smoothing. **Needs `pnpm data`.**
  - The only generated change is `scene/downtown/vignette.json` `terrainTransport.rail[].pts` for the 13 `freightS` runs.
  - The curvature test skips on stale data (79 freight vertices on stale data against 176 after).
  - Once release data includes this, lift `DOWNTOWN_PROFILE.exclude` and turn downtown intermodal back on in the stack, after re-measuring car-pose curvature.
- **#541: high-tier road-vehicle variety, held for Sam.**
  - Adds hatch, pickup and van, plus a rigid 19.16 m semi, with `semiShare` 0.7 on the Connector.
  - Trucks appear only above 25% of the hourly share.
  - `instanceColor` is now allocated at build (fixes the prewarm program).
  - Low is unchanged.
  - The road-traffic owner (studio-midtown-connector) has been told.
- **MARTA/streetcar radius note** sent to 54bca5c0 for the morning.
- **Rules (coordinator):**
  - No pattern kills.
  - Use your own Chrome via `scripts/chrome-cdp.mjs launchChrome`, and check the URL before navigating.
  - Merge slots come from the skyline lead.
- **Held for Sam:** #404, #424 → #436 → #443 → #456 → #492 → #496, #541.
- **Gotchas:**
  - `origin/main` moves under you, because fetches are shared across worktrees. Pin the main SHA when you compare builds.
  - #424 must rebase onto `23cc47a0` or later (#467) and re-measure the ceilings.
