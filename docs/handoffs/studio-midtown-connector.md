# Handoff: studio-midtown-connector → GPT-6.2

Updated 2026-11-23 at coordinator request. Outgoing session:
`orca_session_id:1f9238ff-2c34-4398-9612-0425e769c083` (gpt-6-astra, medium).
Stop after this checkpoint; coordinator will launch the successor in this worktree.

## Current state

Branch `codex/bus-route-49` contains a **planning-only WIP checkpoint**:
`docs/bus-route-49-plan.md` plus this handoff. No bus implementation or PR yet.
The branch starts at the verified crash fix below; fetch/rebase current main before
implementation. No code edits are half-finished. No dev server, worker or browser
tab remains from this agent (:5289 checked, Orca tabs empty).

Completed:
- #340 arterial turns, squash `c8b95c876ba0a0523b50987f2ded1272e5ad5bd5`:
  twenty Midtown turn courses, incoming signal phase, one-way rules, illustrative
  15% turn allocation. Turn/through queues remain independent with overlap hiding.
- #346 streetcar queues, squash `fa5ed0768722cec9bf8036b6e8b7bb975150803c`:
  three downtown courses follow scheduled streetcars, deterministic half-second
  replay. See `docs/streetcar-traffic-queues.md`, `traffic-queues.ts`,
  `streetcar-traffic.ts`. Live buses still only trigger overlap suppression.
- **#354 release-blocking 21:00 crash fixed**, verified with
  `gh pr view 354 --json state,mergeCommit`: state `MERGED`, commit
  `b8011c954ba77117a2f2cb07c7dcc0baa6c2b37b`.
  Streetcar projection at final vertex indexed past segment-owner array. Clamp
  to final owner, return null if absent. Exact endpoint and full-day five-minute
  ArterialTraffic update/seek tests both fail with original stack when reverted.
  Tests (955 web,20 Rust,5 worker), build, both-tier perf and clean Claude review;
  tests/build repeated after build-log rebase conflict. Python pipeline skipped
  without .venv; 1 web skip. Browser00/06/12/18/21/23 plus backward seeks: no frame
  errors,117–118 draws. `docs/log/ui/streetcar-endpoint/{2100,1200}-fixed.jpg`.
  Camera `cam=588,-65,0,50,180&t=2026-11-20T21:00:00-05:00&speed=0&q=low`.
  Coordinator/culture agent received verified merge notice. No deployment by us.
  Reviewer mentioned an existing unclamped turn-exit owner lookup in
  `arterial-turns.ts` outside this fix; investigate separately if needed.

## Next steps, in order

1. Read AGENTS.md, docs/data-model.md and `docs/bus-route-49-plan.md`; fetch/rebase.
2. **Implement route49** in this branch, following the reviewed plan. Sam approved
   behavior in coordinator message `msg_77ed9e2b85a0`:
   - Live buses keep GPS authority, live position/observation age on card,
     illustrative body. Cars yield; simulated signals must not displace GPS.
   - Timetable buses obey simulated signals, dwell and queues. Displayed scene
     position is **inferred**, with scheduled timetable shown separately.
   - First49, then23; one branch/PR per route. Each PR names pinned GTFS edition
     and data-generation/web-rebuild requirements.
3. Route23 is a later separate task after49. No need to ask Sam again for the above.

Data already investigated:
- `/tmp/connector-marta-gtfs.zip`, official archive downloaded2026-11-23:
  https://itsmarta.com/google_transit_feed/google_transit.zip
  SHA256 `f4a36309f42858d3c55bf46298395471621ba6ec1888a141c543a1190a52e2e1`,
  18,620,232bytes, no feed_info.txt. Preserve/check hash if reusing local scratch.
- 81bus routes,40,026trips. `bus-routes.json` is only raw-ID/public-number lookup;
  pipeline currently excludes bus trips from emitted routes/timetable. Exact
  lookup matches shipped file (my initial message saying IDs differed was wrong;
  corrected to coordinator). Export bus trips separately from rail consumers.
-49: raw29153,658trips,2shapes,27,632calls,zero positive dwell.15s illustrative
  dwell proposed in approved plan; don't call that published dwell.
- Board-intersecting routes:3,7,10,20,21,22,42,49,51,55,A downtown/east/south;
  2,11,12,14 Midtown;1,23 upper/Brookwood;49 also reaches Midtown south.
- Current CityBuses only indexes downtown roads, uses nearest-road GPS snap,
  8s glide, no path-based dwell/queues. Shared30s poll, Worker30s cache,3min expiry;
  live payload has no trip ID/type. Timetable bus rendering should stay in
  Timetable mode initially to avoid unverifiable live-trip deduplication.
