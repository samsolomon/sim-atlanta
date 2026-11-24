# Studio skins 4 handoff

The owner was the Claude Opus session in the `studio-skins-4` worktree, Orca session `89d3798a-aabc-4a50-95bf-6bbdc2e47102`. Read its history with `orca agent read`. It reported to the coordinator (`48e90760`) and the skyline lead, which now routes through `191b6166-18e7-4e23-8b97-ec53a7e5a19d` (formerly `47b1a596`). The lead runs the merge trains. Never push to a PR that is in a train until the lead says the train has landed, unless the lead asks for it. Never merge without the coordinator's OK, and rebase on main first.

The repo is public. Keep key values, private notes and personal details out of PR bodies, issues and comments.

## Open PRs (state on 2026-11-24)

| PR | Building | Head | Status |
|---|---|---|---|
| #628 | Mira at Midtown Union (new) | `7671a3a8` | Approved by the lead, perf OK from phone-perf. Rides train **8d**. |
| #643 | Azure on the Park, strengthening of #546 | `a20d40c9` | Approved by the lead. Rides **8d**. Merging main conflicts only in `docs/build-log.md` (both sides appended; keep both). A with-floor frame is posted as a PR comment. |
| #653 | The Hub at Peachtree Center (new downtown) | `03ff743c` | Passed by the lead, perf OK from phone-perf. Sent to the coordinator for **8d**. |
| #573 | 1075 Peachtree rework | `d0100024` | Sam picked glass **B `#718a9d`**. The lead takes this head. It rides the train after #631 (now on main). With-floor frames are posted as a PR comment; the head was deliberately not moved. |
| #614 | 271 Seventeenth strengthening | `2d013a72` | Passed by the lead. The trains take this head (layer offsets plus a NaN column fix). |
| #610 | 201 17th Street | `03d6375a` | Approved. The trains take this head (layer offsets). |
| #595 | Rambler Atlanta | `fee249f3` | Approved. The trains take this head (layer offsets). |
| #655 | Layer offsets on merged skins | `375a396c` | Green. The lead queued it for the next open train; perf is not needed (centimetre moves). |
| #665 | Hurt Plaza Garage (new downtown) | `a2bd317e` | **Not yet reported to the lead.** Build and test pass, code-review fixes are in, and Codex had no findings. `pnpm test:perf` **failed on `low-zoomout` "not settled"** twice while the Studio load average was about 126; main passed it minutes earlier, and every static entry is within one call of main. **Rerun `test:perf` on a quiet machine**, then send the PR to the lead with the four-side sheet and perf numbers. |

## Next steps, in order

1. **#665:** rerun `test:perf` under the shared Studio perf lock, `/Users/samsolomon/orca/workspaces/sim-atlanta/.perf-run 665 pnpm test:perf` (and the same wrapper for the main baseline). Wait on the wrapper and run one sweep at a time; release tickets take priority. Then update the PR's Checks section and report to the lead and then the coordinator.
2. **GSU Langdale Hall** (Overture `948a44ff-43db-4085-9b23-63a966006ca8`, downtown board, at 411,74). Not started. The lead confirmed these identifiers:
   - The lidar roof is about 42 m above the 313.0 ground (mapped 28.8), with a central penthouse at about 46–48 m.
   - Tall dark-brick panels sit between slender white vertical piers, under a white top band of about 3 floors with ribbon windows, with a glazed plaza entrance.
   - [Street View, Sep 2024](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75290,-84.38680&heading=320&pitch=25&fov=100).
3. **GSU "College of Education"** (Overture `34eeefd1-7989-4e7e-971c-90c90d9e5f8d`, downtown, at 243,41, 32 Decatur St SE). Not started. Confirmed:
   - The lidar roof is about 39.5 m above 316.2 (mapped 26.0), with a central penthouse at about 46 m.
   - It is an about 11-storey 1960s slab with thin white vertical mullions, alternating pale spandrel and grey ribbon-glass bands, and a dark granite two-storey base.
   - [Street View, Mar 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75385,-84.38850&heading=235&pitch=28&fov=100) and [from the south](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75320,-84.38860&heading=315&pitch=28&fov=100).
   - Use Overture's name, with a README caveat that the college's address is unconfirmed.
