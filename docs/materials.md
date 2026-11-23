# Material library

`web/src/materials/` is the shared material library for buildings. Landmarks pick from it
first. Add a new material only when photographs show something it cannot cover, and give the
new material a swatch in the model lab.

## How it works

Every material is a shader pattern, not a texture, so the library costs 0 texture bytes. A
landmark still draws in its own vertex colour. The pattern changes that colour by an offset
that averages to about zero, so a wall seen from a distance keeps its flat colour, which is how
the City looked before the library. Detail fades to that average once a feature is under about
two pixels, the same way the #248 ground covers fade, so nothing shimmers. Patterns use
model-space position and normal, so courses follow the building's own walls. On roofs, seams
and courses run down the slope.

```ts
import { surfaces } from '../materials';

shell.prism(ring, PLINTH, EAVE, stucco, stucco, { wall: surfaces.stucco() });
shell.paint(surfaces.agedCopper(), () => { hip(...); hip(...); });
shell.prism(part, base, h, brick, roof, { wall: surfaces.brick({ colour: 'deepRed', bond: 'flemish' }) });
```

- `shell.paint(surface, draw)` tags everything `draw` adds to the shell body. When paints
  are nested, the innermost one wins.
- `prism(..., { wall, roof })` paints walls and roof separately.
- Unpainted shells are byte-identical to before: same geometry, same program.
- `surface.colour` is a suggested base colour from `PALETTE`. A landmark may keep its own hex
  taken from photographs.
- `?surfaces=off` draws every landmark flat, for A/B comparison. FLAT is the unpatched
  program, not a zeroed uniform.
- The low tier (`?q=low`, phones) compiles out every feature under half a metre and the second
  noise octave. What remains is one structural grid (courses, panels, mullions, seams) and one
  soft tone.

### Scale: what the City can show

The City camera never orbits closer than 150 m (`controls.minDistance`). At that distance a
pixel covers 5 to 10 cm, so brick courses (75 mm), slates, clapboard laps and shingles always
fade to their mean in the City. They appear only in the model lab and in close views. What reads
in the City is anything about half a metre or larger: copper seams and streaks, ashlar courses,
precast panels, curtain-wall mullions and spandrels, concrete lifts, and the soft tone variation
of every material. The defaults are tuned for that.

## Materials

| Material | Factory | Parameters | Visible in City | Approx. cost, high / low (ALU ops; a hash is about 10) |
|---|---|---|---|---|
| Brick: common red, deep red, brown, buff, painted | `brick` | bond: running, flemish, stack, english; `darkJoints` | tone only | ~110 far, ~150 near / ~50 |
| Stucco: cream, blush, ochre | `stucco` | | tone, rain streaks | ~150 / ~100 |
| Limestone ashlar | `limestone` | `course` (m) | courses ≥ 0.5 m | ~140 / ~90 |
| Precast concrete panels | `precast` | `width`, `height` (m) | panels, reveals | ~130 / ~80 |
| Granite: pink, grey | `granite` | `course` (m) | courses, tone | ~145 / ~90 |
| Glass curtain wall: blue-green, silver, bronze, blue | `curtainGlass` | `mullion`, `floor` (m) | mullions, spandrels | ~45 / ~45 |
| Aged copper (muted, uneven, streaked verdigris) | `agedCopper` | `seam` (m) | seams, streaks | ~160 / ~110 |
| Slate | `slate` | | tone only | ~100 far, ~140 near / ~50 |
| Terracotta barrel tile | `terracottaTile` | | tone only | ~100 far, ~140 near / ~50 |
| Clapboard | `clapboard` | | tone only | ~100 / ~50 |
| Wall shingle | `shingle` | | tone only | ~100 far, ~140 near / ~50 |
| Concrete | `concrete` | `lift` (m) | lift lines, tone | ~120 / ~70 |
| Asphalt roofing | `asphaltRoof` | | tone only | ~100 far, ~120 near / ~50 |

The costs are static estimates. Measured frame times are in the proof section below. All
materials share one program per tier, `…|surfaces-high` or `…|surfaces-low`.

## Texture budget

`web/src/materials/budget.ts` lists every source file that constructs a texture, with its
estimated GPU bytes (width × height × 4, plus a third for mipmaps). The bytes were measured
in the City on 2026-11-23. `materials.test.ts` fails when:

- an unlisted file makes a texture,
- a listed file no longer makes one,
- the library holds more than 1 MiB, or
- landmark textures together exceed 40 MiB.

No texture in the stack is GPU-compressed. Three 0.180 ships the KTX2/Basis loader and
transcoder, but every texture here is generated at runtime, so the library stays procedural.

## Audit (main @ 2968839, City, high tier, Studio)

The scene holds 64 textures, about 464 MB of estimated GPU memory, and 81 programs.

- **Terrain ground maps:** about 420 MB, in 17 canvases of up to 5735×1639 and 4096². These
  are not building materials. The finding went to the terrain owner.
- **Landmark textures:** about 35 MB in total. Brookwood's painted-masonry canvases
  (64 px/m) are about 15 MB, the largest building item and a candidate for the library. The
  granite window atlases in `johnson-burgee.ts` are 6.2 MB. Then come the Aquarium (3.5 MB),
  World of Coca-Cola (1.7), Fulton County Government Center (1.6), Rhodes-Haverty (1.0),
  1180 Peachtree's curtain wall (1.0), Westin (0.7), Peachtree Center (0.7), and signs and
  lettering (about 2).
- **Procedural, 0 bytes:**
  - Generic facades and residential sidings (`patchFacades` in `vignette/world.ts`): one
    program and one draw for every generic building.
  - Ground covers (`landscape/ground-cover.ts`): one draw.
  - `ashlarCoursing` (One Atlantic, 191 Peachtree).
- **Geometry, not texture:** classical ornament (cornices, modillions, rustication, quoins) and
  Woodruff precast (joints, fins, slots). These cost triangles, not memory.
- **Mirrored glass:** Phong shading plus a borrowed 128×64 skyline panorama.
