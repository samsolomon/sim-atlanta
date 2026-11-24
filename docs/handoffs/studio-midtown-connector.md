# Handoff: studio-midtown-connector (Claude Opus → Codex, 2026-11-24)

Outgoing session: `orca_session_id:cfb2a7c9-c65e-44a5-9d09-9bae3f5b3e21` (read its history with
`orca agent read`). The coordinator is the Claude session on Sam's MacBook Air
(`term_09e1b3da-…`). Reply to its messages with `orca orchestration reply --id <its msg id>`.
Merge order comes from the skyline lead (`orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`).
Never merge without the coordinator relaying Sam's OK (or approval for non-Sam items) **and** the
lead's "your turn".

## Open work I own

| Item | Branch / PR | Status |
|---|---|---|
| Road traffic per-frame cost, round 2 | #592 `claude/traffic-frame-cost-2` @ 18e2bee9 | **Approved, queued with the lead.** Merge only on "your turn": re-sync with main, `pnpm build`, `pnpm test:release`, `pnpm test:perf`, merge commit, quote `gh pr view 592 --json state,mergeCommit` to both. |
| Fifth Street park deck | `claude/fifth-street-park` (no PR yet), WIP commit | **Building; finished look held for Sam.** See below. |
| Incremental per-section traffic | `claude/traffic-incremental` @ c93f3424 (stacked on #592, no PR) | Ready for the streaming agent (be9e0816), who drives the generators. Rebase onto main after #592 merges, then open the PR. |
| Route 49 GPS steering | #368 `codex/bus-route-49` @ f7966a32 | **Held for Sam** (live GPS and fallback captures). If #592 merges first, resolve the `road-traffic.ts` conflict by keeping both sides. |
| Bus network plan | #409 `claude/bus-network-plan` (docs only) | Held for Sam to pick from. |

## Fifth Street park deck (current task)

Sam asked for a bridge where Fifth Street crosses the Connector. #649 (merged 9d8914cb) added the
road deck. This follow-up is the park deck the coordinator approved to build, with the look held
for Sam. The approved plan and the coordinator's notes are in my history (`msg_65da3de73d36`, then
my correction `msg_8aa8739db45b` and its ack `msg_9d614b2b83e5`).

**Done (WIP commit, typecheck clean, `src/terrain src/square-board src/trees` 507 tests pass):**
- `web/src/terrain/fifth-street-park.ts` is a landmark entry pushed in `terrain/model.ts`, like
  the MARTA vents. It is batched and lit by night like any landmark, with no new material:
  `StaticLandmarkMaterial` plus library `surfaces.concrete`/`brick`, and an emissive Lambert
  lamp mesh like `landmark-shell.ts`. The cross-section follows ASPIRE Winter 2008: a 14.6 m
  road, 7.3 m sidewalks, and landscaped decks out to the **lidar** edges (36.6 m N, 31.4 m S
  = 68.0 m).
- Contents:
  - the north lawn with a curved wall, three tiers, a 2.75 m ribbed outer wall and an iron fence;
  - the south lawn and tiers;
  - the trellis with vines and benches;
  - brick curb bands and lane paint (turn lane and bike lanes, estimated);
  - crook lamps and post-top lanterns;
  - uplight pools at the trees, estimated.
- The north deck ends at Williams Street's sidewalk, which runs inside the footprint.
- Trees go through the shared rollout batch as landmark `plantings`, at deck height.
  `rolloutPlantings` now takes optional `species`/`heightM`/`spreadM`. Canopy crowns inside the
  footprint are dropped from the generic trees (`withoutLandBridgeTrees`) and replanted on the
  deck. On main, some of them stood in the freeway lanes. The coordinator wants that side fix
  called out in the PR.
- `midtown-connector-decks.ts`: the deck road narrows from 24 m to 14.6 m (one undivided lane;
  the park paints the lanes). The sidewalk runs are at ±10.95 m, 7.3 m wide.
- **Freeway floor under the deck (important):** the bare-earth DEM interpolates across the deck's
  hole, so the outer lanes under it climbed to 288–291 m. That left 0–2 m under the girders,
  already true under #649's road deck. `pipeline/prototypes/midtown-connector/landbridge-floor.py`
  infers the pavement from class-2 returns at both portals and writes `landbridge-floors.json`
  (209 nodes, keyed by the midtown-central ground sha256). `terrain/surface-build.ts` applies it
  with the existing Connector underpass floors. **Tell ground-contact (a761d59f) about this
  change to `surface-build.ts`.** No `pnpm data` is needed: the patch is a source JSON.
