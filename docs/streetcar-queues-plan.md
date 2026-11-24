# Cars following the streetcar

2026-11-23. Branch `codex/streetcar-traffic-queues`.

Use the next handoff item to replace same-lane arterial overlap suppression with
queues behind scheduled streetcars. Keep adjacent lanes, crossings and bridges on
the existing occupancy guard. Do not change streetcar motion or live buses.

1. Add a pure fixed-step queue solver for open courses. Cars advance at most their
   speed, respect actual signal crossing times, follow same-course leaders with a
   2 m bumper gap, and stop behind moving block intervals. Replay from the earliest
   trip entry on a globally aligned half-second grid. A cache may resume identical
   trip cohorts; backward seeks rebuild, and fractional frames never mutate grid
   checkpoints. The result must match a fresh solver at the same clock.
2. Project scheduled STREETCAR TrainState `s` through the existing GTFS-to-scene
   helpers. Match only same-direction, same-level lane sections, with rear and
   front projections within one streetcar length. Exclude crossings and next lanes.
3. Pass a scheduled-state sampler from the host to City. Cache a bounded set of
   historical streetcar samples. Limit queue replay to downtown arterial courses
   that geometrically share the streetcar lane. Keep Connector and Midtown work
   unchanged. Reserve additional offstage time for streetcar delays.
4. Test dwell, departure, follower gaps, signals, no backward motion, same-clock
   seeking, absence of streetcars, adjacent lanes, opposing/crossing lanes and
   height separation. Measure solver work and cache bounds; then run the full
   suite, build, performance budgets, fixed-clock browser comparison and review.
5. Update the handoff/build log, open one PR and notify the coordinator through
   reply thread msg_ca3634b98b19. Only the coordinator deploys. Web rebuild only;
   no data rebake or extra server requests.

Architect review: current RoadTraffic already derives slot entry times from the
clock. Preserve that contract and keep the sampler separate from drawing. A
current-position clamp alone would jump backward, and a frame-delta simulation
would break seeks. Snapshot streetcar data is insufficient to reconstruct a queue;
use the existing timetable. Bound historical caches and measure fresh replay cost.

Product design review: vehicles remain illustrative, streetcars scheduled. Add no
ambient labels or controls. Same-lane following must remain visible through a
streetcar dwell and release smoothly; retain the existing last-resort footprint
check at crossings and under live buses. Independent courses still do not share
queues; document that limitation rather than claiming full traffic simulation.

Review follow-up: fractional samples now interpolate two immutable grid states,
with a separate signal-release bound. This prevents backward jumps as a streetcar
enters the lane and avoids caching per-frame timestamps. The shared pose cache
retains the longest bound course's complete replay period plus one minute (minimum
2,400 samples, hard maximum 7,200). Courses exceeding that bound keep the existing
skip-draw fallback. Tests cover fractional churn and repeated long-course replay.
