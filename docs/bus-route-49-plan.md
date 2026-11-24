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
4. Make cars queue behind same-lane buses using #346 moving blocks. Live bus
   observations remain authoritative, with age and live tier on the card; no
   simulated red-light delay may move a live observation. Missing/stale fixes do
   not silently become scheduled trips. First slice shows timetable-derived buses
   only in Timetable mode because the live payload lacks trip linkage.
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
