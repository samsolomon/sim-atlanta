# The Commons at Imperial Hotel

The Imperial Hotel is a 1910 brick hotel at 355 Peachtree Street NE, designed by Edward E. Dougherty and listed on the National Register in 1983. Since its 2014 renovation it has been The Commons at Imperial Hotel, supportive housing.

City draws it from the downtown site `6f11e54d-90fa-4264-bc3d-771704366472`, which is on the downtown board only (`web/public/data/scene/downtown/vignette.json`). It is mounted in `city/city.ts` and listed in the downtown batch list. The site has three mapped parts: the block, a stair and lift penthouse, and a one-storey strip on Peachtree.

## Heights: lidar, not the mapped 36.5 m

The 22 April 2019 3DEP lidar shows no phantom tower here, but it does show the building lower than mapped. City uses these heights:

| Mass | Lidar, NAVD88 | City |
|---|---|---|
| Main roof (both blocks) | 342.0–345.1 over a 312–313 m street | 344.5 m (about 32 m) |
| Stair and lift penthouse (the inner mapped part) | 346.2–346.3 | 346.3 m |
| Peachtree arcade (the west strip, x 537–541) | 318–320, with trees | 5 m over the street |

City z grows to the south. So the side with the 3.5 m step is the north side, on Ralph McGill Boulevard, and the straight long side faces south toward Sacred Heart.

## Sources

All of these are Commons photos, cited only:

- [Imperial Hotel, Atlanta, GA (32532279707)](https://commons.wikimedia.org/wiki/File:Imperial_Hotel,_Atlanta,_GA_(32532279707).jpg) and [(47474217071)](https://commons.wikimedia.org/wiki/File:Imperial_Hotel,_Atlanta,_GA_(47474217071).jpg), 2019. The Peachtree front: brown-red brick, paired windows, an ornamented brick cornice band, iron balconies at the third and eighth floors, and a one-storey brick arcade of arches with stone caps.
- [Commons at Imperial Hotel main entrance](https://commons.wikimedia.org/wiki/File:Commons_at_Imperial_Hotel_main_entrance.jpg). The arcade up close.
- [Imperial Hotel in Atlanta, GA](https://commons.wikimedia.org/wiki/File:Imperial_Hotel_in_Atlanta,_GA.jpg), [Imperial Hotel Atlanta](https://commons.wikimedia.org/wiki/File:Imperial_Hotel_Atlanta.jpg), and [Atlanta Imperial Hotel 2012 09 15 05](https://commons.wikimedia.org/wiki/File:Atlanta_Imperial_Hotel_2012_09_15_05_6056.JPG). The Ralph McGill side: white bay-window stacks from the third floor to the top, four on the eastern part and two on the western block, which steps forward under its own cornice.
- [Imperial Hotel viewed from the corner of Courtland and Ralph McGill, June 2015](https://commons.wikimedia.org/wiki/File:Imperial_Hotel_viewed_from_the_corner_of_Courtland_and_Ralph_McGill,_June_2015.jpg). The east end after the renovation, red with tan bands; it was plain painted red in 2012. This is the second angle.
- Photo medians, sunlit: Peachtree brick #77696d to #a78572; north brick in shade #4c2620; bays #dde5ea; east tan #bfa293 and red #c38072.

## What the model follows

| Element | City |
|---|---|
| Block | Brown-red brick (`#7c4c42`), a tall ground floor and nine floors above it, punched windows (one band per floor behind brick piers), and a dark cornice band under the parapet. |
| Ralph McGill (north) | Six white canted bay stacks from the third floor to the top: two on the 13.7 m western face and four on the 25.3 m eastern face, about 3.6 m wide and 0.85 m deep. The ground floor has tall windows. |
| Peachtree (west) | Iron balconies under the third- and eighth-floor windows. A one-storey brick arcade on the mapped strip has five arches across its whole front (mapped as two edges, drawn as one), with stone caps and lit doors behind. |
| East end | Red with a tan band at each floor's window height, with single windows set in the tan (the post-2014 look). |
| Roof | The brick stair and lift penthouse, at the lidar's 346.3 m. |

**Estimated:**
- floor pitch and bay width;
- the bays' depth, width and canting;
- the arcade's height and arch count;
- the south face, which sits behind Sacred Heart and was not photographed: plain brick with punched windows.

**Not drawn:** the rooftop "IMPERIAL HOTEL" letters, because they are a name sign.

## Night

No night photograph was found; Commons and a web search for Flickr turned up none. That is recorded as a gap. As housing, it is noticeably lit: about a third of homes, as illustrative occupancy. The arcade doors and the Ralph McGill ground floor glow too.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From the north-east, over Courtland and Ralph McGill (money shot) | `558,-1127,225,50,330` | 11:30 AM / 11:30 PM | [Day](day-before-after.jpg) · [Night](night-before-after.jpg) |
| Close, from the north-east | `558,-1127,225,50,330` with `&dev`, then `__setView(225, 60, 150, 558, -1127, 1)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Four sides at 300 m, labelled by the face shown, skin outlined | `node scripts/four-side-sheet.mjs --id 6f11e54d-90fa-4264-bc3d-771704366472 --ground 312.5 --top 34 --dist 300` | 11:30 AM | [Sheet](imperial-hotel-four-sides.jpg) |
| Arcade, close from Peachtree | `__setView(90, 70, 70, 545, -1129, 1)` with `&dev&mindist=20` | 11:30 AM | [Close](arcade-close.jpg) |
| Low tier | `558,-1127,225,50,330` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

The usual spec starting cam (`558,-1127,32,60,420`) looks at the hotel through the tower beside it, so it isn't shown.

## Budget and checks

- Downtown is outside `skin-footprint.test.ts`, so the unit test runs the same check on the mapped site: nothing past the outline plus the default 2.5 m (the bays project 0.85 m, the balconies 0.45 m), nothing above or below its limits, and no detached parts.
- Coplanar layers stand 4 cm apart or more. A throwaway point-to-plane check found no pair under 3 cm; the shared check is being added to the footprint audit separately.
- At about 1,230 triangles the skin is well under the ceiling.
