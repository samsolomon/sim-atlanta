# Handoff: studio-midtown-parks (Claude Opus → Codex, 2026-11-24)

This section supersedes everything below it. The worktree's work is now **building skins** (skins-3), not parks. The archived Codex terrace handoff and the older Claude parks handoff are kept below for history. The work they describe is on main: houses #343, Winn #349, terraces #362 and the street edge #365.

Outgoing session: `orca_session_id:f7bfd025-4e43-4928-8318-2e0cafa98878`. Use your own successor id for new messages. The full transcript can be read with `orca agent read`.

## Current state

- Worktree: `/Users/samsolomon/orca/workspaces/sim-atlanta/studio-midtown-parks`.
- This file is on branch `samsolomon/parks-handoff-codex`, cut from `origin/main` d93c51d8. No code is in flight. Every skin branch is pushed and has a PR.
- **Assignment (skins-3):** skin generic City boxes, one PR per building. The latest priority from the coordinator and lead is **downtown generic buildings** near the Westin, Bank of America Plaza and Peachtree Center. My downtown list is finished: the AYIB deck, Barclay, 55 Allen Plaza, Ten and One Park Place, and George Muse.

### Open PRs (all approved; none merged by me; the coordinator runs merge trains)

| PR | Branch | Status |
|---|---|---|
| [#600](https://github.com/samsolomon/sim-atlanta/pull/600) | `samsolomon/clara-meer-detached` | Comment-only `KNOWN_DETACHED` reasons for Clara Meer. Peer studio-midtown-skyline-1c is taking it into train 8b. **Don't push to its head.** |
| [#607](https://github.com/samsolomon/sim-atlanta/pull/607) | `samsolomon/downtown-deck-288` | The AYIB deck. Corrects a 78.7 m phantom to the 27.7 m lidar height. Approved for 8b. The Westin money shot is a PR comment (images on `samsolomon/skins-3-evidence`). |
| [#618](https://github.com/samsolomon/sim-atlanta/pull/618) | `samsolomon/the-mitchell` | The Mitchell. Approved. Head 05fde483 has the coplanar fix (the wall carries the frame colour). Its city.ts wiring was lost once and restored; check that the city.ts diff is present after any rebase. |
| [#630](https://github.com/samsolomon/sim-atlanta/pull/630) | `samsolomon/renaissance-lofts` | Renaissance Lofts. Approved for 8d. |
| [#640](https://github.com/samsolomon/sim-atlanta/pull/640) | `samsolomon/barclay-hotel` | Barclay Hotel. Approved. The README has a deploy note added after Codex review. |
| [#648](https://github.com/samsolomon/sim-atlanta/pull/648) | `samsolomon/downtown-72b58249` | 55 Allen Plaza. Approved for 8d, plain by design (BORDERLINE note in the PR). |
| [#658](https://github.com/samsolomon/sim-atlanta/pull/658) | `samsolomon/park-place` | Ten Park Place (22.9 m) and One Park Place (35.3 m). Overture has the two heights swapped; the names are right. Approved for 8d. The coordinator's non-blocking note: warm Ten Park Place's buff. |
| [#664](https://github.com/samsolomon/sim-atlanta/pull/664) | `samsolomon/george-muse` | George Muse building: 36.4 m roof, 37.6 m cornice, cream limestone. **Approved for 8d** (coordinator msg_b0bff9a2cf73). Head d5d42f42. |

Merged this session, for reference: #410, #417, #428, #444, #459, #477, #490, #504, #511, #546, #558, #577 and #581. #581 shows as CLOSED because it was stacked on #546. Its head 3fcd0bbd is on main via train 8b (#622).

## Sam's decisions (as relayed by the coordinator; ask before reopening any)

Only the ones marked * are detailed in my own work. For the rest, see the owning workstream's handoff and PR, or ask the coordinator.

- **Flat glass:** the low tier draws flat glass (see the UI/phone-perf handoffs, #420).
- **Far board:** stays as decided; don't change the far swap distances.
- **Landmark LOD:** keep it.
- **Far shadows:** keep them as decided.
- **Tree far form:** keep it as decided.
- **Streaming flag:** `?stream=1` must not change the look. LOD failed the blink test.
- \* **0.45 shade floor (#631):** shaded glass keeps 0.45× its colour by day in the shader. Don't brighten base colours to make up for shade.
- **1075 Peachtree glass B:** Sam picked option B.
- **Expansion is paused.** Don't grow the board.
- \* **Generic buildings are the priority**, downtown first.
- \* **Glass:** rendered sunlit glass needs S ≤ 36 (teal up to 40) and V ≥ 40. Cite a photo for every colour change. A plain skin is a pass.
- \* **Night:** offices mostly dark; residential and hotel buildings noticeably lit.
- \* **No logos.** Use Street View for detail; cite it, never copy it.

## Coordinator and lead rulings still in force

- **Merging:** never merge without the coordinator relaying Sam's OK. After a merge, quote `gh pr view N --json state,mergeCommit`. Run `pnpm build` (tsc) on the final head before every merge.
- **Shader programs:** the low tier is at 90/90. Add **no new material variants or shader programs**. Skins use `landmarkShell` + `StaticLandmarkMaterial` (vertex colour only).
- **Batch rules (skyline lead 47b1a596):** no `onBeforeCompile`, maps or transparency; no per-building materials. Don't edit `landmark-batch.ts`, `finish()`, or the batch call in city.ts.
- **Lit panes:** use `litFacade` / `litHash` from `skin-kit.ts`. Don't use the shell rng for lit panes.
- **Coplanar layers:** nothing closer than 3 cm to its wall (use 4–8 cm).
- **Footprint test:** `skin-footprint.test.ts` (footprint plus 2.5 m, detachment via `detachedParts`). `KNOWN_DETACHED` is a ratchet; only lower it.
- **Four-side sheet:** required on each skin PR: `node scripts/four-side-sheet.mjs --id <id> --ground <navd88> --top <m> --dist 400 --name "<name>" --base http://localhost:5417 --out docs/log/ui/<slug>/<slug>-four-sides.jpg`. Use `localhost`, not 127.0.0.1. Bearing 0 shows the **south** face.
- **Every skin PR includes:**
  - captioned BEFORE | AFTER composites inline: day 11:30 money shot first, night 23:30, low tier and a close-up, each with its cam string;
  - `pnpm test`, `pnpm build` and `pnpm test:perf` (all five entries);
  - the **same-session geometry MB delta**: run test:perf on a detached `origin/main` worktree, then on the branch;
  - `pnpm review` (Codex), at most two rounds;
  - a deploy line: a web/dist rebuild and a worker redeploy, no `pnpm data`.
- **Current perf ceilings:** low 435 calls / 190 MB; high 475 calls / 300 MB; high-night 630 calls. Last run (#664): low 358 calls / 169.7 MB, high 407 / 281.5 MB, high-night 600.

## Next steps

1. Watch the 8b and 8d trains. If the coordinator asks for a rebase, follow the recipes under Gotchas.
2. Optional follow-ups the coordinator named:
   - warm Ten Park Place's buff (#658; non-blocking, cite the photo);
   - strengthen 55 Allen Plaza's louvres (optional).
3. **Amli Arts Center dark-field glass:** waits on Sam. Don't start it without a ruling.
4. **Parked: 881 Peachtree / Hanover** (`osm:way:795480473`). There is no photo of the built tower. Lidar gives a flat roof at 95.5 m. Pick it up only if photos turn up.
5. For the next building, ask the coordinator or skyline lead. They assign the downtown rows.

## How a skin is built (reusable)

- **Code:** `web/src/city/<slug>.ts` + `<slug>.test.ts`. Pattern: `landmarkShell(buildings, grid, id, name, origin, axis, probes)`, then `shell.prism`, `shell.body.quad`, `litFacade(...)`, and `shell.finish(lightColor, nightIntensity)`. Local y is NAVD88. Copy a recent example: `george-muse.ts` (simple) or `park-place.ts` (two buildings).
- **Downtown mount** (`web/src/city/city.ts`): a `let` declaration, the create call in the chain after samNunn, `world.group.add`, the batcher's `listed` array (`landmark-batch-list.test.ts` checks it) and `setNight`.
- **Midtown mount** (`web/src/terrain/model.ts`): the `const landmark = site.id === X ? ...` chain.
- **Heights from lidar (3DEP):** `pipeline/scripts/king_memorial_corridor.ept_points` with `vignette_trees.scene_to_lonlat`. Laspy is only in `../studio-midtown-skyline/.venv/bin/python`. Phantom heights are common: the AYIB deck, 55 Allen Plaza, the swapped Park Place pair and 881 Peachtree.
- **Evidence:** `docs/log/ui/<slug>/README.md` must record:
  - day and night photos from two angles, with sources;
  - estimated dimensions;
  - the lighting seen in the photos, or the night-photo gap;
  - which details were estimated.

  Also add a build-log entry.

## Gotchas

- **A/B toggles:** use a reversible sed (`x = null && createX(` or `site.id === X && false ?`). **Never `git checkout -- file`.** That wiped #618's wiring once.
- **Rebasing:** never soft-reset onto a moved `origin/main`; it reverted others' work. Reset to the merge-base, commit, then rebase. On conflicts in `docs/build-log.md`, `city.ts` or `model.ts`, take main's version, re-add your entry or chain lines, and check the imports survived.
- **Perf base:** a stale `pnpm data` gave a false 177.8 MB base. Re-run `pnpm data` in the base worktree if the numbers look off.
- **Load flakes:** vitest timeouts and RPC timeouts under Studio load. Rerun before you debug.
- **Shared Studio:** no `pkill` or `killall`. Kill only PIDs you started. Drive only a browser you launched or your own Orca tab.
- **cargo:** `cargo` isn't on PATH here; source `"$HOME/.cargo/env"` before `pnpm test`.

## Coordination

- Orca CLI: `/Applications/Orca.app/Contents/Resources/bin/orca`.
- Coordinator: the Air terminal. Reply on the thread you were given (handoff: `msg_83670ee8ea9b`; skins-3: `msg_b0bff9a2cf73`) with `orca orchestration reply --id <their msg id> --from <your session> --body ...`. The id must be **their** incoming message id; replying to your own id loops back to you.
- Skyline lead: now routes via `orca_session_id:191b6166-18e7-4e23-8b97-ec53a7e5a19d` (was 47b1a596). Peer studio-midtown-skyline-1c owns #600.
- **The repo is public** (2026-11-24). Keep key values, private notes and personal details out of PR bodies, issues and comments.

## Shutdown

My Vite dev server on :5417 (PID 14820) is stopped, and my Orca review tab is closed. No worker or preview server was running. To restart: `npx vite --port 5417 --strictPort` in `web/`.

---

## Archived: Codex handoff (2026-11-23 evening; superseded)


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

### Archived Claude handoff (historical)

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
