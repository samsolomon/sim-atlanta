# Data model

The map shows *where trains are, or are likely to be, right now*. It must always be
honest about how it knows. The canonical types live in `web/src/model/types.ts`;
the Rust pipeline (`pipeline/`) emits static files that match them.

## Truth tiers

Every displayed fact carries a tier, per attribute (not per train). A train's
position can be `live` while its car count is `illustrative`.

| Tier | Meaning | Examples |
|---|---|---|
| `live` | A real-time feed reported it moments ago | MARTA rail (GPS fixes every 30–60 s) |
| `scheduled` | Derived from a published timetable | MARTA rail/streetcar, Amtrak Crescent |
| `reported` | An average an operator reported to a regulator | FRA crossing train counts |
| `inferred` | We filled it in from nearby `reported` values | Freight arcs with no crossing |
| `illustrative` | A typical example, not a real observation | Freight trains in the future diorama |

`Sourced<T> = { value, tier, source, asOf }` carries this on any value.

## Identifiers

`<feed>:<kind>:<stable name>`, e.g. `marta:route:RED`, `marta:route:STREETCAR`,
`amtrak:route:Crescent`, `fra:crossing:718065F`, `narn:arc:451994`.
Feed-generated numeric ids (MARTA route `29226`) are mapped to stable names once,
in the pipeline, so the rest of the system never depends on them. Namespacing by
feed is what lets this grow to every US agency.

## Geometry: where a train can be

Positions are **distance along a path** (`s`, metres), not lat/lon. That gives
smooth interpolation, guaranteed on-track rendering, and a natural coordinate for
dropping trains into a diorama later.

- **Transit and Amtrak:** `Path` comes from the agency's GTFS `shapes.txt`, with
  cumulative metres per vertex (`cum`).
- **Freight:** `TrackArc` from the North American Rail Network (NARN) lines dataset,
  which is a node/arc graph with owner, trackage rights, subdivision, and track count.
- The basemap's own railway lines are decoration only. Snapping GTFS paths onto NARN
  arcs is a later problem.

## Freight traffic

FRA crossings carry railroad-reported daily train counts but no link to a track arc.
The pipeline attaches each open crossing to the nearest arc owned by the same railroad
within 50 m. An arc's `tpd` (trains per day) is the median of its attached crossings
(`reported`). Arcs with none inherit from connected same-owner arcs through the graph
(`inferred`), up to 6 hops, but **only along main line (`NET=M`) and passing sidings
(`S`)**. Yards and industry leads see a fraction of a main line's trains, so they stay
unknown unless a crossing on them reports a count.

NARN `NET` codes (from the dataset's coded values): M main, I major industrial lead,
O other/minor industrial, S passing siding over 4,000 ft, Y yard, F rail ferry,
X out of service, A abandoned, R removed, T rail-trail, Z transit-only/museum.
We drop X, A, R, T and Z. Identical counts on neighbouring crossings suggest
these are per-segment estimates, so the UI always says "reported average, not live".

## Timetables

Compact, computed in the browser so scheduled trains cost zero server requests:

- `Pattern`: route + path + stops, each with metres-along-path and arrival/departure
  offsets in seconds from trip start.
- `Trip`: `[patternIndex, serviceIndex, startSeconds, shortName]`. `startSeconds` may
  exceed 86 400 (GTFS allows `25:30:00`).
- `Service`: weekday bitmask + date range + `calendar_dates` additions/removals.

## Normalized train state

All four source kinds become one `TrainState` (`id, routeId, pathId, s, heading,
lon/lat, lengthM, vehicleType, headsign, nextStop`):

1. **Position fixes** (GTFS-RT VehiclePositions): snap lat/lon to the path → `s`.
2. **MARTA rail REST**: each prediction row repeats the train's GPS fix (verified
   2026-11-20: half the trains were 400–900 m from any station, and 17 of 24 moved
   between 25 s snapshots). The Worker groups rows by train. The browser snaps each fix
   to the nearest path of that line and direction (all fixes within 55 m), then glides
   between fixes over 8 s. Next stop and ETA come from the soonest realtime row.
3. **Timetables**: interpolate `s` between stops, dwelling at each stop.
4. **Aggregate counts** (FRA): no trains, only `TrackArc.tpd`.

## GTFS gotchas we handle

- Times past midnight (`25:30:00`) and leading spaces (` 8:17:00` in MARTA's feed).
- `calendar_dates.txt` exceptions, not just `calendar.txt`.
- Service day is evaluated in the feed's timezone (both feeds: America/New_York).

## Colour

Colour means the kind of service, the same in every city: city rail is blue, intercity
passenger is violet, and freight is rust, with width and glow scaling with trains per day.
Agency line colours (MARTA Red/Gold/Blue/Green) are an accent. They appear in train
cards, and as a tint on city rail above zoom 12.5. Train style shows the truth tier:
a solid train is live, an outlined one is scheduled.

## Vehicles and art

`VehicleType` holds length, an `art` key, and "can carry" text. Liveries are generic
look-alikes (MARTA-ish silver car, generic freight locomotive), no operator logos.

## Live buses

`GET /api/marta/bus` returns a full snapshot with `source: "marta-bus-rt"`,
`fetched` (epoch milliseconds), and `buses`. Each bus has a vehicle-descriptor ID
(`marta:bus:<vehicle_id>`) and `at` (vehicle observation time in epoch milliseconds,
or null). The wire format carries `lon` and `lat` rounded to five decimal places,
optional `bearing` in whole degrees clockwise from north, and optional `speed`
in whole metres per second. Each attribute inherits the feed source and the
vehicle timestamp. The client expands those into individual live-tier values.

The Worker uses `data/ga/bus-routes.json` to translate the feed's raw GTFS
route ID into `marta:route:<public short name>` (for example, `marta:route:1`).
It omits the assignment when the static edition has no matching bus route. The 2D
map draws teal GPS dots for fixes up to three minutes old, at the real clock only.
The endpoint retains older and undated fixes so other consumers can apply their
own freshness rules.
