# Crowne Plaza Atlanta Midtown

`osm:way:234939892`, 590 West Peachtree Street NW. Code: `web/src/city/crowne-plaza-midtown.ts`.

The footprint was unnamed in the data. OSM tags it 590 West Peachtree, with 4 levels and a height of 98 m. That address is the Crowne Plaza Atlanta Midtown, a 1972 hotel dual-branded with Staybridge Suites ([Explore Georgia](https://www.exploregeorgia.org/atlanta/places-to-stay/hotels-motels/crowne-plaza-atlanta-midtown), [Discover Atlanta](https://discoveratlanta.com/partner/crowne-plaza-atlanta-midtown)). It stands just south of One Georgia Center. Brand signs are left out.

## Sources

| What | Source |
|---|---|
| Street level, Dec 2025: white slab, blank white east end on West Peachtree, white pier-and-slab grid over recessed dark windows on the long north face, low white podium with a dark band | [Street View from West Peachtree, looking south-southwest](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77070,-84.38745&heading=200&pitch=30&fov=100) (viewed in an Orca tab, not copied) |
| Second angle, from Spring Street | [Street View, looking south-southeast](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77070,-84.38880&heading=150&pitch=30&fov=100) |
| Name, date (1972) and dual brand | listings above |

**Gap:** no night photograph. Night is drawn from the building type, as a hotel.

## Heights

From the April 2019 3DEP lidar, above the 303.2 m NAVD88 ground ring:

| Part | Mapped | Lidar | Model |
|---|---|---|---|
| Slab, `osm:way:1456370858` | 98 m | median 81.2, p95 82.4 | 81.2, plus a 1.2 m white parapet and rooftop plant |
| Podium, `osm:way:1456370857` | 15.7 m | median 17.1 | 17.1 |

The mapped 98 m overstated the slab by 17 m.

## Estimates

- **Floors:** 3.2 m each, from the podium roof to the parapet (19 floors).
- **Piers:** about 3.8 m apart on the long faces, standing 0.45 m off the glass, with a white floor slab at each floor.
- **Ends:** the east and west ends and the short sides of the north-face jog are blank white walls, as the Street View end wall shows.
- **Podium:** white panels over a storefront band, with one upper ribbon window where the podium is tall enough. Each wall follows its own street grade.
- **Materials:** flat vertex colours, because of the shader program budget.

### Rendered-pixel check

Taken at 11:30, high tier, from close cameras. Medians are over glass-hued pixels only.

| Patch | Camera | S | V |
|---|---|---|---|
| Sunlit north face | `300,-1814,20,66,200` | 8 | 47 |
| Shaded face | `310,-1840,190,70,220` | 59 | 25 |
| One Georgia Center in shade, same frame | `310,-1840,190,70,220` | 34 | 33 |

The base glass is `#87949a` (S 0.13, V 0.60). A first base of `#6d7d86` rendered sunlit at V 42 and shaded at S 91, so it was raised. The sunlit reading passes (S ≤ 36, V ≥ 40). The shaded reading is advisory: it is deep shade between the white piers.

## Lighting

About 30% of rooms are lit at 23:30, chosen with the shared `litHash`. There is no façade lighting. Everything is `illustrative`.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| North-east, day / night / low tier (money shot) | `310,-1814,20,64,420` | 11:30 / 23:30 / 11:30 `&q=low` |
| South face | `310,-1814,200,64,420` | 11:30 |
| North face (close) | `300,-1814,20,66,200` with `&dev&mindist=20` | 11:30 |