- Tests in `fifth-street-park.test.ts`:
  - 68 m and published widths;
  - the road narrowing;
  - the Williams Street end;
  - the floor inferred under the deck;
  - **every lane sample under the footprint clears the girders/outer walls by ≥ 5 m** (the
    coordinator's note 2a);
  - **both abutment lines touch no lane** (note 2b);
  - trees on the deck, off the street, and replanted crowns.
- Note (1), traffic, lanes and lamps consistent on the approaches: nothing drives or is lit on
  Fifth Street today. There is no arterial bake run, no bus shape, no `midtown-night` lamp or lit
  path in the footprint, and street figures are downtown only. So narrowing the deck road can't
  make anything jump. Say so in the PR.
- WIP frames, before polish: `docs/log/2026-11-24-fifth-street-park-wip-day.jpg` and
  `…-night.jpg`. Camera: `/?view=city&dev&mindist=20&cam=64,-2558,35,58,170&t=2026-11-20T14:00:00-05:00`
  (and `T21:00`).

**Next, in order:**
1. Polish against the photos:
   - The uplight pools are too bright and blobby (lower the night intensity, or shrink them).
   - The tiers and brick bands barely read at the City orbit.
   - The trellis beams read as brown sticks; they should be pale grey.
   - Check the deck-end tapers where the sidewalk runs narrow to 2 m (`deckWeight` blend).
2. Run `pnpm audit:ground --url http://localhost:<port>` (deck ends, lawn vs. terrain at the NE
   corner by Williams Street).
3. Matched day and 21:00 frames:
   - BEFORE (main 9d8914cb) | AFTER captioned composites, money shot first;
   - a close view from under the deck showing the floor fix;
   - the same cam string under each.
4. Run `pnpm build`, `pnpm test:release`, and `pnpm test:perf` on both tiers, with draw calls and
   programs against the ceilings (LOW was 81/86 programs).
5. Run `pnpm review` (cross-model), triage, then open the PR **held for Sam**. Embed the
   screenshots inline. Flag the **night lighting as estimated** (no night photo exists; one dusk
   photo, Smallwood). Cite the sources; the Smallwood photos are copyrighted, reference only.
   Then send the coordinator the blob links.
6. Then the queued items below.

## Other queued items
- **Crack sampler.** Re-run it when ground-contact pings: the road-cracks deck-end fallback, and
  the footpath-rail mitre at (-484.8, 100.7). The sampler is `scripts/zz-*.mjs` plus the
  scratchpad tools in my history.
- **Incremental traffic.** Split `midtown:turns` if it measures over 8 ms at 1x.
- Capitol Gateway portals visual pass (later).
- Vehicle lights PR after #368 merges.

## Sam's decisions affecting this area
- **Today, as relayed by the coordinator:** flat glass; far-board; landmark LOD; far shadows; tree
  far form; the streaming flag; the 0.45 shade floor; 1075 glass B; expansion paused; generic
  buildings as the priority. Ask the coordinator for detail before touching any of these.
- Truth tiers show on selected cards only. Traffic is illustrative, and estimated scenery is never
  labelled on screen (AGENTS.md).
- Bridges need piers that avoid travel lanes (`terrain/pier-clearance.ts`).
- Screenshots go inline in every PR body: day and night plus a close view, with cam strings, and
  blob links in the status reply.
- Run `pnpm build` (tsc) on the final rebased head before every merge, and say so.

## Coordinator rulings still open or binding
- Idle-time work is sliced to a few ms per call; report the longest task at 6x CPU throttle.
- Traffic distance rate: the sub-pixel rule (approved), not a fixed 600 m.
- Crack bridging < 25 cm only between rims, never at lane ends, 30 cm never bridged (approved,
  in #592).

## Gotchas
- **Shared Studio:** never `pkill`/`killall`/`grep | kill`. Kill only the PIDs you recorded.
  Never attach to a browser you didn't launch. Use `scripts/chrome-cdp.mjs` `launchChrome`
  (its own `--user-data-dir`, `--remote-debugging-port=0`) and close it by PID. Two orphaned
  headless `perf-chrome-` processes (PIDs 18697 and 92897, started 02:41 and 04:33) are not
  attributable to me, so I left them.
- Pick free ports (bind port 0) and check the cwd of anything already listening. Another agent's
  vite once answered my sampler.
- cargo isn't on PATH on the Studio (brew rustup). `test:release` needs `.venv` (laspy, lazrs).
- zsh: brace `"${SHA}:path"` in `git show`.
- Lidar: `ept_points` in `pipeline/scripts/king_memorial_corridor.py`. Bridge class 17 covers only
  the paved deck; trees and lawns on a land bridge are class 5 or 2 at deck height.
- The DEM is interpolated under every wide deck. Check the drawn lane heights under any new
  structure, not just mid-span.

## Servers and tabs
None running. My vite was stopped by PID, and the shot script closes its own Chrome.
