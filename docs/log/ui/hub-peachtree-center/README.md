# The Hub at Peachtree Center

Overture `ec83a792-f5f6-446e-9424-26858da5640e`, on the downtown board. It is the former Mall at Peachtree Center, renovated in 2017–2019 by The Beck Group for Banyan Street Capital. The low block closes the east end of the Peachtree Center plaza, between the Harris tower to the north and the International tower to the south, with Peachtree Center Avenue behind it. Skin: `web/src/city/hub-peachtree-center.ts`, mounted in `city.ts` after Peachtree Center and added to the `listed` array.

## Height (lidar)

The 22 April 2019 3DEP returns give a ground ring at 316.3 m NAVD88 and a flat roof at a median of 29.9 m (p95 30.1, max 32.4), against a mapped 32.6 m. There is no hidden tower in the footprint. The model's roof is 29.9 m.

## Photos and identifiers (confirmed by the skyline lead)

| Feature | Evidence |
|---|---|
| The whole roof painted in flowing white and pale-blue waves | [Google satellite, 2026](https://www.google.com/maps/@33.76040,-84.38640,60m/data=!3m1!1e3) |
| Peachtree Center Avenue face: a grey-and-white mural with yellow arcs over the upper floors, a ribbon window band through it, a glazed band under the roof, and a dark base with one red storefront | [Street View, December 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.76045,-84.38598&heading=268&pitch=38&fov=110) |
| Plaza face: a gridded glass atrium front with white mullions over glass storefronts | [AIA Georgia 2020 entry, Beck Group photo](https://storage.googleapis.com/hu6g4al9cdte0xah/sites/8/2020/02/01_PtreeCtr_Plaza.jpg) |

The mural is drawn as abstract grey and white patches with two yellow arcs, not the portrait it shows.

**Night:** the [AIA plaza lighting photo](https://storage.googleapis.com/hu6g4al9cdte0xah/sites/8/2020/02/07_PtreeCtr_PlazaLighting.jpg) shows the atrium lit from inside. In City, about a third of the atrium bays are lit at 23:30, and the mural side stays dark (retail closed). The night lighting is `illustrative`.

## Estimated

- Mural patch size (about 5.5 m), the ribbon band at 13–15 m, the glazed top band, and the arc positions: from the December 2025 photo, by eye.
- The roof waves: six bands, swept north-west to south-east, approximating the satellite pattern rather than copying it.
- Atrium bays at 3 m and storeys at about 4.5 m.

## Later note (for whoever owns the Peachtree Center landmark)

The plaza's signature at night is a suspended canopy of linear white LED tubes strung between the towers ([AIA photo](https://storage.googleapis.com/hu6g4al9cdte0xah/sites/8/2020/02/07_PtreeCtr_PlazaLighting.jpg)). It hangs over the plaza, outside The Hub's footprint, so this skin leaves it out.

## Captures

| View | Camera |
|---|---|
| [Before and after](compare.jpg), 11:30 and 23:30 | `484,-716,240,52,420` |
| [Mural close](close-day.jpg) | `500,-716,270,62,160` with `&dev&mindist=20` |
| [Low tier](low-day.jpg) | `484,-716,240,52,420` `&q=low` |
| [Plaza front at night](plaza-night.jpg) | `440,-717,90,45,260` at 23:30 |
| [Four sides](hub-peachtree-center-four-sides.jpg) | `scripts/four-side-sheet.mjs`, 400 m. The north and south walls are party walls hidden by the towers. |
