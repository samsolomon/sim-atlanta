# Expansion plan: from Five Points to I-285 and the airport

Draft, 2026-11-24. This plan covers how City grows from today's 19 km² board to a square that
encloses I-285 and all of Hartsfield-Jackson. It proposes a tile scheme, checks what Cloudflare's
free plan allows, compares the four directions City could grow first, treats trees as a cost of
their own, and lists the pipeline work. The streaming prototype behind `?stream=1` supplies the
measured numbers for today's board (section 0). The remaining `TODO(measured)` slots are per direction,
and they fill once a direction's first tiles are baked. Figures marked *estimate* come
from arithmetic on shipped data or public sources, not from a device run.

Coordinates are City scene metres, with the origin at Five Points (lon −84.3916, lat 33.7539),
x east and z **south**, so north is negative z. Conversion is the local equirectangular projection
in `web/src/core/places.ts` (R = 6,371,008.8 m).

## 0. The bar every option has to clear

Sam's most important constraint is that City feels very fast and never lags while you move it.

| Tier | Target | Measured as |
|---|---|---|
| Desktop (`q=high`) | 60 fps while panning and orbiting, no visible hitch | Proposed: frame time p95 during a scripted pan stays under 16.7 ms, and max stays under 33 ms |
| Phone (Galaxy A16, `q=low`) | 30 fps held while panning, no visible hitch | Proposed: frame time p95 during a pan stays under 33 ms, and max stays under 50 ms, including while a tile streams in |

The fps targets are Sam's. The p95 and max thresholds are this plan's proposal for turning "no
visible hitch" into a number. Frame time while panning is the bar. A good still-camera fps doesn't count if a tile arriving mid-pan
drops a frame. Today's 12-area board doesn't meet it. `docs/perf.md` records the A16 at 24.8 fps
still and 25.1 fps panning on the default view, against the 30 fps target. Streaming therefore has to
close that gap on today's board before any direction is added. Every direction below depends on that
first step.

What a direction needs in order to hold the bar:

