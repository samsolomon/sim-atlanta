# Illustrative Connector traffic in City

The first traffic layer covers two disconnected portions of I‑75/85 inside the City board. At Georgia State it follows the seven modelled lane centres per direction over the **153 m between the two measured sections**. The northbound outer two arrive on the feeder. Southbound lane 6 (counting from 0 at the median) leaves for I‑20. Lane 5 divides between that exit and the continuing mainline. The positions taper over the next 60 m at either end onto the existing paint. On the generic 14 m pavement, the model draws three travel positions per direction. The separate northern crossing runs between the north and east edges of the board. [Footprint measurements](connector-road-footprint.md) · [Directed route builder](../web/src/city/connector-traffic-routes.ts)

Road runs join at matching directed endpoints. A route requires a verified junction and two board-edge endpoints. The I‑20 exit's last mapped vertex falls 4.5 m inside the south edge. The northern northbound approach uses the clipped ground piece to reach the east board edge. Cars pass through time in covered intervals, disappear over holes and resume along their own roadway. The phase wraps at a board edge. Detached local ramps, arterial streets and the off-board section between the two crossings have no simulated through path in this pass.

## What the counts mean

GDOT station 121-5472 gives a **calculated 2025 AADT of 237,000 vehicles/day, both directions combined**, near the Georgia State crossing. Applied separately to each on-board crossing as an illustrative demand proxy, it is multiplied by a weekday/weekend hourly share from the baked FHWA TMAS 2023 Atlanta station 000009 at Freedom Parkway. Hourly shares interpolate on Atlanta local time. The two displayed portions represent the same corridor. Adding their demands would double count it. [GDOT station records and imagery](connector-road-footprint.md#traffic-records) · [TMAS hourly-profile bake](../pipeline/scripts/vignette_traffic.py)

The model divides demand equally by direction and then by available positions. Lane 5 has a 50/50 illustrative exit choice. At 18 m/s, expected occupancy is hourly demand × time spent on the route. Fixed pseudo-random offsets form groups and gaps. The two tiers cap the whole board at 48 and 120 cars. A box truck, SUV and sedan share the vehicle kit and lighting material with East Portal. The coloured instances show a typical scene. Time, direction shares, turning decisions, speed, vehicle mix and individual positions are illustrative. Neither these counts nor the vehicle layer provide live congestion.

## Renderer attachment

Construct once after the downtown measured terrain and transport are ready. The module uses the existing local `traffic.json` hourly profiles. If the bake is missing, skip this optional layer. Keep independent bus observations authoritative. Supply a bus occupancy function in City world coordinates, including level, and a road-deck lookup from the renderer. Without a deck lookup, scoped ground approaches still render and vehicles on unresolved decks are hidden. Build `connectorRoadHeight` once so that its per-road interval cache is reused. [Road-surface resolver](../web/src/city/connector-road-height.ts) · [City layer](../web/src/city/connector-traffic.ts)

```ts
const cars = new ConnectorTraffic({
  city: vd,
  quality,
  hourly: trafficData.hourly,
  roadHeight: connectorRoadHeight(vd, terrain.groundAt, deckAt),
  busOccupies,
  clippingPlanes: edges,
});
scene.add(cars.group);
```

In the frame loop alongside freight, call `cars.update(options.clockMs(), atm.dark)`. The car position is a function of the shared scene clock. Pause, rewind and a second visit to the same instant reproduce the same poses given the same bus occupancy. Read `cars.visibleCars` for diagnostics, call `cars.dispose()` on close and show **Illustrative road traffic** in City attribution whenever the layer is enabled. A deck sampler receives the exact scoped `TransportRun`, which lets it distinguish an overpass from the road beneath. The independent bus layer can veto a candidate before any car instance is submitted.

## Visual check

Open Map at `/?q=high&t=2026-11-20T14:12:49-05:00&speed=0#18.5/33.74918/-84.38315/177`, then choose City. Repeat with `q=low`. At the same framing, advancing five seconds moves cars about 90 m along their own road. These Orca captures used a local preview that attached the module beside CityFreight and the new footprint painter in the ground map. The crossing view includes the pre-adjustment street lamps. The renderer owner is taking the production attachments and device check. [High](log/ui/2026-11-21-connector-traffic-high-49.jpg) · [Five seconds later](log/ui/2026-11-21-connector-traffic-high-54.jpg) · [Low](log/ui/2026-11-21-connector-traffic-low-49.jpg)