4. Delete the side branch `samsolomon/review-assets-skins4` once the PR comments that link to it no longer matter (it holds only review images).
5. After the 8d train, follow up the later note in #653: the Peachtree Center plaza's LED-tube canopy belongs to whoever owns the Peachtree Center landmark.

## Sam's decisions that affect skins (today)

- **Glass shade floor (#631, 0.45×):** shaded glass never renders below 0.45 of its own colour by day. It is binding and lives in the shader. Pick glass against the sunlit rule only (rendered sunlit S ≤ 36, teal 40; V ≥ 40). Do not compensate for shade in base colours, and do not report shaded readings.
- **1075 Peachtree glass:** option B, `#718a9d`.
- **Expansion paused; generic buildings first.** Named downtown generics come before the rest of the list. The lead assigns them.
- **Flat glass, far-board, landmark LOD, far shadows, tree far form and the streaming flag** were also decided today. I did not work on them; read the coordinator's thread and `docs/perf.md` before touching anything in those areas. One known constraint: `?stream=1` must not change the look.

## Coordinator and lead rulings in force

- **Layers:** no coplanar layer (window slots, panels, lit strips, screens) closer than 3 cm to its wall or to an overlapping layer. Use 4–8 cm. skins-6 is adding a lint to `skin-footprint.test.ts`.
- **Four-side sheets:** use `node scripts/four-side-sheet.mjs --id <id> --ground <lidar NAVD88> --top <m> --dist 400 --base http://127.0.0.1:<port> --out docs/log/ui/<slug>/<slug>-four-sides.jpg`. `--x/--z` re-centre it when the target lands on a podium. With plain `pnpm dev` (IPv6), use `localhost`.
- **Footprint and detachment:** `skin-footprint.test.ts` must pass; every part must touch its wall.
- **Downtown mounts:** chain in `city.ts` after a related landmark, `world.group.add`, `setNight`, and add to the `listed` array.
- **Recognition:** identifiers come from photographed features; send them to the lead (a few lines plus photo links) before building. A plain box passes when the photos show a plain box.
- **Batching:** vertex colours and `StaticLandmarkMaterial` only, so the skin batches. No `onBeforeCompile`, maps or transparency. Lit panes come from skin-kit `litHash`. Change the night look only in `setNight`.
- **Lidar first:** downtown parking polygons have hidden phantom towers twice. Mark post-2019 heights as reported or inferred.
- **Each PR:** day 11:30 and night 23:30 on 2026-11-20 at the money-shot cam, plus a close view and the low tier, inline with cam strings. Run `pnpm build`, `pnpm test`, and `pnpm test:perf` (low, high, high-night) with main measured in the same session. Run `code-review` (medium) and `pnpm review` (Codex). Keep routine skins to about +0.2 MB low geometry.
- **Perf lock (Studio-wide):** every `test:perf` or long-task sweep runs through `/Users/samsolomon/orca/workspaces/sim-atlanta/.perf-run <ticket> <command>`, where the ticket is the PR number or worker name. Rerun any load failure under the lock before acting on it.
- **Shared Studio:** no pattern kills (kill only PIDs you started). Drive only a Chrome you launched (`scripts/chrome-cdp.mjs` launchChrome, port 0).

## Gotchas

- **Chord curves:** a skin that draws layers on simplified chords of a curve must push them out by the chord's bulge, or they cut the real wall. See `bulge()` in `1075-peachtree.ts`.
- **Sloping sites:** per-face datums make deck and floor lines step at the corners. Use one datum per building, and start ground-floor glass at each face's lower corner (see `hurt-plaza-garage.ts`).
- **Lamp meshes:** an emissive lamp colour is uniform, not multiplied by the vertex colour. Give lit strips a day colour that disappears into the wall.
- **Lidar vs mapped heights:** downtown and Midtown mapped heights are often wrong by more than 10 m in both directions (Langdale +13 m, the garage −9 m).
- **zsh:** a `for` loop over quoted pairs does not word-split. Use bash scripts, or `${VAR}` braces in `git show "${SHA}:path"`.
- **Load:** heavy Studio load makes `test:perf` motion routes fail as "not settled". Check `uptime` before blaming a skin.
- **vitest:** the RPC error `Timeout calling onTaskUpdate` under load can appear with every test green.
- **Lidar scripts** write `pipeline/scripts/__pycache__`; delete it afterwards.
