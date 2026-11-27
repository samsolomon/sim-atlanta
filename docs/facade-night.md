# Night windows on the wall draw

Increment 2a of the scaling plan (2026-11-27). Lit windows draw inside the wall draw of the
building they belong to, and no longer as separate draws on top. One shader does it for every wall
that opts in. It adds no draws, programs, textures or per-vertex bytes, however many buildings or
areas are loaded.

## What was wrong

Generic buildings already lit their windows in the wall shader (`patchFacades`): a hash of each
window cell picks lit or dark. Landmark skins don't work that way. A skin builds its panes as
geometry and picks the lit ones when it builds them: `litFacade` uses `litHash`, and
`landmarkShell.facade` uses its seeded stream. The lit panes go to a second mesh whose emissive
light `setNight` turns up.

The landmark batcher (#441) merged those meshes into one draw per 500 m cell by day, when lit
panes look like the wall. At night each lit-pane colour became its own draw, because every landmark
has its own light colour and intensity. Each cell's far version also switched off. On High at
22:00, landmark batches went from about 54 draws (15 near plus 39 far) to about 193. That is about
+139 of the night's +190.

## What changed

`materials/facade.ts` holds the shared facade program. It was `patchFacades` in `vignette/world.ts`,
moved unchanged except for two additions:

- **`plain`**: a uniform that switches the procedural windows off for walls that bring their own
  panes.
- **Glow ranges**: a per-material table of up to `FACADE_GLOW_RUNS` (16) vertex ranges, each with
  the light it emits now. The vertex shader finds the vertex's range by `gl_VertexID` and passes
  the light to the fragment, which adds it to the emitted light, exactly as a material's
  `emissive` would.

The batcher draws a group as **lit walls** when:

- its class matches the generic buildings' material: Lambert, double-sided, three-channel vertex
  colours, no map, not flat;
- its runs differ only in emitted light at every probe;
- it has at most 16 runs.

Then the group has one draw, day and night, with the facade program and `plain` set. Each run is a
range of that draw. `sync()` copies each run's emitted light from its source material every frame,
as it used to copy it onto the run's own material. So any `setNight` curve works, including night
values between the probes. The group's day light stays on the material's `emissive`, so the far
version, which draws only by day, still shows it on its blended walls.

A group that doesn't qualify keeps the old path: a day draw, and its runs at night.
`?perf&nightwall=off` sends every group down the old path, for same-build A/B runs.

Pane choice stays at build time. Re-picking lit panes in the shader would light different windows
on every approved landmark, and the look rule wins over the plan's "hash in the shader" wording. The
build-time pick is just as deterministic: the same building lights the same panes on every load and
in every view.

## API: how a wall opts in

```ts
import { patchFacades, facadeGlow } from '../materials/facade';

// Procedural windows: a wall with aStyle and aBase attributes (generic buildings, far boxes).
patchFacades(material, world.night);

// Panes of its own: no procedural windows, glow by vertex range.
const glow = facadeGlow();
glow.range.value.set([start, end], 0);   // vertex ids as the draw sees them
glow.count.value = 1;
patchFacades(material, undefined, { plain: true, glow });
// each frame: glow.rgb.value.set([r, g, b], 0)  // emitted light, linear, times intensity
```

The material has to be `MeshLambertMaterial({ vertexColors: true, side: DoubleSide })` with no map
and three-channel colours. That is what keeps it on the one program. Anything else (front-sided, a
map, flat shading, an RGBA colour attribute) compiles a new variant.

| Wall | How it opts in | Status |
|---|---|---|
| Generic buildings | `aStyle` walls, procedural windows | Already did (`World.buildingSteps`) |
| Far boxes (#613, `styledBoxMesh`) | Drawn with the generic material, so their windows match the near form | Already did |
| Skinned landmarks (`litFacade`, `landmarkShell.facade`, skin-kit) | Nothing to do: put lit panes in the shell's `lights` builder, keep the shell on `StaticLandmarkMaterial`, and the batcher makes it lit walls | **This PR** |
| Landmarks painted with library surfaces (`aSurface`) | Their hooked program keeps them out of batches. They light as before | Unchanged |
| Houses (`house-lod.ts`) | They have their own two night-style programs. Moving them onto this program would free those 2 programs and is increment 2b's job | Doc only |
| Coarse levels L1–L3 (increments 5 and 7) | Draw boxes or block masses with the generic material, `aStyle` and `aBase` per vertex, and they get #613's procedural windows and night share. Footprint walls (not oriented boxes) put the cells where the near form has them | Doc only |

**Streaming.** All state lives in the batch meshes' own materials. An area that loads builds its
batches, and their glow tables with them. One that unloads disposes the meshes and materials. There
is no registry, no global table and no per-building texture to set up or tear down.

**Determinism.** Lit panes come from the skin's build-time hash. Procedural windows come from a
hash of the wall position. Light colour and level come from each landmark's `setNight(night)`, which
City drives from its one night factor. No season input lights windows today. A season-dependent
share would go through `setNight`'s caller, the same way, and stay deterministic.

## Budget

Same build, default view, `?perf=run` with and without `&nightwall=off` (Studio, headless Chrome,
all 12 areas):

| Tier, time | Calls off → on | Programs | Triangles | Geometry MB |
|---|---|---|---|---|
| Low 14:00 | 345 → 345 | 80 → 80 | 1.674M → 1.674M | 160.2 → 160.2 |
| Low 22:00 | 523 → **380** | 80 → 80 | 2.020M → 2.020M | 160.2 → 160.2 |
| High 14:00 | 439 → 439 | 94 → 94 | 6.476M → 6.476M | 271.5 → 271.5 |
| High 22:00 | 629 → **486** | 94 → 94 | 6.840M → 6.838M | 271.5 → 271.5 |

- **High night calls**: 629 → 486. That is 144 free against the 630 ceiling, and the 40-call
  reserve is restored. The ceiling ratchets to 535 (target 480).
- **Where the 143 come from**: all from landmark batches. On High at 22:00 they draw about 49
  times (45 near and 4 far), against about 193 on main and 54 by day. These counts come from
  per-draw captures, leaving out full versions hidden behind their far version. The rest of the
  night draw list is unchanged, draw for draw.
- **Cost per facade draw**: 2 × 16 vertex uniform vectors in the one shared program, plus a loop
  of at most 16 compares per vertex. The loop stops at once for walls with no ranges, which means
  generic buildings and far boxes. Per-vertex bytes: 0. Textures: 0.
- **Per-frame CPU**: `sync()` writes three floats per run instead of copying a material per run.
- **Growth**: night windows add no draw for any building count. Each lit-wall group draws once
  whether it is lit or not. A coarse level that uses the generic material gets procedural windows
  inside its existing draws.

## Kept as they are

These night draws don't ride the wall program. Each is unlit (`MeshBasicMaterial`) or not a
facade. Moving them would change an approved look or need another program. Below is High's
22:00 default view from main, with the draws night adds over day.

- **Landmark custom night looks, kept as they are:**
  - Capitol lit windows, Floyd office windows: unlit window meshes;
  - Federal Reserve uplights, Georgia-Pacific eastern terrace uplights, Tower Square wash;
  - 1180 Peachtree edge light, Promenade Tower crown neon, Biltmore letters;
  - Grady, Atlanta City Hall, 25 Park Place, One12 Courtland (2, 2, 2 and 1 unlit meshes).

  14 draws in all.
- **Not facades:**
  - street lamp heads (6);
  - underpass pavement illumination (4, a ShaderMaterial);
  - King Memorial platform lights;
  - vehicle lamps.
- **Batch classes that can't share the program:**
  - a few front-sided landmark classes (4 draws at this view);
  - textured landmark meshes. Their runs keep the old night split.

  `stats.litWallOverflow` counts groups with more than 16 runs. It wasn't read from a live board.
  At the default view's 12 areas, the night batch count (about 49, under the day's group count)
  leaves no room for an overflowing group. R16 is unchecked.

## Verification

- **Matched frames**: the docs/perf.md views on High and Low at 14:00, 17:50 (dusk, a night factor
  between the probes) and 22:00, plus 12 landmarks at 11:30 and 23:30 on High and 3 on Low.
  - Captures: `speed=0`, `weather=clear`, after every area mounted and far versions settled.
  - High runs with `&perf=silent&nopass=grade`, because film grain is animated and swamps a diff.
  - Every night frame differs from main by at most 0.21% of pixels over 8/255, about the same
    as day frames, where nothing changed (up to 0.44%).
  - A second capture of main against itself, on six of the frames, gives the same numbers (Mayfair at night: 0.205% for
    main vs main, 0.202% for main vs this change). The fixed 0.08% over 32/255 is the radio's
    album art.
  - Sheets: [docs/perf.md views](log/facade-night/sheet-views.jpg) ·
    [landmarks](log/facade-night/sheet-landmarks.jpg).
- **Tests** (`landmark-batch.test.ts`):
  - lit walls draw once at night factors 0, 0.3 and 1, with each run's light from its source;
  - the batch shares the generic facade program's cache key;
  - groups with more than 16 runs fall back to the old split.

  With the merge disabled, the first two fail.
- **Open: device check.** `gl_VertexID` with a non-zero first vertex is core WebGL2, but some
  mobile drivers have mishandled it, and headless ANGLE-Metal can't show that. One night frame on
  the iPhone 15 Pro and the A16 before release: at the default view at 22:00, landmark panes
  should glow as they do on release 19.
