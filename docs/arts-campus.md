# Woodruff Arts Center and High Museum of Art

The 126-vertex High Museum footprint connects several wings. The Stent wing faces Peachtree with a quarter-round glazed atrium, a radial skylight and the long diagonal entry ramp from Peachtree. The white Piano galleries face it across Sifly Piazza. The ground-level glazing, fine vertical panel joints and rows of roof scoops distinguish them from Meier's square-panelled galleries. The separate 68-vertex Memorial Arts Building footprint contains the long Peachtree colonnade and a higher performance volume toward Arts Center Way. The paved piazza follows local terrain. [High Museum footprint](https://www.openstreetmap.org/way/28961738) · [Memorial footprint](https://www.openstreetmap.org/way/28961767) · [Architect's campus description](https://www.rpbw.com/project/high-museum-expansion)

The landscape approach shows the scoop silhouette above the gallery walls. The elevated Peachtree angle resolves the radial skylight, the punched windows on the end wall and the two smaller projections beside the ramp head. The roof layout was checked against Esri World Imagery centred at City (560, −3965). [Architect's daylight photographs](https://www.lordaecksargent.com/portfolio/civic-cultural/high-museum) · [Elevated view of Stent](https://www.artsatl.org/rediscovering-atlantas-architecture-high-museum/) · [Aerial imagery service](https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer)

The historic night photograph of Memorial shows light in the lobby and on the tall piers beneath the cornice. The AJC night photograph of the High shows light beneath its rounded projection with much darker enamel above. The Peachtree account also describes light passing through the curved atrium. City lights the atrium, selected lobby bays and the ground-floor glazing. Colour, intensity and occupancy are illustrative. The historic photographs predate the expansion. [Memorial at night, Atlanta History Center](https://dlg.usg.edu/record/geh_athpc_1076) · [High at night, AJC archive](https://dlg.usg.edu/record/gsu_ajc_12088)

| Feature | Ground and height evidence |
|---|---|
| High Museum | 365 perimeter samples on the baked 5 m 3DEP grid span 287.8–295.6 m NAVD88. Piazza reference (515, −3967) is 294.1 m. The architect reports a 29.6 m building height for the museum expansion. The model estimates the tallest gallery parapet at 26.6 m above the plaza reference, its hoods at another 1.55 m, the Stent skylight apex at 26 m and the quadrant radius at 23 m. Roof subdivisions and skylight spacing are photographic estimates. The ramp's rise is inferred from the mapped stair; see below. |
| Memorial Arts Building | 226 perimeter samples span 292.2–295.8 m NAVD88. The Peachtree reference (642, −3948) is 294.1 m. The 55 × 80 m colonnaded roof, 19 m cornice, 27 m rear performance volume and 5.4 m pier spacing are inferred from the mapped outline and photographs. |

Ground ranges use bilinear samples at intervals of at most 2.5 m. In City each building takes its entrance height from the rendered terrain triangles for the selected quality and extends the foundation beneath its lowest perimeter. Both outlines require interior probes before a model can replace the generic shell. [Upper Midtown 3DEP source and grid](../pipeline/prototypes/square-board/midtown-upper/ground.json) · [Architect's published dimensions](https://www.fondazionerenzopiano.org/en/project/high-museum-of-art-expansion/)

The matched camera targets (565, −3965), bearing −101°, tilt 55°, at 0.33 m/px. Clear weather, November 20, 2026, 13:00 and 23:00 Eastern. [High day](log/ui/arts-campus/high-day.jpg) · [High night](log/ui/arts-campus/high-night.jpg) · [Low day](log/ui/arts-campus/low-day.jpg) · [Low night](log/ui/arts-campus/low-night.jpg)

## Meier revisions (November 23, 2026)

**Enamel panel grid.** Meier clad his volumes in square porcelain-enamel steel panels. City draws their joints as 0.1 m lines on every Meier volume: both Stent gallery bars, the rounded Peachtree projection and the smaller block beside the ramp. No published source gives the panel size, so the 1.5 m module is estimated from photographs against the Rodin plinth and the ramp rails. Piano's aluminium galleries keep their own fine vertical joints. [Meier front with ramp, 2020s](https://commons.wikimedia.org/wiki/File:High_Museum_of_Art,_Meier_Building.jpg) · [Peachtree lawn and atrium](https://commons.wikimedia.org/wiki/File:High_Museum_of_Art_in_Atlanta.jpg)

**Entry ramp.** The ramp runs diagonally from the Peachtree sidewalk to the entry terrace, not toward the north-east as before. Its line follows the mapped OSM footway from (625.1, −4010.5) to (577.2, −4017.0), 48.4 m long. The mapped stair (578.9, −4015.0) → (591.1, −4011.4) leaves the head landing and drops back to the lawn. Both ends of the ramp sit on 3DEP bare earth at about 290.4 m NAVD88. A 12.7 m stair at an ordinary pitch drops about 6 m, which puts the head landing at the model's 2.3 m entry terrace, 296.4 m. The ramp therefore rises about 6 m at an average 1:8. That figure is inferred and has no survey behind it. The deck is 2.6 m wide between solid white parapets 0.55 m tall, which carry pipe rails at 0.78 m and 1.05 m. Three white bollards stand at the foot. Width, rail heights and bollard count are photographic estimates. [Ramp from the Peachtree sidewalk](https://commons.wikimedia.org/wiki/File:High_Museum_of_Art_outside.jpg) · [Ramp centred, from across Peachtree](https://commons.wikimedia.org/wiki/File:10_The_High.jpg) · [OSM ramp footway](https://www.openstreetmap.org/#map=20/33.78996/-84.38520)

**Atrium.** The quarter-round atrium is now a white frame. Main mullions stand every 2.26 m with an intermediate mullion between, and white bands mark each floor, 0.8–0.9 m deep, with thin mid-floor transoms. Glass panes sit 0.45 m back behind the frame. The solid crown carries small square windows. At night the panes glow, as the Peachtree account describes. Mullion and band dimensions are photographic estimates.

**Ginkgo planting spot (for the tree agent; City models no tree here).** Trees Atlanta lists Atlanta's champion ginkgo at 33.789866, −84.384916, which is City (617.9, −3999.2). An OSM tree node sits 1.1 m away. The record gives 27.5 m height, 26.2 m spread and a 186 in circumference, about 1.5 m DBH. It stands on the Peachtree lawn south of the ramp, about 12 m south of the ramp centreline and about 10.7 m from its south parapet. It is not in Sifly Piazza. Rodin's *The Shade* stands to its west. A leaf-on Esri export puts the crown centre near (615, −4005), consistent with the record within the crown radius. My first pick, from leaf-off branch shadows, sat 4–5 m too far north. Nothing new in this change stands within 10 m of the trunk. [Champion tree service](https://services6.arcgis.com/BZn8g8tzu5WfMokL/arcgis/rest/services/TreeChampionData_2019/FeatureServer/0) · [Ginkgo and Rodin](https://commons.wikimedia.org/wiki/File:Ginkgo_tree_and_Rodin_at_the_Woodruff_Arts_Center.jpg)

**Sifly Piazza.** Paving is now 1.5 × 3 m white concrete slabs in three close tones, with dark 0.1 m joints, laid on the rendered terrain. The slab size is estimated from a ground-level photograph. OSM maps a 330 m² lawn inside the old paved outline, at local u −10…10, v −4…23. It stays grass behind a low white curb. Leaf-off imagery shows it tan, as it shows the dormant Peachtree lawn. A mapped stair leaves the piazza's north edge through the passage between Stent and the Piano wing, at local u −13.6, v −9.3 → −20.1. 3DEP confirms the fall, about 3 m over 11 m. Most of the stair lies under the skybridge and is hard to see from City's cameras. The café seating is described under People at Sifly Piazza below. Three benches face the lawn. Temporary installations such as the rope seating are left out. I found no reliable night photograph of the piazza, so City adds no piazza lighting. At night it reads by the Piano glazing and the Memorial lobby. Night coverage remains a gap. [Piazza paving and café seating](https://commons.wikimedia.org/wiki/File:Plaza_-_Flickr_-_hyku.jpg) · [OSM lawn and stair](https://www.openstreetmap.org/#map=20/33.78972/-84.38605)

| Matched camera in Five Points metres | High | Low |
|---|---|---|
| Ramp, cam=595,-4012,-45,55,150 | [Day](log/ui/arts-campus/ramp-high-day.jpg) · [Night](log/ui/arts-campus/ramp-high-night.jpg) | [Day](log/ui/arts-campus/ramp-low-day.jpg) · [Night](log/ui/arts-campus/ramp-low-night.jpg) |
| Atrium, cam=555,-4022,-40,62,150 | [Day](log/ui/arts-campus/atrium-high-day.jpg) · [Night](log/ui/arts-campus/atrium-high-night.jpg) | [Day](log/ui/arts-campus/atrium-low-day.jpg) · [Night](log/ui/arts-campus/atrium-low-night.jpg) |
| Sifly Piazza, cam=540,-3972,150,45,150 | [Day](log/ui/arts-campus/piazza-high-day.jpg) · [Night](log/ui/arts-campus/piazza-high-night.jpg) | [Day](log/ui/arts-campus/piazza-low-day.jpg) · [Night](log/ui/arts-campus/piazza-low-night.jpg) |

Both cameras use clear weather at 13:00 and 23:00 Eastern on November 20, 2026. The wide campus captures above were reshot with these changes. Web rebuild only.

## Woodruff rear: stage house and fly tower (November 23, 2026)

Sam's review found the back of the Memorial Arts Building blank, with plain boxes for the stage house and fly tower. The piazza-side photograph shows the rear skin. The stage house is white precast with vertical fins at a regular bay, horizontal panel joints and recessed slot windows high in the wall. The fly tower above is a plain jointed box. City now draws that skin on the exposed stage-house faces, including the short east return beside the auditorium: fins 0.6 m wide, 0.5 m proud and 4.2 m apart, joints every 2.4 m, and slot windows 1.2 × 2.2 m in alternate bays, all estimated from the photograph. The fly tower gets 3 m × 6 m panel joints and a coping. The aerial shows mechanical units on the roof, so two louvred screens stand on the stage-house roof. Their positions are illustrative. [Piazza side with the stage house and fly tower](https://commons.wikimedia.org/wiki/File:Woodruff_Arts_Center3.jpg) · [Peachtree side](https://commons.wikimedia.org/wiki/File:Woodruff_Arts_Center2.jpg)

**Service side (Street View, March 2025).** Sam approved Street View for this, and the panoramas settled the earlier gap:

- **Loading dock.** The Arts Center's loading dock is not on the Memorial Arts Building. It is the pair of drive-in openings off Arts Center Way, at the base of the Piano west pavilion inside the High's mapped footprint (1 Arts Center Way). The sign on the pier between them reads "LOADING [DOCK] … use intercom to call dock". Behind the openings are roll-up doors and a raised dock platform. City draws a stone-clad base on the mapped footprint edge, rising from the street to the podium top. In it are two dark openings about 5 × 4.5 m with a pier and sign panel between, at local v ≈ 56 and 62, which is about 501, −3896 in Five Points metres. Widths, heights and positions are estimated from the panorama at about 13 m range. [Arts Center Way, heading 73°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7889073,-84.3863136&heading=73&pitch=-3&fov=15) · [Wider view, heading 60°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7889073,-84.3863136&heading=60&pitch=8&fov=90)
- **15th Street face.** The Memorial's south face rises behind a surface parking lot off 15th Street. Its ribs are closer and slimmer than on the piazza side, at an estimated 1.4 m bay. A dark recessed ground loggia sits behind slender white piers about 2.7 m apart, and recessed balconied windows run high in the wall. An accessible ramp and stair with metal rails climb to a terrace at the west end. City now draws the ribs, loggia and balconies on that face. Bays and heights are estimated. [98 15th St, heading 0°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.788398,-84.385273&heading=0&pitch=10&fov=45) · [Along 15th St, heading 50°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.788398,-84.385273&heading=50&pitch=8&fov=70) · [87 15th St, heading 350°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7883983,-84.3848007&heading=350&pitch=12&fov=90)
- **Signage.** No signage band appears on either service face, so none is drawn. The only lettering is the dock sign.
- **Lighting.** The panoramas are daytime and show ceiling lights inside the dock. I found no night imagery of either face. At night City lights one small lamp over each dock opening and one balconied window in two on 15th Street. Both are illustrative, and the night-imagery gap remains.

The panoramas are cited, not copied. Web rebuild only.

| Matched camera in Five Points metres | High | Low |
|---|---|---|
| Loading dock, cam=500,-3897,70,62,150 (zoom 2.5) | [Day](log/ui/arts-campus/dock-high-day.jpg) · [Night](log/ui/arts-campus/dock-high-night.jpg) | [Day](log/ui/arts-campus/dock-low-day.jpg) · [Night](log/ui/arts-campus/dock-low-night.jpg) |
| 15th Street face, cam=585,-3870,10,38,150 (zoom 1.6) | [Day](log/ui/arts-campus/south15-high-day.jpg) · [Night](log/ui/arts-campus/south15-high-night.jpg) | [Day](log/ui/arts-campus/south15-low-day.jpg) · [Night](log/ui/arts-campus/south15-low-night.jpg) |

| Matched camera in Five Points metres | High | Low |
|---|---|---|
| Rear from Arts Center Way, cam=570,-3914,70,55,150 | [Day](log/ui/arts-campus/back-west-high-day.jpg) · [Night](log/ui/arts-campus/back-west-high-night.jpg) | [Day](log/ui/arts-campus/back-west-low-day.jpg) · [Night](log/ui/arts-campus/back-west-low-night.jpg) |
| Rear from the south, cam=570,-3914,0,55,170 | [Day](log/ui/arts-campus/back-south-high-day.jpg) · [Night](log/ui/arts-campus/back-south-high-night.jpg) | [Day](log/ui/arts-campus/back-south-low-day.jpg) · [Night](log/ui/arts-campus/back-south-low-night.jpg) |

## High entry plaza at the ramp head (November 23, 2026)

Sam saw a void from above where the ramp meets the museum. The notch between the atrium drum, the rounded projection and the smaller block lies outside the mapped footprint. City therefore showed the 3DEP lawn there, about 6 m below the 2.3 m entry level the ramp arrives at. A paved deck now fills the notch at entry level, bounded by the drum's glazing, both entry volumes and the ramp head, with white walls down to grade. Its outline follows the modelled volumes. The deck level matches the ramp landing, which is inferred from the mapped stair. Paving detail is plain, and the photographs do not resolve a joint pattern here. Web rebuild only.

| Matched camera in Five Points metres | High | Low |
|---|---|---|
| Entry, top-down, cam=577,-4017,0,5,150 | [Day](log/ui/arts-campus/entry-top-high-day.jpg) · [Night](log/ui/arts-campus/entry-top-high-night.jpg) | [Day](log/ui/arts-campus/entry-top-low-day.jpg) · [Night](log/ui/arts-campus/entry-top-low-night.jpg) |
| Entry, oblique, cam=580,-4016,-60,50,150 | [Day](log/ui/arts-campus/entry-high-day.jpg) · [Night](log/ui/arts-campus/entry-high-night.jpg) | [Day](log/ui/arts-campus/entry-low-day.jpg) · [Night](log/ui/arts-campus/entry-low-night.jpg) |

## The ginkgo lawn on Peachtree (Street View)

These notes record the landscaping around the champion ginkgo, now at City (607.2, −3998.6) by the lawn path's dead end, for the lawn and landscape builders. They come from Google Street View, which is cited here and not copied:
- [Peachtree, Dec 2025, heading 252°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78993,-84.38466&heading=252&pitch=12&fov=55)
- [The same spot, Nov 2019](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78993,-84.38466&heading=252&pitch=12&fov=70), using "See more dates"
- [South, from the café terrace, Sep 2024, heading 300°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78972,-84.38478&heading=300&pitch=10&fov=45)

| Element | What the photos show | Where (estimated) |
|---|---|---|
| Ginkgo bed | Raised mound of dark hardwood mulch, no grass, rising gently from the sidewalk to the trunk. The trunk forks low into several upright stems. | Centred on the trunk, about 12–14 m across |
| Sidewalk edge | Low curb or edging between the sidewalk and the bed. A black lamp post on the sidewalk in front of the bed. | Along Peachtree, x ≈ 630 |
| Shrubs | Low green shrub mass between the bed and the ramp, and along the ramp's south parapet toward the museum | North edge of the bed, z ≈ −4006 to −4010 |
| Entry ramp | White parapet rising west to the Stent wing, with steel handrails | Its centreline runs (625.1, −4010.5) to (577.2, −4017.0) |
| Peachtree steps | Wide granite steps with metal handrails, rising from the sidewalk to the piazza walk | (633.4, −3995.6) to (619.6, −3987.8), south of the bed |
| Lawn | Open grass west of the bed, rising toward the museum | Between the bed and *The Shade* |
| *The Shade* (Rodin) | Bronze on a dark stone pedestal on a round paved pad | (603.6, −4003.4) |
| Lawn path | Short footway from the steps' top that dead-ends in the grass near the bed | Ends at (607.5, −3997.4) |
| Other trees | An oak beside the steps, holding brown leaves in December, and glossy magnolias at the café to the south | Oak at about (619.5, −3990.5) |
| Dec 2025 only | Temporary construction fencing along the Peachtree sidewalk | Do not model |

The sizes and bed extents are estimates from the photographs. None of them is measured.

## Peachtree lawn landscaping (November 23, 2026)

This section builds on the Street View notes above and uses the parks agent's landscape primitives from #214, all in a single draw:
- **Mound bed:** a raised hardwood-mulch mound 13 m across round the champion ginkgo trunk at (612.5, −4001.2), with no flowers, as the photographs show.
- **Shrubs:** a loose row 1 m tall along the ramp's south parapet, 2.6 m off the ramp centreline, from near Peachtree toward the museum.
- **Steps:** the mapped granite steps from the Peachtree sidewalk to the piazza walk, 4 m wide, on the 3DEP ends at 291.0 and 292.5 m NAVD88.

Nothing within the ginkgo's 9 m crown stands more than 1.5 m above the lawn. The grass and the slope rising toward the museum come from the 3DEP terrain itself. The oak and the magnolias stay as generic canopy crowns, the lamp belongs to the street-light layer, and the ginkgo belongs to the tree agent. The Street View notes show no separate flower beds on this lawn, so none are added. The parks agent's 'manicured' GroundCover, a formal lawn with faint mow stripes, covers the whole OSM-mapped lawn, about 1,500 m². That outline already notches out the round Rodin pad, centred near (604.8, −3999.7). The turf is cut round the ginkgo mound and the Peachtree steps. Under the ramp the deck and its walls hide it, so the ramp needs no hole. Bed extents, shrub size and step width are photographic estimates. Planting colour is illustrative. Web rebuild only.

| Matched camera in Five Points metres | High | Low |
|---|---|---|
| Lawn, cam=612,-4002,-70,50,150 | [Day](log/ui/arts-campus/lawn-high-day.jpg) · [Night](log/ui/arts-campus/lawn-high-night.jpg) | [Day](log/ui/arts-campus/lawn-low-day.jpg) · [Night](log/ui/arts-campus/lawn-low-night.jpg) |

## People at Sifly Piazza

**Café grove (revised 2026-11-23 after Sam's review).** The first version set six
tables in a row against the Memorial's north wall, under the Woodruff shadow, where
they were hard to see at the usual orbit. The tables now stand where the photographs
and aerial put them: a gridded grove in the paved square, along the Woodruff wall at
the square's south-west edge, local u −48…−34.5, v 17…25. The leaf-on Esri aerial
shows the grove's tree canopy at about u −50…−28, v 16…30. Beside it, four pale
squares near u −33, v 10 look like open umbrellas. Photographs show a loose grid of
12–15 round pedestal tables with four chairs each, inside a low cable rail among
deciduous trees. City draws twelve tables in three rows of four. Each table has four
red-cushioned chairs, a warm pale top (`#f5ead4`) that stands out from the grey
paving, and an open cream umbrella at every other table.

- **Chairs.** The 2006–07 photographs show white wire chairs with red seat pads.
  Photographs from 2018 to 2023 show teal bistro chairs. City keeps the red chairs,
  which Sam liked and which read better against the paving. The teal era is
  recorded here.
- **Umbrellas.** In March 2023 they were furled, and in July 2024 they were open on
  weighted bases. A rainy December 2018 photograph shows none. I found no October
  or November photograph. Sam chose open (2026-11-24) because they read at his
  orbit. Setting `umbrellas: 'furled'` in `arts-campus.ts` restores the
  photo-faithful winter state.
- **Grove trees (added 2026-11-24).** Six deciduous trees stand around the table
  block, inside the canopy that the leaf-on aerial shows (local u −50…−28, v 16…30).
  They are City's generic low-poly broadleaves, 8 m tall with 5 m crowns
  (`SIFLY_GROVE` in `arts-campus.ts`), and draw generic in every tree mode. The
  photographs show 6–10 trees among the tables. A first version with eight 9 m trees
  among the tables hid the tables and umbrellas at Sam's 260 m orbit. These trees ring
  the block instead, so the café still reads at that distance. Each trunk stands at
  least 2.5 m from a table centre, clear of the chairs, and each crown starts about
  3.5 m up, above the 2.65 m umbrellas. Count, positions and size are illustrative.
  [260 m orbit](log/ui/arts-campus/grove-orbit.jpg) ·
  [close](log/ui/arts-campus/grove-close.jpg), by day, in July and at night.
- **Left out.** The cable rail is too thin to read at City distances.
- **Positions.** Exact table positions are illustrative.

Sources:
- [Plaza, 2006-03-28](https://commons.wikimedia.org/wiki/File:Plaza_-_Flickr_-_hyku.jpg)
- [Table 1280 patio, 2007](https://www.flickr.com/photos/abardis/696583449/)
- [Teal chairs, 2018-12-20](https://www.flickr.com/photos/doctorcasino/46599960995/)
- [Furled umbrellas, 2023-03-10](https://www.flickr.com/photos/9115672@N05/52743396909/)
- [Open umbrellas, 2024-07-14](https://www.flickr.com/photos/31673483@N00/53884854993/)
- [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9)

At lunch the high tier seats ten visitors around the grove. Eight walkers cross
the open square, skirt the grove, climb the entry ramp and follow the mapped
Peachtree lawn path. A test keeps every walker more than 1.3 m from each table.
The low tier shows the walkers and the furniture but no seated figures. The figures
use the existing City clothing palette and material. Visitor positions and
attendance carry the illustrative tier in the visitor data.

The scene uses Atlanta local time. Tuesday through Sunday, the 12:00–14:00 lunch
peak falls within the busier 10:00–17:00 museum period. A few visitors linger into
the evening. Monday daytime has one walker, and after 21:00 the museum crowd is
empty. Seated visitors scale with the crowd, from ten at lunch to none after close.
These are artistic estimates of activity. A fixed scene clock reproduces the same
visitor positions, looks and gait.

November 20, 2026, high tier:
- [Lunch](log/ui/high-visitors/lunch.jpg) and [full night](log/ui/high-visitors/night.jpg)
  use camera `565,-3965,-101,55,260` at 13:00 and 23:00 Eastern.
- [Before and after](log/ui/high-visitors/compare-lunch.jpg) and
  [furled or open umbrellas](log/ui/high-visitors/umbrella-options.jpg) use the
  same camera.
- [Café grove close-up](log/ui/high-visitors/tables.jpg) and the
  [furled-umbrella close-up](log/ui/high-visitors/tables-furled.jpg) use
  `520,-3955,-101,50,60` with `&dev&mindist=20`.
