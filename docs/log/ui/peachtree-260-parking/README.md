# 260/270 Peachtree Parking

This is the brick-clad parking deck behind 270 Peachtree on Baker Street, Overture `110124e5-f458-4355-bc57-2ab8e60d688e`.

There are no Commons photographs. Google Street View at 33 Baker St NW (December 2025, looking south-south-east at the north face; cited, not copied) shows red-brown brick piers and spandrels framing large regular openings on every level, so it reads like a brick loft. The ground-floor bays are open behind black metal grilles, with vehicle entrances on Baker Street.

## Heights from lidar

From the USGS [`GA_Statewide_B2_2018`](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) point cloud, NAVD88:

- **Grade:** 315.3 on Baker Street, rising to 317.4 on the south.
- **Roof deck:** 337–339, about 22 m above grade, against a mapped 29.2 m.
- **Stair and elevator tower:** up to 344.7 at the north edge.

There is no phantom tower over the deck.

## Estimates

- **Levels:** 3.6 m each over a 4.2 m ground floor.
- **Bays:** 4.2 m.
- **Openings:** 74% of each bay wide. Each shows the dark deck, the next slab's edge along its foot and the soffit along its head, so the openings read as open decks rather than windows (the lead asked for this).
- **Ground floor:** a grille band between brick piers.
- **Stair tower:** 8 × 6 m.

The footprint check on the staged data (local harness) gives 0 m outside and 0 detached. Every layer sits at least 4 cm off its wall.

## Lighting

About 30% of the deck bays are lit at night with skin-kit `litHash`, standing in for the deck lights. This is illustrative, and no night photograph was used.

## Captures

| View | Camera | Capture |
|---|---|---|
| From the north, 11:30 | `270,-875,160,45,300` | [Day](day.jpg) · [Before and after](before-after.jpg) |
| Same view, 23:30 | `270,-875,160,45,300` | [Night](night.jpg) |
| Close (`&dev`, then `__setView(160,45,300,262,-868,2.6)`) | | [Close](close.jpg) |
| Four sides at 400 m (`scripts/four-side-sheet.mjs`) | | [Sheet](peachtree-260-parking-four-sides.jpg) |
