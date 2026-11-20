# Railwatch

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
pnpm data           # fetch + build data (≈1.2 MB gzipped); re-run to refresh
pnpm secrets:local  # writes worker/.dev.vars (gitignored) from 1Password item trains-marta-api
pnpm build          # the worker serves web/dist
pnpm dev:worker     # live API on :8787
pnpm dev            # http://localhost:5173 (proxies /api to the worker)
pnpm test           # Rust + web + worker tests
```

These URL options are handy for reviewing:
- `?t=2026-11-20T14:00:00-05:00` pins the clock to a moment.
- `?speed=30` plays time faster.
- `#zoom/lat/lon` sets the map view.

Live MARTA appears only when the clock shows the real present. A time-shifted or
sped-up view always uses the timetable.

## Deploy (Cloudflare free tier)

```sh
npx wrangler login                       # once
cd worker && npx wrangler secret put MARTA_API_KEY
pnpm deploy
```

## Not yet

- The zoom-in diorama.
- Freight positions. No free source exists; see docs/data-model.md.
