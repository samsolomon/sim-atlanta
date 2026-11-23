# Traffic signals on the arterials

Downtown's and Midtown's illustrative arterial cars now stop at mapped traffic signals. Signal **locations** are mapped: OSM `highway=traffic_signals`, 148 points in the downtown vignette and 151 in the archived Midtown row extracts (`web/src/city/fixtures/midtown-signals.json`). Signal **timing** is illustrative: every controller runs the vignette's 84 s cycle (38 s green and 4 s amber per axis), with an offset hashed from its location. Cars, speeds and queues stay illustrative, and volumes stay inferred from HPMS.

## Model

- **Controllers.** Signals within 25 m form one controller, since OSM often maps one per approach. An approach whose centreline passes within 20 m of a controller gets a stop line 8 m before the intersection, and twin lights within 30 m on one course count as one stop. Per intersection, the first approach sets a reference street. Approaches within 45° of it share its phase, and the crossing street takes the other, so crossing streets are never green together, however they are oriented.
- **Trips.** A car's position stays a pure function of the scene clock. Each trip enters at a time derived from its slot, then walks its signals in order: it arrives, waits on amber or red until green, and continues.
- **Queues.** Cars arriving in the same red window queue behind one another, front bumper to the line, 2 m apart, and pull away 2 s apart. On green, a follower waits right behind a car still pulling away.
- **Spillback.** A car that would queue back past the previous light is held at that light until the car ahead of it leaves. A queue reaching back past a course's entrance holds the rest offstage.
- **Spacing guard.** A final pass along each course keeps every follower at least both half lengths plus 2 m behind the car ahead. Each car's position never decreases with time, and neither does the minimum of such positions, so the pass never moves a car backward, and two cars of one course can never overlap.
- **Purity.** Scrubbing the clock lands every car exactly where a fresh load would (tested).
- **Known limitation.** A slot that appears or disappears when the hourly share changes at a minute boundary can shift the queue behind it once.
- **Budget.** A signalled course's period includes the worst case, the full red plus headway for a 15-car queue at every light, so a trip always finishes before its slot runs again. The traffic cap applies to expected visible cars (about 13 s of mean delay per light), so signals don't thin the street. Over the evening peak, visible cars stay within 25% of the unsignalled layer (tested).
- **Opt-in.** A course with no mapped signal, every closed loop, and the whole Connector run exactly as before.
- **Signal heads.** Each stop line gets an instanced mast and an unlit head coloured from the same controller every frame. At q=low, at the wide Midtown camera, the change adds 2 draw calls and about 4.3k triangles (+0.2%).

Turns at intersections come next; HPMS has no turning counts, so turn shares will be illustrative. Requires a web rebuild only.

[10th Street queue (4:38 pm), before and after](log/ui/traffic-signals/compare-10th-queue.jpg) · [Night and low tier](log/ui/traffic-signals/compare-night-low.jpg)
