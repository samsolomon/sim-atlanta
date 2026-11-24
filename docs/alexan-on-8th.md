# Alexan on 8th

`osm:way:789975430`, 880 West Peachtree Street. This 22-storey apartment tower was designed by Rule Joy Trammell + Rubio for Trammell Crow Residential and built by Brasfield & Gorrie. Residents moved in in January 2019. City code: `web/src/city/midtown-skyline-alexan.ts`. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- [RJTR](https://rjtrdesign.com/alexan-on-8th/): 22 storeys, 355 units, retail and a 535-space deck. [Kawneer](https://www.kawneer.com/projects/multi-family/alexan-on-8th/): the curtain wall. [Patch, 2014](https://patch.com/georgia/midtown/developer-seeks-demolish-880-west-peachtree-building-build-apartments-site-0): the proposal.
- Photographs (all from RJTR): two dusk exteriors, [the street corner](https://rjtrdesign.com/wp-content/uploads/2023/06/ALEXAN-RWH2207_8_9.jpg) and [the tower](https://rjtrdesign.com/wp-content/uploads/2023/06/ALEXAN-_RWH2222_3_4_EditedJY-scaled.jpg), plus [the pool deck by day](https://rjtrdesign.com/wp-content/uploads/2023/06/ALEXAN-_RWH2375_6_7.jpg). The developer's daytime rendering shows the top band and the deck. I found no daytime photograph of the whole tower and no full-night photograph.
- Height: 3DEP lidar (2019-04-22), flown three months after occupancy. Both legs of the L reach 74.5 m at the 95th percentile and 75–76.7 m at the maximum. The mapped 96 m is 29% too high. The lot west of the tower reads 26 m: that is the covered deck, a separate mapped building.

## What City draws

The frame uses City axes, with the origin at the footprint centre (City 361.5, −2800). City draws the mapped L at a 74.5 m roof.

- **Walls:** tan panels (`#c6ad8e`) with a panel spandrel at each of 21 upper floors over a 7 m street base, and thin white vertical strips about every 6.4 m.
- **Windows:** punched blue-green windows on a 3.2 m bay. Glass base `#4f7178`, S 34% V 47%.
- **Balconies:** stacks 6.5 m wide at each end of the long faces, with a charcoal slab edge and a glass rail on every floor.
- **Glass slot:** a full-height curtain wall, 4.4 m wide, centred on the West Peachtree face. Glass `#6a8f98`, S 31% V 60%.
- **Base:** two storeys of storefront and lobby glass at the street.
- **Top:** a white band and a dark canopy edge.

The bay widths, balcony positions and slot width are estimated from the photographs.

## Night

City lights 35% of apartments and 40% of storefronts, chosen per window by skin-kit's `litHash(seedOf(id), face, floor, bay)`. With no night photograph, City adds no crown or deck lighting.

## Captures

| View | Camera | Image |
|---|---|---|
| From the east-north-east, before and after, 11:30 | `cam=372,-2800,250,58,450` | [compare-day.jpg](log/ui/alexan-on-8th/compare-day.jpg) |
| Same, 23:30 | same | [compare-night.jpg](log/ui/alexan-on-8th/compare-night.jpg) |
| South-west three-quarter view | `cam=372,-2800,40,52,380` | [southwest-day.jpg](log/ui/alexan-on-8th/southwest-day.jpg) |
