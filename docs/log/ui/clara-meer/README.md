# Lake Clara Meer: bridge, gazebo and Dockside

The 2001–02 restoration of Lake Clara Meer replaced a concrete causeway with a granite bridge. It set the historic gazebo on a round platform at the bridge's side and built new docks at the west end. City drew the bridge as a generic footbridge. The gazebo, OSM `way/269747513` (*Clara Meer Gazebo*), stood in the water as an 8 m generic brick box, and the dock (OSM `way/1089189870`, *Clara Meer Dock*) was not drawn at all.

## References

Each was opened in a fresh Orca tab.

- **Bridge and gazebo, day.** [Wikimedia: Bridge Piedmont Park](https://commons.wikimedia.org/wiki/File:Bridge_Piedmont_Park.jpg), an oblique view of the gazebo end. [Wikimedia: Bridge over Clara Meer](https://commons.wikimedia.org/wiki/File:Bridge_over_Clara_Meer_in_Piedmont_Park.JPG), from the far shore. [TSW project page](https://www.tsw-design.com/portfolio-items/piedmont-park-clara-meer-restoration) ("a granite bridge, restored gazebo").
- **Dusk and night.** [Wikimedia: Bridge over lake clara meer](https://commons.wikimedia.org/wiki/File:Bridge_over_lake_clara_meer.JPG) shows warm amber acorn lamps on the approach piers and the gazebo columns lit warm from within. [Flickr 376240067](https://www.flickr.com/photo.gne?id=376240067) (2007) shows the night approach: acorn globes on black posts above granite piers.
- **Dockside.** [Conservancy photo](https://piedmontpark.org/wp-content/uploads/2020/11/Dockside-01.jpg): a curved band of weathered wooden boardwalk along the shore and a straight railing-less pier with four short stone posts at its corners. The restoration date comes from the [Conservancy's history](https://piedmontpark.org/park-history/). No night photograph shows lighting on the dock, so the dock has no lights in City.

## Measured, reported and estimated

| Attribute | Tier | Basis |
| --- | --- | --- |
| Plan of bridge, spur, gazebo and dock | `reported` | OSM, as extracted by `pipeline/scripts/piedmont_edge.py` |
| Water surface 267.4 m NAVD88; banks 269.5 m east, 269.8 m west | measured | Hydro-flattened 3DEP, at both tiers |
| Deck crest 2.9 m above water; 4.5 m deck; 9 m bank ramps | estimated → drawn `inferred` | Photographs, scaled by people |
| Two end arches, 12 m span and 2.1 m rise; piers 0.65 m, 1.4 m above the deck, at seven bays; two rails | estimated, `illustrative` | Photographs |
| Four acorn lamps on the end piers, warm amber at night | estimated, `illustrative` | Dusk and night photographs. Lamp count and post height are estimates |
| Gazebo: eight white columns about 2.7 m tall, standing-seam pyramid to 5.9 m, warm uplight at night | estimated, `illustrative` | Photographs |
| Dock deck 0.5 m above water, four stone posts about 0.75 m tall | estimated, `illustrative` | Conservancy photograph |

No published dimensions exist for any of these structures.

## Cameras

Day 14:00 and night 23:00 Eastern on 20 November 2026, low and high quality, 999 × 496 viewport.

- Bridge and gazebo: `/?view=city&cam=1662,-3470,-20,68,70`. [Low day](bridge-low-day.jpg) · [low night](bridge-low-night.jpg) · [high day](bridge-high-day.jpg) · [high night](bridge-high-night.jpg)
- Dockside: `/?view=city&cam=1362,-3357,80,60,60`. [Low day](dock-low-day.jpg) · [low night](dock-low-night.jpg) · [high day](dock-high-day.jpg) · [high night](dock-high-night.jpg)

The walkable deck replaces the generic footbridge in the transport layer, so `deckAt` follows the modelled crest. Everything else is drawn by the landmark registered on the gazebo footprint. Publishing needs a web rebuild only.
