# Streetcar corners filleted (November 24)

The Atlanta Streetcar's GTFS shapes turn 60–114° at a single vertex at each downtown street corner. The rails cornered hard, and the articulated S70 folded into an L across the intersection. At Edgewood Avenue and Park Place its tail came within 0.6 m of Ten Park Place's wall, close enough to read as inside the building from above. The worst body swing off the centreline was 5.1 m.

City now fillets every corner at load time in one shared function, `streetcarShapes()` in `web/src/city/streetcar-shape.ts`. It's memoized and costs about 1.15 ms for all three paths. The rails, cars, stops, traffic and road-car cover checks all read it. The 2D map, Schedule and data contract keep the raw GTFS shape, so there's no `pnpm data`.

- **Radius 18 m:** the S70's optional minimum per the [Siemens Atlanta S70 data sheet](https://assets.new.siemens.com/siemens/assets/api/uuid:1199226b-3898-4e47-94b2-2a0c8bb6ca82/atlanta-s700-streetcar-data-sheet.pdf), which gives 25 m standard and 18 m optional. The built Overture tram corners measure 17–30 m. A corner whose legs are too short for the arc folds its neighbouring vertices into one compound turn instead of shrinking the radius.
- **GTFS distance:** `cum` is interpolated onto the new points, so stops and timetable positions keep their meaning. Every served stop sits at least 11.8 m from an arc, so the 22 m straight platforms stay off curves.
- **Loop seam:** at Centennial Olympic Park, path 155169 ends on the corner path 155170 turns through. Its end is spliced onto that arc, so the last cars stay on the rails. The drawn network still has the same three rail segments as main.
- **Tier:** this is inferred geometry on a scheduled-tier shape.

**Checks** (`streetcar-shape.test.ts`):
- **Swing, hard:** at most 1.0 m, sweeping the real S70 kinematics over 6,638 poses. Worst 0.95 m, down from 5.12 m.
- **Buildings, hard:** at least 1.0 m from every building wall. The raw shape failed at Ten Park Place. One footprint is exempt by id: the skybridge over Carnegie Way.
- **Mapped tram, hard:** each arc lies within the larger of 5 m or the raw corner's distance from the mapped tram rails. At Edgewood and Park Place the raw corner was 14.0 m off and the arc averages 1.3 m. (371,−501) is the one corner that moves away from the mapped rails, 3.2 → 4.5 m.
- **Kerb, ratchet:** an articulated car cuts every street corner. Measured from the drawn carriageway edge, the raw corners already overshot by 2.4–3.8 m, and the fillets add up to 0.8 m at four corners. The test holds each corner at today's value as a ceiling. Ground-contact will paint carriageway under `streetcarSweptCorners()` and lower it.

The vehicles agent's probe (10 sim hours, about 530k car-frames): streetcar worst 5.07 → 0.94 m, with cells over 1.0 m going from 20 to 0. CQ400 and Crescent are unchanged.

| View | Camera | Image |
| --- | --- | --- |
| Edgewood at Park Place, oblique, noon and night | `292,-66,225,68,55` with `&dev&mindist=30`; 12:06:38.130 and 23:06:38.130 | [Before and after](edgewood-park-place-oblique.jpg) |
| Five corners, top-down, day | `<x,z>,0,4,95` with `&dev&mindist=40`; 11:30 | [Before and after](corners-top-down.jpg) |
