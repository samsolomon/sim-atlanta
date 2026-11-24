# Art backlog

Ideas to use when we get to the detailed modelling. They're not scheduled yet.

## MARTA CQ400 rail cars
- MARTA is moving to the new **CQ400** cars (https://itsmarta.com/newCQ400railcars.aspx;
  video: https://www.youtube.com/watch?v=F4O_wVL38yI).
- **The front and back cars light up with the colour of the line they're running.** Light
  each train's cab ends with its line colour (Red/Gold/Blue/Green). This is a good place for
  the agency-colour accent in our "colour = kind of service" system. Live data says which
  line a train is on.
- Model the cars from the reference photos/video: a generic look-alike, no MARTA logos.

## Camera
- "Ride along": attach the camera to a train and see the world from it. The path + distance
  model already supports this.

## Rendering styles
- Low-poly with ink outlines is the baseline. Add a pixel-art mode later: render at low
  resolution, upscale with nearest-neighbour, limit the palette.
- Time of day from the real sun ("blue hour"). Weather from the NWS API.

## Cutaway (decided 2026-11-20)
- Underground trains drawing over buildings is fine for now. Revisit it in the polished
  version: fade buildings near the selected train, use a ground-cut stencil, or use a
  sectional "slice" view.
- **Underground view for City (Sam, 2026-11-21).** Most downtown MARTA track is underground,
  so with only open track drawn, City hides most of the trains. Trains are the most compelling
  part, so add a toggle (or a hold-key) that fades the board and buildings and draws tunnel track
  and trains as a tinted cutaway at their schematic depths. The retired `scene3d` did this
  (depth-tinted, no depth test). Label the depths schematic, and keep each train's position tier
  (live or scheduled). Not built yet; consider it with M2b motion.

## Downtown landmarks from the train

The current City board is 2 km square. Five of Sam's six landmarks already have named building footprints in the downtown bake. Each offers a different test from a rider's or observer's viewpoint.

| Order | Landmark | What the model should capture | Camera to check |
|---|---|---|---|
| 1 | Georgia State Capitol | The existing 29 m extrusion loses the gold dome. Place the drum and lantern over the crossing of the wings, and verify the dome from the train approach and the portico from street level. | Georgia State winter curve, plus a wider frame comparable to Sam’s snowy photograph. [Georgia State station study](georgia-state-station-study.md) |
| 2 | The Westin Peachtree Plaza | The named footprint spans about 125 × 44 m and has one height of 220 m in the bake. Locate the round reflective tower separately from its lower base, then give the Sun Dial its own crown. | A downtown skyline view from the Gulch and a closer street view. [Sun Dial architectural description](https://www.sundialrestaurant.com/about/) |
| 3 | Mercedes-Benz Stadium | Its footprint reaches 5.5 m past the board’s western edge. One missing ground sample makes the generic foundation builder skip the whole stadium, leaving an empty field. Register a foundation on the on-board footprint, then build the faceted shell and the eight overlapping roof petals, then check the western cut from across the tracks. | An elevated camera looking west across the Gulch, then a roof view. [Current City view](log/ui/downtown-landmarks/stadium-before.jpg) · [HOK project photographs](https://www.hok.com/projects/view/mercedes-benz-stadium/) |
| 4 | Georgia World Congress Center | The single named footprint spans nearly 600 m. Trace the individual exhibition halls against their floor plans so the campus has legible rooflines, entrances and gaps. | The stadium district overhead and a view along the western rail approaches. [Current City view](log/ui/downtown-landmarks/congress-center-before.jpg) · [GWCCA floor plans](https://www.gwcca.org/wp-content/uploads/2025/10/GWCC-Floor-Plan-Booklet-10.22.25-compressed.pdf) |
| 5 | Grady Memorial Hospital | Identify the main hospital’s wings on its roughly 165 × 202 m footprint. The Correll Pavilion and parking deck already have separate footprints. | A Connector-facing elevation and a close check from the entrance street. [Current City view](log/ui/downtown-landmarks/grady-before.jpg) · [Grady campus guide](https://www.gradyhealth.org/patients-and-visitors-guide/) |
| Later | Bank of America Plaza | The tower sits roughly 600 m north of the current board edge. Revisit it when the board grows north or a distant skyline is added. | Check the north-facing skyline from the Gulch before choosing the level of detail. [Owner’s aerial photograph](https://www.bankofamericaplaza.com/wp-content/uploads/2023/12/CPGroup-BankofAmericaPlaza-Atlanta-Brochure.pdf) |

For every new downtown landmark or reskin, save a City frame before modeling. In Orca, consult daytime and nighttime exterior photographs, compare at least two angles, and check the facade base against the footprint. Link the references, record the source of the height and label estimated dimensions. Describe where the photos show light coming from, which surfaces it reaches and what stays dark. Identify estimated colors, fixture placement and patterns. If a reliable night photograph is unavailable, record which sources you checked and what remains uncertain. Return to the same City camera in daylight and full night and save both renders for the build log. Add a dusk comparison when it helps judge the silhouette.

The three baseline frames use high tier and a paused Atlanta clock of 14:12:45 on November 20, 2026. The stadium camera targets (−850, −174) at bearing 275°, scale 0.49 m/px, tilt 53°. The Congress Center uses (−705, −725), 290°, 0.69 m/px, 46°. Grady uses (880, 240), 270°, 0.34 m/px, 53°.

- Georgia Tech’s Holland central utility plant stack is a separate landmark candidate.
  Verify the stack's coordinates against the City board before modelling it.
  [Georgia Tech Facilities' plant history](https://facilities.gatech.edu/index.php/2016-04/hidden-georgia-tech-holland-plant).
- When the board grows east past x = 1905, build the CSX rail-over at Boulevard SE (FRA 717928R), including its separated pedestrian passage. [Crossing evidence, lidar and Street View](king-freight-crossings.md).

## Deck landings left by the Gulch deck levels (2026-11-24)

The deck-level fix (`terrain/deck-levels.ts`, Sam's footpath over the freight line) holds the
Gulch-west decks at street level over the tracks. A road's sidewalk stays welded to its deck to
the end, so where the mapped ground footway it joins lies on the Gulch floor, the sidewalk now
ends a step above it. Mapped steps get a drawn flight; the rest need a landing (stair or ramp)
in the #418 weld and parapet work. Heights are the end's top above the ground way it joins.

| Run (staged downtown index) | Class | End (x, z) | Joins | Step | What it needs |
|---|---|---|---|---|---|
| tt1 | footway | (-658, 447) | footway | 8.5 m | landing needed (stair or ramp) |
| tt76 | footway | (-475, 94) | footway | 8.1 m | landing needed (stair or ramp) |
| tt164 | service | (-321, -139) | unknown | 7.2 m | data conflict: deck meets an unmapped-class ground way |
| tt82 | footway | (-539, -242) | footway | 7.1 m | landing needed (stair or ramp) |
| tt160 | footway | (-295, 56) | footway | 6.9 m | landing needed (stair or ramp) |
| tt52 | footway | (-670, 434) | footway | 6.7 m | landing needed (stair or ramp) |
| tt132 | service | (-357, -193) | unknown | 6.2 m | data conflict: deck meets an unmapped-class ground way |
| tt30 | footway | (-655, -216) | footway | 6.1 m | landing needed (stair or ramp) |
| tt76 | footway | (-422, -26) | footway | 6.0 m | landing needed (stair or ramp) |
| tt83 | footway | (-353, -297) | steps | 6.0 m | stair drawn |
| tt127 | footway | (-353, -297) | steps | 6.0 m | stair drawn |
| tt143 | footway | (-353, -297) | steps | 6.0 m | stair drawn |
| tt34 | footway | (-783, -44) | footway | 5.8 m | landing needed (stair or ramp) |
| tt117 | footway | (-150, -290) | footway | 5.7 m | landing needed (stair or ramp) |
| tt175 | pedestrian | (-228, -129) | steps | 5.7 m | stair drawn |
| tt119 | footway | (-159, -302) | footway | 5.6 m | landing needed (stair or ramp) |
| tt51 | footway | (-651, 28) | footway | 5.1 m | landing needed (stair or ramp) |
| tt1 | footway | (-547, 392) | footway | 4.7 m | landing needed (stair or ramp) |
| tt196 | footway | (-77, -41) | footway | 4.7 m | landing needed (stair or ramp) |
| tt9 | footway | (-574, -1144) | footway | 4.5 m | landing needed (stair or ramp) |
| tt126 | footway | (-322, -339) | steps | 4.0 m | stair drawn |
| tt133 | footway | (-322, -339) | steps | 4.0 m | stair drawn |
| tt52 | footway | (-513, 359) | footway | 3.3 m | landing needed (stair or ramp) |
| tt78 | footway | (-311, 45) | footway | 2.0 m | landing needed (stair or ramp) |
| tt131 | footway | (-329, -264) | pedestrian | 2.0 m | landing needed (stair or ramp) |
| tt153 | footway | (-188, 97) | footway | 1.5 m | landing needed (stair or ramp) |
| tt9 | footway | (-649, -1129) | footway | 1.0 m | landing needed (stair or ramp) |
| tt196 | footway | (12, -149) | footway | 0.8 m | small step, likely fine |
| tt157 | footway | (-194, 107) | footway | 0.5 m | small step, likely fine |
| tt198 | footway | (21, -136) | footway | 0.5 m | small step, likely fine |
| tt12 | footway | (-648, -1106) | footway | 0.3 m | small step, likely fine |
| tt147 | service | (-248, -181) | service | 0.3 m | small step, likely fine |

The freight clearance review adds two service approaches to #418. At the Circle Connection,
tt146 begins 8.12 m above the ground service way at (−236.46, −167.00). Carry the plaza
landing through that approach. At Mitchell, tt139 meets the tt87 viaduct flush at
(−280.27, −353.41), but the final approach reaches 29.3%. Resolve the landing profile
while preserving the rail clearance and shared tread. [Aerials and run measurements](log/footpath-rail/bridge-review.md)