1. **Rings.** Full detail (today's area build) only in the near ring around the orbit target. A cheap
   LOD in the mid ring. Nothing beyond it, except possibly one coarse horizon mesh.
2. **A compact per-tile LOD pack.** The mid ring should never fetch or parse a full `context.json`.
   The prototype's LOD currently reads the shipped context files. The default camera under `?stream=1`
   fetches 5.65 MB of context and ground for 3 full areas plus 9 LOD areas. The pack should be
   prebuilt typed arrays that are ready to upload.
3. **A forest LOD** (section 4). Individual crowns only in the near ring.
4. **Split area builds. This is the gate for growing past today's 12 areas.** Today an area build
   is one synchronous main-thread job. Stream-in has to be time-sliced, with a budget of about 4 ms
   of main-thread work per frame on the phone. Ground decode, SHA checks and LOD parsing should move
   to a Web Worker and hand results back as transferables. GPU uploads should be capped per frame.
   The first prototype loaded and freed full areas as the camera moved. The worst pan frame was
   533 ms on the phone tier (today: 50 ms) and 733 ms on desktop (today: 33 ms). Deferring builds until
   the camera rested moved the stall without removing it. So tonight's prototype loads every area
   at boot, as today, and its rings only swap what draws (see "Tonight's prototype" below). That
   holds for 12 areas. It can't hold for 1,218 tiles, whose full builds can't all live in memory. Until
   sliced builds pass the pan bar, no direction ships.
5. **No new shader programs on stream-in.** LOD geometry reuses existing materials. `docs/perf.md`
   puts low-tier programs at 85 against a ceiling of 90 (main 63d7e332). Five programs of headroom
   have to cover every future landmark, so streaming should spend none of them.
6. **Landmark triangle budgets.** Use the skins spec ceilings: 600 low-tier triangles for a routine skin
   and 2,400 for a landmark. Landmarks also need a LOD form, which is usually their merged block.
7. **Hysteresis and prefetch.** A tile joins a ring at a smaller radius than it leaves at. Prefetch
   follows the pan velocity, so a tile is usually decoded before it is needed.

### Tonight's prototype (`?stream=1`)

- **Near ring:** the full area draws.
- **Mid ring:** the full area is hidden (`group.visible`, no dispose) and a LOD draws in its place. The
  LOD has three batched meshes per area: coarse ground, every footprint as a minimum-area box, and
  forest masses. It's built in a Web Worker from the shipped `context.json` and `ground.i16`, and its
  uploads are staged through `core/load-budget.ts`.
- **Far ring and long off-screen:** neither draws, and the LOD's buffers are freed.
- **Radii:** near is 3 km on low and 4.5 km on high, measured to the area's box from the eye, plus the
  area under the orbit target in a close view. Fog sets the far edge at 3× the orbit distance.
  Hysteresis and a 4 s dwell stop flicker.
- **What's saved:** draws and triangles, which is what the A16 is bound by: hiding buildings alone
  took it from 25.9 to 41 fps in the coordinator's attribution run.
- **What isn't saved:** heap and GPU memory, which stay at today's level until full areas can be
  freed and rebuilt without a stall (gate 4).

Measured on 2026-11-24, from one build of the prototype (`e8557bb4`) per device. Each cell is today → `?stream=1`.

| Run | fps | Worst frame | Draws |
|---|---|---|---|
| Galaxy A16, `q=low`, default camera, still | 23.3 → 30.7 | | 562 → 290 |
| A16, north pan | 34.0 → 36.7 | 367 → 222 ms | |
| A16, wide pan | 29.6 → 35.9 | 178 → 156 ms | |
| A16, dolly | 29.7 → 33.3 | 300 → 178 ms | |
| M5 Air, `q=high`, default camera, still | 34.0 → 47.5 | 100–183 → 68–83 ms | 1,229 → 631 |
| M5 Air, north pan | 39.2 → 42.5 | 233 → 216 ms | |
| M5 Air, wide pan (single run) | 32.2 → 33.1 | 100 → **332 ms** | |
| M5 Air, dolly | 35.7 → 37.9 | 198 → 166 ms | |

The wide pan's 332 ms frame on the M5 is open. The lead's sweep of shader programs shows that a shader
compiled on its first use mid-pan costs frames of 100 ms or more. That fix is a separate guard
(`samsolomon/program-guard`), and the guard has to cover the LOD's materials too.

Programs are unchanged on every run (low 85 at 14:00 and 89 at 22:00). Heap after GC is **higher**:
+23 MB on low and +51 MB on high, because the LOD sits on top of full areas that are still loaded. The
A16 holds 30 fps still but not yet while panning on every route. Panning is the bar.

## 1. Tile scheme for the whole square

### Extent

I took I-285's extent from OpenStreetMap (`highway=motorway`, `ref~"I 285"`, 444 ways, fetched
2026-11-23 through Overpass). The airport's extent comes from its aerodrome outline,
[way 208889095](https://www.openstreetmap.org/way/208889095).

| Feature | Lon / lat extent | City x (m) | City z (m) |
|---|---|---|---|
| I-285 | −84.5028 … −84.2303, 33.6161 … 33.9204 | −10,281 … 14,911 | −18,517 … 15,318 |
| Hartsfield-Jackson aerodrome | −84.4535 … −84.4011, 33.6174 … 33.6574 | −5,723 … −874 | 10,735 … 15,176 |

The rough figures in the brief were close. The airport lies **inside** I-285's bounding box. The
southern arc of I-285 dips to 33.6161°, just south of the airfield's 33.6174°. A convex hull of the
I-285 geometry covers 681.0 km². Adding the airport outline brings it to 682.2 km², so about 1.2 km²
of the aerodrome sticks out past the hull, on its southwest side. The tile rule below (hull plus
400 m) covers that sliver. So "I-285 plus the whole airport" is, for tiling, the I-285 extent. The extent is 25.2 km east–west by 33.8 km north–south.
It is not a square.

Today's board is one rectangle, **x −1,000…1,800, z −5,700…1,100** (2.8 × 6.8 km = 19.04 km²). It is
the union of downtown, King Memorial, Sweet Auburn, the north and south bands and corners, and the
five Midtown rows (`web/src/square-board/sections.ts`, `web/src/city/board-footprint.ts`,
`pipeline/prototypes/square-board/midtown-rows.json`).

### Lattice

The existing edges (x = −1,000, 1,000, 1,800; z = −5,700 … −1,700 in 800 m steps, −1,300, 700,
1,100) all lie on a **400 m lattice** anchored at (−1,000, −5,700). King and Sweet Auburn's internal
edges (−520, 280, 640) don't, but they sit inside the rectangle. No 800 m or 1 km lattice can hit
every outer edge: x needs both −1,000 and 1,800, and those are 2,800 m apart, which is 3.5 tiles.

Two workable options:

| Option | Tiles over the I-285 box (27.2 × 35.2 km at 800 m) | Tiles touching I-285 hull + 400 m | Files at 3 per tile | Share of the free 20,000-file cap |
|---|---|---|---|---|
| **800 m tiles**, anchored (−1,000, −5,700) | 1,496 | **1,218** | 3,654 | 18% |
| 400 m tiles, same anchor | 5,808 | 4,694 | 14,082 | 70% |
| 1,600 m tiles | 414 | 332 | 996 | 5% |
| Literal square (35.2 × 35.2 km) at 800 m | 1,936 | (same hull, 1,218) | 5,808 | 29% |

*Counts computed from the OSM geometry. The hull counts treat a tile as touching when its centre is
inside the hull or within 400 m plus half a tile diagonal of it.*

**Proposal: 800 m tiles on the (−1,000, −5,700) anchor, generated only where they touch the I-285
hull (1,218 tiles, about 780 km²).** That's the size of a Midtown row's height and of Sweet Auburn,
so a tile costs about what an area costs today. It leaves more than 80% of the file cap free. At
400 m the file count reaches 70% of the cap before any second LOD level or per-tile extras. Tiling the
literal square adds 718 tiles of Cobb, DeKalb and Clayton suburbs outside I-285 for no story gain.
Bake them later only if the board edge looks wrong.

Tile index: `i = (minX + 1000) / 800`, `j = (minZ + 5700) / 800`, both signed. So tile `(0, 0)` is
x −1,000…−200, z −5,700…−4,900, which is Brookwood station's west third. The I-285 hull spans
`i` −13…20 and `j` −17…26.

**Legacy overlap rule.** The 2.8 × 6.8 km legacy rectangle stays as hand-built areas. With an 800 m
lattice it cuts exactly one tile column (x 1,400…2,200) and one tile row (z 700…1,500) in half. Those
tiles are baked clipped. The manifest records the lattice cell and a `clip` rectangle (the legacy
board). Features whose centroid falls inside the clip are dropped. Ground cells inside it are not
meshed. Ground still bakes over the whole tile, because every grid samples the same pinned DEM at the
same 5 m registration, so shared nodes agree exactly. `verifySeam` already enforces this. North of
z = −5,700 and west of x = −1,000, tiles meet the legacy edge cleanly and none is clipped.

### Files per tile

```
web/public/data/scene/tiles/v1/
  index.json                 every tile: i, j, bounds, clip, sha256 and bytes per file,
                             building/tree/road counts, legacy owner (if any)
  <i>_<j>/ground.i16         161 × 161 inclusive nodes at 5 m, int16 dm NAVD88 (51,842 B)
  <i>_<j>/lod.bin            mid-ring pack (section 5), target ≤ 40 KB raw
  <i>_<j>/context.json       near-ring detail, same schema as square-board context.json
```

- Folding each tile's `ground.json` into `index.json` keeps it at three files per tile. The shared
  header is identical (registration, scale, noData, scene zero). Only bounds and the sha256 differ.
- The version directory (`v1`) lets a rebake publish next to the old set, and lets `_headers` mark
  tiles `immutable`.
- **Bytes, estimate.** Ground: 1,218 × 51.8 KB = 63 MB. Context: Midtown rows run 0.51–0.87 MB per
  2.24 km², or about 150–250 KB per tile raw and about 60 KB gzipped. Dense bungalow tiles (east side,
  section 3) run higher. So 1,218 tiles hold about 200–350 MB of context. LOD: about 50 MB at the
  target. Cloudflare documents a 25 MiB cap per file. I found no documented cap on total asset bytes.
  See "could not verify".
- **Deploy.** Every tile is a static asset in `web/dist`. Rebaking tiles needs `pnpm data`, then
  `pnpm build`, then a deploy. Per AGENTS.md, a PR that changes tiles must say so.

## 2. Cloudflare cost check

### What the current docs say (fetched 2026-11-23, raw Markdown)

| Question | Answer | Source |
|---|---|---|
| (a) Do static asset requests count or bill as Worker requests? | "Requests to static assets are free and unlimited. Requests to the Worker script (for example, in the case of SSR content) are billed according to Workers pricing." The pricing page repeats it: "Requests to static assets are free and unlimited." | [Billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) · [Pricing, footnote 3](https://developers.cloudflare.com/workers/platform/pricing/) |
| Free plan daily limit | "Accounts on the Workers Free plan have a daily request limit of 100,000 requests, resetting at midnight UTC. When a Worker exceeds this limit, Cloudflare returns **Error 1027**." | [Limits, Daily requests](https://developers.cloudflare.com/workers/platform/limits/) |
| (b) Are assets served without invoking the Worker? | "By default, if you configure static assets and a Worker script, Cloudflare checks for a matching asset first." Then: "If no asset matches, Cloudflare invokes that version's `fetch()` handler." The binding page puts it the same way: "a Worker script is only invoked when the requested route has not matched any static assets". | [Routing: Worker script](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) · [Binding](https://developers.cloudflare.com/workers/static-assets/binding/) |
| `run_worker_first` on the free tier | "requests matching the specified patterns will always invoke your Worker script. If you exceed your free tier request limits, these requests will receive a 429 (Too Many Requests) response instead of falling back to static asset serving." | [Billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| (c) Max files per Worker version | Free **20,000**, Paid 100,000 ("Files per Worker version") | [Limits, Static Assets](https://developers.cloudflare.com/workers/platform/limits/) |
| (d) Max individual asset size | **25 MiB** on both plans | [Limits, Static Assets](https://developers.cloudflare.com/workers/platform/limits/) |

The docs never say outright that an asset hit is excluded from the 100,000/day count. "Free and
unlimited", together with the routing rule that a matched asset never reaches `fetch()`, implies it.
I list it under "could not verify".

### How this repo is configured

`worker/wrangler.toml`:

```toml
[assets]
directory = "../web/dist"
binding = "ASSETS"
run_worker_first = ["/api/*"]
```

There is no `not_found_handling`, so it defaults to none, and no `html_handling` override. The Worker
(`worker/src/index.ts`) handles `/api/marta/bus`, `/api/marta/rail` and `/api/weather` (all
edge-cached). It returns 404 for other `/api/*` paths and passes everything else to
`env.ASSETS.fetch(req)`.

What this means for tiles:

- A `/data/scene/tiles/...` request that **matches** a file is served as a static asset. The Worker
  doesn't run. It's free and doesn't count against the daily limit (per the quotes above).
- A request that **misses**, such as a tile that doesn't exist, a typo, or a stale `v1` path after a
  rebake, **falls through to the Worker** because no asset matched. That invocation counts toward the
  100,000/day limit. The Worker then calls `env.ASSETS.fetch`, which returns the 404. A streaming client
  that guesses tile URLs at the board edge would turn every pan into Worker invocations.
- **Rule: the client fetches only tiles listed in `index.json`.** It never probes. Out-of-hull lattice
  cells are simply absent from the index. With that rule, streaming adds no per-visitor server work.
- `run_worker_first` is `["/api/*"]` only. Don't widen it to `/data/*`, for example to add headers
  from code. Use a static `_headers` file instead (free plan: 100 rules).
- `/api/marta/bus` reads `/data/ga/bus-routes.json` through the binding. That's a subrequest inside an
  already-counted invocation, not a new request.

Things that **would** add per-visitor server work, flagged per AGENTS.md:

- Live aircraft for the airport, for example an ADS-B feed through a new `/api/planes` route. That adds
  Worker invocations, which count. It needs an edge cache like MARTA's (10 s), and most ADS-B feeds
  with usable terms aren't free. Scheduled or illustrative planes from static data cost nothing.
- Any server-side tile assembly, such as "give me the tiles in this view" as one call. Keep assembly
  in the client.
- Live traffic from 511GA, if it's ever wired for the new areas. It goes through the Worker, so it
  must be edge-cached the same way.

## 3. Four directions compared

### Extents

Every extent is on the 800 m lattice. "Corridor" means tiles within 800 m of the MARTA line, plus the
direction's spine road, and the airport for South. "Rectangle" is the full box.

| | North: Buckhead | South: the airport | East: Decatur | West: Westside and H.E. Holmes |
|---|---|---|---|---|
| Joins today's board at | z = −5,700, the full 2.8 km edge | z = 1,100 (x −1,000…1,800) | x = 1,800 (z −5,700…1,100) | x = −1,000 (z −5,700…1,100) |
| Corridor (bounding box of a staircase; rows listed below) | within x −1,000…4,600, z −11,300…−5,700 | within x −6,600…600, z 700…15,900, along the Red/Gold line plus the airfield and NS South Yard | within x 1,400…9,400, z −3,300…1,500, along the Blue line plus Ponce City Market | within x −7,400…−1,000, z −5,700…1,500: Blue to H.E. Holmes, Green to Bankhead, plus the Inman/Tilford/Howell yards and Westside Park |
| Corridor tiles / new km² | **35 / 22.4** | **91 / 57.6** | **36 / 21.9** | **53 / 33.9** (31 / 19.8 without the yards) |
| Rectangle | x −3,400…5,400, z −11,300…−5,700 | x −7,400…2,200, z 700…15,900 | x 1,400…9,400, z −3,300…1,500 | x −7,400…−1,000, z −5,700…1,500 |
| Rectangle tiles / new km² | 77 / 49.3 | 228 / 144.8 | 60 / 36.6 | 72 / 46.1 |
| Clipped tiles (legacy overlap) | none | row z 700…1,500 | column x 1,400…2,200 | none |
| Files (corridor / rectangle) | 105 / 231 | 273 / 684 | 108 / 180 | 159 / 216 |
| Distance from Five Points to the payoff | Lenox ≈ 10.6 km | Airport station ≈ 13.6 km | Decatur ≈ 9.2 km | H.E. Holmes ≈ 7.2 km |

Corridor tile rows (x ranges per 800 m row; each is contiguous):

- **North:** z −11,300…−10,500: x 600…4,600 · −10,500…−9,700: x −200…4,600 · −9,700…−7,300: x −200…3,800
  · −7,300…−6,500: x −200…3,000 · −6,500…−5,700: x −1,000…3,000.
- **South:** z 700…1,500: x −3,400…600 · 1,500…2,300: x −3,400…−200 · 2,300…3,100: x −4,200…−200
  (incl. NS South Yard) · 3,100…3,900: x −4,200…−1,000 · 3,900…5,500: x −4,200…−1,800 · 5,500…6,300:
  x −5,000…−1,800 · 6,300…7,100: x −5,000…−2,600 · 7,100…7,900: x −5,800…−2,600 · 7,900…10,300:
  x −5,800…−3,400 · 10,300…11,900: x −6,600…−1,000 · 11,900…13,500:
  x −6,600…−200 · 13,500…14,300: x −5,800…−200 · 14,300…15,100: x −5,800…−1,000 · 15,100…15,900:
  x −5,000…−1,800.
- **East:** z −3,300…−2,500: x 7,000…9,400 · −2,500…−1,700: x 1,400…3,000 (Ponce City Market) and
  4,600…9,400 · −1,700…−900: x 2,200…9,400 · −900…−100: x 1,400…8,600 · −100…700: x 1,400…5,400 ·
  700…1,500: x 1,400…3,000.
- **West (with yards):** z −5,700…−2,500: x −5,800…−1,000 · −2,500…−1,700: x −5,000…−1,800 ·
  −1,700…−900: x −4,200…−1,000 · −900…700: x −7,400…−1,000 · 700…1,500: x −7,400…−3,400.

These come from tiles within 800 m of polylines through the station coordinates. North's spine also
follows Peachtree Rd through points I placed by hand: (−81, −5,065), (1,280, −7,400),
(1,100, −9,490) and (2,550, −10,690). Treat them as approximate. Some named places fall outside every
corridor: Westview Cemetery (−5,230, 2,090) and Center Parc Stadium (175, 2,100) are in the South
rectangle only.

The station coordinates come from `web/public/data/ga/routes.json`. Lindbergh Center is at (2,061,
−7,739), Buckhead (2,208, −10,457), Lenox (3,084, −10,173), West End (−2,039, 1,928), East Point
(−4,525, 8,504), Airport (−5,048, 12,604), Inman Park (3,591, −395), Decatur (8,892, −2,313),
Bankhead (−3,446, −2,030) and H.E. Holmes (−7,232, −69). H.E. Holmes is the station Sam called
"Hightower". It opened as Hightower station in 1979 and was renamed in 1997
([Wikipedia](https://en.wikipedia.org/wiki/Hamilton_E._Holmes_station)). West End and the Atlanta
University Center sit where the South and West boxes meet. West End is counted under South (Red/Gold).
The AUC is counted under West.

### What's in each

Building counts are OSM `building` ways in each extent outside the legacy rectangle (Overpass,
2026-11-23). Tall means 45 m or more by `height`, or by `building:levels` × 3.5 m. The tall count is a
floor. It misses towers with neither tag, including 3344 Peachtree, the Waldorf Astoria, Buckhead
Grand and the Ritz-Carlton Residences. It also counts Resurgens Plaza twice, as a way and a relation. The context
pipeline uses OSM, so these are the counts a bake would see. OSM completeness in East Point and
College Park wasn't checked.

| | North | South | East | West |
|---|---|---|---|---|
| OSM buildings, corridor (per km²) | 8,873 (396) | 19,721 (342) | 16,706 (762) | 13,227 (390) |
| OSM buildings, rectangle | 18,361 | 54,156 | 26,457 | 18,032 |
| Tall (≥ 45 m) in rectangle (OSM tags; a floor) | **at least 79** | 2 (control tower, Olympic cauldron) | 1 (Ponce City Market) | 3 |
| Freight-network arc km in rectangle, incl. yard tracks (`freight.geojson`) | CSX 8.0, NS 7.2 | NS 56.5, CSX 11.7 | CSX 17.4 | CSX 37.7, NS 29.8 |
| Amtrak (passenger-flagged arc km) | 7.2: Crescent north of Peachtree station | 0 | 0 | 6.2: Crescent west via Howell |
| MARTA | Red and Gold through Lindbergh. Red runs to Buckhead in the GA-400 median, Gold to Lenox. MARTA's Armour Yard sits at (1,890, −6,700). | Red and Gold through West End, Oakland City, Lakewood, East Point and College Park to Airport, beside the NS/CSX main line. MARTA South Yard is at (−5,800, 12,770). | Blue through Inman Park, Edgewood, East Lake and Decatur, beside CSX's Georgia line. Avondale Yard is just past the box at (10,780, −2,660). | Blue to H.E. Holmes, Green to Bankhead |
| Freight landmarks | Armour area, NS/CSX north mains | NS South Yard (−600, 2,600), NS Industry Yard (−3,520, 6,630), East Point yards | CSX Hulsey Intermodal (2,110, 150) at the board edge, Pullman Yards (5,880, −550) | NS Inman Yard and Inman Intermodal (−5,000, −4,800), CSX Tilford (−4,390, −5,040), CSX Howell Yard and Howell Junction (−2,720, −4,970) |
| Buses | Dense: Peachtree Rd, Lenox and Piedmont routes | Dense, plus airport routes | Dense | Dense |
| Other moving things | GA-400 and I-85 traffic | Planes (scheduled or illustrative only, see §2), SkyTrain to the Rental Car Center, I-85 and I-285 | Beltline Eastside trail | Beltline Westside trail |

The yard positions are OSM names in scene metres. The freight km come from summing segment lengths
whose midpoints fall in each rectangle. The net includes yard and siding arcs, so read it as "how
much track", not as mainline length.

### Payoff and risk

| | Payoff | Risk |
|---|---|---|
| **North** | A second skyline. The Paramount, Grandview, Park Avenue, 3344 Peachtree and Terminus all sit within about 1 km of Lenox. Peachtree keeps going from the Midtown rows. The Crescent and the Brookwood rail work continue north. It's the most "Atlanta from the air" view after downtown. Clean edge, no clipped tiles. | Heaviest canopy of any direction (NPU A is the city's most canopied, at 62.8%), and 79 tall buildings that look wrong as generic boxes. The triangle budget gets squeezed from both sides. Lindbergh to Buckhead runs partly in tunnel, so some trains vanish there. |
| **South** | The airport: terminals, seven concourses, the 121 m tower, the Delta hangars, SkyTrain and planes. Freight is busiest here (NS South Yard to East Point). There's a clear end point for the Red/Gold line. | Largest area: 2.6× North's corridor for one destination, with 10 km of low-rise between the board and the airfield. The UTC canopy map stops at the city limits, so East Point, College Park and Hapeville need another canopy source. Planes are a truth-tier trap: no free live feed fits the hosting rules. The clipped row at z 700…1,500 has to be handled. |
| **East** | Short, dense and cheap per km²: bungalows, the Beltline, Ponce City Market just past the Midtown rows, Krog Street, Little Five Points, East Lake, Decatur Square. CSX Hulsey sits right at today's edge. | Highest building density (769/km² on the corridor). That's many small boxes, and the draw and memory cost per km² is higher than it looks. Almost no skyline, and Decatur is outside the UTC canopy map. Only CSX freight, and no Amtrak. |
| **West** | The freight centre of Atlanta: Inman, Tilford, Howell Junction. The Crescent leaves to the west here. Also Westside Park and the Bellwood Quarry reservoir, the AUC, and Vine City next to the existing stadium. Clean edge, no clipped tiles. Smallest corridor. | Very few tall buildings, so the payoff is rail and landscape, not skyline. Freight is `illustrative` on its card, so the most active place in the scene is the least certain. |

### Phone and desktop cost with streaming

Per direction, at a representative camera over the new area. Estimates come from shipped Midtown
rows. A row of 2.24 km² carries 757–1,040 buildings and 1,962–4,067 crowns. The prototype's LOD
averages about 15k triangles per km² (224k across nine LOD areas, about 15 km²). The Midtown rows
average about 400 buildings per km², so the LOD row below scales 15k by each corridor's building
density. It is a placeholder until the pack exists.

| | North | South | East | West |
|---|---|---|---|---|
| Near ring (3 × 3 tiles, 5.8 km²): buildings, *estimate* (corridor density × 5.76) | ~2,300 + 20–40 towers | ~2,000 | ~4,400 | ~2,200 |
| Mid ring LOD triangles per km², *estimate*: 15k × (corridor buildings per km² ÷ 400) | ~15k | ~13k | ~29k | ~15k |
| Phone (A16, `q=low`): pan frame time p95 / max | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Phone: triangles / draws / programs | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Phone: geometry + texture MB, heap after GC | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Phone: worst stream-in frame | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Desktop (`q=high`): pan frame time p95 / max | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Desktop: triangles / draws | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| What it needs to hold the bar | Tower skins within 600/2,400 tris. Merged-block LOD for towers beyond about 1.2 km. Forest LOD from the first tile. | Mid ring capped at about 3 km on the phone. The airfield as a few large flat meshes. Planes as one instanced batch. | Merged-block LOD from the near ring's second ring of tiles. One draw per tile for houses. | Yard tracks as merged meshes, and freight consists through the existing instancing. |

### Key buildings per direction, ranked

**Scheme.** I reused the weights from the ranked skins survey in `docs/building-skins.md` (on
`origin/samsolomon/studio-building-skins`, `ed8e352c`): height 40, footprint area 16, three proximity
terms worth 10 each, a mapped name 7, and class 5. Its proximity terms (Peachtree, the Connector,
Five Points) are downtown-specific. For new directions I replaced them with distance to the direction's
MARTA line, to its spine road (Peachtree Rd, the I-85/Airport loop, DeKalb Ave or Ponce, MLK/Joseph
E. Lowery), and to its centre (Lenox, the terminal, Decatur Square, Westside Park). The rankings below
are **judged** with those weights from OSM heights and footprints. They were not computed into a
CSV. A rebake should produce the CSV the same way the skins survey did.

The hours below are **estimates**. Commit history shows one tower per PR, and a series like the Westin
(placement, glazing, mast and crown, reflection) landed within about 35 minutes of commits on 11-22.
Commits don't capture photo research, review shots or Sam's sign-off, though. I use 2–3 agent-hours
for a routine skin, 5–8 for a landmark, and 15–25 for a complex.

**North (Buckhead).** OSM has 79 buildings ≥ 45 m in the rectangle and 78 in the corridor. The
heights come from [Wikipedia's tallest list](https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Atlanta)
where OSM lacks them.

| Rank | Building | Height | Note |
|---:|---|---|---|
| 1 | 3344 Peachtree (The Sovereign; one building) | 202.7 m (Wikipedia list) or 193.5 m (other sources: 635 ft) | Tallest in Buckhead. Missing an OSM `height`. The two figures may be spire and roof. |
| 2 | Waldorf Astoria Buckhead | 176.8 m | |
| 3 | Park Avenue Condominiums | 148.1 m | |
| 4 | Terminus 100 | 147.9 m | Next to Buckhead station |
| 5 | The Paramount at Buckhead | 145.7 m | |
| 6 | Ritz-Carlton Residences | 143 m | |
| 7 | The Grandview | ~141 m (OSM) | |
| 8 | Buckhead Grand | 137.5 m | |
| 9 | Salesforce Tower (Atlanta Plaza) | ~130 m | |
| 10 | Park Place on Peachtree | 128 m | |
| 11 | Elora at Buckhead | 128 m | |
| 12 | 2828 Peachtree | 127.9 m | |
| 13 | Alliance Center towers (One, Two, Three) | 116–125 m | One builder for the family |
| 14 | Tower Place 100 | 122.2 m | |
| 15 | Lenox Square and Phipps Plaza (malls plus the Phipps tower) | low, huge footprints | Landmarks for their footprint, not their height |
| 16 | Atlanta History Center and Swan House | low | Named, recognisable |

Workload, *estimate*: about 25 routine skins (every tower ≥ 90 m) plus 6 landmarks (3344, Terminus,
Lenox, Phipps, Swan House, Armour Yard). That's 25 × 2.5 + 6 × 6.5 ≈ **100 agent-hours**. Skins can run
three or four agents in parallel, like the 30-skin night.

**South (to the airport).**

| Rank | Building | Note |
|---:|---|---|
| 1 | ATL control tower ("Atlanta Tower", 121 m) | Tallest US tower ([Wikipedia](https://en.wikipedia.org/wiki/List_of_tallest_air_traffic_control_towers_in_the_United_States), [ATL fact sheet](https://www.atl.com/about-atl/atl-factsheet/)) |
| 2 | Domestic Terminal (North and South) | Complex |
| 3 | Maynard H. Jackson International Terminal | Complex |
| 4 | Concourses T, A, B, C, D, E, F | One parametric concourse builder, then 7 placements |
| 5 | Delta TechOps hangars (TOC1–3) and Delta North/South hangars | One hangar builder |
| 6 | SkyTrain guideway, Rental Car Center, Georgia International Convention Center | Elevated rail is visible from orbit |
| 7 | Porsche Experience Center and its handling track | Recognisable from the air |
| 8 | Delta headquarters | |
| 9 | Cargo buildings A–D, UPS, FedEx | Generic; shared builder |
| 10 | Fort McPherson / Tyler Perry Studios stages | Large footprints |
| 11 | Center Parc Stadium and the 1996 Olympic cauldron tower (47 m) | Just south of the board, in the rectangle, not the corridor |

Workload, *estimate*: about 3 complexes (terminals, the concourse builder, the airfield: runways,
taxiways, aprons) × 20 + 6 landmarks × 6.5 + 4 shared builders × 5 ≈ **120 agent-hours**. Planes are
extra.

**East (to Decatur).**

| Rank | Building | Note |
|---:|---|---|
| 1 | Ponce City Market (50 m, huge footprint) | Just east of the Midtown rows (2,385, −2,059) |
| 2 | Old DeKalb County Courthouse, Decatur Square | |
| 3 | Jimmy Carter Presidential Library and Carter Center | |
| 4 | Agnes Scott Main Hall | |
| 5 | CSX Hulsey Intermodal (cranes, stacks) | Moves |
| 6 | Krog Street Market and tunnel | |
| 7 | Pullman Yards sheds | |
| 8 | East Lake Golf Club clubhouse | |

Workload, *estimate*: 8 × 6.5 ≈ **50 agent-hours**, and no tower skins.

**West (Westside, Bankhead, H.E. Holmes).**

| Rank | Building | Note |
|---:|---|---|
| 1 | NS Inman Yard and Intermodal (cranes, hump), CSX Tilford, Howell Junction | Mostly track, but it's the subject here |
| 2 | Westside Park and the Bellwood Quarry reservoir | Landscape |
| 3 | AUC: Woodruff Library, Morehouse, Spelman, Clark Atlanta landmarks | |
| 4 | Hemphill water works | |
| 5 | Rodney Cook Sr. Park (Vine City) | Beside the modelled Mercedes-Benz Stadium |
| 6 | Westview Cemetery gate and abbey | |
| 7 | H.E. Holmes station | |

Workload, *estimate*: 7 × 6.5 plus yard track work (about 15 h) ≈ **60 agent-hours**.

Mercedes-Benz Stadium and State Farm Arena are already on the downtown board
(`docs/mercedes-benz-stadium.md`, `web/src/city/state-farm-arena.ts`). Atlantic Station sits inside the Midtown rows (x ≈ −440), so it
belongs to no new direction.

## 4. Trees as a first-class cost

### What today's board carries

The square-board and neighbourhood rows use the City of Atlanta / Georgia Tech 2023 Urban Tree
Canopy mosaic for crown positions. Crown heights come from Meta & WRI canopy heights (Tolan et al.,
2024, CC BY 4.0). See `treeSource` in each `context.json` and `pipeline/scripts/expanded_canopy.py`.
Downtown's `trees.json` uses Meta/WRI directly.

| Area | km² | Crowns | Per km² | `treeLowCount` (share) |
|---|---:|---:|---:|---:|
| midtown-south | 2.24 | 1,962 | 876 | 923 (47%) |
| midtown-central | 2.24 | 2,448 | 1,093 | 1,071 (44%) |
| midtown-upper | 2.24 | 2,439 | 1,089 | 1,023 (42%) |
| brookwood-south | 2.24 | 3,377 | 1,508 | 1,323 (39%) |
| brookwood-station | 2.24 | 4,067 | 1,816 | 1,557 (38%) |
| north-band | 1.12 | 1,169 | 1,044 | 541 (46%) |
| south-band | 1.12 | 702 | 627 | 376 (54%) |
| sweet-auburn | 0.64 | 524 | 819 | 246 (47%) |

The whole board holds about 18,400 crowns, counting downtown's 897.

The placement rules cap density. `expanded_canopy.py`, which `midtown_landscape.py` also calls for
the Midtown rows, reserves `max(7, 1.36 r)` metres around each
crown and limits the radius to 10 m. The low tier keeps **the largest crown in each 32 m cell**. That
caps low-tier crowns at 977 per km² however dense the canopy is. I checked the shipped files: in
midtown-central and brookwood-station, every low-tier crown sits in its own 32 m cell (1,071 of 1,071
and 1,557 of 1,557). Brookwood station already reaches 695/km² on the low tier.

### Canopy by NPU

From the [2023 City of Atlanta Urban Tree Canopy Assessment](https://geospatial.gatech.edu/AtlantaUTC/AtlantaCanopyReport2023GT.pdf),
§4.18, Figure 89 (tree acres ÷ total acres): the city averages 45.7%. Downtown's NPU M is lowest at
14.1%. NPU A is highest at 62.8%. Midtown's NPU E is 29.2%. NPU B is 42.3% and C 53.2%. For the other
directions: N 39.3%, O 35.9%, W 42.5% (east), T 27.8%, S 45.9%, X 38.4%, R 56.0%, V 16.6% (south and
southwest), and L 24.2%, K 36.5%, J 51.2%, I 60.4%, H 54.8% (west). The NPU-to-neighbourhood mapping
(A and B are Buckhead, E is Midtown, N and O are Inman Park through East Lake, T is West End, L is
Vine City and English Avenue) is from my own knowledge, not the report. Check it against the city's
NPU map before relying on it.

### Estimates per direction

The bake turns canopy into crowns at about **30–62 crowns per km² per canopy point**. That range comes
from NPU E's 29.2% against 876–1,816 crowns/km² in its rows. The table uses 35–60. The spread is wide because each row's
local canopy differs from the NPU mean. Below, the full count is a range, and the low count uses the
observed 38–54% share, capped at 977/km².

| | Canopy assumed | Full crowns, corridor | Low-tier crowns, corridor | Full crowns, rectangle |
|---|---|---|---|---|
| North (22.4 km²) | 45–55% (NPU B, A, C) | 35k–74k | 13k–22k (cap 21.9k) | 78k–163k |
| South (57.6 km², of which the airfield is ~21.5) | 30–40% off the airfield, 5–10% on it | 42k–100k | 16k–53k (cap 55.7k) | 133k–309k |
| East (21.9 km²) | 36–42% (NPU N, O, W; Decatur unmapped) | 28k–55k | 10k–21k (cap 21.4k) | 46k–92k |
| West (33.9 km² with the yards) | 25–45% (L, K, T, J, I, G) | 30k–92k | 11k–33k (cap 33.1k) | 40k–124k |
| Whole I-285 hull (682 km²) | ~45% | **1.1M–1.8M** | ≤ 666k (cap) | — |

Even the smallest direction doubles today's 18,400 crowns. The full square is 60–100 times today's
count. Individual crowns cannot be the model beyond the near ring.

### Forest LOD

- **Near ring (the 3 × 3 tiles around the target).** Today's crowns, species and leaf clumps,
  unchanged. Species detail only matters here, where the mask and leaf cards can be seen.
- **Mid ring.** Per tile, one merged mesh of **canopy masses**. Each mass is a faceted clump per
  32 m or 64 m cell where canopy cover exceeds about 30%. Its height comes from the Meta/WRI
  95th-percentile canopy height, and its footprint from the cell's cover fraction. Adjacent cells
  merge into ridged blobs, so a wooded ravine reads as one mass. Budget: about 10 triangles per
  64 m cell, or **≤ 2k triangles and 1 draw per tile** for a fully wooded tile. It uses the existing
  foliage material, so no new program.
  The shared builder is `web/src/trees/far-canopy.ts` from the tree lab: `farCanopyArrays` is pure
  (plain arrays in, typed arrays out) so it runs in the LOD Worker, and it draws with the board
  skirts' vertex-coloured Lambert program that low already compiles. It takes `World.trees`, so
  planted crowns are included, with an adapter for raw `context.trees` on tiles that never load
  in full. The prototype's own per-cell clump builder in `web/src/city/stream/lod-build.ts`
  switches to it after this PR.
- **Beyond the mid ring.** No tree geometry. Canopy is baked into the ground's vertex colour from the
  same cell grid.
- The bake for all three levels comes from one pass, so they line up.

Per-ring phone costs to measure:

| Phone tier (A16, `q=low`) | North | South | East | West |
|---|---|---|---|---|
| Near-ring crowns drawn | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Tree triangles, near / mid | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Tree draws, near / mid | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Tree geometry MB | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |
| Foliage mask cost (see `docs/tree-mask-clawback.md`) | TODO(measured) | TODO(measured) | TODO(measured) | TODO(measured) |

**Truth tiers.** Crown centres, radii and heights are already labelled inferred in `treeSource`.
Canopy masses are illustrative shapes over inferred canopy. Both are ambient scenery, so they go in
the Key and About, not on screen.

**Canopy source gap.** The UTC raster covers the City of Atlanta only. Decatur, East Point, College
Park, Hapeville and most of the I-285 square outside the city need another crown mask. The candidate
is Meta/WRI canopy height ≥ 3 m (1 m, global, already a pipeline input). Each new area needs more
Meta tiles than the two quadkeys (`032002311`, `032003200`) the bake uses now. The seam where the two
sources meet needs a visual check.

## 5. Pipeline changes (`pnpm data`)

1. **A tile driver.** A new `pipeline/scripts/tiles.py` (or a Rust stage) walks the lattice cells
   that touch the hull, or a given direction's set, and bakes each tile's three files. It's
   restartable and skips any tile whose inputs' hashes are unchanged.
2. **Ground tiling.** Generalise `square_board.py`'s ground bake from fixed rows to any lattice cell.
   USGS 3DEP 1 m tiles are 10 × 10 km. The I-285 box needs about 12–20 of them, at several hundred MB
   each (*estimate*). Pin their URLs and sha256s like `x74y374`/`x74y375` today, and keep the 5 m
   int16 encoding and the 323.8 m scene zero. City's tabletop base will need per-region levels:
   Midtown's base already moved to 234 m NAVD88.
3. **An OSM source, with Overture as backfill.** Downtown's buildings come from Overture
   (`extract_overture.py`, `rebake_buildings.py`). The square-board rows use OSM. For tiles, keep OSM as
   the primary source for consistency with Midtown. Use Overture, which includes machine-derived
   footprints, only to backfill tiles where OSM coverage is visibly thin. That's most likely outside
   the city limits, but it hasn't been checked.
    Context currently comes from the OSM API's `map` call per area. That call is
   meant for editors, and 1,218 calls isn't acceptable use. Switch to one pinned Geofabrik Georgia
   extract (sha256 recorded) clipped per tile with osmium. Keep the ODbL attribution in each context
   file.
4. **The LOD pack (`lod.bin`)**, made per tile and also once per legacy area so the mid ring never
   reads a legacy `context.json`:
   - buildings merged by 100 m cell into simplified blocks: rotated rectangle or convex hull,
     quantised heights, int16 positions relative to the tile, uint16 indices, and per-vertex colour
     from the existing palette
   - a coarse ground of 25 m nodes (33 × 33 per tile), plus a skirt
   - canopy masses (§4)
   - optional rail and road ribbons for the main lines only
   - a small header with counts and the sha256

   Target ≤ 40 KB raw per tile. The prototype measures 224k triangles across 9 LOD areas. The pack
   should land at or below that, with far fewer bytes than the 5.65 MB it reads today.
5. **The index.** `tiles/v1/index.json` holds tile bounds, clip, file sha256s and bytes, counts,
   legacy owner, and the shared ground header. The client loads it once (it's small: about 1,218 rows,
   roughly 150 KB raw) and never requests a tile that isn't listed in it (§2).
6. **Canopy.** Generalise `expanded_canopy.py` to take any tile. Use the UTC mask inside the city
   limits and the Meta CHM mask outside it, and emit crowns plus the 32/64 m canopy-mass grid.
7. **Transit and freight.** Nothing new to download. MARTA rail and bus GTFS, Amtrak GTFS, FRA NARN
   freight and FRA crossings are already statewide in `web/public/data/ga/`. Rail geometry per tile
   gets clipped from them. New yards (Inman, Tilford, Hulsey, South Yard) need the same
   `freight-route` treatment the Five Points line got.
8. **Contract.** Add the tile index and LOD pack types to `web/src/model/types.ts`, with a
   `tiles.contract.test.ts` like the existing contract tests. Stable ids stay `<feed>:<kind>:<name>`.
   LOD blocks keep their source building ids so a picked block can name its building.
9. **Checks.** Run the seam check for every adjacent tile pair, as `verifySeam` does now. Count
   tiles, files and bytes against the 20,000-file and 25 MiB limits in CI, and fail at 15,000 files.

## 6. Recommendation and schedule

**Recommendation: go North first (A).** It joins the board along a full, unclipped 2.8 km edge. It
continues the Peachtree, Brookwood and Crescent work that just landed. At 35 tiles it is about 40% of
South's 91-tile corridor, and it puts a second skyline on screen. That's the payoff most visible from the
default orbit. Its costs are the canopy and the 79 towers, and both fall on the parts streaming must
solve anyway (forest LOD, landmark LOD). Solving them on 22 km² is cheaper than on 57 km².

South (B) has the best single destination, but it is the wrong first step. It needs 2.6× the tiles to
reach its payoff. It needs a second canopy source and a clipped row. It also forces a decision about
planes and truth tiers before anything else. It's a better third or fourth step, once streaming and
the forest LOD have been proven over a large area.

**Suggested sequence toward the full square:**

1. **Streaming on today's board** until the A16 holds 30 fps panning (this is the gate).
2. **North to Lenox and Phipps** (35 tiles).
3. **East to Decatur** (36 tiles, including Ponce City Market's two). It's short, and Ponce City
   Market sits next to the Midtown rows. It
   stress-tests building density, and it needs the second canopy source first, for Decatur.
4. **West to H.E. Holmes and the Inman/Tilford yards** (53 tiles, or 31 without the yards). This is
   the freight payoff.
5. **South to the airport** (91 tiles).
6. **Fill in the I-285 hull** in mid-ring-only form (all 1,218 tiles). Near-ring detail is baked
   everywhere, but skins arrive only where a direction earned them.

**Rough schedule for North first (agent-hours, *estimate*):**

| Step | Agent-hours |
|---|---:|
| Streaming foundation: ring manager, time-sliced builds, worker decode, hysteresis and prefetch, LOD for legacy areas | 20–30 |
| Forest LOD (bake and render) | 8–12 |
| Pipeline: tile driver, Geofabrik source, ground tiling, index, LOD pack, contract tests | 12–18 |
| North bake, seams, board clamps and City camera limits for the new extent | 6–10 |
| MARTA north (Lindbergh, Buckhead, Lenox, the tunnel), Armour Yard, Crescent north of Peachtree | 8–12 |
| Skins and landmarks (§3, run in parallel) | ~100 |
| A16 and desktop perf passes, ceilings, build log | 6–8 |
| **Total** | **~160–190**, of which ~60–90 must run in sequence |

For comparison, South first needs the same foundation plus about 25–35 h of bake, airfield and
second-canopy work, and about 120 h of airport landmarks, so **~200–240 agent-hours**. East and West
each come in at about 110–130.

## Could not verify

- That static asset hits don't count toward the free plan's 100,000/day Worker limit. The docs say
  "free and unlimited" and that matched assets never reach `fetch()`, but no page states the daily
  limit explicitly excludes them.
- A total-bytes limit for Workers static assets. The docs list only file count and per-file size.
- Whether the fail-open and fail-closed setting applies to this repo's `custom_domain` route. It
  matters only for `/api/*` after the daily limit.
- The per-NPU canopy for East Point, College Park, Hapeville and Decatur. They're outside the city's
  UTC study.
- OSM building completeness outside the city of Atlanta, and the exact NPU-to-neighbourhood mapping.
- That OSM's "Salesforce Tower" footprint is the tower Wikipedia lists as Atlanta Plaza. I matched
  them by position only.
- Agent-hours per landmark. Commit timestamps show bursts, not the research time behind them.
- These facts are from memory and weren't checked against a source this session:
  - The Red line runs in tunnel north of Lindbergh and Buckhead station sits in the GA-400 median.
  - USGS 3DEP 1 m tiles are 10 × 10 km.
  - Usable ADS-B feeds aren't free.
  - `not_found_handling` defaults to none.
  - The OSM API `map` call isn't meant for bulk extraction.
- Landmark positions not located in OSM are hand placed. That covers Ponce City Market's tile, the
  Carter Center, Decatur Square, Westside Park, the AUC, Porsche, Swan House, Lenox and 3344 Peachtree.
  Their tile membership is right, but the coordinates are only good to about 200 m.
- The airfield's southern edge at z 15,176 reaches about 80 m into the last South row. One more corner
  tile may be needed there.
