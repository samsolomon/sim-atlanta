# Sim Atlanta

A free, fast map of where trains are, or are likely to be, right now. It starts with
Atlanta and Georgia. Every fact on the map says how we know it: **live**, **scheduled**,
**reported** average, **inferred** or **illustrative**. See [docs/data-model.md](docs/data-model.md).

## What's here

- `pipeline/`: Rust. Downloads the open data and writes compact static files to
  `web/public/data/ga/`:
  - MARTA and Amtrak GTFS schedules
  - FRA crossing inventory
  - BTS/FRA North American Rail Network lines
- `web/`: TypeScript + Vite + MapLibre GL on OpenFreeMap tiles. Scheduled trains are
  computed in the browser from the timetables, so they cost no server requests.
- `worker/`: a Cloudflare Worker. It serves the site and `/api/marta/rail`, which fetches
  MARTA's rail realtime API using a secret key, normalizes the response and caches it for
  10 s. The browser snaps each train's GPS fix onto its line and glides it between fixes.

## Run it

```sh
pnpm install
python3 -m venv .venv && .venv/bin/pip install duckdb rasterio pyproj scipy pillow   # once
pnpm data           # fetch + build Map data, downtown rail profiles and City data; re-run to refresh
pnpm data:city      # refresh the City board, traffic network, tree canopy and baked ground grid
pnpm data:vignette  # East Portal diorama: refreshes the Overture roads/land-use/infrastructure/building
                    # extracts, then crops them and adds FHWA traffic + Meta/WRI trees (re-run after pulling)
pnpm secrets:local  # writes worker/.dev.vars (gitignored) from 1Password item sim-atlanta-marta-api
pnpm build          # the worker serves web/dist
pnpm dev:worker     # live API on :8787
pnpm dev            # http://localhost:5173 (proxies /api to the worker)
pnpm test           # Rust + web + worker tests
```

These URL options are handy for reviewing:
- `?t=2026-11-20T14:00:00-05:00` pins the clock to a moment.
- `?speed=30` plays time faster.
- `#zoom/lat/lon` sets the map view.
- In local development, `/terrain-preview.html?at=cut` opens the downtown ground study. Run `pnpm data:city` first, or `pnpm data:terrain` if the downtown board and trees are already present. [Terrain measurements and camera stops](docs/downtown-ground.md)
- `/` opens the 2.8 × 6.8 km City board from downtown through Midtown to Brookwood.
  On older checkouts missing the five Midtown row directories, run `pnpm data:midtown` before building.
  Use `?board=square` for the 2.8 km square around downtown and King Memorial.
  Use `?board=downtown` for the downtown-only board. Use `?view=map` for Map or a saved Map camera
  hash. City also accepts `?view=city` and `?view=3d`. Drag to orbit, use WASD to
  move and Q/E to rotate, or tap a train or bus for its source. Phones open on the
  low tier. Use `?q=high` or `?q=low` to override the device tier.
- `/vignette.html` is the East Portal look study: a detailed low-poly diorama whose light,
  season, weather and traffic follow Atlanta's clock. Options: `?at=<ISO time>`,
  `?speed=600`, `?weather=rain|fog|storm|overcast|clear` (default live), `?clean`, `?scatter`.

Live MARTA appears only when the clock shows the real present. A time-shifted or
sped-up view always uses the timetable.

## Live MARTA buses

The 2D map polls the keyless `GET /api/marta/bus` endpoint at most once per
30 seconds while visible at the real clock. An always-open map adds up to 2,880
Worker requests per day. The Worker caches each bus snapshot for 30 seconds
per edge location. For local route labels, run `pnpm build` after `pnpm data`
before starting the dev Worker. For deployment, run `pnpm data` to generate the bus route
index, then `pnpm --filter worker run deploy` to rebuild static assets and deploy the Worker together.
See [the response contract](docs/data-model.md#live-buses).

## Deploy (Cloudflare free tier)

Live at **https://atlanta.solomon.io** (Worker `railwatch` in the "Solomon" Cloudflare account,
custom domain set in `worker/wrangler.toml`). Run `pnpm data && pnpm data:vignette && pnpm build`
before `pnpm run deploy`; the secret `MARTA_API_KEY` is already set on the Worker.
`pnpm data` includes `data:city`: City requires `scene/downtown/vignette.json`,
`trees.json` and the retained `scene.json` profiles. It also stages the six surrounding areas. In an existing checkout with Map
data, run `pnpm data:city` once before building this milestone. Missing City data makes
the app fall back to Map. Vite omits the three retired downtown `.bin` meshes.

The optional East Portal art map uses a separate static bake. To include or retain
`/artmap.html` in a deployment, copy the Studio's complete `web/public/art/`
directory before building. A checkout without the bake ships only the map and
vignette, and deploying it removes a previously published art map.
[Art factory instructions](pipeline/scripts/art/README.md)

```sh
npx wrangler login                       # once
cd worker && npx wrangler secret put MARTA_API_KEY
pnpm run deploy   # not `pnpm deploy`, which is a pnpm built-in
```

## Not yet

[Future features](docs/future-features.md) collects ideas for sharing City views, rendering distant traffic and building a neighborhood from a fork.

- City's phone performance gate, moving vehicles, real terrain, a ride-along camera,
  and growing out to I-285 (see docs/city-plan.md and docs/art-backlog.md).
- Freight positions. No free source exists; see docs/data-model.md.

## Licence

The code is MIT (see `LICENSE`). The radio music and covers in `web/public/music/` are
not covered by it and are not for reuse. Map and open data keep their own licences,
credited in the app's About & credits.
