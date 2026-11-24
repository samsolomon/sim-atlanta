# Studio Midtown Parks handoff to Claude Opus

**Stopping point, November 23, 2026.** Branch `samsolomon/prado-building-identification`. All implementation work is pushed. There is no open Parks PR or uncommitted WIP. The three PRs below merged before the coordinator’s new hold. **Hold every future merge until the coordinator relays Sam’s OK. Only the coordinator deploys.** Deployment and Sam’s verdict on the revised Prado frontage are unverified here.

## Sam’s words and the requested revision

On the tree round-two sheet Sam said “there is one random building.” After seeing the first porch render he said “House looks a little funny for Ansley Park.” The coordinator asked for visible siding, main-body windows and pale trim, a lighter low side gable with a front-gabled porch, square posts on masonry bases, steps, and a clean side porte-cochère. A chimney depended on photographic evidence. Sam’s comments and the full directions are in coordinator messages `msg_fd560a78ef3e` and `msg_957e2ada9997`. The board-wide rule and tower protection are in `msg_d28a30b5d3b2` and `msg_d0fa638d89f9`.

## Shipped work and review views

GitHub state and merge commit were checked with `gh pr view <number> --json state,mergeCommit`.

| PR | Verified state and merge commit | Result and evidence |
| --- | --- | --- |
| [362](https://github.com/samsolomon/sim-atlanta/pull/362) | MERGED `0792e8f4946350d07307879a1c892298e9c1c274` | 33 terraces, 8 Midtown Upper and 25 Brookwood South. Ground-contact independently verified 66/66 approach corners, 39,510 clear approach samples (minimum 4.04 cm), 39,670 clear shelf/cap probes and zero low-tier terrace layers. A shared-frontage crossing accounts for the change from 34 to 33. [Matched views](../log/ui/ansley-terraces/README.md) |
| [365](https://github.com/samsolomon/sim-atlanta/pull/365) | MERGED `cb2cdeeb337555fcb667353883c7aad0f0455f0d` | Street edges, mapped crossings, two Prado islands and high-tier yield signs. Ground-contact inspected the islands, crossing, hedge and two example streets. [Street-edge gallery](../log/ui/ansley-street-edge/README.md) |
| [385](https://github.com/samsolomon/sim-atlanta/pull/385) | MERGED `7d35e743ddd7d3d73c4522dad32fb7389179100a` | The cream block was 145 The Prado NE, OSM way 269539876. The mustard patch was a tree. Rebuilt the street elevation and widened the house rule. Of 442 footprints above 450 m², 85 qualified (83 general house, one bespoke house, one detached). All 53 broad residential footprints kept their existing treatment. [Sources, before/afters, comparison houses and 31-storey tower](../log/ui/145-the-prado/README.md) |

Use `/?view=city&ui=classic&dev&mindist=20&cam=<camera>&q=<tier>&t=2026-11-20T14:00:00-05:00`. Change 14:00 to 23:00 for night.

| Subject | Camera |
| --- | --- |
| Sam’s original low aerial | `1194,-4352,20,50,420`, low day/night |
| Prado porch and side bay | `1232,-4427,90,83,42` and `1231,-4427,58,58,73`, high. The gallery also records the eye, target and lens for the Street View position. |
| General rule and tower control | `1502,-4522,40,45,120` (76 Park Lane), `1150,-4655,25,45,155` (1 Ansley Drive), `732,-2823,45,50,340` (903 Peachtree), low |
| Terrace row and landing | `1503,-4056,70,60,150` both tiers, `1503,-4056,70,60,45` high |
| Islands and crossing | `1152,-4545,10,40,115`, `1386,-4172,20,45,90`, `1165,-4526,130,52,42`, high |

## Checks and open risks

The final main-synced Prado run passed Rust, Python, 1,072 web tests (one skipped) and five worker tests. Both performance tiers loaded all 12 areas. Low/high post-GC heap measured 388/495 MB. High had 1,245 calls against a 1,250 ceiling. High readiness took 4.22 s against a nonblocking 3 s target. Two Claude review rounds led to the 1,000 m² block-scale guard and its regression test. The final sync’s Street View-position render was pixel-identical to the gallery image. No reliable night exterior or chimney evidence was found. Future footprint changes can require refitting the bespoke frame, and a new Overture release can require regenerating the land-use lookup. The terrace audit applies only to the named geometry.

## Next steps in order

1. Read this handoff from the current branch, then read outgoing session `orca_session_id:9ed961b2-061b-4422-a16e-54c75d4054ba`. Check the successor inbox for a new assignment or Sam’s visual feedback. The archived task list below is historical.
2. If the coordinator requests a revision, fetch current main and create a fresh task branch. Match the gallery camera and clock. Use `. "$HOME/.cargo/env" && pnpm test`, a browser check, `pnpm test:perf` for City changes, and `pnpm review` under the two-round charter. For terrain contact, run `pnpm audit:ground --url http://localhost:5417` against the dev server. Ground-contact is `orca_session_id:22a6180b-5cd0-4056-bbed-4d2cb2483246`.
3. Send the PR, screenshot links and camera strings to the coordinator. Use a coordinator message reply and the **successor’s own session ID**. The latest Air route is terminal `term_09e1b3da-5f48-4755-abf8-92a571a1f474`, message `msg_a8027aa718aa`. Await the coordinator’s relay of Sam’s OK before any merge. Quote GitHub state and mergeCommit before any MERGED notice. The coordinator handles publication.

At handoff, ports 5417 and 5418 had no listeners and Orca listed zero browser tabs for this worktree.

<details>
<summary>Archived predecessor handoffs (superseded)</summary>

# Handoff: studio-midtown-parks (Codex → gpt-6.2, 2026-11-23 evening)

This section supersedes the archived Claude handoff below. Sam requested a model switch at a pushed WIP. **Resume the existing terrace task; do not redo houses or Winn.**

## Current state

- Worktree `/Users/samsolomon/orca/workspaces/sim-atlanta/studio-midtown-parks`.
- Current branch **`samsolomon/studio-ansley-terraces`**, pushed WIP, **no terrace PR yet**.
- Houses are verified merged as [PR343](https://github.com/samsolomon/sim-atlanta/pull/343), merge `c66e4d63f3acaabf6fe687c2fa547ee249e06b6b`.
- Winn Park is verified merged as [PR349](https://github.com/samsolomon/sim-atlanta/pull/349), merge `a64509686c54314f208ddd9eafcd64323a8e1e5d`. Evidence and cameras are in `docs/log/ui/winn-park/README.md`; reference/implementation notes in `docs/winn-park.md`.
- Terraces implement item 2. High-only, Ansley-only, using existing frontage/road/obstruction lookup. Shelves, clipped hedges, 2–5 treads and occasional pale stone piers. `yard-terrace.ts` returns GroundYield cuts; `terrain/model.ts` builds yards and carves before scenery/tree placement. Low unchanged.
- Latest code qualifies **34 sites: 8 midtown-upper, 26 brookwood-south, 2,008 terrace triangles total, 52–76/site** (before replacing existing street hedges). Measured from staged 3DEP contexts in `/tmp/terrace-sites-final.log`.
- Final change fixes a sideways-slope stair/walk mismatch: stair top takes ground at entry + the existing walk's 4 cm surface offset, rather than the highest shelf corner. Shelf tops remain level. `terrace-landing-check.test.ts` reproduces a 23 cm gap on a 5% cross-slope with old code and passes fixed. Existing flower beds are suppressed on terraced yards to prevent shelf overlap.

## Next steps, in order

1. Finish this terrace PR. Read `docs/ansley-terraces.md` and the code. **The images and independent ground audit in the current evidence directory predate the final stair-landing fix.** Refresh high after views and get a new ground-contact check for all 34 sites. Preserve the before halves of the comparison JPEGs (they are the Winn-merged baseline; raw before PNGs were deleted after composing).
2. Re-run `pnpm test:perf` after the final landing fix; full tests/build status is recorded below. Last pre-fix integrated run passed both ceilings, but that is not final-fix validation. `pnpm test` needs `. "$HOME/.cargo/env"` in this shell. Python `.venv` is configured, so pipeline checks run.
3. Append a **final** dated build-log entry with new counts and screenshot links. I removed the old 30-site entry so it cannot be mistaken for the final result.
4. Open PR after checks. Cross-model review has already had its **two rounds**, per skill limit; no third round. Confirmed findings were flower-bed overlap and the reproduced stair landing gap, both fixed. Plausible remaining risk: named/facing-pair tree rollout occurs after terrace tree exclusion; no actual overlapping lot identified. Include this in PR. Do not call the whole board ground-clean: existing unrelated intersections remain.
5. Fetch and check PR diff against origin/main. Merge after checks/review; only coordinator deploys. **Wait for merge command completion and run `gh pr view N --json state,mergeCommit` before any MERGED notice. Quote its actual state and merge SHA.** Build-log conflict: retain both entries, rerun tests. Put our log entry before main's last existing entry to avoid append races.
6. Then new branch/PR for **item 4, street edge**: hex-paver sidewalks, granite curbs, liriope strips, continental crosswalks, Prado grass islands and yield signs. This has not been implemented. Ground-contact approved paint hooks, no pending conflicts; coordinate with its new gpt-6.2 successor. No changes to low ground-map density 0.724 px/m, downtown light-map 1024², low drape off, far swap 2500/2250 m. `low-ground-merge` must never ship. Do not place trees: tree owners own Prado maples.

## Validation and evidence

- **Final landing-fix full tests and build PASS**: 20 Rust, pipeline checks, 983 web + one skip, five worker. Logs `/tmp/terrace-handoff-tests.log`, `/tmp/terrace-handoff-build.log`. Targeted landing/terrace/residential tests also pass (12 tests). Final-fix perf and fresh visual/ground checks remain.
- Prior integrated main tests: 20 Rust, pipeline checks, 982 web + one skip, five worker; build pass.
- Prior integrated perf: low 2,356,960 triangles, 543 calls, 86 programs, 114 MB texture, 168.6 MB geometry, 430 MB post-GC heap. High 13,730,361 triangles, 1,177 calls, 147 programs, 813.2 MB texture, 274.1 MB geometry, 562 MB heap. Both ceilings pass; concurrency made timing exceed nonblocking targets. Logs `/tmp/terrace-merge-{tests,build,perf}.log`.
- Claude review logs `/tmp/terrace-review1.log`, `/tmp/terrace-review2.log`; persisted review files under main git dir `.git/train-review/`.
- Independent ground-contact checked **old `ceae1970`, 30 sites only**: 34,850 exposed-surface samples @0.25m, zero penetration/coplanar hits, low has no new layers. Report `/tmp/ansley-terrace-audit.json`, low counterpart. **This does not sign off revised 34-site code.** Ground-contact was told; it also handed off to gpt-6.2, so ask coordinator for successor route.
- `pnpm audit:ground` was invoked, but waits on old `#city-info` “Frame the full board” UI text and stalled. Headless temporary readiness fix also stalled. Both audit-owned Chrome processes were stopped. The same audit ran directly via Orca eval at 1 m with all 12 areas, both tiers: `/tmp/terrace-full-{high,low}-orca.json`. High includes 5,122,726 samples, 87,987 intersections across existing scene; not an attribution to terraces. For a new targeted audit use `window.__cityDev.areas().size===12`, then `window.__groundAudit` with terrace colours.
- Matched camera **`1503,-4056,70,60,150`**, Nov20 14:00/23:00 ET, `q=high|low`, `ui=classic` (current opening animation stalled in Orca; classic rendered). Close stair camera `1503,-4056,70,60,45`, `dev&mindist=20`; piers **`916,-4352,180,60,45`** (bearing 0 hid them behind roof).
- Existing comparison files: `docs/log/ui/ansley-terraces/`; README clearly flags WIP/pre-fix status. `/tmp/terrace-capture.py` captures all pairs but **do not rerun its baseline loop**: preview dist has now been rebuilt with terraces. `/tmp/terrace-final-shots.py` captures just high after views. Replace page ID before use. Generic capture waits for `#city-loading.hidden` and `timetable`, then 12 sec, screenshots and perf. Inspect images; blank/fog captures can happen. Use one tab, `orca tab switch`, and activate Orca if RAF stalls. Pillow is `.venv/bin/python` (system python lacks PIL).
- `web/dist` at handoff is the final-fix build, not a baseline. Data staged in `web/public/data/scene/square-board/{midtown-upper,brookwood-south}`. Prototype contexts have empty trees; use staged contexts for exclusions/measurement.

## Coordination and promises

Use `/Applications/Orca.app/Contents/Resources/bin/orca`.
Our outgoing session was `orca_session_id:ef6ac039-f20d-4773-bbff-e84554815860`; use your successor identity for new messages. Coordinator is Air terminal `term_05a952fa-de06-4064-8655-3e98e1caf1e0`. Direct remote send may reject pairing token; reliable reply thread is `msg_7b61952ad24d` (model switch), or `msg_924cf36be6ad` (verified merges). Reply with `orca orchestration reply --id ... --from <your session> --body ...`; read with `orchestration check`.

- Previous ground-contact acad9721-185c-4ee8-84df-9fb8fe9fac1e has now handed off. Coordinator will supply successor. It owns the southern inferred bridge follow-up and audit harness; no ground paint edits pending.
- Tree-species previous752c9656-15cc-4501-99e1-e59257d6fdcb owns mask PR348, last frozen head86750083/codefb699bbb awaiting coordinator. Winn's carpet filter is merged and must be preserved during integration. It approved local painted-cover carpet exclusion; do not edit mask ownership/update code casually.
- Tree lab previous48c0c9e4-ceda-4b87-adf1-6ada97d12390 owns lab looks, no rollout/sharedCarpet changes when coordinated.
- Still owed from old handoff: ground-contact check of hedge site612,-4008 and one unclassified street's yards (also living_street). Existing roadIndex excludes service/footway/path. Do not quietly expand those classes.
- Sam allows Google Street View for neighbourhood feel, not house-by-house copying. No new terrace photo research was done; current patterns follow Sam's relayed photos. Winn photo notes recorded sources, no new night lamps.
- Send coordinator milestone updates and PR/merge evidence: screenshot links, full cameras/time/tier, anything needing Sam's eye. Only coordinator deploys.

## Shutdown

Own servers :5417 (Vite dev) and :5418 (preview) stopped; own browser tab closed. No worker was started. Successor can restart `npx vite --port 5417 --strictPort` in `web/`.

---

## Archived Claude handoff (historical; state above supersedes this)

# Handoff: studio-midtown-parks (Claude, 2026-11-23)

Worktree `studio-midtown-parks`, which the coordinator calls "Midtown parks". This agent owns houses, yards, landscape primitives and furniture, Piedmont Park details and canopy staging. The full transcript is readable with `orca agent read`. This file covers what isn't obvious from it.

## Current state

- **Branch `samsolomon/studio-ansley-houses`:** pushed WIP, no PR yet. It is the coordinator-approved Ansley plan, item 1 (house forms):
  - `residential.ts`: an `ansleyForms()` pass on its own random stream (`id + ':ansley'`), so no other house changes. Its parts:
    - American Foursquares: about 45 % of eligible Ansley Colonials. Hipped roof, two storeys, a full-width porch with a white balustrade (balusters on high only) and one centre dormer.
    - Newer houses: about 30 % of Ansley Tudors. Limestone ashlar (siding style 12, `ashlar` family, about `#e4dccb`) or white-painted brick, under dark slate, with black steel window frames (the new `Plan.frame`).
    - Painted shingle: grey-blue and dark green added to the shingle family.
  - The lab has a new Houses → "Ansley Park forms" row and an ashlar row in the swatches.
  - Before/after captures of three cameras (`sam`, `pc`, `close`) at both tiers, day and night, were in progress in the scratchpad (`an/before`, `an/after`). Re-capture them; scratch is not durable.
  - **Still to do before its PR:**
    - compose the captioned BEFORE | AFTER images;
    - measure triangles (expected about +10k on high, +2k on low near houses; far houses unchanged);
    - write the README in `docs/log/ui/ansley-houses/`;
    - add a build-log entry;
    - run `pnpm test` and `pnpm build`;
    - self-review with the code-review skill;
    - **run `git diff --stat origin/main...HEAD` and confirm only your files appear.**
- **No open PRs.** Merged this session:
  - #286 yards;
  - #296 Active Oval;
  - #301 Piedmont furniture and the 10th Street gate;
  - #303 the `?dev&mindist` close camera;
  - #315 house level of detail (the phone-perf win);
  - #328 Ansley street widths.

## Sam's decisions and intent (all 2026-11-23)

- **Ground:** light and calm, "a whisper of variation". #248 is the standard.
- **Ansley character** (two photo batches, relayed by the coordinator):
  - wide streets (done in #328);
  - large houses with trees bigger than the houses;
  - terraced front yards with granite fieldstone walls and clipped hedges;
  - hex-paver sidewalks and granite curbs;
  - Winn Park's ravine floor is leaf litter with a dirt path, not lawn.
- **Street View:** allowed in a fresh Orca tab for the neighbourhood's feel, but never house by house. Record what you took in the doc. Everything stays illustrative or inferred, with no on-screen label, and within the low-tier budget.
- **Deferred:** utility poles and wires.
- **Phone performance is the top priority.** The A16 is triangle-bound. The low tier must stay lean, and new detail goes on high or into ground paint.

## Next steps, in order (the coordinator approved the plan: items 1 and 3 first)

1. Finish and ship the Ansley houses PR (above).
2. **Item 3, Winn Park:**
   - ravine floor: the `leaf-litter` ground cover plus a narrow `earth` path;
   - ivy and liriope on the banks;
   - a stacked fieldstone channel wall along the creek (`retainingEdge`, a granite colour variant);
   - a flagstone path and terrace with a bench (the furniture `bench`);
   - a small pond with a stone edge;
   - high tier about +4k triangles; low tier 0, via ground paint.

   Winn Park lies around x 790–900, z −4090…−4000 (Peachtree Circle, Westminster). Record the Street View notes in `docs/ansley-street-widths.md` (the "Street View notes" section) or a new Ansley doc.
3. **Item 2, terraced front yards** (high only, about 40–80 triangles per qualifying house). Where 3DEP rises more than about 0.8 m from the sidewalk to the house front: a fieldstone or limestone wall at the sidewalk, a clipped hedge on top, steps at the walk, and stone piers at some newer houses.
4. **Item 4, the street edge:** hex-paver sidewalks, granite curbs, liriope strips, continental crosswalks and The Prado's grass islands with yield signs. This is ground paint in `terrain/ground-map.ts`. **Ground-contact owns the ground maps, so coordinate first.**
5. If phone-perf asks: instanced house shells for heap, or freeing CPU-side attributes on far house tiles.

## Promises to other agents

- **Ground-contact** (`orca_session_id:1df827bc-6e12-4e74-b7da-83ee8931ec4b`):
  - measure the loose-hedge-clump fix with `pnpm audit:ground` now that #282 is in (the High's Peachtree lawn row, worst at about 612,−4008);
  - check one unclassified street's yards after #328 changed the yards' kerb to `roadWidth`;
  - coordinate on any ground-map paint (item 4).
- **Phone-perf** (`orca_session_id:3126b1a7-8882-498c-a5ff-7b65d626cf91`): answer if the A16 points back at houses, yards or landscape. Houses are tagged `userData.perf = 'buildings'`.
- **Materials** (`orca_session_id:2a079a0f-2573-4fe8-9648-2ec17e852466`): siding styles 11 and 12 (ashlar) were added for us. Tune coursing in `materials/siding.ts`, not in `world.ts`.
- **Tree lab:** owns tree species and placement, including the red Japanese maple on The Prado's islands. Don't place trees.

## Servers and ports

- Vite dev server on **:5417** from this worktree. It is stopped at handoff; start it with `npx vite --port 5417 --strictPort` in `web/`.
- There is no worker. The `/api` proxy errors to :8787 are expected and harmless.

## Repo rules that bit me

- **Never `git reset --soft` onto a stale `origin/main` to squash.** In #328 it produced a commit that would have reverted 83 files. Ground-contact caught it. Always `git fetch` first, and check `git diff --stat origin/main...HEAD` before every PR.
- **Build-log conflicts:** deleting the conflict markers can interleave entries. Check that your entry is intact after a rebase.
- **Capturing:**
  - Keep only one Orca tab open; a second tab throttles rendering and loads stall at "Building the city…".
  - Use a script that reloads and retries; the UI no longer has the "Frame" button the old capture script waited for.
  - After swapping files for BEFORE captures, wait for Vite to settle.
- **Ansley box:** `inAnsley` (house styles) starts at x 800. Peachtree Circle runs at x 770–835, so street logic uses `inAnsleyStreets` (x > 740).
- **Reviews:** Codex, opencode and Grok were unavailable to this Claude session, so reviews were self-reviews with the code-review skill, noted in each PR. Merge notices need GitHub blob links to captioned BEFORE | AFTER images, money shot first.

</details>
