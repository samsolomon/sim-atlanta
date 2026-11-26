# Headlight pools

At night on the High tier, every vehicle with headlights lights the road or track ahead of its leading end. This covers road traffic, the semi, buses, the Atlanta Streetcar, MARTA (the alignment, the east cut and the North Line), downtown and Norcross freight, and the Crescent. The plan and its costs are in [headlight-pools-plan.md](headlight-pools-plan.md); this page records what was built.

- **One draw.** `web/src/city/headlight-pools.ts` holds one `InstancedMesh` of a unit quad with an additive `ShaderMaterial`. Every producer writes into it during its own per-frame pass, through a narrow `PoolSink` (`active`, `inRange`, `add`).
  - The falloff is two beam lobes, computed from the quad's UV, with no texture.
  - The quad fades with City's darkness and with camera distance, from full at 450 m to gone at 1,400 m; beyond 1,400 m nothing is placed.
  - Fog dims it rather than tinting it, and rain brightens it by up to 40%.
- **On the vehicle's own surface.** Each pool runs between two points sampled on the vehicle's own lane or track, so it follows decks, viaducts and ramps, and a road passing overhead never catches it.
  - Road cars use the lane's drawn height (`heightAt`).
  - Buses use their own street (`surface`), the streetcar its drawn street height, and MARTA `al.elev`.
  - Freight uses the drawn tread, and the Crescent and the Norcross freight use the Brookwood bed and rail head.
- **Dropped where nothing is drawn.** A pool is skipped when either end has no surface. That covers a null lane height, MARTA's `trackVisible`, a freight tread section's start and end, a corridor's chainage limits, and the board edges. There are no clipping planes, because the producers use four different plane sets.
- **Leading end only.** Every pool starts 0.5 m under the front bumper, so it meets the vehicle rather than floating ahead of it. Road cars light from their front bumper, the bus and the streetcar's cab A from the front bumper, and trains from the lead cab or locomotive in the direction of travel.
- **Freight lamps.** Locomotive headlamps and ditch lights now glow at night through the shared freight patch, using `freightNight` and the `stockLight` lamps. The program key stays `freight-containers-1`, so this adds no program.
- **Tier.** High only. Low has no batch, because it is at its program budget. A hidden one-instance template lets boot prewarm compile the program, and the live mesh is hidden when nothing is lit. `?pools=0` (dev only) turns pools off for matched stills.

Pool sizes, from `POOL`:

| Vehicle | Reach | Width | Power |
|---|---|---|---|
| Car | 12 m | 4.2 m | 0.7 |
| Truck (box, semi) | 15 m | 4.8 m | 0.7 |
| Bus, streetcar | 14 m | 4.8 m | 0.7 |
| Rail | 20 m | 4.2 m | 0.65 |

Sam's review on 2026-11-26 dimmed street-level pools by 30% and shortened them by a quarter. It also started each pool at the bumper, because in the Connector aerial the first cut's light floated ahead of a barely visible truck. Rail keeps its reach and power. See `docs/log/headlight-pools/tweak-off-first-tweak.jpg` (off, first cut and tweak, in matched frames).

Each producer has a recorder test: one pool per lead at night, none by day, none where the surface ahead isn't drawn, and the pool's height on the vehicle's own lane or deck.
