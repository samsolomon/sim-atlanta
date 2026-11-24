# Route 49 traffic slice

Sam approved this scope on 2026-11-23: live buses retain GPS authority and cars
yield to them. Timetable buses obey simulated signals, dwell and queues; their
scene position is **inferred**, with timetable information shown separately.
Route 49 ships first; route 23 is a separate branch/PR.

## Pinned input

Official MARTA archive downloaded 2026-11-23 from
`https://itsmarta.com/google_transit_feed/google_transit.zip`:
18,620,232 bytes, SHA-256
`f4a36309f42858d3c55bf46298395471621ba6ec1888a141c543a1190a52e2e1`.
No feed_info.txt is present. Record retrieval date/hash and calendar validity in
the generated bus artifact; respect calendar exceptions and after-midnight times.
The archive's 81 bus route-ID mappings exactly match the shipped bus-routes.json.
The initial coordination note incorrectly said the mappings differed.

Route 49 is raw ID 29153, McDonough Boulevard / Hill Street: 658 trips,
2 shapes, 27,632 stop calls, no positive arrival-to-departure dwell intervals.
Its service IDs are 3, 4, 5, 24, 28, 39. These are edition-specific input IDs;
public identities remain namespaced stable IDs. The in-board route serves Georgia
State, the Piedmont/Courtland pair, Peachtree and North Avenue. Verify each
shape's direction, station access and road ownership before drawing it.

## Implementation order

1. Export a small separate bus routes/timetable artifact for 49 from the pinned
   archive using existing GTFS contracts, retaining stops and service calendars.
   Keep bus trips out of rail consumers. Add edition/contract checks and an
   explicit data-generation command; PR must state data generation and web rebuild.
2. Build a board-aware directed lane path from each GTFS shape, with owner-based
   road/deck height, curved turns and stop anchors. Do not bridge unmapped gaps by
   driving through buildings. Extend beyond downtown only through mounted roads.
3. Add deterministic timetable bus motion with proposed 15 s illustrative dwell
   where GTFS gives none, #340 signals where modeled, and carried queue delay.
   Bus identity persists in traffic; no collision-driven disappearance or jumps
   to recover schedule. Use explicit reference points for bumper/stop clearance.
4. At the present, match fresh GPS observations to active trips by the GTFS
   trip descriptor and service date. Use directed route proximity for older
   feeds without descriptors. Hide a nearby timetable twin of an unmatched bus.
   Draw uncovered trips from the timetable. Follow the same trip as its source
   changes. A matched bus follows stops, signals and queues while steering
   toward the age-adjusted GPS target (at most 150 m past the fix). Fade
   corrections over 300 m ahead or 200 m behind. A bus over 40 m behind its
   target skips modelled dwells. GPS takes over from the trip's drawn timetable
   position without a jump, and a trip that loses GPS fades its fallback in.
5. Extend selection/follow and card states: inferred scene position, scheduled
   timetable, illustrative dwell/model. Keep live position separate. Unknown
   routes and expired schedules must remain explicit, without invented service.
6. Keep one shared rigid bus batch, target <=1,000 triangles per bus at low;
   no new textures/lights or server endpoints. Existing shared 30 s polling and
   cached worker remain unchanged. Coordinate articulated geometry separately;
   neither route number nor sparse fixes establish a vehicle type or joint curve.

## Validation

Test service dates/exceptions, zero dwell, after-midnight calls, clock seeks,
red-light/stop queues and preserved identities, road direction, bridge ownership,
board transitions, stale GPS and card tiers. Run pnpm test, build, populated
low/high performance probes, browser day/night review and Claude cross-review.
Report actual low-tier draws/triangles and ask coordinator for A16 verification.
Only coordinator deploys.

Architect/product review, 2026-11-23: keep buses separate from the existing rail
schedule consumer; do not deduplicate live and timetable trips without trip IDs.
Treat dwell and traffic-delayed positions as inferred rather than scheduled/live.
Exact path mapping and stop positions remain implementation checks, not claims
established by this inventory.

## Building the pinned edition

Run `pnpm data:bus49` to stage the checked-in compact edition, then `pnpm build`.
The full `pnpm data` also stages it. To regenerate from the original archive,
run `pnpm data:bus49 /path/to/google_transit.zip`. The exporter verifies the
digest before reading the feed. Compare the resulting
`web/public/data/ga/bus-49.json` with `pipeline/prototypes/bus-49/timetable.json`.
A new edition needs updated provenance, a regenerated snapshot and contract checks.

Architect review, 2026-11-23 revision. Keep raw trip IDs beside the compact
timetable, in its existing order. The existing worker response can carry the
optional descriptor with the same polling and cache settings. Use the feed's
observation clock for freshness and the service clock for the scheduled trip.

Product design review, 2026-11-23 revision. The selected City card distinguishes
the GPS observation from the drawn position and names the fallback on a missing
fix. The scene word describes the real-time City clock. Shifted clocks use only
the timetable. The Map continues to display reported GPS fixes.

Release checklist: on or before **2026-11-27** (14 days before the last service
date, **2026-12-11**), check for the next MARTA GTFS edition, regenerate the
snapshot, verify service exceptions and update these dates before release.
