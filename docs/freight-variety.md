# Freight locomotive variety — 2026-11-23

PR 2 adds four lab studies: `es44acNs`, `es44ah`, `sd70ace`, `gp382`.
They use vertex colours and the existing stock lamp material, with no operator
logos, lettering or numbers. City still uses the approved CM44AC-family units;
new consists are PR 4. A web rebuild is required; no data regeneration or server
work is added.

## Geometry and dimensions

| Model | Length / truck centres (m) | Distinguishing shape | Triangles |
| --- | --- | --- | --- |
| NS-like ES44AC | 22.30 / 16.15 | Extended GEVO radiator wings and recessed intakes, white cab face | 2,864 |
| CSX-like ES44AH | 22.30 / 16.15 | Same Evolution body, navy hood and yellow nose | 2,684 |
| NS-like SD70ACe | 22.63 / 15.90 | Broad clipped-corner nose, cab brow lamps, flat-sided radiator with three roof fans | 3,828 |
| CSX-like GP38-2 | 18.03 / 10.3632 | Narrow short hood, bevelled cab roof, two-axle trucks, two radiator fans | 3,036 |

[Progress Rail's SD70ACe specification](https://www.progressrail.com/en/segments/locomotive/locomotives/freight-locomotives/sd70-a-ce)
gives 74 ft 3 in overall length and six powered axles. The SD truck spacing, cab
height and fan/door positions are estimates from photos; they are not a surveyed
engineering model. [GATX's GP38-2 specification](https://www.gatx.com/products/gp38-2/)
gives 59 ft 2 in length, 34 ft bolster centres, 9 ft rigid truck wheelbase and
40 in wheels. A secondary data sheet returned 43 ft truck centres; the model uses
GATX's primary specification. GE overall dimensions reuse the AC4400CW-family
envelope from [the first detail pass](freight-stock.md); the Evolution radiator
length (4.8 m), intake layout and cab rake are estimated from the ES44 photos.
The ES44AH's internal weight/traction differences are not visible geometry.

One merged geometry/material per locomotive. No new textures. Wheel treads sit at
y=0; the lab's existing 0.125 m offset seats them on its track. Lamp attributes
follow the selected leading end, including long-hood-forward use. No illuminated
roadside light pools are implied by emissive lenses.

## Dated photographs

- [NS SD70ACe 1132, Valley Forge, 21 April 2017](https://commons.wikimedia.org/wiki/File:NS_SD70ACe_1132_EB_Valley_Forge_PA.jpg), Dough4872, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/): front three-quarter, paired brow headlights, ditch lights, roof bevel, safety nose and end rails.
- [NS SD70ACe at Oostanaula GA, 2 June 2026](https://commons.wikimedia.org/wiki/File:Passing_train,_Oostanaula_GA.jpg), John Phelan, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): opposite cab side, sliding side windows, dirty lower body and HTCR running gear.
- [CSX GP38-2 2772, 17 June 2005](https://commons.wikimedia.org/wiki/File:CSX_GP38-2.jpg), Phil Gengler, [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/): front three-quarter, narrow short hood, cab and two-axle trucks. The model follows its YN2 blue cab and grey long hood, with a yellow nose.
- [CSX GP38-2 2641, Valdosta GA, 1 January 2014](https://commons.wikimedia.org/wiki/File:CSX_2641_in_Valdosta_010114.JPG), Michael Rivera, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/): opposite side elevation, rear pair of cooling fans, dynamic-brake blister, fuel tank and light roof.
- [CSX ES44AH 3122, Langhorne, 13 July 2019](https://commons.wikimedia.org/wiki/File:CSX_ES44AH_3122_NB_Langhorne_PA.jpeg), Dough4872, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/): cab rake, stacked nose lamps, extended rear radiator and side intakes.
- [NS ES44AC 8176, Mechanicsville GA, 8 February 2026](https://commons.wikimedia.org/wiki/File:Passing_train,_Mechanicsville_GA.jpg), John Phelan, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): wider side view of the GEVO hood, pale cab face, white sill and nose stripes, yellow end rails.

## Lighting evidence and gaps

The SD70ACe 1132 daylight reference has the paired brow headlights and both ditch
lights visibly illuminated. GP38-2 2772 shows a lit low ditch lamp. The ES44AH
3122 trailing unit has unlit lenses. For night context I inspected
[NS 6902 at Roanoke, 23 October 2011](https://commons.wikimedia.org/wiki/File:NS_6902_Night_Shoot_(6274324314).jpg)
(jpmueller99, CC BY 2.0): headlights and number boards glow while the body is lit
by yard lighting; ES44AC 8010 is partially visible behind it. The foreground is
an SD60E, **not** an SD70ACe, and is not used to claim SD70-specific geometry.
Reliable unobstructed night photos for these exact four examples were not found.
Night lamp colour/intensity and the GP's rear board positions are therefore
illustrative estimates. No cab-interior glow is added.

## Lab comparison

All new models use the same solo-locomotive camera: position `[-19,6.8,18]`, target
`[0,2,0]`, field of view 38 degrees. The Side, Front, Rear and Top buttons use the
existing solo-stock presets. Day/night images use `__lab.setNight(false/true)`
and `__lab.render()` with that matched camera.

[Four silhouettes by day](log/freight/variety/day.jpg) ·
[Matched night views](log/freight/variety/night.jpg) ·
[Photo/model comparison](log/freight/variety/references.jpg).
Reference panels are cropped/resized with captions; author, date, source and
licence are listed above. The combined reference sheet is distributed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Validation

Full strict tests and build pass. New geometry checks cover each family's envelope,
rail contact and front/rear lamp attributes. Cross-review caught a shared-table
side effect: adding the GP38-2 lowered City's sliver cutoff from 12 m to 10.36 m.
The cutoff now derives from City's actual consist, preserving the 12 m behavior.
A concrete 11 m / 12 m track test fails when that fix is reverted. The four new
unit keys still do not enter City consists in this PR.

Final validation: 20 Rust, 11 pipeline, 940 web tests (one existing skip), and five worker tests passed; build and type check passed. Perf Low: 2,384,006 triangles / 543 calls; High: 13,781,355 / 1,177, both below ceilings. Claude's second and final review found no remaining findings. All four models were checked in the browser with matched day/night screenshots. Web rebuild only; no data rebuild or worker change.

Sam’s colour revision: ES44AH uses navy `#343f50` with yellow nose and sill; GP38-2 uses stronger blue `#344f70` on its cab against grey `#969b9e` on its long hood. GE cooling faces now slope outward to the roof; the SD uses a flat-sided radiator and a taller 3.62 m nose with smaller corner bevels. These silhouette dimensions are estimated from the linked references. Day, night and reference sheets were reshot with the same camera.
