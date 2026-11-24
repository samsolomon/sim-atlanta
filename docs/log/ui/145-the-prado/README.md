# 145 The Prado NE

The cream block near the top of the round-two tree comparison projects to OSM way `269539876`. The way carries both the house number and the house tag. Its irregular footprint covers 469.4 m², above the 450 m² limit for generated house roofs. That left it with the generic building finish. Four rays through the lower gold patch in the 411 × 891 review view hit City’s tree mesh first. [OSM footprint](https://www.openstreetmap.org/way/269539876) · [Original round-two sheet](https://github.com/samsolomon/sim-atlanta/blob/0937b971/docs/log/ui/tree-species/round-two/prado-day.jpg).

The National Register survey identifies a 1905 wood-frame Craftsman with a low side-gabled roof, shingled front porch gable, square posts on masonry bases and an attached porte-cochère. Fulton County’s assessment identifies the same parcel as residential and shows its aerial footprint. The survey describes the street elevation as one and a half stories; the assessor counts two. [Historic district registration, page 11](https://npgallery.nps.gov/GetAsset/7822f21b-4939-49dd-ae0e-70970bce6081) · [County assessor’s parcel review](https://fultonassessor.org/wp-content/uploads/sites/16/2021/02/12-02-21-BOA-Meeting-Packet.pdf).

The frontal April 2014 panorama shows a dark porch gable, a three-part upper window, pale fascia and a driveway passing beneath the side roof. The February 2022 oblique view from near 147 confirms the gable’s projection toward the street. No reliable night exterior was found. The model uses City’s ambient lighting and adds no exterior fixture. [Frontal Street View](https://www.google.com/maps/@?api=1&map_action=pano&pano=BhZzxEILZCCNEOiXs86iPg&heading=90&pitch=0) · [Oblique Street View](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79394,-84.37864&heading=142&pitch=0).

The outline supplies the 16.6 m front and the stepped rear extent of roughly 32 m. The model sets the porch floor from the front grade. The 3.1 m porch depth, 4.45 m wall height above that floor and 2.45 m main roof rise are estimates. A single side gable spans the stepped main body. The front gable shelters five lower sashes, the offset door and four entry steps. The drive-through bay has two outer posts and a shallow shed roof. The photos did not establish a chimney. Window spacing and asphalt and siding values are illustrative.

| View | Camera | Clock |
| --- | --- | --- |
| [Matched day](day.jpg) | `1194,-4352,20,50,420`, low | 2026-11-20 14:00 ET |
| [Matched night](night.jpg) | `1194,-4352,20,50,420`, low | 2026-11-20 23:00 ET |
| [Porch and side bay](porch.jpg) | `1231,-4427,58,58,73`, high, dev close orbit | 2026-11-20 14:00 ET |
| [Frontage from the April 2014 panorama location](pano.jpg) | Dev camera eye at x 1205.5, z −4420.3, 2.5 m above grade. Target x 1229, z −4427.2, 0.8 m above eye. Vertical FOV 36°, near 0.1 m. | High, 14:00 ET |
| [Front porch in City](street-facing.jpg) | `1232,-4427,90,83,42`, high, dev close orbit | 14:00 ET |
| [76 Park Lane NE, 510 m²](park-lane.jpg) | `1502,-4522,40,45,120`, low | 14:00 ET |
| [1 Ansley Drive NE, 547 m²](ansley-drive.jpg) | `1150,-4655,25,45,155`, low | 14:00 ET |
| [903 Peachtree, 31 storeys](tower.jpg) | `732,-2823,45,50,340`, low | 14:00 ET |

## Board-wide footprint audit

Across the 12 staged boards, 161 footprints over 450 m² carry one of the three explicit residential tags. Mapped residential land use contains 399. The groups overlap at 118 footprints, giving 442 distinct footprint records. The land-use join uses an interior point, respects polygon holes, and counts clipped pieces as staged. Run `.venv/bin/python pipeline/scripts/residential_landuse.py` against the staged board to regenerate the lookup and totals.

| Category over 450 m² | Footprints | General house finish | Bespoke Prado | Prior treatment retained |
| --- | ---: | ---: | ---: | ---: |
| Tagged house | 105 | 83 | 1 | 21 |
| Tagged detached | 3 | 1 | 0 | 2 |
| Tagged residential | 53 | 0 | 0 | 53 |
| Residential land use only | 281 | 0 | 0 | 281 |

Footprints over 1,000 m² retain their existing geometry even when tagged as a house. This protects compact multi-unit blocks where a courtyard or elongated shape would give no warning. Specific house tags take precedence over the old area cutoff. In the broader residential and land-use categories, mapped levels or height must establish a low building. Separate apartment tags, named blocks, mapped parts, courtyards, seam fragments and large slab-like forms keep their earlier massing. The Castle retains its existing finish and recorded retail use. The table counts generic eligibility before any existing landmark override. The 31-storey 903 Peachtree keeps its flat roof and tower façade. General house roof rise is limited to half the eave height on the newly eligible large footprints. Where overall height is reported, two thirds or more remain in the wall.
