# Studio skins 4 handoff

The skins-4 author owns the models, evidence, and verification. The skyline lead owns integration of reviewed skin contributions through one combined train. The shared City mount in `web/src/city/city.ts` is an integration overlap.

## Current work

- **Hurt Plaza Garage, [#665](https://github.com/samsolomon/sim-atlanta/pull/665)** — `a2bd317e3c15f00a23b348eddc3476b82e9ae352`. Recognition and new-skin approval passed. The PR contains matched day/night, close, low-tier and four-side screenshots. The south view shows open decks turning the corner and the daylight close view shows the red awning. The west view is occluded. Build and 266 test files passed on this head in the previous run. Two perf runs failed to settle on low-zoomout. **Next:** await the reserved timing window, then collect the queued PR sweep and staged main baseline (`d93c51d890bdea4c1bafcc46a3a99d4bfb0e43da`), record the actual results in the PR, and send the verified head to the integration owner. The staged main baseline predates subsequent main changes.
- **Langdale Hall**, local branch `samsolomon/langdale-hall`, draft `707b4d3c49d2b49cb00ff81c921cf94024446c8e`. Model, City mount, footprint and detachment checks, lidar roof test, and photo notes are committed. Two daylight references show the paired plaza piers and the horizontal concrete grid on the projecting end. Night lighting is estimated. **Pending:** queued build and tests, sunlit glass readings, matched day/night and low/close screenshots, four-side sheet, perf, review and recognition approval before integration. There is no PR yet.
- **32 Decatur** follows Langdale. GSU identifies the College of Education at the Pryor/Decatur corner and publishes its entrance as 30 Pryor SW. The alternate street number remains unverified. Modeling, tests and screenshots are pending. [GSU entrance directions](https://education.gsu.edu/csd/csdresearchoutreach/slhclinic/locations/)

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
| #665 | Hurt Plaza Garage | `a2bd317e` | Approved pending locked perf. See current work above. |

## Model references and follow-ups

2. **GSU Langdale Hall** (Overture `948a44ff-43db-4085-9b23-63a966006ca8`, downtown board, at 411,74). Draft committed. Photo and lidar identifiers:
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
- **Shared Studio:** no pattern kills (kill only PIDs you started). Drive only a Chrome you launched (`scripts/chrome-cdp.mjs` launchChrome, port 0).

## Gotchas

- **Chord curves:** a skin that draws layers on simplified chords of a curve must push them out by the chord's bulge, or they cut the real wall. See `bulge()` in `1075-peachtree.ts`.
- **Sloping sites:** per-face datums make deck and floor lines step at the corners. Use one datum per building, and start ground-floor glass at each face's lower corner (see `hurt-plaza-garage.ts`).
- **Lamp meshes:** an emissive lamp colour is uniform, not multiplied by the vertex colour. Give lit strips a day colour that disappears into the wall.
- **Lidar vs mapped heights:** downtown and Midtown mapped heights are often wrong by more than 10 m in both directions (Langdale +13 m, the garage −9 m).
- **zsh:** a `for` loop over quoted pairs does not word-split. Use bash scripts, or `${VAR}` braces in `git show "${SHA}:path"`.
- **vitest:** the RPC error `Timeout calling onTaskUpdate` under load can appear with every test green.
- **Lidar scripts** write `pipeline/scripts/__pycache__`; delete it afterwards.
