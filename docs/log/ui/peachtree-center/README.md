# Four office towers around the Peachtree Center promenade

From Peachtree Street, the two narrow ends of North and South frame the promenade. Farther east, Harris and International have an extra slab each. All four use the same exposed-aggregate concrete panels, narrow vertical windows and dark joints. Portman's view down the block shows the staggered ends particularly well. The oblique view from across the block shows where the wings step below the spine. A close street photograph of South shows how far the panel edges project past the glazing. [Portman, end elevations](https://portmanarchitects.com/wp-content/uploads/2019/03/Slider10-28.jpg) · [Portman, oblique skyline](https://portmanarchitects.com/wp-content/uploads/2019/03/New_Slider02-16.jpg) · [South from the street, Wally Gobetz](https://www.flickr.com/photos/wallyg/9178127814)

The historic-district survey identifies two mirror pairs. North and South have two east–west slabs and a long promenade balcony. Their shorter, outward-facing slabs carry groups of eight and three square openings. Harris and International have three slabs with four-story projecting balconies, one high on the street side and one lower on the promenade. The architectural family extends to 230 Peachtree and the later Marquis offices. This City treatment covers the four promenade footprints only. Hyatt's hotel wing also bears the name International Tower. The office modeled here is the former Cain Tower, south of the promenade. [Georgia historic-district survey, printed pp. 31–38 and integrity inventory](https://gadnr.org/sites/default/files/hpd/pdf/Peachtree%20Center%20HD%20Final%204-24-17.pdf)

## Footprints, floors and roofs

Each ID below belongs to an individual building in the downtown Overture bake. The footprint register, both directions of the outline check, the area check and valid terrain samples determine eligibility per tower. A changed or missing tower can fall back independently of its twin. The Hub, garages, Hyatt/Polaris, 191 Peachtree, Ritz-Carlton, Marriott Marquis and Marquis One/Two all retain their existing City treatments. [Overture building footprints](https://docs.overturemaps.org/guides/buildings/)

| Office | Overture footprint ID | Approx. plan | 2018 returns inside ring | Wing deck / high roof well / top rim, m NAVD88 |
| --- | --- | --- | ---: | --- |
| North (Atlanta Gas Light) | `2fcbd70e-1d1d-4690-9092-191ba41c54be` | 73 × 21 m, high slab to south | 5,813 | 405.5 / 413.8 / 417.7 |
| South | `c934a398-eff1-4ede-98ba-ffc5045f9949` | 73 × 21 m, high slab to north | 5,758 | 405.5 / 413.8 / 417.7 |
| Harris | `1bc229b3-76a6-4e34-abf0-ff9cf0d5b6d3` | 57 × 31 m, high middle slab | 12,600 | 419.2 / 426.1 / 431.5 |
| International (Cain) | `d1108a48-5c60-4872-b593-fb4444f84440` | 57 × 31 m, high middle slab | 13,008 | 419.3 / 426.1 / 431.5 |

The source is the USGS Georgia Statewide B2 2018 point cloud, EPT depths 7–10. I projected the horizontal returns into City metres around 33.7539° N, 84.3916° W, clipped them to each baked polygon, then sampled 2 m strips across the slabs. The lower rims cluster near 407.3 m and 421.1 m. Equipment inside the raised spines clusters near 416.6 m and 430.2 m. The model shares representative elevations between twins and samples the sloping bare-earth grid for each foundation. Equipment outlines, fin depth, balcony projection, lobby height, glazing proportions and finishes are estimates. [USGS point-cloud metadata](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)

The district survey gives 27 stories for North/South and describes Harris and International as 30-floor twins. The Council on Tall Buildings and Urban Habitat lists 31 for Harris and 30 for International, as does the bake. A 2007 lending filing counts 24 stories for each western office building and 27 for each eastern one. It accounts for portions of their ground floors in the mall. We use the latter counts for the estimated office-window rhythm on the high slabs and the measured roof elevations for their heights. The records do not establish how every source counted podium or mechanical levels. [Historic-district survey](https://gadnr.org/sites/default/files/hpd/pdf/Peachtree%20Center%20HD%20Final%204-24-17.pdf) · [CTBUH Harris](https://www.skyscrapercenter.com/building/harris-tower/11115) · [CTBUH International](https://www.skyscrapercenter.com/building/peachtree-center-international-tower/16698) · [SEC filing, “4-PACK”](https://www.sec.gov/Archives/edgar/data/1389033/000095013607000864/file1.htm)

## After dark

The leasing photographs on pages 2 and 4 look along the plaza and across its Peachtree Street entrance. They show blue-white light suspended over the promenade, brighter glass storefronts at grade, and individual lit windows among dark offices. The suspended installation belongs to the plaza. The photographs do not resolve every upper elevation or establish a crown-lighting scheme for Harris or International. City uses dark roof screens and a repeatable illustrative selection of warm window lights. [Transwestern photographs, pp. 2 and 4](https://s3.amazonaws.com/transwestern-property/Flyers/286335fd-4817-ee11-8f6e-000d3a3739c1/peachtree-center-brochure.pdf#page=2) · [Plaza lighting design](https://aiaga.org/design-award/the-hub-at-peachtree-center/)

## Reproduce the City views

Desktop Orca, 1200 × 850, high quality, paused June 21, 2026 at 10:30 and 23:00 EDT. Use `/?view=city&q=high&t=2026-06-21T10:30:00-04:00&speed=0` and `__city.lookAt(x,z,{bearing,tilt,metresPerPixel})` in a development build. Before frames use commit `7a6723a` and the same downtown bake.

| Camera | Target (x, z) | Bearing / tilt / m per pixel | Daylight | Full night |
| --- | --- | --- | --- | --- |
| Looking northwest across the promenade | (456, −750) | 310° / 48° / 0.295 | [Before](promenade-day-before.jpg) · [After](promenade-day-after.jpg) | [Before](promenade-night-before.jpg) · [After](promenade-night-after.jpg) |
| From the Baker Street side | (435, −685) | 205° / 38° / 0.32 | [Before](baker-day-before.jpg) · [After](baker-day-after.jpg) | [Before](baker-night-before.jpg) · [After](baker-night-after.jpg) |

The four towers share two 256 × 256 RGBA textures for precast, glass and window emission. The City web bundle needs a rebuild and deployment. It consumes the existing scene data.
