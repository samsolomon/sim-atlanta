# Piedmont Park details pass: plan

Status: plan, 2026-11-24. Held for Sam. Trees stay generic low-poly (Sam, 24 November). Lawns
follow the ground rule: light, calm and low-contrast, with mow stripes only on manicured lawns
such as the Active Oval. Every new piece is instanced or merged into an existing batch, low-poly,
and uses existing materials (no new shader programs on either tier).

## What City already has

The 10th, 12th and 14th Street gates, the Clara Meer bridge and gazebo, the Dock, the Active
Oval's diamonds, fields, backstops, goals and volleyball, mapped OSM furniture (high tier only)
and entrance map kiosks. [Current day](log/ui/piedmont-details/current-day.jpg),
[night and Active Oval](log/ui/piedmont-details/current-night-oval.jpg).

**Off the board: an input to the expansion decision.** The board ends at x = 1,800 m. The Meadow
(except a sliver), the Legacy Fountain and Promenade, and the dog parks lie east of that edge, near
x ≈ 1,890 m. They wait for the board to grow and are not part of this pass. Growing the square
east by about 400 m would bring in the rest of the park.

## Priorities

| # | Item | Why it reads | Tier | Reference |
|---|---|---|---|---|
| 1 | **Greystone bathhouse and the Aquatic Center pool** | The biggest gap at 150–420 m. A plain tan extrusion stands where there should be a long grey granite building, about 83 × 29 m (OSM). It has a grey shingle roof, a gabled centre pavilion and hipped end pavilions. The pool is about 34 × 26 m (OSM), with a white deck, white steel shade pergolas and globe lamps along the deck. Those lamps are the best night subject in the park, reflected in the lake. | both | [day](https://commons.wikimedia.org/wiki/File:View_of_the_Piedmont_Park_Aquatic_Center_and_the_midtown_Atlanta_skyline_from_across_Lake_Clara_Meer.jpg), [night](https://www.flickr.com/photos/31171751@N00/5167519050), [TSW](https://www.tsw-design.com/portfolio-items/piedmont-park-bathhouse-and-pool/) |
| 2 | **Path lamps** | At night the park is black. The research found black fluted cast-iron posts about 4 m tall (scaled from people), with clear faceted acorn globes and a warm-white glow, along the main asphalt paths. Plan: instanced posts and globes on the existing lamp materials, spaced about 30 m along the main loops, with the night glow through City's existing lamp pass. | both (low: globes only past the far orbit) | [bridge lamps](https://commons.wikimedia.org/wiki/File:Piedmont_Park_view_from_the_Park_Drive_Bridge_on_Christmas_Eve_Day.jpg), [lamp head](https://www.flickr.com/photos/13838874@N00/450108089), [paths](https://commons.wikimedia.org/wiki/File:Walking_Paths_in_Piedmont_Park.jpg) |
| 3 | **Lake Clara Meer edge and fishing piers** | The water meets lawn with no edge. By Greystone the shore is a vertical masonry wall with a flat buff coping. The 2001–02 restoration added three fishing piers: timber decks with granite-ashlar posts about 0.9 m tall. | both (posts high only) | [pier](https://www.flickr.com/photos/39326308@N07/4061939362), [Dock lawn](https://www.flickr.com/photos/39326308@N07/4061939768), [TSW restoration](https://www.tsw-design.com/portfolio-items/piedmont-park-clara-meer-restoration) |
| 4 | Dockside (1910 rest house, the Visitor Center) by the 12th Street gate | A small heritage building beside the Dock. No usable exterior photo yet; needs a Street View check before modelling. | both | [history](https://piedmontpark.org/park-history/), [Midtown Alliance](https://www.midtownatl.com/go/dockside-at-piedmont-park) |
| 5 | Active Oval finish: picnic shelter, chalked lines, mow stripes on the fields | Manicured lawn, so stripes are allowed. The fields are already there. | both | [Active Oval](https://commons.wikimedia.org/wiki/File:Piedmont_Park%27s_Active_Oval_under_a_threatening_summer_sky.jpg) |
| 6 | Overlook benches on both tiers (dark slats, black iron ends) and lakeside swing benches | Mapped benches draw on the high tier only today. | high, low at overlooks | [gate and bench](https://commons.wikimedia.org/wiki/File:Ghostly_Piedmont.JPG) |
| 7 | Peace Monument inside the 14th Street gate | A landmark, about 5 m. It needs a close camera. | both | [main entrance](https://commons.wikimedia.org/wiki/File:Main_Entrance_to_Piedmont_Park_Atlanta.jpg) |

**Gaps.** I found no night photos of the gazebo, the gates or the Dock, and no photo of the
12th Street gate. No published dimensions exist for lamps, benches or gate piers. Dimensions
above are OSM footprints or scaled from photos, as marked.

## Build (top three as one PR, held for Sam)

- Matched before and after for each item, by day and at night: Greystone and pool
  `cam=1600,-3520,30,45,220`, lamps on the park overview `cam=1550,-3600,20,45,700` at 22:00,
  and the lake edge `cam=1600,-3500,30,50,300`.
- Report low, high and high-night calls and triangles, program counts at 14:00 and 22:00, and
  `pnpm test:perf`.

## Built (first PR): what is reported, inferred and estimated

1. **Greystone and the pool** (`city/greystone.ts`).
   - Reported: the building parts follow the OSM footprint (way 182313892).
   - Inferred: the pool's lap rectangle and its free-form lagoon are traced from the leaf-off Esri
     World Imagery aerial. The lake wall follows the OSM shore.
   - Estimated from the photographs: wall heights (4.4 m wings, 5.5 m end pavilions, 7.2 m centre),
     roof pitches, the window band, the arched entry, the three butterfly pergolas, and the twin-globe
     lamp posts. The photos show the posts on the deck in front of the building and along the lake
     edge, and the night photo shows rows of warm globes. Their count and spacing are estimated.
   - The deck's light pools fall only on the lawn beyond the deck. Lighting the deck itself would
     need a new shader program.
2. **Park path lamps** (`piedmontLampPaths`, `World.buildLights` `dimPaths`). Every pedestrian
   promenade and every footway at least 100 m long inside the park gets a 4 m lamp every 30 m,
   with a small, faint warm pool (radius 7 m, about half a street lamp's strength). The park's
   paths are not tagged lit in OSM. Beyond an 800 m orbit (back at 680 m), the park lamps drop out by day, as transport's far form does, because their posts read as a fence line of dark dots on open lawn. They stay at night and up close. They are the last instances in the shared lamp buffers, so trimming the count costs nothing. Which paths are lit and the spacing are **illustrative**, not
   surveyed, and carry no label on screen: they are ambient scenery, listed in About.
3. **Active Oval mow stripes**. Low-contrast stripes, about 9 m wide, painted into the ground map
   on the two soccer fields only. Illustrative.

**Not built.** The three fishing piers: they are not mapped, and the aerial does not show them
clearly enough to place them. Beyond Greystone's wall, the lake edge stays as grass banks, as the
aerial shows.

## Cost

Built dists, before (main) → after, `perf=run`, Nov 20. Calls / triangles / programs:

| View | Low 14:00 | Low 22:00 | High 14:00 | High 22:00 |
|---|---|---|---|---|
| Default | 392 / 2,453,488 / 84 → 395 / 2,462,585 / 84 | 539 / 2,479,071 / 85 → 542 / 2,486,364 / 85 | 429 / 6,824,091 / 98 → 431 / 6,832,752 / 98 | 585 / 6,849,780 / 98 → 588 / 6,857,653 / 98 |
| Park, `cam=1550,-3600,20,45,900` | 63 / 1,125,607 / 85 → 65 / 1,133,688 / 85 | 63 / 1,116,147 / 86 → 66 / 1,123,832 / 86 | 103 / 3,763,957 / 100 → 105 / 3,771,822 / 100 | 117 / 3,747,978 / 102 → 120 / 3,756,639 / 102 |
| Greystone, `cam=1620,-3535,270,50,180` | 66 / 1,283,498 / 86 → 68 / 1,291,183 / 86 | 66 / 1,273,642 / 87 → 69 / 1,281,327 / 87 | 97 / 3,485,254 / 101 → 99 / 3,493,907 / 101 | 110 / 3,470,107 / 103 → 113 / 3,478,768 / 103 |

No new programs at any clock. There are 244 park path lamps out of 3,595 lamps board-wide, on both tiers. They share the existing post and head instanced meshes, so they add no draws, and their pools go into the existing light map. The added draws are Greystone's three merged meshes.

Sheets: [Greystone](log/ui/piedmont-details/gs.jpg) and [the park from 900 m](log/ui/piedmont-details/ov.jpg), by day and at night; [lake edge in January and July](log/ui/piedmont-details/lake-edge-seasons.jpg), no z-fighting at the shoreline.
