# Traffic signals on the arterials

Downtown's and Midtown's illustrative arterial cars now stop at mapped traffic signals. Signal **locations** are mapped: OSM `highway=traffic_signals`, 148 points in the downtown vignette and 151 in the archived Midtown row extracts (`web/src/city/fixtures/midtown-signals.json`). Signal **timing** is illustrative: every controller runs the vignette's 84 s cycle (38 s green and 4 s amber per axis), with an offset hashed from its location. Cars, speeds and queues stay illustrative, and volumes stay inferred from HPMS.

## Model

- **Controllers.** Signals within 25 m form one controller, since OSM often maps one per approach. Each approach's stop line sits 8 m before the intersection. Per intersection, the first approach sets a reference street. Approaches within 45° of it share its phase, and the crossing street takes the other, so crossing streets are never green together, however they are oriented.
- **Trips.** A car's position stays a pure function of the scene clock. Each trip enters at a time derived from its slot, then walks its signals in order: it arrives, waits on amber or red until green, and continues. Cars arriving in the same red window queue behind one another, front bumper to the line, 2 m apart, and pull away 2 s apart. A follower may cross only once the car ahead has rolled clear. Scrubbing the clock lands every car exactly where a fresh load would (tested).
- **Budget.** A signalled course's period includes the worst case, the full red plus queue headway at every light, so a trip always finishes before its slot runs again. The traffic cap applies to expected visible cars (about 13 s of mean delay per light), so signals don't thin the street. Over the evening peak, visible cars stay within 25% of the unsignalled layer (tested).
- **Opt-in.** A course with no mapped signal, every closed loop, and the whole Connector run exactly as before.
- **Signal heads.** Each stop line gets an instanced mast and an unlit head coloured from the same controller every frame. At q=low, at the wide Midtown camera, the change adds 2 draw calls and about 4.3k triangles (+0.2%).

Turns at intersections come next; HPMS has no turning counts, so turn shares will be illustrative. Requires a web rebuild only.

[10th Street queue, before and after](log/ui/traffic-signals/compare-10th-queue.jpg) · [Night and low tier](log/ui/traffic-signals/compare-night-low.jpg)
