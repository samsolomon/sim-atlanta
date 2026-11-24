# Generic buildings v2 (`?generic=v2`)

**Status:** prototype for Sam (2026-11-24). Off by default. Nothing changes until he picks.

## Problem

Unskinned buildings came in three looks chosen by height alone: brick under 16 m, a brick/stone
coin flip to 42 m, and pale blue-grey glass for everything taller. Downtown's ordinary stock is
mostly buff precast, limestone, brick and open decks, so the tall generic blocks around
Peachtree Center read as one flat blue-grey glass box with the same faint grid. Recolouring
would not fix that ("a colour treatment, not artwork"), so v2 adds form as well.

## Archetypes

Each archetype has a wall palette, a base, a top and its own window rhythm. Reference photos
are cited for feel only; no building is recreated.

| Archetype | Form | Rhythm (bay × storey) | References |
|---|---|---|---|
| **Precast office, 1960s–70s** | Light concrete. Either vertical fins over recessed glass, or deep punched windows with a shadowed reveal. Base is a recessed dark lobby under the shaft (1.2 m inset and soffit) or a flush granite plinth. Top is a light cap band. | Fins 1.6 or 2.0 m × 3.9 m; punched 2.6 or 3.0 m × 3.8 m | [Hilton Atlanta](https://commons.wikimedia.org/wiki/File:Hilton_Atlanta_Hotel,_Atlanta,_GA_(32532261517).jpg), [Peachtree Center](https://commons.wikimedia.org/wiki/File:Peachtree_Center_Architecture.jpg) |
| **Banded curtain wall, 1980s–90s** | Spandrel bands in warm grey alternating with glass ribbons, and slim mullions. The glass is green-grey, bronze-grey, blue-grey or dark grey, all near-neutral. Base is a recessed lobby; top is a tall mechanical-screen band. | 1.5 m × 3.9 or 4.1 m | [Midtown skyline](https://commons.wikimedia.org/wiki/File:Sunset_view_of_the_midtown_Atlanta_skyline_from_the_Eastside_BeltLine_Trail.jpg), [Hotel District, Peachtree and Ellis](https://commons.wikimedia.org/wiki/File:Hotel_District.jpg) |
| **Brick mid-rise** | Warm red or tan brick with paired or single punched windows and stone sills. Base is a shopfront with a sign band; top is a stone cornice projecting 0.45 m. | 2.8 or 3.4 m × 3.5 m | [Healey Building](https://commons.wikimedia.org/wiki/File:Healey-Bldg-Atlanta-01.jpg), [Biltmore](https://commons.wikimedia.org/wiki/File:Biltmore_ATL.jpg), [Fairlie-Poplar](https://commons.wikimedia.org/wiki/File:Fairlie-Poplar,_Atlanta,_GA_30303,_USA_-_panoramio_(1).jpg) |
| **Limestone or granite office** | Buff stone with tall punched windows and a lighter pier every third bay. Base is a darker granite plinth; top is a cornice projecting 0.6 m. | 2.4 or 2.8 m × 3.9 or 4.2 m | [Candler Building](https://commons.wikimedia.org/wiki/File:Candler_Building_viewed_from_the_Peachtree_Center_Atlanta_Streetcar_stop.jpg), [Hurt Building](https://commons.wikimedia.org/wiki/File:Hurt_Building_view_from_Hurt_Park.jpg), [Equitable](https://commons.wikimedia.org/wiki/File:Atlanta%27s_Equitable_Building_seen_from_Woodruff_Park.jpg) |
| **Residential, 2000s+** | Light panels with slab edges every floor, and balcony rails on some bay groups. Panel groups take an accent (darker, charcoal, lighter or terracotta). Base is a retail podium; top is a dark coping. | 3.0 or 3.6 m × 3.2 m | [1010 Midtown](https://commons.wikimedia.org/wiki/File:1010_Midtown,_Midtown_Atlanta_GA.jpg), [One Midtown](https://commons.wikimedia.org/wiki/File:One_Midtown_ATL.jpg) |
| **Parking deck** | Open horizontal slots between pale spandrels, with a column every 8.5–9.5 m. At night the slots glow dim and warm. | 8.5 or 9.5 m × 3.1 m | [Edgewood Peachtree Center garage](https://commons.wikimedia.org/wiki/File:Edgewood_Peachtree_Center_Parking_Garage.JPG) |
| **Low commercial** | A storefront and sign band 4.4 m tall at the street. Above it, a blank upper wall or a sparse window row, with a coping line. | 3.2 m bays | [Edgewood Avenue](https://commons.wikimedia.org/wiki/File:Atlanta_Streetcar_on_a_mid-morning_run_heading_east_on_Edgewood_Avenue.jpg) |
| **Glass tower** | A curtain-wall grid in a docs/glass-palette.md family (clear, blue, green-tint), on a recessed lobby with a tall crown band. Kept a minority: about 10–30 % of towers, more in Midtown. | 1.5 m × 3.9 m | [1010 Midtown](https://commons.wikimedia.org/wiki/File:1010_Midtown,_Midtown_Atlanta_GA.jpg) |

**Estimated, not photo-measured:** floor heights, bay widths, cornice projections and the inset
depths. They are typical values for the type, chosen to read at 400–600 m.

**Night:** each archetype has its own lit share: offices about 30–36 %, homes 45 %, lobbies and
shopfronts 75–80 %, and decks fully lit at a quarter level. The night photos referenced in the
skins docs show the same pattern: dark offices, lit residential towers and glowing deck slots.
This prototype has no archetype-specific night photo check yet.

## Assignment

Assignment is deterministic. It uses the id, class, drawn height, footprint area and
compactness, and district (Midtown is north of scene z ≈ −1700). Each building draws from its
own stream, seeded `id + ':v2'`, so neighbours differ and a building looks the same on every
load. World's legacy stream is untouched, so rooftop clutter does not move.

- `parking` and `garage` up to 36 m become decks. Taller "parking" polygons carry a neighbour's
  height, so they fall through to the office rules.
- Under 12 m: shops on commercial classes, otherwise brick, shop or precast.
- Homes, hotels and dorms: mostly residential, plus brick when low and some glass in Midtown.
- Campus and civic buildings: precast, brick or limestone.
- Offices by height: brick, limestone and precast at mid-rise; precast and banded at 30–110 m;
  banded and glass above that.
- Left on the legacy styles: anything with a finish (houses, skins, Woodruff shopfronts), and
  small or special classes (roof, shed, shelter, church, stadium and similar).

## Render budget

- **Program:** no new program. The shader branch for styles 20–55 is always compiled, so the
  program source is the same with the flag on or off.
- **Attributes:** none new. `aStyle` stays a small integer, so the far-house Int8 compaction
  still applies. `aBase` (the storey origin) is now set per vertex.
- **Draws:** unchanged. Everything stays in the one generic building mesh.
- **Geometry:** each outer edge of a v2 building is 1 quad (legacy), 3 quads (base, shaft and
  cap), 4 with an inset base and soffit, or 6 with a cornice. Measured numbers are in the PR.
- **Glass:** near-neutral bases inside docs/glass-palette.md (the punched glass is V 45–49 at
  S ≤ 10). Measured rendered values are in the PR.

## Code

- `web/src/vignette/generic-v2.ts`: the flag, archetype table, assignment and ring offset.
- `web/src/vignette/generic-v2-glsl.ts`: the facade patterns.
- `web/src/vignette/world.ts`: `appendGenericWalls`, and the shader branch.
