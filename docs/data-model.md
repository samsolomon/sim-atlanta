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

## Rail elevation profiles (downtown)

`railprep scene` gives every MARTA heavy-rail path through downtown a height profile, with one
value every 10 m. Heights come from Overture's subway `level_rules` and `rail_flags`, which
derive from OSM `layer` and `tunnel`. They are **schematic stacking order, not depth**: −1 → −10 m,
−2 → −16 m, −3 → −22 m, and any bridge → +7 m. City and East Portal draw track only where the
smoothed profile is at or above `PORTAL_E` (−5.5 m), so anything deeper counts as tunnel.

`clean_profile` fills untagged gaps of 150 m or less between two tunnels, because most of them are
mapping seams. Some are real open cuts, though. `VERIFIED_OPEN` in `pipeline/src/scene.rs` pins the
ones checked against dated imagery at a schematic −4 m, so they survive the fill and the ramp. On a
flat board, City cuts a slot in the ground over each below-grade open stretch and gives it a floor.

### Open-air MARTA track downtown (checked 2026-11-21)

Primary evidence: OSM way tags and history (api.openstreetmap.org); USGS NAIP orthoimagery
`m_3308413_se_16_060_20231008` (2023-10-08, 0.6 m, public domain, via TNM
`USGSNAIPImagery`); Esri World Imagery, Vantor WorldView-2, 2026-02-02 (0.5 m, leaf-off,
viewed only, not redistributed). MARTA's SEC District roof page was also used
(itsmarta.com/gwccroof.aspx).

| Stretch | Status | Evidence | Precision |
|---|---|---|---|
| Five Points station (Blue/Green on the upper level) | Underground | OSM `tunnel=yes`, `location=underground` platform | — |
| **Gulch trench**, between Five Points and the Ted Turner Dr viaduct, about −84.3937 to −84.3924 | **Open cut** (pinned) | OSM ways 702258823 and 702258824 have had no tunnel tag since 2019. NAIP 2023 and WV02 2026 both show a walled trench with a footbridge across it. | The ends match the OSM ways to a few metres. The two tracks are 111 m and 141 m long. City's drawn run is 117–128 m, and its ends fall within 7–23 m of the surveyed ends after smoothing. |
| Ted Turner Dr → SEC District (Dome/GWCC) → Northside Dr, about 1 km | Covered | OSM way 702268368 is `tunnel=yes`, `layer=-3`. Imagery shows the line under the Gulch deck, the plaza and the Centennial Olympic Park Dr bridge. MARTA says the station "sits underneath the Centennial Olympic Park Drive bridge overpass" and has its own roof. The open slot visible beside the station carries the NS freight tracks, not MARTA. | The station is roofed and isn't open to the sky. |
| Vine City station's open cut, about −84.4064 to −84.4047 | Open, **off the board** | OSM ways 702268369 and 702268371 are untagged, and the trench is visible in NAIP 2023. Its x coordinate is about −1,300 to −1,140 m, west of the City board's edge at −1,000. | Not drawn. |
| **Five Points east cut**, between Peachtree St and Pryor St, about −84.3898 to −84.3889 | **Open cut** (pinned) | OSM ways 702258817 and 702258818 are untagged, and the Interline Connector way 1453238814 beside them is `cutting=yes`. Rails are visible in NAIP 2023 and WV02 2026. | Same method as the Gulch trench. |

Gaps still unverified: the 100–115 m untagged spans near Georgia State (about −84.3875 to −84.3865
and −84.3852 to −84.3843) stay filled as tunnel until someone checks them the same way. Centennial Yards plans
to build a platform over the Gulch tracks, so re-check the Gulch trench against new imagery
before trusting this entry after 2026.

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
