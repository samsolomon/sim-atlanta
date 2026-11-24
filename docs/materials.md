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
- `facade()` window panes stay flat inside a painted wall.
- **Tuning:** there is no strength slider in the lab. Pass `strength` to a factory, for
  example `surfaces.stucco({ strength: 1.5 })`, or edit the amplitudes in `glsl.ts`, then check
  the result in the lab swatches and at the City orbit.
- Code that sets its own `onBeforeCompile` on a painted shell's material after `finish()`
  (as One Atlantic does for its ashlar) must chain the existing hook and cache key, or the
  surfaces disappear.
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
| Aged copper (muted, uneven, streaked verdigris) | `agedCopper` | `seam` (m; 0 = model draws its own) | seams, streaks | ~160 / ~110 |
| Slate | `slate` | | tone only | ~100 far, ~140 near / ~50 |
| Terracotta barrel tile | `terracottaTile` | | tone only | ~100 far, ~140 near / ~50 |
| Clapboard | `clapboard` | | tone only | ~100 / ~50 |
| Wall shingle | `shingle` | | tone only | ~100 far, ~140 near / ~50 |
| Concrete | `concrete` | `lift` (m) | lift lines, tone | ~120 / ~70 |
| Asphalt roofing | `asphaltRoof` | | tone only | ~100 far, ~120 near / ~50 |

The costs are static estimates. Measured frame times are in the proof section below. All
materials share one program per tier, `…|surfaces-high` or `…|surfaces-low`.

## Texture budget

`web/src/materials/budget.ts` lists every source file that constructs a texture or render
target, with its estimated GPU bytes (width × height × 4, plus a third for mipmaps). The bytes
are declared, not re-measured by the test. They were measured in the City on 2026-11-23 by
walking every material's texture slots, so a listed file that grows its textures must update
its entry. `materials.test.ts` fails when:

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
- **Other shader and geometry finishes, 0 texture bytes:**
  - `city/apartment-facade.ts`: apartment finishes built as vertex-coloured geometry.
  - `city/auburn-sanctuaries.ts`: a per-vertex `aWash` attribute adds warm night floodlight
    on the church fronts.
  - `city/station.ts`: Georgia State platforms. The emissive is scaled by vertex colour so
    warm brick and pale concrete stay distinct at dusk.
  - `city/stadium.ts`: pillow-rib seams on the roof membrane, with an fwidth fade (the same
    idea as the library's joints).
  These are lighting and one-off effects, not reusable materials, so they stay where they are.

The low tier was counted on the four proof views: 23 to 29 textures, against 31 to 35 on high.
The ~420 MB terrain figure was measured on the high tier only.

## Proof (2026-11-23, Studio, M5 Ultra, Chrome 157 with ANGLE on Metal, 1600×1000)

Four landmarks were painted on a proof branch and compared with `?surfaces=off` at matched
cameras, at 1 pm and 9 pm on both tiers:

- Academy of Medicine: aged copper with `seam: 0`, since the model draws its own seams, plus
  stucco. Camera `&cam=451,-2722,70,62,150`.
- Atlanta Biltmore: common red brick. Camera `&cam=432,-2560,60,56,300`.
- Hurt Building: buff brick. Camera `&cam=405,-32,340,58,240`.
- Promenade Tower: curtain glass over pink granite. Camera `&cam=596,-3779,250,56,260`.

The sheets are in `docs/log/ui/materials/` (`materials-proof-*.jpg`, `materials-gain-study.jpg`).

**What reads at City distance.** The City camera never orbits closer than 150 m, and its lens
is 22°, so a pixel covers 6 to 15 cm.

- **Brick:** courses (75 mm) never resolve. Even the 2.5 m tone mottle hardly shows, because
  the brick between windows is only a few pixels wide. The honest answer to "does brick need
  texture?" is no, not in the City. Brick shows only in the model lab and in close views.
- **Curtain glass:** the pane grid shows faintly. The landmark's own window quads already
  carry most of the look.
- **Aged copper and stucco:** these gain the most. The first pass (1×) matched FLAT in the crops, and a gain study (FLAT, 2.5×, 4×)
  showed that 2.5× reads as uneven, streaked verdigris and soft
  trowel mottle while staying calm, and 4× turns noisy. The defaults are now set at 2.5×.

**Cost.** The FLAT and library builds were each timed over 7 × 30 scene renders, with a
`readPixels` sync after every batch. Each figure below is the best median of 2 page loads.

| View | Tier | FLAT ms | Library ms | Δ |
|---|---|---|---|---|
| Academy | high | 0.70 | 0.74 | +0.04 |
| Academy | low | 0.50 | 0.64 | +0.14 |
| Biltmore | high | 0.87 | 0.81 | −0.06 |
| Biltmore | low | 0.86 | 0.65 | −0.21 |
| Hurt | high | 0.90 | 0.89 | −0.01 |
| Hurt | low | 0.66 | 0.95 | +0.29 |
| Promenade | high | 0.82 | 0.79 | −0.03 |
| Promenade | low | 0.55 | 0.94 | +0.39 |

The deltas have no consistent sign, so the library's fragment cost on the Studio is below
the run-to-run noise of this scene pass, about ±0.4 ms. Memory:

- Texture bytes: unchanged (+0).
- Programs: +2, one per painted material type (shell and lamps) per tier.
- Vertex data: `aSurface` was 1.6 MB as float32 over the 5 painted meshes and is now half
  that as float16.

Phone timing is deferred.

## Proposals (not done)

- **Brookwood painted masonry:** about 15 MB of canvases at 64 px/m. The walls could become
  `stucco` or painted `brick` surfaces. The lettering and window glow would move to a much
  smaller canvas, or the lettering to geometry. Expected saving: most of the 15 MB.

## Moved into the library (2026-11-23, byte-identical source)

- `materials/stone.ts`: `ashlarCoursing` and `withStonePosition`, from `city/johnson-burgee.ts`,
  which re-exports them, so One Atlantic and 191 Peachtree are unchanged.
- `materials/siding.ts`: `SIDING_GLSL`, the residential clapboard, brick, stucco and shingle
  courses from `patchFacades` in `vignette/world.ts`, which interpolates it at the same place.
  Style ids 3 to 10 and the `hasWin` gate stay in world.ts.

Both moves were checked by rebuilding the original files from the moved text: they match byte
for byte. The window atlases (`graniteWindowAtlas`, the Westin, Truist, Peachtree Center and
1180 atlases) stay with their towers, because their lit-window night maps are per-building data,
not reusable materials.

## Model lab

`/models.html?v=swatches` (Materials > Library swatches) draws every catalogue material as a
small gabled block through the same shader as City. The high tier is on the left block and
the low tier on the right; wall materials paint the walls and roofing paints the roof.

- **¾ front:** close-up of the high-tier block.
- **Side:** close-up of the low-tier block.
- **Rear:** the City's 22° lens from about 200 m, to check the fade to flat colour.
- **Night:** the lab's Night button.

### Static downtown landmark bodies

For a fixed, opaque shell with baked vertex colours, use `StaticLandmarkMaterial` from `web/src/materials/landmark-batch.ts` on a mesh that casts and receives shadows. City combines these shells within 500 m cells on High. Keep animated windows, glass, meshes with local-coordinate shader patches and anything with independently changing visibility in their own meshes. The standard landmark shell already selects the batchable material for its body. The material library's painted surfaces keep their local coordinates.
