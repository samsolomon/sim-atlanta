# Midtown skyline

## One Atlantic Center

The West Peachtree tower stands on a 52.2 × 51.9 m mapped footprint. The 3DEP grid gives 282.4 m NAVD88 at its centre and 281.6–283.1 m around the perimeter. City samples the rendered bare-earth triangles for the current quality tier and extends the foundation to the lowest sampled edge. The mapped 250 m architectural height includes the finial. These data describe terrain and total height. Finished floor elevations and intermediate roof levels are inferred. [Mapped footprint](https://www.openstreetmap.org/way/39450314) · [Upper Midtown perimeter survey](midtown-landmarks.md)

Mary Ann Sullivan's street views show tall arched entrances on four sides, a recessed band over the base and slender granite piers running up the shaft. Her distant view shows the narrow vertical rhythm continuing into the pale pinnacles below a copper pyramid. The owner's brochure shows the same ribs from directly below on its cover. Page 2 shows the entrance arch washed amber at dusk, warm light around the roof collar, bright diagonal ridges against darker roof planes and a small lit finial. The model estimates the office glazing from 18 to 201 m, the crown springing at 208 m and the copper apex at 244 m. Bay spacing, glass colour, occupied offices and lamp intensity are illustrative. [Street, corner and crown photographs](https://homepages.bluffton.edu/~SULLIVANM/atlanta/johnsonburgee2/atlantic.html) · [Owner's exterior photographs, pages 1–2](https://www.1ac.com/pdfs/1ac_brochure.pdf)

The matched City cameras target (450, −3785) at bearing 25°, tilt 47° and 0.81 m/px, on 20 November at 11:30 and 23:30 EST. [High daylight](log/ui/midtown-skyline/one-atlantic-high-day.jpg) · [High night](log/ui/midtown-skyline/one-atlantic-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/one-atlantic-low-day.jpg) · [Low night](log/ui/midtown-skyline/one-atlantic-low-night.jpg)

### Shared Johnson/Burgee facade (2026-11-23)

Sam pointed out that One Atlantic Center (1987) and 191 Peachtree (1990) are both late Johnson/Burgee towers and should share their facade details. Photographs confirm it. Mary Ann Sullivan's close views of One Atlantic show flame-finished granite laid in coursed ashlar, with deep reveals and light-framed, four-pane-wide glass strips between continuous piers. A Wikimedia close-up of 191 shows the same flamed ashlar and light gridded glass, grouped over several floors between granite bands, beside narrow punched windows. [One Atlantic street, base and shaft](https://homepages.bluffton.edu/~SULLIVANM/atlanta/johnsonburgee2/atlantic.html) · [One Atlantic with its banded shaft and lit crown materials](https://commons.wikimedia.org/wiki/File:4_One_Atlantic_Center.jpg) · [191 Peachtree base and shaft](https://commons.wikimedia.org/wiki/File:191_Peachtree_Tower,_Atlanta,_GA_(47421491822).jpg) · [Owner's dusk photographs](https://www.1ac.com/pdfs/1ac_brochure.pdf)

**Shared:**
- Flamed granite ashlar, running bond.
- Light mullion grids in dark grey-tinted glass.
- Glass grouped over several floors, with a granite band on the first floor of each group.
- Deep reveals.

**Different:**
- One Atlantic's granite is pink Spanish stone; 191's is cream Rosa Dante.
- One Atlantic's strips run between continuous piers on all four faces, while 191 mixes grouped bays with punched windows in its slot.
- The crowns differ: One Atlantic has a copper pyramid with pale pinnacles and a gilded finial, and 191 has paired domed temple lanterns.

`web/src/city/johnson-burgee.ts` now holds the granite window atlas and the ashlar-coursing shader. 191 calls it with its previous parameters, and a hash of its geometry, textures, shader source and night response is unchanged by the refactor. One Atlantic uses the same atlas: 36 bays of four-pane strips, nine per face so lit offices never repeat, over 45 floors from 18 to 201 m, a granite band every third floor and 16% occupied offices. It adds 1.5 × 0.75 m coursing on the stone of the shaft and base.

**Estimated:**
- The three-floor band module.
- The strip width, at two thirds of each 4 m bay.
- The course size.
- The paler granite tone, #ccaea0, matched by eye to sunlit photographs.
- The occupancy.

Close facade camera: target (391, −3690), bearing 200°, tilt 62°, 170 m. [High daylight](log/ui/midtown-skyline/one-atlantic-facade-high-day.jpg) · [High night](log/ui/midtown-skyline/one-atlantic-facade-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/one-atlantic-facade-low-day.jpg) · [Low night](log/ui/midtown-skyline/one-atlantic-facade-low-night.jpg)

## Promenade I and II

An AT&T letterhead gives the historical name Promenade I and the address 1200 Peachtree. Today's Promenade Central gallery identifies that same address. The plaza photograph shows deeply framed repetitive windows and the side approach shows a white blade canopy with slim supports beside the glazed lobby. The model uses the present exterior of the low building. Its 36.2 m height is mapped. The upper floor plate, 6.4 m terrace, glazing, blade spacing and column spacing are estimates. The measured perimeter ranges from 292.9 to 302.1 m NAVD88 on 3DEP. No full-night exterior of the current 1200 facade was established from those galleries. The adjacent garden's visible warm entrance lights guide an illustrative, restrained lobby treatment. [Archival address](https://psc.ky.gov/pscecf/2001-00105/AT%26T/070901/ATT_RT_SEN_Data_Integrity_070901.pdf) · [Current plaza and canopy](https://www.promenadecentral.com/gallery) · [Landscape architect's reverse views](https://spacecraftla.com/projects/promenade/) · [Dusk plaza and canopy lighting](https://www.turnerconstruction.com/projects/1230-peachtree-promenade-repositioning-project)

The separate Promenade II at 1230 Peachtree has a dark, copper-speckled glass shaft and granite frame. The architect's skyline photograph of nearby 1180 shows Promenade's storeys narrowing in several steps below a white lantern. The garden-facing photograph from the recent renovation shows how the granite piers and double-height glazing meet the plaza. City turns the tower 45° on its own mapped ring and leaves the parking garage separate. The reported height is 211 m. The shaft's 50 × 38 m plate, 143 m first setback, intermediate steps and 22 m lantern assembly are visual estimates. Measured 3DEP terrain around the footprint spans 293.8–298.5 m NAVD88. [Granite and glass description](https://bomalegacy.org/legends/tobyawards/promenade-3/) · [Skyline at night, stepped tower at right](https://www.kendall-heaton.com/projects/1180-peachtree/) · [Plaza renovation photographs](https://www.turnerconstruction.com/projects/1230-peachtree-promenade-repositioning-project)

The matched camera for II targets (642, −3844), bearing 25°, tilt 47°, 0.85 m/px. For I use (682, −3783), bearing −110°, tilt 34°, 0.35 m/px. Both use the One Atlantic dates and times above. [II high day](log/ui/midtown-skyline/promenade-high-day.jpg) · [II high night](log/ui/midtown-skyline/promenade-high-night.jpg) · [II low day](log/ui/midtown-skyline/promenade-low-day.jpg) · [II low night](log/ui/midtown-skyline/promenade-low-night.jpg) · [I high day](log/ui/midtown-skyline/promenade-central-high-day.jpg) · [I high night](log/ui/midtown-skyline/promenade-central-high-night.jpg) · [I low day](log/ui/midtown-skyline/promenade-central-low-day.jpg) · [I low night](log/ui/midtown-skyline/promenade-central-low-night.jpg)

### Promenade II crown at night (2026-11-23)

Sam's night photograph of the stepped crown shows cool-white neon on the corners of every setback (the stepped chevrons), vertical frames outlining the setback faces, and a lit lantern, spire and finial. The offices below stay warm. Chris McClanahan's 2011 view across Lake Clara Meer shows the same white outline on the crown and spire beside the warm Midtown towers. The image is low resolution, but it confirms the colour. [Midtown at night, CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Midtown_at_night.jpg)

City now draws the neon as a separate unlit mesh in about 6000 K white (`#eef2ff`). It has 0.9 m bands along the top of each of the five crown setbacks, 0.5 m bars on the corner fins of the four upper tiers, and the lantern and spire faces. Before, the lantern used the tower's warm lamp colour. The neon blends additively, so it brightens through twilight, and it is hidden by day. The lantern therefore loses its paler daytime face band and shows its plain stone prism. The band and bar widths are estimated for legibility at City scale, and the brightness is illustrative.

Close crown camera: target (657, −3905), bearing 25°, tilt 38°, 430 m. [High night](log/ui/midtown-skyline/promenade-crown-high-night.jpg) · [Low night](log/ui/midtown-skyline/promenade-crown-low-night.jpg) · [High daylight](log/ui/midtown-skyline/promenade-crown-high-day.jpg) · [Low daylight](log/ui/midtown-skyline/promenade-crown-low-day.jpg)

## 1180 Peachtree

The 41-storey Symphony Tower occupies the eastern portion of a single 126 × 35 m mapped outline. The west end curves around a lower glazed wing. Pickard Chilton's approach view shows the lower wing in front of two separate glass screens. The reverse view shows the narrow high-rise face between them and diagonal framing above the roof. At night Kendall/Heaton's skyline photograph shows two bright pale fins, a dark opening and a less uniformly lit office face below. [Architect's gallery](https://www.pickardchilton.com/work/1180-peachtree) · [Reverse angle and night skyline](https://www.kendall-heaton.com/projects/1180-peachtree/) · [Mapped footprint](https://www.openstreetmap.org/way/885660351)

The OSM architectural height is 200 m. Pickard Chilton reports 120 feet (36.6 m) for the veil above the roof. These values put the model's flat roof at 163.4 m. The 62 × 30 m upper plate, 57 m western wing, screen camber, glazed bays and distribution of night lighting are inferred. The 3DEP perimeter ranges from 292.9 to 297.4 m NAVD88. The eastern shaft provides the local grade reference and the foundation follows the mapped perimeter. The garage entrances and access lanes are described in the owner's tenant manual. [Tenant manual](https://1180peachtree.com/assets/pdf/2023-1180-peachtree-tenant-manual-03.01.2023.pdf)

The four captures share (800, −3710), bearing 70°, tilt 50°, 0.80 m/px. [High daylight](log/ui/midtown-skyline/symphony-high-day.jpg) · [High night](log/ui/midtown-skyline/symphony-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/symphony-low-day.jpg) · [Low night](log/ui/midtown-skyline/symphony-low-night.jpg)

### The "napkin holder", second pass (2026-11-23)

Sam called it the napkin holder. Its two glass veils carry the broad faces 36.6 m above the roof, and end-on they curve in toward each other. The owner's aerial from the west gives the end-on section: the faces are about 30 m apart at the roof and the tips about 15 m apart, so each veil leans about 7.8 m inward. The 2006 street photograph from the west and the 2023 elevated view confirm the same curve, the white steel lattice trusses at the narrow ends, and one smooth blue-green curtain wall with silver mullions at every floor. The same aerial shows the roof garden on the curved 68 m west wing: an oval lawn inside a clipped hedge around a white round pavilion, with paving, two cypresses toward the tower and a glass rail. The OSM building parts from #201 supply the plan: tower, 68 m wing, 54–59 m shoulders, 9.8 m entrance nose and the 73 m pavilion. A night skyline shows the veils glowing pale. No photograph shows garden lighting, so the garden stays unlit. [Owner's architecture photographs](https://1180peachtree.com/architecture.php) · [2006 street view](https://commons.wikimedia.org/wiki/File:1_Symphony_Tower.jpg) · [2023 elevated view](https://commons.wikimedia.org/wiki/File:A1180PchtrMT2511-0726.jpg) · [Night skyline](https://www.kendall-heaton.com/projects/1180-peachtree/) · [Aerial](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-84.38518629579029,33.785843882368816,-84.38258932696779,33.78800225279914&bboxSR=4326&imageSR=4326&size=900,900&format=jpg&f=image)

City draws the veils as curved glass in 8 rows by 10 columns, at 88% opacity so a little light shows through. The mullions follow the curve, and the transoms run along it. The veils and trusses glow cool white at night. The tower and wing share a single curtain-wall atlas (1.5 m bays, 4.1 m floors, warm-lit offices at night), replacing the random tile shades. **Estimated:** the inward lean and its curve profile (a 1.6 power), a 1.5 m crest along the top edge, the truss depth, the garden layout, the pavilion size, the cypress height and the glass colours.

[Sam's angle, before and after](log/ui/midtown-skyline/napkin-sam-compare-day.jpg) · [Night](log/ui/midtown-skyline/napkin-sam-compare-night.jpg) · [Crown end-on, before and after](log/ui/midtown-skyline/napkin-crown-compare-day.jpg) · [Photo and model](log/ui/midtown-skyline/napkin-photo-vs-model.jpg) · [Low tier at Sam's angle](log/ui/midtown-skyline/napkin-sam-after-low-day.jpg) · [Low tier crown at night](log/ui/midtown-skyline/napkin-crown-after-low-night.jpg)

### Garden, crown lattice and night, third pass (2026-11-23)

Sam's reference photos were an aerial and an eye-level rooftop shot from a stock library, so they aren't cited here. The owner's aerial and the Wikimedia views linked above show the same features. On the 68 m wing roof garden, the pavilion is now a smooth white drum with a stepped top edge and a louvred service panel. Mounded beds of ornamental grasses and low shrubs (#214 primitives) flank the lawn. A row of seven small multi-stem crape myrtles runs along the curved west edge inside the rail. They are a tagged stand-in (`TODO(tree-lab)`) until the tree lab's crape myrtle is approved, shown in late-November fall colour because landmarks don't yet receive City's season. Behind the veil glazing, white steel lattice trusses (verticals, chords and alternating diagonals) frame the crown. At night the veils and lattice glow cool white-green from inside, so the truss pattern reads through, and a thin light line runs up each veil's curved west edge from the wing roof to the tip. The offices below stay warm. The ground-level plaza at the tower base already had its curved paths and trees, so it is unchanged.

**Estimated:** the lattice spacing and depth, the light-line route, the bed and grass layout, and the crape myrtle spacing and height (4.5 m). **Gap:** I found no citable dusk photograph; the night colour follows Sam's description and the Kendall/Heaton night skyline.

[Garden before and after](log/ui/midtown-skyline/garden2-close-compare-day.jpg) · [Night before and after](log/ui/midtown-skyline/garden2-sam-compare-night.jpg) · [Dusk and night](log/ui/midtown-skyline/garden2-dusk-night.jpg) · [Day at Sam's angle](log/ui/midtown-skyline/garden2-sam-compare-day.jpg) · [Low tier garden](log/ui/midtown-skyline/garden2-close-after-low-day.jpg)

## The Georgian Terrace

The parent footprint reports 19 floors. Two archived building parts distinguish the ten-storey historic corner from the 19-storey rear addition. The part boundaries preserve the angled Ponce frontage, indented courtyard, rounded corner and atrium junction. The hotel's daylight corner photograph shows the brick bay windows and stone cornice below a taller glazed cylinder. Smallwood's side approach shows the projecting terraces and the physical joint between old masonry and new glazing. A visitor's evening photograph shows warm lamps grazing the bases of pale columns and shining behind arched openings. Seasonal decorations vary. [Historic and modern exteriors](https://www.thegeorgianterrace.com/gallery) · [Renovation architect's photographs](https://smallwood-us.com/projects/georgian-terrace/) · [Evening terrace photograph](https://myloveofoldhollywood.blogspot.com/2014/01/touring-atlanta-part-one-of-three.html)

The parent outline spans roughly 81 × 69 m. USGS 3DEP perimeter samples range from 308.0 to 313.0 m NAVD88. The two part plans and storey counts are mapped. Roof heights of 37 and 68 m, the 73 m cap, cornice widths, arch locations, glass colours and room occupancy are inferred from the photographs. [Historic footprint](https://www.openstreetmap.org/way/886041062) · [Addition footprint](https://www.openstreetmap.org/way/886041060) · [City preservation record](https://www.atlantaga.gov/government/departments/city-planning/historic-preservation/property-district-information/georgian-terrace-hotel)

Target (683, −2115), bearing 10°, tilt 32°, 0.38 m/px. [High daylight](log/ui/midtown-skyline/georgian-terrace-high-day.jpg) · [High night](log/ui/midtown-skyline/georgian-terrace-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/georgian-terrace-low-day.jpg) · [Low night](log/ui/midtown-skyline/georgian-terrace-low-night.jpg)

A self-review found five more parts inside the parent outline. The recess behind the Peachtree colonnade is filled by a mapped two-storey infill ([way 886041063](https://www.openstreetmap.org/way/886041063)), so the arched French windows sit on its west face and on the two end bays. A mapped three-storey podium ([way 886041052](https://www.openstreetmap.org/way/886041052)) fills the east side. Three mapped roof parts are canopies on posts: the north drive ([way 1341948170](https://www.openstreetmap.org/way/1341948170)), the north service bay ([way 1342535108](https://www.openstreetmap.org/way/1342535108)) and the Ponce entrance court ([way 886041058](https://www.openstreetmap.org/way/886041058)). The earlier model laid a 1 m slab under all of them. On 3DEP the Peachtree sidewalk is about 2.5 m above the grade at the site centre, so the old 1.4 m terrace slab and the column bases were buried. OSM maps the terrace as a raised walkway (layer 1) reached by steps. The deck now sits 0.3 m above the highest Peachtree sample and wraps the corner onto Ponce, where the ground falls away. The deck offset, 12 m podium height, canopy heights (4.6–8.2 m) and post spacing are inferred. The columns and entablature now stay inside the mapped west edge.

Courtyard view: target (659, −2081), bearing 80°, tilt 62°, 0.15 m/px. [High daylight](log/ui/midtown-skyline/terrace-courtyard-high-day.jpg) · [High night](log/ui/midtown-skyline/terrace-courtyard-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/terrace-courtyard-low-day.jpg) · [Low night](log/ui/midtown-skyline/terrace-courtyard-low-night.jpg)

Podium view from the northeast: target (700, −2100), bearing 250°, tilt 55°, 0.3 m/px. [High daylight](log/ui/midtown-skyline/terrace-podium-high-day.jpg) · [High night](log/ui/midtown-skyline/terrace-podium-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/terrace-podium-low-day.jpg) · [Low night](log/ui/midtown-skyline/terrace-podium-low-night.jpg)

### Roofline ornament (2026-11-23)

Sam pointed out that the 1911 hotel read as a plain tan block. Street photographs show its classical vocabulary:
- pale limestone across the two base storeys
- a projecting belt cornice above the base
- a string course under the top storey
- a deep crowning cornice on modillions, below a low parapet
- that cornice wrapping the round corner bay at Peachtree and Ponce

City now draws all of these on the historic wing and the corner bay as true per-edge offsets, replacing the earlier centroid-scaled bands that left inward-facing walls bare. The 1991 addition keeps plain bands, as the photographs show. [Wikimedia: hotel from Peachtree, 2009](https://commons.wikimedia.org/wiki/File:Georgian_Terrace_Hotel.jpg) · [Wikimedia: hotel and the Fox from above](https://commons.wikimedia.org/wiki/File:Hotels_around_Fabulous_Fox_Theater.JPG) · [Wikimedia: 2019 corner and addition](https://commons.wikimedia.org/wiki/File:Georgian_Terrace_Hotel_1.jpg)

**Estimated:** the cornice projection of 1.05 m, the modillions at 1 m pitch, the 0.85 m parapet (the wing now tops out at 38 m), the 0.75 m rustication courses and the limestone tone. Window surrounds and keystones are under a pixel at City cameras and are not modelled. No night photograph shows the roofline lit, so the cornice stays dark at night and catches the low sun in the evening.

Camera (655, −2105), bearing 20°, tilt 58°, 230 m. [Before and after, labelled](log/ui/midtown-skyline/terrace-ornament-compare-day.jpg) · [Evening and night](log/ui/midtown-skyline/terrace-ornament-evening-night.jpg) · [Low tier day](log/ui/midtown-skyline/terrace-ornament-after-low-day.jpg) · [Low tier night](log/ui/midtown-skyline/terrace-ornament-after-low-night.jpg)

## Tower Square

The Digital Library of Georgia's face-on photograph shows the old BellSouth tower's rows of dark horizontal openings, shallow shoulders and pale concrete return walls. Josh Green's upward night photograph resolves the recess under each slab and the coloured light along the tall blank corner. The 1980s signage has since changed. City uses unlettered concrete and a static violet-blue wash along the return walls. Window occupancy and lighting intensity are illustrative. [Archival exterior](https://dlg.usg.edu/record/nge_ngen_m-9641) · [Night view from the corner](https://atlanta.urbanize.city/post/photos-how-lighting-additions-are-enlivening-midtown-night)

The footprint reports concrete, a flat roof, 47 storeys and a 206 m height. Its recessed corners leave four projecting window banks, roughly 53 × 67 m overall. The 3DEP perimeter spans 304.3–306.2 m NAVD88 with 304.5 m at the centre. The 9 m base, 197 m top window line, 5 m mechanical cap and 0.8 m recess depth are estimated. The tower has a separate identity from the station and its plaza. [Mapped tower](https://www.openstreetmap.org/way/26800371)

Camera (470, −2180), bearing 8°, tilt 45°, 0.73 m/px. [High daylight](log/ui/midtown-skyline/tower-square-high-day.jpg) · [High night](log/ui/midtown-skyline/tower-square-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/tower-square-low-day.jpg) · [Low night](log/ui/midtown-skyline/tower-square-low-night.jpg)

A self-review found three geometry problems, all now fixed:
- Each storey's recess opened into a 6 m hollow behind the glazing. A solid bank now backs every window row, so the recess is a true 0.8 m.
- The end mullions stuck out into the corner notches.
- The window banks sat up to 0.7 m inside the mapped outline, leaving a ledge at the base and an open overhang at the cap.

The bank faces now sit on the measured outline: ±33.7 m on the long axis and ±26.3 m across. The violet-blue wash is hidden by day.

Close camera from the northwest: target (470, −2110), bearing 330°, tilt 60°, 135 m. [High daylight](log/ui/midtown-skyline/tower-square-close-high-day.jpg) · [High night](log/ui/midtown-skyline/tower-square-close-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/tower-square-close-low-day.jpg) · [Low night](log/ui/midtown-skyline/tower-square-close-low-night.jpg)

## The Atlanta Biltmore

Schultze & Weaver's 1924 Georgian Revival hotel at West Peachtree and 5th was a generic 65 m glass extrusion. Street photographs show red-brown brick over a two-storey limestone base, stone quoins, a stone string course near the top, and a crowning cornice on modillions. A two-storey columned portico stands on West Peachtree. The two lattice masts on the roof first carried WSB's long-wire antenna and now carry the vertical illuminated letters BILTMORE. The 1925 photographs give the span between them as 312 ft 6 in (95 m). The OSM building parts from #201 give the plan: a 65 m main block, 56 m and 47 m wings, and low annexes. [Wikimedia, 2009, CC BY 3.0](https://commons.wikimedia.org/wiki/File:Biltmore_Hotel.jpg) · [Wikimedia, 2019 front, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Front_of_Biltmore,_Atlanta.jpg) · [Wikimedia, 2019 with mast, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Biltmore_ATL.jpg) · [Scott Fybush on the WSB masts](https://fybush.com/site-20160318) · [City landmark record](https://www.atlantaga.gov/government/departments/city-planning/historic-preservation/property-district-information/biltmore-hotel-and-tower) · [Wikipedia](https://en.wikipedia.org/wiki/Atlanta_Biltmore_Hotel_and_Biltmore_Apartments)

The ornament reuses the Georgian Terrace template, now shared as `classical-ornament.ts` (the Terrace's geometry hash is unchanged), and adds quoins. **Estimated:** the 46 m mast height and taper, the letter size, the portico's ten columns, the cornice dimensions and the brick tone. The photos found show the letters but not at night, so the red night glow is inferred from the description of illuminated letters; this is a documented gap.

Cameras: front `/?view=city&cam=395,-2565,75,62,330` · context `/?view=city&cam=430,-2560,75,60,640` · masts `/?view=city&cam=470,-2560,75,52,430`. [Front before and after](log/ui/midtown-skyline/biltmore-front-compare-day.jpg) · [Context before and after](log/ui/midtown-skyline/biltmore-context-compare-day.jpg) · [Night](log/ui/midtown-skyline/biltmore-context-compare-night.jpg) · [Masts at night](log/ui/midtown-skyline/biltmore-masts-after-high-night.jpg) · [Low tier](log/ui/midtown-skyline/biltmore-front-after-low-day.jpg)

## The Academy of Medicine

The 1941 Academy of Medicine at 875 West Peachtree (Hentz, Adler & Shutze; now a Georgia Tech event venue) was drawn as a generic two-storey brick box. Three Wikimedia photographs from two angles show a cream stucco temple on a raised base. It has a six-column pedimented portico facing West Peachtree with ACADEMY OF MEDICINE across the frieze, verdigris copper hipped roofs over the wings, a square central lantern with arched thermal windows, and tall arched windows set in blind arches. The mapped outline (osm:way:42725820) already traces the portico, the stepped wings and the rounded rear. City draws them with the shared classical ornament: a base course, an eave band on brackets and a cornice. [Wikimedia, 2008, CC BY 3.0](https://commons.wikimedia.org/wiki/File:Academy_of_Medicine.jpg) · [Wikimedia, 2011, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Academy_of_Medicine_(Atlanta).JPG) · [Wikimedia, oblique, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Academy_of_Medicine_875_West_Peachtree_Street_NE_Atlanta_Georgia.JPG) · [Wikimedia, frontal, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Academy_of_Medicine,_Atlanta.jpg)

**Estimated:** the 8.4 m eave, the 15.5 m lantern, the roof pitches, the column spacing and the window positions. The frieze lettering is a band of glyph blocks. **Gap:** no night photograph was found, so only an illustrative warm lamp behind the portico doors is lit.

Camera `/?view=city&cam=452,-2721,60,45,150`. [Before and after](log/ui/midtown-skyline/academy-compare-day.jpg) · [Night](log/ui/midtown-skyline/academy-compare-night.jpg) · [Low tier](log/ui/midtown-skyline/academy-after-low-day.jpg) · [Wider](log/ui/midtown-skyline/academy-wide-after-high-day.jpg)

### Second pass: materials, openings and the 1941 garden (2026-11-23)

**Wall material, re-verified.** The National Register nomination (1980) describes a five-bay Neo-Classical building with a standing-seam hipped metal roof, a central cupola with Roman windows, a pedimented portico of six Tuscan columns carrying a large caduceus, round arched windows and corner pilasters. It does not name the wall finish. The 2009 Wikimedia photograph at full resolution (4592 × 3056) settles it: smooth putty-cream **stucco** with a fine grain and no coursing, over a banded stucco base and a cast-stone water table. The walls keep stucco, now a warmer putty tone with a banded base and faint streaks under the eaves where water runs off the cornice. The shared procedural stucco and aged-copper surfaces from the materials library will replace these vertex tones when that library merges. [NRHP nomination, NPS](https://npgallery.nps.gov/GetAsset/43283731-e6d9-459e-8324-f8855aa67409) · [Wikimedia, 2009, full resolution](https://commons.wikimedia.org/wiki/File:Academy_of_Medicine_875_West_Peachtree_Street_NE_Atlanta_Georgia.JPG)

**Copper.** The roofs are now a muted grey-green verdigris with darker standing seams, bundled every 2.2 m at City scale, in place of the saturated teal.

**Openings.**
- Each arched sash has a moulded surround and a keystone inside a recessed blind arch, with white muntins, a radiating fanlight and a stone sill, as the close photographs show.
- The portico has Tuscan bases and capitals.
- The tympanum carries the caduceus.
- The central door has a moulded surround and a fanlight, flanked by arched sashes.

**Grounds.** Georgia Tech's 2023 Campus Historic Preservation Plan lists the Academy of Medicine Garden (1941, Classical Revival) as recommended eligible. It records that the front lawn keeps many of its original plantings, that shrubs replaced the trees flanking the entrance, and that the south sunken garden is now hardscape. The nomination records a front yard with shrubbery and a paved brick walk. City now draws:
- a brick walk from West Peachtree to the steps
- clipped boxwood along the walk, the street edge and the foundation
- two boxwood-edged formal beds of rich black soil flanking the steps (#263)

[GT 2023 Campus Historic Preservation Plan](https://www.facilities.gatech.edu/sites/default/files/2024-07/2023%20GT%20Campus%20Historic%20Preservation%20Update_Final%20Report%20with%20Appendices.pdf)

**Estimated:** the bed and hedge layout, the hedge heights, the seam spacing, the streak placement and the sash proportions. **Gap:** still no night photograph; the door fanlight lamp is illustrative.

[Before and after](log/ui/midtown-skyline/academy2-compare-day.jpg) · [Close before and after](log/ui/midtown-skyline/academy2-close-compare-day.jpg) · [Close at night](log/ui/midtown-skyline/academy2-close-compare-night.jpg) · [Low tier](log/ui/midtown-skyline/academy2-after-low-day.jpg) · close camera `/?view=city&cam=440,-2721,52,60,80`

## The Wimbish House

The 1898 Wimbish House at 1150 Peachtree (W. T. Downing), home of the Atlanta Woman's Club, was drawn as a generic two-storey box. Wikimedia photographs from the street and from the garden show buff stone under a steep slate hip roof. A round drum bay and a conical turret frame an arched loggia on the south front, two pinnacled dormers rise between them, and a tall chimney stands at the back. The OSM building parts give the plan: the house at the east end, the porch, and the club's later two-storey wing to the west. The mapped 7.2 m height fits the wing, not the three-storey house, so the house is raised to an inferred 11.5 m eave and an 18 m ridge. The turret cap is at 19.6 m and the chimney at 20.5 m. [Wikimedia, 2019, front, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Wimbish_House.jpg) · [Wikimedia, 2019, oblique, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Wimbish_House_3.jpg) · [Wikimedia, 2013, from Peachtree, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Atlanta_Women%27s_Club_2013_09_28_7845.JPG)

**Estimated:** all heights, the roof pitch, the turret and drum radii, the dormers, the arch count and the stone tone. **Gap:** no night photograph was found, so only an illustrative lamp in the loggia is lit.

Camera `/?view=city&cam=762,-3556,335,55,120`. [Before and after](log/ui/midtown-skyline/wimbish-compare-day.jpg) · [Night](log/ui/midtown-skyline/wimbish-compare-night.jpg) · [Low tier](log/ui/midtown-skyline/wimbish-after-low-day.jpg)

## The Ponce de Leon Apartments

The 1913 Ponce de Leon Apartments (William L. Stoddart), now The Ponce condominiums, at the southeast corner of Peachtree and Ponce, are mapped as "Ponce Condominium" (osm:way:208355680, `old_name` Ponce de Leon Apartments, `start_date` 1913). They had been a generic 43–50 m block. Wikimedia photographs from the corner and the side show:
- buff brick on a curved front that faces the intersection, over a two-storey white terra-cotta colonnade
- a deep green bracketed cornice
- stacked round iron balconies where the curve meets two square corner towers
- an open arched belvedere on each tower, under a green tile hip roof

The rear walls are plainer brick. The OSM building parts give the curved main block (43.2 m) and both towers (50.4 m). City draws the base, the cornice and its brackets with the shared classical ornament. The evening photograph shows warm lit windows and lanterns at the colonnade. [Wikimedia, 2017, corner, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Ponce_Condominiums_(formerly_Ponce_de_Leon_Apartments),_Atlanta.jpg) · [Wikimedia, evening, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Ponce_de_Leon_Apartments,_Atlanta,_Georgia.jpg) · [Wikimedia, 2013, side, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Ponce_de_Leon_Apartments_(side_view),_Midtown_Atlanta.JPG)

**Estimated:** the 52.5 m belvedere roof peak, the arch proportions, the column pitch (2.6 m), the balcony radius and spacing, and the brick and green tones.

Camera `/?view=city&cam=655,-2000,135,58,230`. [Before and after](log/ui/midtown-skyline/ponce-compare-day.jpg) · [Night](log/ui/midtown-skyline/ponce-compare-night.jpg) · [Dusk](log/ui/midtown-skyline/ponce-dusk-after-day.jpg) · [Low tier](log/ui/midtown-skyline/ponce-after-low-day.jpg)

