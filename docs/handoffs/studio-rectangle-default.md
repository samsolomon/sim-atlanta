# Handoff for studio-rectangle-default

## Current release handoff · 2026-11-24

**Accountable owner.** The Studio release packager owns the build, verification, archive and checksum. The merge lead owns integration and the exact cut. The deployment coordinator owns production deployment and smoke verification.

**Production baseline.** The deployment coordinator verified R15.1 at 100% on atlanta.solomon.io, Cloudflare version `66d0174c-b313-4bf2-8cbd-4b6f9265c679`. All 420 public assets match the deployed R15 archive. The deployed Worker includes the MARTA formatter from [#678](https://github.com/samsolomon/sim-atlanta/pull/678), merged at `0bd6bec0da87083fc03e2e408cb67a4c19177bc1`.

**R15 asset archive and verification.** Pinned #677 merge `a92979633e6f08aafcecceb370216e4537039d20` has the approved tree `9c38797f5868fff4475748868bc7fe30183229b8`. The archive contains 55,931,670 bytes and verifies to `2eb7a59e8b19be72c4070c33962dd7d6b589b10df876831e911c61ce3f1bf05d`. All 475 extracted manifest entries verified. At packaging time, the R15 data, music and bundled Worker matched R14. Strict tests passed (20 Rust, 18 Python, 1,381 web with one skip, 9 Worker). Standing gates and both-tier sky and sunset, traffic, Follow, and desktop/phone intermodal checks passed. The archive’s RELEASE.md records the gates and public transit observations. See smoke/sunset-high.jpg, sky-low.jpg, traffic-motion.jpg and models-phone.jpg. The [#674 12-view sheet](https://share.onorca.dev/a/R_wHXCEOqP7m) is the overcast reference.

**Integration and cleanup.** At kickoff, agree on one integration owner for independently reviewed contributions. Report overlapping editors, shared services and pending branches before cleanup. The packager owns no pending feature branch or shared dev server. For the next authorized cut, compare public files with web/dist in sim-atlanta-release-a9297963.tar.gz, visuals with the R15 captures, and Worker changes with the deployed R15.1 formatter from #678.

## Historical handoffs

## Claude Opus → Codex handoff (2026-11-24)

Claude Opus session **`orca_session_id:7130640f-bf32-49f2-80aa-bb14558a400d`** hands this worktree to Codex (gpt-6.2-astra or gpt-6.2-sol). Read its history with `orca agent read --id orca_session_id:7130640f-bf32-49f2-80aa-bb14558a400d`. The earlier sessions are listed below.

### Role

This worktree is the **Studio release packager**. It writes no feature code and owns no PRs. When the coordinator (Sam's MacBook Air, `term_09e1b3da-5f48-4755-abf8-92a571a1f474`) sends **"Release N: go <sha>"**, it:
1. Verifies the commit is on `origin/main`.
2. Builds and runs the strict `test:release`.
3. Diffs the data and Worker against the last live release.
4. Runs the standing smoke set.
5. Seals the package with `SHA256SUMS`, Taildrops it to `sams-macbook-air`, and reports.

Only the coordinator deploys. Reply to the coordinator's message ID (`orca orchestration reply --id <their msg id>`), never your own. Send interim status at each stage, because the coordinator chases silence.

### Current state

- Branch `samsolomon/handoff-studio-rectangle-opus` is docs only, with no PR. There is no WIP and no open or held PR owned by this workstream.
- **Production: release 10, `8729e1cc`, live as Worker `631ca0f8`.** All of its post-Taildrop items (the train 8b skins) are done and reported.
- **Next release:** once #593, #420, #524, #520, #435, #631 and #625 have landed (Sam approved them on the morning of 2026-11-24), the coordinator sends the go with the commit. #435 is the streaming flag, which brings back `route:north` and `route:loop`. Add those to the long-task check, comparing with the previous release rather than an absolute bar, because house-tile builds of 100–590 ms are a known issue with a fix in progress.
- No servers, Workers or Chrome sessions of this worktree are running.

### Sam's decisions affecting the area (as relayed 2026-11-24)

Flat glass; far-board; landmark LOD; far shadows; tree far form; the streaming flag; a 0.45 shade floor; 1075 glass B; expansion paused; generic buildings as the priority.

For the packager, these mean: expect the related PRs in upcoming releases, and check them with the matched-frame comparison against the last live release. Earlier rulings still stand:
- Low-poly trees by default, with `?trees=species`.
- Very-far ground on by default on Low, with `?veryfar=0` to turn it off.
- Idle work must be sliced into short tasks.
- No pattern kills.
- Drive only a browser you launched yourself.

### Coordinator's standing rulings for every release

- **Matched frames against the last live release.** Serve both staged `web/dist` folders on two local ports, capture identical pinned URLs and report the share of pixels whose difference exceeds 32/255. Attribute every changed region. This is required for any change that claims to be invisible.
- **Deck-over-road shadow set** (`planDecks.json`, inside `planFix.json` together with near, default and freight-kink frames). It caught #514's viaduct banding.
- **Far-orbit shadow follow** on Low at 3, 6, 12 and 21 km (`smoke9.mjs`). It caught #534's lag.
- **6x CPU long tasks**, three runs per build (`smoke10.mjs`): a Midtown pan at 700 m and a 33-tick zoom-out from 3 km to 22.9 km. Fail anything more than 1.5x the previous release's worst. It caught #538's idle task.
- **P0 live data**: run `wrangler dev` on the bundle from a temp folder with a **canary** `.dev.vars`. Check that every `/api/*` route returns `no-store` with a current `Date`, and grep for leaks of the canary key. Run `smoke7.mjs` for the client status line: a stale feed must read Timetable and old weather must read "illustrative sky". Never put `.dev.vars` in a package; check the tarball for it.
- **Core regression** (`smoke.mjs` and `smoke2.mjs`, desktop and phone) **before** the Taildrop.
- Skins from four sides, day and night, can follow the Taildrop. Label them as pending.

### Tools (all in `~/Developer/sim-atlanta-release-tools/`)

| Tool | What it does |
| --- | --- |
| `smoke.mjs` | Core flow |
| `smoke2.mjs` | Tree count from the scene, night chip, piazza |
| `smoke6.mjs` | Plan-driven captures: `PLAN=<json>`, optional `waitMs` and `scene` actions, plus a Worker-constructor probe |
| `smoke7.mjs` | Live-feed stubs: `RAIL=fresh\|stale10\|502`, `WEATHER=fresh\|old90\|none` |
| `smoke8.mjs` | Fly and geometry probe |
| `smoke9.mjs` | Far-orbit pan |
| `smoke10.mjs` | 6x long tasks |
| `smoke11.mjs` | Device pixel ratio |
| `smoke12.mjs` | Moves the clock and conditions in place for #552-style freeze checks |
| `smoke13.mjs` | Very-far terrain triangle probe |
| `verify-production.py` | Production verifier with retries |
| `plan*.json` | Camera plans |
| `ref-r7-*`, `ref-r9-*`, `ref-r10-8729e1cc/` | Baselines |

- **Environment:** set `SMOKE_DIR` and `SMOKE_BASE`.
- **Browser:** every script launches its own Chrome with `--remote-debugging-port=0` and reads its `DevToolsActivePort`.
- **Camera read-back:** City does not update `cam` in the URL, so read it from the share panel's `.a2-share-url`.

### Gotchas

- **Sandbox:** local HTTP, Chrome and Taildrop need the sandbox disabled on this host, and `lsof -t` inside the sandbox returns nothing. Find your server PIDs with `ps -eo pid,command | grep "[h]ttp.server <port>"` and kill those PIDs only.
- **Long commands:** foreground tool calls are capped at 10 minutes. Run long capture chains in the background and poll them.
- **Shared host load:** under a load average around 50, Vitest can time out. Rerun once. A failure that passes alone is a timing failure; say so explicitly.
- **Workers:** the bundle for a Worker-changing release comes from `cd worker && npx wrangler deploy --dry-run --outdir <pkg>/worker/bundle`. Otherwise copy the previous package's `worker/`.
- **`pnpm data`:** for #512 it was `.venv/bin/python pipeline/scripts/terrain_transport.py`. Don't use `-I`, because the script imports from its own folder. It runs offline from `data/raw` and does not refresh Overture or GTFS, which would break the November 20 Crescent cameras. Diff all 52 public data files afterwards.
- **`web/public/data`** in this worktree currently holds the release 8+ regenerated `vignette.json`. It is the correct current state.
- **Untracked `pipeline/scripts/__pycache__/`** appears on this old-base branch. Ignore it and never commit it.

---

Codex GPT-6.2 session `orca_session_id:75355e85-c0af-4497-b5d4-86533a9e9ed8` hands this worktree to Claude Opus. The earlier Codex session is `orca_session_id:d460b6b8-d706-4545-8a60-370d9ba9369c`.

## State at handoff

- Branch `samsolomon/handoff-studio-rectangle-opus` is a docs-only handoff off `origin/main` at `59b8cbc9`. This handoff has no PR. There is no WIP and no open or held PR owned by this workstream. Keep every coordinator merge hold in force until the coordinator relays Sam's OK.
- #338, freight Follow, is `MERGED` at `f70efec304469f65d3d4f1b56d2404cf66137746`. Prior handoff PR #332 is `MERGED` at `eb538980e2d1e726d0a449eaa3bb000ed3a6d816`. Earlier completed Follow work includes #238 and #261. [Freight review and cameras](../log/ui/follow/freight-review.jpg)
- Passenger night checks are complete. Both production packages requested in this session were sent to the Air. The coordinator owns deployment. The newest package is `b71b863f`. The production verifier passed at handoff: all 95 public assets matched and the MARTA rail response had the expected shape.
- No dev server or browser session owned by this worktree is running. Port 8787 currently belongs to the Midtown Connector worktree's Worker. Coordinate before using or stopping it.

## Coordinator requests, quoted from the messages

> You are the release packager: package only when the coordinator asks. Otherwise finish the passenger live-feed night checks in the handoff.

> Coordinator: package a production release from main at ccae1bc1, using the release recipe in your handoff (test:release strict, build, tarball with SHA256SUMS, smoke/verify-production.py, RELEASE.md), Taildrop it to sams-macbook-air, and send me the SHA-256. Keep ?ui=classic (#310 is not in this one). In RELEASE.md, list user-visible changes since bc32b09 in plain words: City species trees (crape myrtle, loblolly, sweetgum, Japanese maple) with the phone fix (#336, #348); napkin crown B (#341); King Memorial CSX track (#334); freight locomotive detail and four new locomotives (#291, #347); traffic turns and streetcar queues (#340, #346) plus the 21:00 fix (#354); freight Follow (#338); Ansley houses and Winn Park (#343, #349); Rhodes Hall and its uplight, SCAD, Woodruff service side (#344, #360, #351, #337); the Arts Center slab (#339); footbridge contact (#356); and lab-only trees (magnolia, dogwood, white oak, elm). Say whether pnpm data is needed: if fresh GTFS data is regenerated, pre-Nov-22 cameras lose the Crescent, so prefer existing data unless a PR requires new data. Include review cameras with day and night URLs.

> Coordinator: package a production release from main at b71b863f with your recipe (test:release strict, build, tarball, SHA256SUMS, smoke/verify-production.py, RELEASE.md), Taildrop it to sams-macbook-air, and send me the SHA-256. This release removes ?ui=classic (#310) and ships the new interface: Final dock, Models page, phone selection card, compact radio. Say whether pnpm data is needed (I expect not; route 49 is NOT merged yet). In RELEASE.md list the user-visible changes since ccae1bc1 in plain words: the new interface (#373, #376, #379, #382); tree round 2 (#363) and the lab species (redbud, Callery pear, lacebark elm, river birch); Grant Street rail bridge (#370) and the North Avenue underpass (#380); Coda (#366) and the Rhodes uplight (#360); Rapid A-Line buses and the XE60 roof (#358, #364, #369); Ansley terraces and street edge (#362, #365); load-time staging (#359); the heap fix (#371); the streetcar replay stutter fix (#378). Include day/night review cameras, and smoke-check the dock, Models and selection on desktop and phone emulation.

> Then take no new work: the Claude successor will read your session history and continue. Merge holds stay in force; nothing merges until I relay Sam's OK.

## Packages and verification

Archives, unpacked app and Worker, SHA files, per-release notes, camera tables and smoke screenshots live under `~/Developer/sim-atlanta-release-<sha>/` and next to those folders as `.tar.gz` and `.tar.gz.sha256`. Both packages were Taildropped to `sams-macbook-air` and reported through the coordinator reply route.

| Release | Compared against | Archive SHA-256 | Verification |
| --- | --- | --- | --- |
| `8729e1cc` | `af33991c` | `f958bbb9cc16114b610d18fe0a33dd508927f7083c8c18ef87f50ec3421ad3ae` | Train 8b plus the houses stack, #608 very-far ground on by default, #615, #567/#580 and #603. Web rebuild only. Very-far proven on Low with `smoke13.mjs`: terrain goes from 160k to 65k triangles. SkyView wheel checked. Live as `631ca0f8`. |
| `af33991c` | `6c863340` | `b9019c8bf23475f8f3c56ef3e221df5db852df207fb17d399a7bd25536a5e553` | Train 8a plus #552, #588 and #562. Web rebuild only; data and Worker byte-identical. Live as `05828352`. #552 check with `smoke12.mjs` and `planMotion.json`: the clock advances in place through `__scene` and frames are compared with the previous release at each step. The only daytime difference was #590's intended Marquis piers. Ships the new `verify-production.py` with retries. |
| `6c863340` | `4e33e335` | `ed050ac607a6e76678080e2e416ba8a9fb5244d359dfecf774b496b3de44bd08` | Release 8, after three re-cuts. **`pnpm data`**: `vignette.json` regenerated for #512 (13 `freightS` runs). Worker unchanged. Held for the #514 viaduct banding (fixed by #566), the #534 shadow lag at far orbits (#570), and #538's very-far idle task (made opt-in by #586). Live as `67f69d4c`. |
| `4e33e335` | `a2199af7` | `7dc2b5ab0021ea45338067026ef4fe35e4e0b2221e490516be3ed5ff0136983a` | P0 #517 plus train 6, #506, #472, #467, #495 and #489. **The Worker changed**: the bundle was rebuilt with `wrangler deploy --dry-run --outdir worker/bundle`. Strict tests passed on the second run, after a #472 traffic test hit the 5 s timeout under load; the rerun had 1,209 web and 9 Worker tests. Worker P0 under `wrangler dev` with a canary key: every `/api` response, including cache hits, errors and 404s, returns `no-store` with a current `Date`, and the key never leaked. Client P0 used `smoke7.mjs` with CDP `Fetch` stubs: stale data shows Timetable, and old weather shows illustrative sky. Taildropped after (1)–(4); skins and sweep followed. Live as `1cc055ed`. |
| `a2199af7` | `c577cf06` | `690683eb31dc6e0735052f63a6ceeafc28505dda177df2add3a36a9e963b1d52` | Train 5 plus #478, #470, #479, #484, #480 and #486. Web rebuild only. **96 public files**, because #486 adds `surface-worker`. 218 manifest entries. Strict tests passed on the first run: 1,170 web. Medical Arts stays dark through the dusk sweep. #479 drag, mount and speed=600 checks match fresh loads. No Worker without `?worker=1`. The sweep found only allow-listed late compiles. Core smoke ran before the Taildrop. Production MARTA upstream returned 500 at packaging time. |
| `c577cf06` | `5aab946f` | `fb8697fd3787511a0c3925a24aa4534c5d35a37c548015f9505327cd310dbe38` | #464, #461 and #471, plus train 4. Web rebuild only. 161 manifest entries. Strict tests passed on the first run: 20 Rust, 11 pipeline, 1,149 web, 5 Worker. 28 matched frames against release 4 (`smoke5.mjs`). `scripts/program-sweep.mjs` ran on both tiers and found only allow-listed late compiles. The core smoke ran after the Taildrop, at the coordinator's request, and passed. |
| `5aab946f` | `4cf6f874` | `b8c6103453aa0a1604a3e4fbd7425a112457766a6207b7a1ba955373dc843a8c` | Trains 2 and 3, plus #441, #442, #449 and #452. Web rebuild only. 170 manifest entries, 95 served files. Strict tests passed on the first run: 20 Rust, 11 pipeline, 1,141 web, 5 Worker. Matched frames against release 3: both releases were served on two ports and diffed with `smoke4.mjs`. The default views differ by at most 0.03%, and the houses and night lights are unchanged. Comparison images are in `smoke/compare/`. |
| `4cf6f874` | `1acba131` | `4c6f967dde9752fe9594cce2be82c32704c6550a21aaf484c26125ecbbc4aff5` | 16 PRs including merge train 1 (#445). Train 2 is excluded. Web rebuild only. 144 manifest entries, 95 served files. Strict tests passed on the second run: 20 Rust, 11 pipeline, 1,127 web, 5 Worker. On the first run, the east-rail King Memorial test hit the 5 s timeout under load. Smoke covered GTAO at 14:00 and 22:00, a High pan, and The Proscenium, The Atlantic and 1072 West Peachtree. `smoke3.mjs` holds those checks. |
| `1acba131` | `63d7e332` | `a1c0d9050b3c51b66ed706294d9da04b7631e691dfe5536e77078aca70eb9ee7` | 22 PRs (#326–#417). Web rebuild only. 128 manifest entries, 95 served files. Strict tests 20 Rust, 11 pipeline, 1,110 web with one skip, 5 Worker. Default City has 0 species-rollout meshes and 0 rollout carpets on both tiers, and `?trees=species` restores them (counted with `__perf.top`). Night 3D chip and the 13:00 piazza umbrellas checked. Deployed by the coordinator as version `cc1fe35a`, and the production verifier passed. |
| `63d7e332` | `b71b863f` | `3cb8e0aa70b983ea1aed3417c889406b584ad676bdcd977346c6643c464e5302` | 11 PRs (#377–#395). Web rebuild only. 116 manifest entries, 95 served files. Strict tests 20 Rust, 11 pipeline, 1,080 web with one skip, 5 Worker. No High precompile exception. |
| `b71b863f` | `ccae1bc1` | `80b0f06ac93b68d38dc1695d99b54dea107f1b4abf4fad5eae2a44e3d334bfea` | 112 manifest entries checked after extraction, 95 local HTTP assets. Strict tests 20 Rust, 11 pipeline, 1,071 web with one skip, 5 Worker. Desktop and phone checked Final dock, radio, Models search/XE60 Details, warm return and selection. An old classic URL opens Final. |
| `ccae1bc1` | `bc32b09` | `de404a41230783bb1d742ed39f0705f1a855afbf84001e9086f6420c0e22c6d3` | 118 manifest entries checked after extraction, 102 local HTTP assets. Strict tests 20 Rust, 11 pipeline, 987 web with one skip, 5 Worker. Classic still worked. Phone auto chose Low. Edgewood at 21:00 rendered. Downtown freight Follow said Illustrative. |

Public data was byte-identical across both comparisons (52 files). Both packages reused the previous Worker bundle and smoke verifier. `b71b863f` excludes the Route 49 work in flight. Check its merge state independently on future release requests.

## Camera strings and checks

City camera format is `cam=x,z,bearing,tilt,distance`. Use `/?view=city&q=low&weather=clear&speed=0&t=TIME&cam=CAM` for a pinned review. Match day and full night, usually November 20 at 14:00 and 21:00 ET. Use `q=high` for the High pass. For the real-time checks omit `t` and `speed`.

| Check | Camera or link |
| --- | --- |
| Final dock and radio | `565,-3965,-101,55,421`, `2026-11-20T14:00:00-05:00`. Add `ui=classic` to check old links reach Final. |
| Phone compact and expanded selection | `482,-3063,-83,63,600`, `2026-11-20T13:30:00-05:00`, `follow=marta:route:RED`. Confirm Scheduled, visible dock in compact view, and Follow stays active through More and collapse. |
| Models | From the dock, search XE60 and inspect Articulation in Details. Verify the original City canvas is reused on return. Direct URLs `/?view=models&v=xe60` and `/?view=models&v=xe60&night=1`. |
| Downtown freight | Day `921,549,-148,26,300` at 14:12:35, night `-505,-900,-148,26,300` at 22:12:35. Tap a visible car, then Follow. |
| Norcross freight | `-654,-4519,-148,26,300` at 14:21:25 and 22:21:25. Confirm Illustrative and end on board exit. |
| Edgewood queue | `588,-65,0,50,180` at 21:00 for the course endpoint, and 12:08 for queue rollover. |
| Rhodes Hall | `301,-4675,340,60,160`, matched day and full night. |
| Grant Street and North Avenue | `1390,505,0,55,300` and `-783,-1860,235,55,350`; closer below-deck cameras are in the project survey notes. |

The live passenger check used City Low at `53c29a11`, with local Vite relaying public cached MARTA endpoints at the real clock around 20:18–20:21 ET, solar elevation −34° to −35°. The Red Line camera moved 1,041 m through mapped Midtown tunnel, from `489,-3026,-148,26,300` to `410,-1988,-148,26,300`. Route 49 bus 5106 moved 449 m across a live update, from `878,-895,-148,26,300` to `549,-1200,-148,26,300`. Stop/restart passed on both. Pinning the clock switched Live to Timetable. The board-wide tier and cards were checked independently. Evidence is in `~/Developer/sim-atlanta-passenger-night-2026-11-23/`. The review sheet and moving-bus frame were Taildropped. The Route 49 bus check used a public feed observation. The later Route 49 feature branch adds separate functionality.

## Claude Opus session (2026-11-23)

Claude Opus session `orca_session_id:7130640f-bf32-49f2-80aa-bb14558a400d` packaged `63d7e332` and `1acba131`. The coordinator reply route works by replying to each inbound message ID. Smoke scripts are `/tmp/sim-release-1acba131/smoke.mjs` (core flow) and `smoke2.mjs` (tree count, night chip, piazza). Set `SMOKE_DIR` and `SMOKE_BASE` before running them. Run them against a staged `python3 -m http.server`. Local HTTP and headless Chrome need the sandbox disabled on this host. Release 3 (`4cf6f874`) is live as version `3823167f`. Release 4 (`5aab946f`) is live as `0547323b`. Release 5 (`c577cf06`) is live as `db7a01cc`. Release 6 (`a2199af7`) has been delivered. Release 7 (`4e33e335`) is live as `1cc055ed`. **The next release (train 7, transport far form, sliced builds) needs `pnpm data` for #512.** Regenerate scene data from pinned inputs without refreshing GTFS, and diff every public data file against the live release. A Worker-changing release needs the bundle rebuilt with `wrangler deploy --dry-run --outdir <pkg>/worker/bundle` from `worker/`. Run the local Worker from a temp folder that holds a canary `.dev.vars`; never put that file in the package. All smoke scripts and plans are in `~/Developer/sim-atlanta-release-tools/`. `smoke6.mjs` takes `PLAN=<json>` and injects a `window.Worker` probe. Release 6 comes after train 5 and #472, #478, #479, #480 and #470. The coordinator sends the go with the commit. Lesson learned: keep the coordinator updated during long smokes. Foreground tool calls are capped at 10 minutes, so run long capture batches in the background. The skyline lead cuts it, and I confirm with the coordinator. For any change that claims to be invisible, the smoke must include matched-frame pixel diffs against the last live release (coordinator, 2026-11-24). For release 4, the coordinator delegated the go to the skyline lead's cut message. It comes after #441, #442, the .pyc cleanup, the test-speed fix and train 3 are on main. Release requests come only from the coordinator. The merge-train session `47b1a596` announces cuts, but packaging waits for the coordinator's go. The smoke scripts launch Chrome with `--remote-debugging-port=0` (the #440 pattern).

## Release 8 history (2026-11-24, shipped as `6c863340`)

Release 8 was re-cut twice. `2742657d` added #566, the viaduct fix, verified at 0.06–0.08% against release 7. `c3d751fd` passed full strict tests. It is held for ground-contact's PR that makes #538 opt-in, and the go will name that commit. Originally, release 8 at `0e3a71b1` was **held and not Taildropped**. On High and Low, the freight viaduct's shadow over the Connector bands in wavy stripes; see `757,519,190,55,350` at 2026-11-23 14:05:41. The merge bisect shows the bands first at `3eca63b9` (#514, transport in the shadow pass) on top of #500's triangle permutation; `71b26f41` and `a1305a32` are clean. Ground-contact (`a761d59f`) owns the fix. Production stays on release 7.

When the fix merges, the coordinator will re-cut release 8 from the then-current main, which will also carry #538, #550 and the release-9 train.
- Regenerate `vignette.json` with `.venv/bin/python pipeline/scripts/terrain_transport.py`. Do not use `-I`: the script imports `vignette` from its own folder. It runs offline from `data/raw` and does not refresh Overture or GTFS.
- Diff all 52 files. Only `terrainTransport.rail[].pts` on the 13 `freightS` runs may change.
- Reuse the release 7 reference frames in `~/Developer/sim-atlanta-release-tools/ref-r7-4e33e335/` (plans `planR8match.json` and `planR8skins.json`).
- **Standing deck-over-road shadow set:** `~/Developer/sim-atlanta-release-tools/planDecks.json`, 21 frames with release 7 references captured. Run it on every release from now on.
- **Standing check: far-orbit shadow follow** (`smoke9.mjs`). On Low at 3, 6, 12 and 21 km over downtown, drag-pan about 2 km. The camera is read from the share panel's `cam`, because the URL doesn't update. Report shadow redraws and frames against release 7. R7 baseline: 25, 15, 13 and 8 redraws.
- **Standing check: 6x CPU long tasks** (`smoke10.mjs`). On Low with CDP `setCPUThrottlingRate` 6 after ready, run a 12 s drag-pan at Midtown 700 m and a 33-tick wheel zoom from 3 to about 22.9 km, then hold 8 s. Record `longtask` entries and the worst frame. Fail if a task exceeds 1.5x release 7's worst on the same path, comparing three runs each. R7: pan 72–93 ms (worst frame 67–100), zoom 50–74 ms. `route:north` and `route:loop` exist only on the held #435 branch.
- Bisect evidence is in `~/Developer/sim-atlanta-release-0e3a71b1-bisect/`.
- Still to do on the re-cut: the #534 low fly with `smoke8.mjs`, the geometry read-back (about 171 MB low, about 282 MB high), the program sweep and the core regression.

## Current state

Release 10 (`8729e1cc`) is live as `631ca0f8`. The next release comes once #593, #420, #524, #520, #435, #631 and #625 land; the coordinator sends the go with the commit. Baselines are in `~/Developer/sim-atlanta-release-tools/ref-r10-8729e1cc/` (`planFix.json` frames, `c3/` and `longtasks.txt`). #435 brings back `route:north` and `route:loop` for the long-task check.


## Next steps, in order

1. Read `AGENTS.md`, this handoff, and `orca agent read --id orca_session_id:75355e85-c0af-4497-b5d4-86533a9e9ed8 --limit 100`. Establish the reply route using a fresh inbound coordinator message with your own session ID. The last inbound handoff thread was `msg_97d689062a0d` from `term_09e1b3da-5f48-4755-abf8-92a571a1f474` on Sam's Air. Use `orca orchestration check` for replies. Direct Studio-to-Air sends have failed with a rejected pairing token; `orca orchestration reply --id <incoming-message> --from <your-session> --body ...` works.
2. Wait for the next coordinator release request. There is no outstanding release, night check or approval request in this workstream. Only the coordinator deploys. Before a MERGED notice, run `gh pr view <n> --json state,mergeCommit` and quote both values.
3. For the next release, fetch and verify the requested commit is on `origin/main`. Build at that exact commit, and compare with the last confirmed deployed package. Use existing GTFS and public board files unless a change requires new inputs. If the City datasets must be rebuilt, `pnpm data:city` includes `data:midtown`. Check the actual changed files before claiming any rebuild dependency.
4. Run `pnpm build` and `pnpm test:release`. On this host, use `PATH="$(brew --prefix rustup)/bin:$PATH"` and the per-worktree `.venv`. A three-worker Vitest cap worked for both releases (`VITEST_MAX_THREADS=3 VITEST_MIN_THREADS=1 VITEST_MAX_FORKS=3 VITEST_MIN_FORKS=1`). Compare every non-asset file with `cmp`. If Worker source/config is unchanged, copy the last live release's `worker/`; copy `smoke/verify-production.py`.
5. Smoke the staged build with headless Chrome, inspect screenshots, and write `RELEASE.md` with the data comparison, smoke results and day/night review URLs. The last smoke script is `/tmp/sim-release-b71b863f/smoke.mjs`. CDP sets viewport, phone UA, and five touch points. Verify the served file count and the deployed MARTA rail schema. The full production verifier runs after deployment.
6. Generate `SHA256SUMS`, archive with `COPYFILE_DISABLE=1`, extract in a temp dir, check the manifest and compare the extracted tree to staging. On this host the Taildrop CLI is `/Applications/Tailscale.app/Contents/MacOS/Tailscale file cp`. Send the tarball and sidecar to `sams-macbook-air:`, then reply with the SHA, evidence, and any caveats. Stop only your own test servers and close your browser sessions.

## Risks and maintained contracts

- The rolling Amtrak GTFS starts November 22 in the fresh feed observed during #342. Regenerating it would remove the Crescent from November 20 demo links. The historical contract tests use a pinned fixture. [GTFS investigation](../brookwood-gtfs-regression.md)
- Headless desktop High logged Three.js `currentProgram.isReady` during asynchronous shader precompile on `bc32b09`, `ccae1bc1` and `b71b863f`. The captured views finished rendering, and the Final phone smoke had no uncaught errors. Physical-device performance was outside the packaging smoke. Some current tests also report a Lake Clara Meer survey/fixture warning despite passing.
- Follow defaults on. Covered rail is decided by the baked spans where present, then mapped tunnel and cover data. Linked inferred handoffs retain their Inferred label, and freight stays Illustrative. User camera gestures cancel Follow through `manualCamera()`. The UI contracts are `#train-follow`, `[data-follow]`, `[data-recenter]`, `.follow-status` and `showCard(html, canFollow)`.
- Review shots use captioned comparisons, strongest frame first. Link repository evidence and cameras in merge notices. Preserve both append-only build-log entries on rebase conflicts and rerun tests.
