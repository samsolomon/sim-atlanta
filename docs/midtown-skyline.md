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

## The Georgian Terrace

The parent footprint reports 19 floors. Two archived building parts distinguish the ten-storey historic corner from the 19-storey rear addition. The part boundaries preserve the angled Ponce frontage, indented courtyard, rounded corner and atrium junction. The hotel's daylight corner photograph shows the brick bay windows and stone cornice below a taller glazed cylinder. Smallwood's side approach shows the projecting terraces and the physical joint between old masonry and new glazing. A visitor's evening photograph shows warm lamps grazing the bases of pale columns and shining behind arched openings. Seasonal decorations vary. [Historic and modern exteriors](https://www.thegeorgianterrace.com/gallery) · [Renovation architect's photographs](https://smallwood-us.com/projects/georgian-terrace/) · [Evening terrace photograph](https://myloveofoldhollywood.blogspot.com/2014/01/touring-atlanta-part-one-of-three.html)

The parent outline spans roughly 81 × 69 m. USGS 3DEP perimeter samples range from 308.0 to 313.0 m NAVD88. The two part plans and storey counts are mapped. Roof heights of 37 and 68 m, the 73 m cap, cornice widths, arch locations, glass colours and room occupancy are inferred from the photographs. [Historic footprint](https://www.openstreetmap.org/way/886041062) · [Addition footprint](https://www.openstreetmap.org/way/886041060) · [City preservation record](https://www.atlantaga.gov/government/departments/city-planning/historic-preservation/property-district-information/georgian-terrace-hotel)

Target (683, −2115), bearing 10°, tilt 32°, 0.38 m/px. [High daylight](log/ui/midtown-skyline/georgian-terrace-high-day.jpg) · [High night](log/ui/midtown-skyline/georgian-terrace-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/georgian-terrace-low-day.jpg) · [Low night](log/ui/midtown-skyline/georgian-terrace-low-night.jpg)

A self-review found five more parts inside the parent outline. The recess behind the Peachtree colonnade is filled by a mapped two-storey infill ([way 886041063](https://www.openstreetmap.org/way/886041063)), so the arched French windows sit on its west face and on the two end bays. A mapped three-storey podium ([way 886041052](https://www.openstreetmap.org/way/886041052)) fills the east side. Three mapped roof parts are canopies on posts: the north drive ([way 1341948170](https://www.openstreetmap.org/way/1341948170)), the north service bay ([way 1342535108](https://www.openstreetmap.org/way/1342535108)) and the Ponce entrance court ([way 886041058](https://www.openstreetmap.org/way/886041058)). The earlier model laid a 1 m slab under all of them. On 3DEP the Peachtree sidewalk is about 2.5 m above the grade at the site centre, so the old 1.4 m terrace slab and the column bases were buried. OSM maps the terrace as a raised walkway (layer 1) reached by steps. The deck now sits 0.3 m above the highest Peachtree sample and wraps the corner onto Ponce, where the ground falls away. The deck offset, 12 m podium height, canopy heights (4.6–8.2 m) and post spacing are inferred. The columns and entablature now stay inside the mapped west edge.

Courtyard view: target (659, −2081), bearing 80°, tilt 62°, 0.15 m/px. [High daylight](log/ui/midtown-skyline/terrace-courtyard-high-day.jpg) · [High night](log/ui/midtown-skyline/terrace-courtyard-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/terrace-courtyard-low-day.jpg) · [Low night](log/ui/midtown-skyline/terrace-courtyard-low-night.jpg)

Podium view from the northeast: target (700, −2100), bearing 250°, tilt 55°, 0.3 m/px. [High daylight](log/ui/midtown-skyline/terrace-podium-high-day.jpg) · [High night](log/ui/midtown-skyline/terrace-podium-high-night.jpg) · [Low daylight](log/ui/midtown-skyline/terrace-podium-low-day.jpg) · [Low night](log/ui/midtown-skyline/terrace-podium-low-night.jpg)

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
