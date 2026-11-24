# Handoff: studio-midtown-marta (Claude, 2026-11-23)

Worktree `studio-midtown-marta`. Coordinator: `orca_session_id:84ff6fd9-a68e-4888-aa2a-4477f88e5ff0` (Claude on the Air). Earlier messages came from terminal `term_0813aeff…`, later ones from `term_05a952fa…`.

## State
- Merged this session:
  - #299, the Atlanta Streetcar's 12 stops;
  - #313, graded freight cuttings (`terrain/cutting.ts`, carve rules in `terrain/surface.ts`);
  - the King Memorial CSX freight PR, `samsolomon/king-csx`, which carries this file. It is merged unless its PR says otherwise.
- Earlier, also merged: the North Line bridge, portals and vents; streetcar track (#271) and vehicles (#278).
- No open PRs from this worktree once king-csx merges. There is no WIP.
- `trees/rollout.test.ts` ("sizes up and pairs generic crowns only inside Ansley Park") fails on main (bc32b09) as well as on these branches. It most likely needs fresh `pnpm data`. It isn't mine, but tell whoever owns trees.

## Sam's and the coordinator's decisions (2026-11-23)
- Tiers go on cards, not on ambient area notes (#231). Freight stays `illustrative`.
- Cuttings run on both tiers. The coordinator accepted +22k triangles (+2%) on low.
- Screenshots: captioned BEFORE/AFTER composites, money shot first, matched camera string, GitHub blob links in merge notices.
- Street View: view it and cite it, never copy the imagery into the repo.
- Supports never stand in a lane, shoulder or ramp.

## Next steps, in order
1. **Arts Center east wing slab** (coordinator msg_558b5522dbad; low priority). On main, the plaza sits 25 cm above part of the east-entrance wing floor slab in `midtown-marta.ts` `artsCenter`. The slab is a prism top at entry + 0.08, with ring [430.8,-3920.8]–[428.5,-3934.5]. The audit found 491 samples, worst at (450,-3935). Fix: return `yields: [{ ring: wing, floor: () => entry + 0.03 }]` from `artsCenter`, which `createDowntownTerrain` carves (as for the High steps). Camera: `/?view=city&cam=445,-3930,250,50,150`.
2. **Midtown-south North Ave underpass** (assigned; the plan was sent and has NOT been approved, so wait for "go"). This is the last `GRADED_CUTS` exception in `ground-contact.test.ts`, at (-783,-1860). North Avenue NW runs in an 86 m OSM tunnel (ways 218105244 and 218105246, layer -1) under the CSX and NS mains, at 33.7706, -84.4001. Street View shows a row of separate concrete deck bridges with daylight gaps between them:
   - east portal: a balustrade parapet, and haunched square columns splitting the opening into 2 road bays and a sidewalk bay ([pano, Mar 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77085,-84.39935&heading=243&pitch=3&fov=30));
   - west side: median piers, pipe railings on top and lamps on the trench walls ([pano, May 2022](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77035,-84.40125&heading=60&pitch=3&fov=45));
   - no night imagery exists.

   Plan:
   1. Rail profile at a straight grade across the footprint.
   2. OpenSlot trench walls for North Ave.
   3. Deck spans, parapets and median piers clear of the lanes.
   4. Draw North Ave at its low level.
   5. Tests: grade at or under 1.5%, at least 4.5 m clearance, and the exception removed.
3. Optional: a test holding the King Memorial MARTA piers (`east-rail.ts`, every 26 m) clear of freight, using the King transport's `clearOfFreight`. I checked this only in a browser.

## Promises to other agents
- Connector agent (86c22ca9): the streetcar exposes `occupied()` and `streetcarLanes()` for traffic to yield. They own the skip-draw.
- rectangle-default (f4705eb0): the Follow interface for streetcars (`cars()`, `drawnAt`) is in place. Nothing is outstanding.

## Servers and ports
- Vite: this worktree on :5297, and a scratch `origin/main` worktree on :5298 at `$TMPDIR…/scratchpad/main-wt`, used for BEFORE shots. Both were stopped at handoff, and main-wt was removed.
- There is no `.venv` here. Python with PIL and numpy is available from `../studio-midtown-skyline/.venv/bin/python` (run it; don't edit that worktree). Cargo: `export PATH=$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH`.

## Rules and traps that bit me
- `git checkout <file>` to undo a temporary edit also drops your uncommitted work in that file. Commit first, or back up to a scratch path.
- When code builds geometry in deferred closures, capture loop variables, or every quad shares the last station (this broke the ballast texture once). `ground-contact.test.ts` now guards against it.
- The King board mounts after City, so screenshot capture needs about 20 s or the AFTER frame comes out blank.
- zsh: `"$R:web"` is parsed as a modifier; write `"${R}:web"`.
- Doc conflicts on rebase: both sides append to `docs/build-log.md`, so keep both.
- AGENTS.md review rule 4: say "web rebuild only" or "needs pnpm data" in every PR.