- Existing XN40 geometry measured6,140triangles each at both tiers,1instanced draw
  per render pass,cap64. Proposed low rigid budget<=1,000triangles; actual renderer
  draws/triangles and queue CPU need populated perf checks and coordinator A16 run.

## Coordination and promises

Coordinator is Air terminal `term_05a952fa-de06-4064-8655-3e98e1caf1e0`.
Direct sends can reject pairing token; reply threads work:
- general `msg_ca3634b98b19`
- bus approval `msg_77ed9e2b85a0`
- GPT6.2 handover `msg_ae9de69b0034`
Use successor's own session ID as --from. Read replies with orchestration check.
Only coordinator deploys. BEFORE announcing MERGED, run
`gh pr view <n> --json state,mergeCommit` and quote actual state/hash.
Build-log conflicts: keep both entries and rerun tests.

Art/model owner: `orca_session_id:6ee0d928-55e1-45e7-b22a-77426a1002ec`,
worktree studio-amtrak-livery, latest reply thread `msg_82fc1c861005`.
- Coordinator requested lab-only XE60 articulated plus xn40Rapid livery in onePR.
  Proposed physical type IDs `marta:vt:xe60` and `marta:vt:xn40`; Rapid is livery,
  NOT physical type. Current canonical VehicleType exists, but City hard-codes
  XN40 and LiveBus has no vehicle type; do not assume registry integration exists.
- Agent reports official PhaseOne A-Line uses CNG XN40, not XE60/XN60; never assign
  articulated solely by route. Source references/dimensions belong to their PR.
- Proposed XE60 dimensions18.54m bumpers,18.29m body,2.6m width,3.3m roof;
  axle spans229in/293in. Front origin front axle, hitch estimated8m behind;
  rear origin hitch. Exact exports forthcoming after validation.
- Agreed boundary: model exports front/rear/bellows geometry, shared materials,
  axle/hitch dimensions/local origins, articulation limit, low geometry; lab uses
  explicit joint angle with coincident anchors. Traffic owns poses/history and
  per-section collision footprints. +z forward,+y up,curb side-x.
  Path progress reference proposed front axle; bumper offsets drive stops/queues.
  Preserve rigid axle/hitch constraints; independent path samples at fixed body
  spacing would separate the hitch. Sparse live fixes do not establish a curve.
  Proposed articulated low budget<=1,500triangles total,<=3 shared batches;
  model agent owes exact exports/counts. No integration assumed yet.

Ground contact: `orca_session_id:acad9721-185c-4ee8-84df-9fb8fe9fac1e`.
All original Midtown questions resolved and handed back, nothing owed:
- upper0.83m = 14thStreet surveyed approach underside (.95m slab), top12cm clear.
- central0.28m = inferred footway underside (.4m slab), top12cm clear.
- south0.088m = actual inferred footbridge top penetration, endpoints
  (371.18,-1870.12)→(360.93,-1870.15); ground agent owns separate geometry fix.
- Ground agent merged audit-only#350 `054b89cc`, explicit buried-face metadata,
  removes upper/central false positives at both tiers and retains south.
  No surveyed Connector heights were changed. Diagnostic /tmp/deck-attribution.log.

Culture agent `orca_session_id:128fa2b2-d0a4-4d21-915c-69ea438111ce`
provided endpoint crash reproduction and was sent verified#354 merge notice.
No remaining action owed on that blocker.

## Commands and pitfalls

- `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"`
  before pnpm test. .venv absent; disclose skipped Python pipeline checks.
- `pnpm review -- --reviewer claude` works. Read cross-review skill, max2 rounds.
- Plan reviews available under ~/.claude/skills/{architect-plan-review,
  product-design-plan-review}/SKILL.md; both applied to bus plan.
- `pnpm --filter web exec vite --host 127.0.0.1 --port 5289 --strictPort`
  actually binds chosen port; pnpm dev -- --port can be ignored.
- CLI `/Applications/Orca.app/Contents/Resources/bin/orca`; tab create/eval/
  screenshot/tab close are top-level, not `orca browser tab`.
- Unfocused Orca browser runs~1fps. Wait for revealed render and inspect capture;
  renderer stats alone can be ready while screenshot still shows white reveal.
  Freeze with t AND speed=0. Dynamic import /src/core/clock.ts can change pinned
  clock in dev for seek checks. Close only your own tabs/servers.
- Run test/build/perf sequentially with successful exit gating; mixed concurrent
  logs once hid stale-build perf output. Use unique logs.
- Stale Midtown staged data previously broke tree tests; restage with
  `node scripts/stage-square-board.mjs --midtown` if evidence warrants it.
- Meaningful milestones need build log and screenshots. Send GitHub blob money
  shot first, camera string, and data/rebuild note. Never commit main directly.
