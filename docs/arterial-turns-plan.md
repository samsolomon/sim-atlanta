# Arterial turns — PR 2

2026-11-23. Implementation branch: `codex/arterial-turns`.

Add illustrative turns to downtown and Midtown using separate `TrafficCourse`s.
Keep positions a pure function of scene time and retain the existing car caps.

1. Build permitted directed traversals across corridor boundaries at shared nodes.
   Reject reverse travel on one-way roads, U-turns, ambiguous joins and disconnected
   endpoints. Preserve source road ownership for height sampling on every segment.
2. Construct approach, smooth turn and exit geometry. Allocate an explicitly
   illustrative share from incoming flow rather than adding demand. Retain enough
   approach and exit length for queues and endpoint fades.
3. Assign the incoming approach's signal controller and phase explicitly: the
   nearest tangent on the curved course can incorrectly choose the exit phase.
   Use `signalPositions` for green-only release. Resolve shared approach/exit
   occupancy with through courses; separate course queues alone cannot prevent
   overlap. Do not represent permissive left turns as protected movements.
4. Cover one-way exits, geometry continuity, source-road mapping, flow allocation,
   red/amber holds, clock seeking and shared-lane overlap with deterministic tests.
5. Check fixed-clock downtown and Midtown renders at both tiers, daylight and
   night. Save captioned BEFORE | AFTER images with the subject circled and camera
   strings. Run `pnpm test`, build, City performance checks and cross-model review
   before opening/merging the PR. A web rebuild is required; no data rebake planned.

Architect review (2026-11-23): inspected route joining, signal assignment and slot
allocation. Added explicit incoming phase selection, source-road mapping and
cross-course occupancy requirements; simply appending curved routes is insufficient.

Product design review (2026-11-23): preserve illustrative traffic semantics and
existing ambient UI. Keep caps unchanged and verify turns in motion as well as
frozen screenshots. No new controls or claims about observed turn counts.

Cross-review revision (2026-11-23): turn courses now reuse original entrances and
exits, take a direct 15% incoming-flow share, and retain approach speed. Exits with
speed differing by more than 0.1 m/s are skipped. This avoids the initial slow
streams and mid-block fades. Midtown has 20 eligible turns. Shared queues remain
future work; the existing footprint guard suppresses cross-course overlaps.

Second review (2026-11-23): fixture measurements confirmed the 17th Street turn
stop was 11.95 m beyond its through stop, and a neighbouring turn picked a controller
removed by twin-light merging. Stops now use the earlier of the through stop and
curve entry; ambiguous merged controllers are excluded. Regression checks cover
all 20 remaining Midtown turns. Two review rounds complete.
