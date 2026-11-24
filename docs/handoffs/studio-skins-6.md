# Studio skins 6 handoff

The previous owner was the Claude Opus session in the `studio-skins-6` worktree, orca session `f7b4e433-6da3-4bf8-8413-4d95febd2d10`. Read its history with `orca agent read` for the detail behind anything here.

Report to the Air coordinator (`term_09e1b3da`, on Sam's MacBook Air) and the skyline lead. The lead was `47b1a596` until 2026-11-24 and now routes through `191b6166-18e7-4e23-8b97-ec53a7e5a19d`. The lead runs the merge trains. Never push to a PR that is queued in a train unless the lead asks; post extra images as PR comments instead.

The repository is public. Keep keys, private notes and personal details out of PR bodies, issues and comments.

## Open PRs I own

| PR | What | Status |
|---|---|---|
| #637 | The Landmark's parking deck (Overture `22d70224`): it replaces a 68 m phantom tower beside the Connector | Approved for train 8d. Depth fix pushed at the lead's request (head `444ac581`), no re-approval needed |
| #645 | International Garage (`b42101fd`), buff precast spandrels over open slots | Approved for 8d |
| #660 | Peachtree and International deck (`51c354f8`); the lidar-less strip is a low glass link | Approved for 8d |
| #612 | One Peachtree Pointe | Approved; lands with #606 |
| #594 | The Fed rework (paired windows, square-pier loggia) | Approved, queued (8b) |
| #604 | 1072 West Peachtree rework (balcony slots) | Approved, queued (8b) |
| #605 | The Registry's compass wording | Queued (8b) |
| #589 | Detachment check: join crossing parts | Queued after 8a |

Not PRs:
- `samsolomon/glass-saturation-held`: an NCR / Midtown Union glass saturation change, held for Sam's palette call. Don't merge it without Sam.
- `samsolomon/coplanar-lint` (`967de75a`): the coplanar-layer lint (`coplanarLayers()` in skin-kit plus a `KNOWN_COPLANAR` ratchet in `skin-footprint.test.ts`). Session `43258d81` is absorbing it into the downtown-audit PR with the 5 mm floor. Don't push to it.

Merged today: #631 (glass shade floor, merge `2702de1d`), plus #485, #502, #513, #525, #532, #537 and #555. #619 (the shade prototypes) is closed, superseded by #631.

## Sam's decisions that touch this area

- **Shade floor:** option A, glass only, at 0.45× (2026-11-24). It is live on main through a Lambert shader-source patch (`web/src/vignette/glass-floor.ts`), so it adds no programs. In dev, `?glassfloor=<n>` previews other strengths. Skins choose glass against the floor now.
- **Priorities:** expansion is paused. The generic downtown boxes next to skinned landmarks come first, starting with the Westin, Bank of America and Peachtree Center blocks.
- The coordinator also listed Sam's decisions on flat glass, far-board, landmark LOD, far shadows, the far form of trees, the streaming flag, and 1075 Peachtree's glass (B). Their details live with the coordinator and the owning agents; ask before touching any of them.
- Colour changes to merged skins wait for Sam's palette decision.

## Coordinator rulings still open

- **Coplanar floor:** skins-5's 5 mm floor misses exactly coincident layers (gap 0), which was International Garage's z-fight before its fix. On the square boards, a 0 floor flags 91 landmarks and 747k pairs; the 5 mm floor flags 68 and 152k. The ratchet uses 5 mm. Raise it with the lead if gap-0 cases keep appearing.

## Next steps, in order

1. Watch the 8d train for #637, #645 and #660. Rebase on request, then run `pnpm build`, `pnpm test` and `pnpm test:perf`, merge with a merge commit and report `gh pr view <n> --json state,mergeCommit`.
2. Take more downtown generic boxes from the lead's list (none was assigned past `51c354f8`).

## Rules learned the hard way

- **Lidar first.** Parking polygons have hidden phantom towers twice; `22d70224` carried The Landmark's height. `/tmp/sky-lidar-h.py` fails where the ring has no ground class. In that case grid the polygon by hand at 4 m, then 2 m. An area with no returns next to returning ground suggests glass.
- **Coplanar layers.** Every layer stands at least 4 cm clear of the prism wall and of each other, or it z-fights into black teeth from orbit. The hatching seen in shade is the style; the teeth are not.
- **Compass.** Scene z is −north, and the `cam` bearing is the view heading: 0 shows the south face.
- **Four-side sheets.** Use `scripts/four-side-sheet.mjs --base http://localhost:<port>`; vite here listens on IPv6 localhost, not 127.0.0.1. Hemmed-in buildings need per-bearing tilts such as `0:25`.
- **Before shots.** Unhook the mount in `city.ts` with a temporary `(null as unknown as typeof createX)?.(` and restore it with `git checkout`.
- **Geometry deltas.** Measure against main in the same session. Main moves often, so unhook the skin and run `pnpm test:perf` for the base.
- **Downtown mounts** go in the city.ts creator chain, the group adds, the `listed` array and `setNight`. Anchor a new mount away from lines that open PRs edit, to avoid conflicts.
- **Triangles.** The shared parked sedan is about 50 triangles; on a deck roof use 14-triangle car blocks.
- **Perf lock** (from 2026-11-24): run every `test:perf` or perf sweep through `/Users/samsolomon/orca/workspaces/sim-atlanta/.perf-run <PR number or worker name> pnpm test:perf`, one at a time. Release tickets take priority. Rerun a load failure under the lock before acting on it.
- **Shared Studio.** No pattern kills. Drive only a Chrome you launched (port 0).
