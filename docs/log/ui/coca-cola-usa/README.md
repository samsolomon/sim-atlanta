# Coca-Cola USA Building

The Coca-Cola USA Building (Heery International, 1987; 20 storeys; [Enclos](https://enclos.com/project/coca-cola-usa-building) lists 216 ft) stands on the Coca-Cola North Avenue campus, west of One Coca-Cola Plaza. It replaces the mapped outline `osm:way:536718218`, about 36 × 102 m with a notched northwest corner and mapped at 78.3 m.

## Heights from the lidar

These come from the 22 April 2019 3DEP returns, sampled on a 4 × 6 m grid across the footprint.

- The roof deck is a flat 382.1 m NAVD88, inside a parapet ring at 383.2 m.
- A long penthouse at 388.8 m covers x −584 to −570 and z −1849 to −1794.
- The west edge and the notch return 297–316 m. That is the low ground and the plaza the tower stands on.

Enclos's 216 ft (66 m) is measured from the plaza at about 316 m: 316 + 66 = 382. The lidar's 85 m "roof height" is measured from the low west grade at 297 m. The two agree.

The model therefore uses absolute heights:
- a granite plinth from grade to the plaza;
- the lobby to 322.5 m;
- 15 glass floors at about 3.9 m;
- a 4.2 m granite frieze to the 383.2 m parapet;
- the 388.8 m penthouse.

The 1.1 m deck recess inside the parapet is not modelled.

## References

- The [Enclos project page and aerial photograph](https://enclos.com/project/coca-cola-usa-building) are the primary reference, and cover both towers. The USA Building is a dark slate-glass curtain wall in a red-brown granite grid, with a deep plain band under the roof and a long penthouse. One Coca-Cola Plaza stands beside it.
- The [Wikimedia Commons Coca-Cola headquarters category](https://commons.wikimedia.org/wiki/Category:Coca-Cola_headquarters) gives the campus context.
- The second angle is the campus seen from the Guggenheim side, used for #402.

## Not drawn

The red script sign and any wordmarks are logos. The frieze stays plain.

## Glass

The glass base is `#a2aeb6` (S11 V71) and the granite is `#a07a66`. The first glass value, `#74838e`, rendered too dark.

At 11:30, high tier, camera `-582,-1817,280,62,330`, the sunlit east-face panes render about H205 S16 V43 ([frame](glass-sample.jpg)).

## Lighting

There is no full-night exterior photograph, so that gap is recorded here. The night look follows the office-tower rule: about 6% of panes lit, from skin-kit `litFacade`, and a lit lobby at plaza level. The crown and penthouse stay dark.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| Campus, looking west-southwest | `-520,-1840,250,50,620` | 11:30 AM EST | [Day](day.jpg) |
| Same | `-520,-1840,250,50,620` | 11:30 PM EST | [Night](night.jpg) |
| East face, looking west | `-582,-1817,280,62,330` | 11:30 AM EST | [East](east.jpg) |
| Same | `-582,-1817,280,62,330` | 11:30 PM EST | [East at night](east-night.jpg) |
| Frieze and penthouse (close) | `-582,-1817,300,45,180` | 11:30 AM EST | [Crown](crown.jpg) |

The bearing is the camera's heading. Use `/?view=city&cam=<camera>&t=2026-11-20T<clock>`. The close view adds `&dev&mindist=20`.
