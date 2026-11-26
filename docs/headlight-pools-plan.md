# Plan: headlight pools at night (High tier)

Status: plan only (2026-11-26), for the coordinator and Sam. Nothing here is built yet.

Sam wants light on the road ahead of each vehicle at night, not just lit lamps. Today every vehicle's headlamps glow as emissive faces (`vehicleMaterial` kind 1, `busMaterial`, `cq400Material`, `passengerMaterial`), and nothing lights the ground in front of them. The only ground light at night is the street-lamp light map baked into ground and street materials (`vignette/world.ts` `bakeSteps`), which is static.

## Proposal

**One instanced additive quad per lit vehicle, all in one draw.** A `HeadlightPools` batch owned by City holds one `InstancedMesh` of a single quad (2 triangles) with an additive, depth-tested, non-depth-writing material. Each traffic layer writes its visible cars' pools into the shared batch during its existing `update` pass, so the Connector, downtown arterials and Midtown share one draw. No real lights, shadows or per-pixel lighting.

- **Shape.** A trapezoid about 3.4 m wide at the bumper widening to 5 m, reaching 16 m ahead (22 m for the semi, whose lamps sit higher). The falloff is computed in the fragment shader from the quad's UV: two soft beam lobes that merge about 6 m out, warm white (the headlamp colour, `vec3(1.0, 0.96, 0.82)`), brightest 2–5 m ahead and fading to nothing at the far edge and sides. No texture.
- **Placement.** On the vehicle's own course, not the ground below it: the pool's near and far edges are sampled with `heightAt(lane, s + half + d)` on the same lane state that already places the car. On a deck or ramp the pool follows that deck, pitched by its two samples, and a road crossing overhead never catches it. Where a sample is null (tunnel, hole, board edge) the pool is dropped. A curve gets a single chord quad. For a 16 m pool its mid-point sits 32/R m off the lane (0.4 m on an 80 m radius ramp), which the soft edge hides; tighter turns can split the pool in two. The quad sits 4 cm above the drawn road and uses `polygonOffset` so it never z-fights the paint.
- **Night and distance.** One uniform carries `atm.dark`, and pools are skipped (batch count 0) below 0.05. A second fade by camera distance runs from full at 250 m to zero at 900 m, so the default orbit sees soft glows rather than a field of blobs. Fog applies as on every other material. The trip-fade `tripOpacity` already computed per car multiplies the pool, so it fades in and out with its car.
- **Wet weather.** Wet roads are only darkened today (`World.setWet`: no sheen). Under rain the pool brightens about 1.4× and stretches about 25% along the road, reading as glare off wet asphalt, from the existing wetness value. That gives rain a night look it lacks now, without a reflection pass.
- **Clipping.** The material takes the traffic layer's clipping planes, so pools stop at the board edges with their cars.

## Cost

| | Programs | Draw calls | Triangles | CPU per frame |
|---|---:|---:|---:|---|
| High, day | +1 (compiled at boot) | 0 (count 0; mesh kept in scene for prewarm) | 0 | none |
| High, night | +1 | +1 | about 2 per lit vehicle: about 500 for 250 cars | one 16-float matrix write per car, on the pass that already writes the car's matrix |
| Low | 0 | 0 | 0 | none (Low gets no pools) |

- **Programs.** High is at 98 of 100 (the same test:perf run, day and night). There is no instanced additive material to share, and a plain `MeshBasicMaterial` match is not guaranteed once it is instanced and patched for the night uniform. So this takes **one** of the two spare programs. Prewarm (`core/prewarm.ts`) compiles visible meshes, so the batch stays in the scene with count 0 by day to keep its compile at boot and out of the `_lateCompiles` sweep.
- **Draws.** +1 at night, against 626 calls measured on main at 22:00 (test:perf, 068b32ed, 2026-11-26) and a 630 ceiling. That is tight: this plan needs 1 call of headroom. If night is at the ceiling when built, merge the pools into an existing night draw or trim one first.
- **Fill.** Additive overdraw where pools overlap in queues. High only, where the desktop GPU carries it. Pools are small on screen at orbit distances.

## Which vehicles

- **Phase 1:** road traffic (all three layers, every kind). The semi's pool is longer and wider.
- **Phase 2, same batch, no extra draws:** buses (`city/buses.ts`, already instanced with `buses.night`) and the Atlanta Streetcar on Edgewood and Auburn. Both run on streets where a pool reads naturally.
- **Not proposed:** MARTA trains (mostly in tunnels, trenches and on elevated structure, where a pool on the trackbed reads poorly from the orbit) and freight and Amtrak (their materials have no night term today, and freight positions are illustrative). Revisit after phase 1.

## Truth tier

Pools are illustrative art on illustrative traffic. On a bus with a live position the pool is decoration, not data, and carries no tier of its own. Nothing here changes what the selection card says.

## Proof when built

The "before" night views already exist for the Connector: [Connector at 22:00, orbit and street-eye](log/road-semi/city-day-night.jpg) · [street-eye](log/road-semi/city-eye.jpg). The matched "after" stills come with the build.


- Matched night stills before and after: the Connector at the default orbit, a downtown arterial queue at a signal, a deck over a street, a ramp, a street-eye close-up, and the same views in rain.
- `pnpm test:perf` on high-night: programs +1, calls +1 or better, triangles about +500, and no late compiles in the clock and weather sweep.
- A test that a pool's samples come from its own lane, so a car on a deck never lights the street below, and that a null sample drops the pool.
