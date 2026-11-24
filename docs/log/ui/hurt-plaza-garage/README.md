# Hurt Plaza Garage

Overture `8de7071d-aa01-4995-9acb-9387696c58ec`, 33 Hurt Plaza SE, on the downtown board. It is an open concrete parking deck beside the Hurt Building. Skin: `web/src/city/hurt-plaza-garage.ts`, mounted in `city.ts` after the Hurt Building and added to the `listed` array.

## Height (lidar)

The 22 April 2019 3DEP returns give a ground ring at 316.1 m NAVD88 and a top deck at a median of 21.9 m (p95 22.1). The mapped 30.6 m is too tall. A cluster at about 28 m inside the east tip is the stair and elevator core, modelled as a 10 × 10 m block to 28.3 m, turned to the garage's grid so it stays inside the walls. There is no phantom tower.

## Photo and features (confirmed by the skyline lead)

[Street View, March 2025, from Hurt Plaza](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75440,-84.38800&heading=180&pitch=25&fov=100) shows:

- about seven stacked open decks, each a continuous pale concrete spandrel over a dark open slot;
- a ground floor of shopfronts with a red awning beside the ramp entrance. The "Hurt Plaza Garage / Public Parking" sign text is left out.

The awning goes on the long face that looks most nearly north, toward Hurt Plaza.

**Night:** I found no night photo. Garages are lit, but an evenly glowing face reads as a lightbox. The lighting is drawn as a thin line of ceiling fixtures under each spandrel, about seven bays in ten. It is `illustrative`.

## Estimated

- A 4.2 m ground floor above the highest street corner, with the remaining decks spaced evenly to the 21.9 m top. The street falls about 4 m from south-west to north-east, so the decks are one level set for the whole garage, and each shopfront starts at its face's lower corner.
- 1.1 m spandrels, the awning's slope and size, and the core's plan.

## Captures

| View | Camera |
|---|---|
| [Before and after](compare.jpg), 11:30 and 23:30 | `351,-16,150,55,330` |
| [Close, Hurt Plaza face](close-day.jpg) | `355,-30,160,62,110` with `&dev&mindist=20` |
| [Low tier](low-day.jpg) | `351,-16,150,55,330` `&q=low` |
| [Four sides](hurt-plaza-garage-four-sides.jpg) | `scripts/four-side-sheet.mjs`, 400 m. The Hurt Building and a neighbour hide the north and west views. |
