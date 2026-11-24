# Glass palette for skinned towers

**Status:** proposal for Sam (2026-11-24). Nothing changes until he picks.

## Problem

Each glass tower skinned tonight was matched to its own photos by a different worker. Each match is defensible on its own. Side by side, though, they skew to dark, saturated blues and teals. The generic buildings around them are pale grey-blue: saturation (S) 13–23% and value (V) 64–76% in HSV.

- Eleven of the 25 skinned glass bases sit at V ≤ 54, darker than any generic tower.
- Several are much more saturated: NCR S44, Two Midtown Plaza S46, Square on 5th S43, Sora S41.

From the 500–600 m orbit, the darkest read as near-black slabs. Their modelled mullions, bands and setbacks disappear, which is why #451 was sent back. The district reads as a patchwork of unrelated blues.

## Evidence

All views are the high tier on 20 Nov 2026, with clear weather.

- **[Every skinned glass tower at 11:30](log/ui/glass-palette/towers-11.jpg)** and **[at 16:30](log/ui/glass-palette/towers-16.jpg).**
  - Each tile uses the same bearing (20°), tilt (55°) and zoom (1.5), so only the building changes.
  - The swatch under each tile is the glass base colour from source.
  - A few tiles are partly occluded by neighbours: 1072 West Peachtree, Midtown Union and NCR.
- **[Two wide Midtown views](log/ui/glass-palette/wide.jpg)** at 11:30 (left) and 16:30 (right):
  - `cam=800,-3710,70,50,1021`
  - `cam=480,-3400,200,52,1700`

## Glass bases today

Sorted by value. Generic towers are `#8fa4b6`, `#9fb0bd`, `#7f93a4` and `#a8b8c2`: H 203–208, S 13–23, V 64–76.

| Building | Glass base | H | S | V | Proposed family | Change |
|---|---|---:|---:|---:|---|---|
| Four Seasons | `#3f4b59` | 212 | 29 | 35 | Dark | Lift to the floor, about `#4b5868` (V 41) |
| 10 10th | `#3f5361` | 205 | 35 | 38 | Dark | About `#4c5d69` (S 28, V 41) |
| 1075 Peachtree | `#46606e` | 201 | 36 | 43 | Dark | About `#4f6570` (S 29, V 44) |
| Metropolis (low) | `#4b676e` | 192 | 32 | 43 | Dark | About `#52686d` (S 25) |
| NCR HQ (low) | `#3f5a70` | 207 | 44 | 44 | Blue | About `#5a7189` (S 35, V 54) |
| 1105 West Peachtree | `#4d6c72` | 190 | 32 | 45 | Green-tint | **Keep.** The green glass is in the photos. |
| 903 Peachtree | `#527482` | 198 | 37 | 51 | Blue | About `#5c7a88` (S 33) |
| Nomia | `#5b7783` | 198 | 31 | 51 | Blue | Keep |
| Midtown Union (low) | `#4f6b84` | 208 | 40 | 52 | Blue | About `#5d7891` (S 36, V 57) |
| The Atlantic | `#5b6e84` | 212 | 31 | 52 | Blue | **Keep.** Tan stone leads the look. |
| Sora | `#4f7e86` | 189 | 41 | 53 | Teal | Keep only if the photos show teal; otherwise green-tint, about `#5f8287` |
| Square on 5th | `#4f8a86` | 176 | 43 | 54 | Teal | Keep, but cap S at 40, about `#558c88` |
| ViewPoint | `#56708a` | 210 | 38 | 54 | Blue | About `#5e778e` (S 34) |
| 1100 Peachtree | `#6c7f92` | 210 | 26 | 57 | Blue | Keep |
| 171 Seventeenth | `#607d92` | 205 | 34 | 57 | Blue | Keep |
| Hanover Midtown | `#5f949b` | 187 | 39 | 61 | Teal | **Keep.** Teal glass is in the photos. |
| 999 Peachtree | `#6d8fa9` | 206 | 36 | 66 | Blue | Keep |
| Ascent Midtown | `#7f97a8` | 205 | 24 | 66 | Clear | Keep |
| Twelve Midtown | `#7fa9a5` | 174 | 25 | 66 | Green-tint | Keep |
| 1072 West Peachtree | `#7d97ad` | 207 | 28 | 68 | Clear | Keep |
| Two Midtown Plaza | `#5d82ad` | 212 | 46 | 68 | Blue | About `#6a87a6` (S 36). Keep the maroon bands and red granite. |
| 77 12th Street | `#7d9db2` | 204 | 30 | 70 | Clear | Keep |
| 1010 Midtown | `#7ea6bf` | 203 | 34 | 75 | Clear | Keep |
| Emmi Midtown | `#8eafc4` | 203 | 28 | 77 | Clear | Keep |
| Loews | `#9db4c4` | 205 | 20 | 77 | Clear | Keep |

Also distinctive, and outside the glass families: the Proscenium's blue ribbon bands, Two Midtown Plaza's red granite and the Atlantic's tan stone. Open PRs follow the same table: #451 271 Seventeenth (sent back) and #454 712 West Peachtree (in rework).

## Proposed palette

Five named glass families, plus bronze for when a photo shows it. Ranges are HSV values for the glass *base*. Panes can vary within ±4 V for life, as they do today.

| Family | H | S | V | Use |
|---|---|---|---|---|
| **Clear blue-grey** | 200–212 | 16–28 | 62–76 | The default. It sits within the generic towers' range. |
| **Blue** | 204–214 | 26–36 | 52–68 | Reflective blue glass seen in photos. |
| **Green-tint** | 172–195 | 18–32 | 52–68 | Low-iron green or tinted glass, as at 1105 and Twelve Midtown. |
| **Teal** | 172–192 | 30–40 | 52–64 | Only where photos show it plainly, as at Hanover and Square on 5th. |
| **Dark** | any cool hue | ≤ 30 | **40–48** | Tinted or very reflective glass. See the floor below. |
| Bronze | 25–40 | 18–32 | 40–55 | Bronze-tinted glass, only from photos. |

**Dark-glass floor:** no daytime glass base below **V 40**, or mean pane luminance about 0.16. At V 35–38, a 500–600 m view loses the mullion, band and setback detail that skins model. That is what happened with Four Seasons and 10 10th tonight, and with #451. Night is unaffected, because lit panes are emissive.

**Check rendered pixels, not only the constant.** The colour grade, sky fill and shadow tint shift glass away from its base constant: MAA Midtown's corner (`#7fa3bd`, S 33) renders deeper blue than that in its sheet. Apply both rules to the base constant **and** to rendered pixels:
1. In the 11:30 high-tier shot, sample the median HSV of one sunlit and one shaded patch of glass. Avoid mullions and lit panes.
2. Sample a generic glass tower in the same frame as a reference.
3. **Binding:** the sunlit median must have rendered S ≤ 36 (teal 40) and rendered V ≥ 40. **Shade reading is advisory** (coordinator, until Sam decides on the grade): record the shaded median and a generic tower's shaded median from the same frame. Send a skin back only if its shaded face is visibly the most saturated thing in the frame. Background: The shadow tint pushes any dark glass far over S 36 in shade, and even generic towers read about S 37 there. 271 Seventeenth's test showed this: bases at S28/V58, S15/V58 and S13/V62 rendered S96, S67 and S55 in shade, while sunlit the last two read S10 and S7. Only the grade alternative below fixes shaded saturation.
4. Put the numbers in the PR body.

**What base values land in range.** The grade and shadow tint raise rendered saturation more as glass gets darker. I sampled the median HSV of glass pixels in the centre of every 11:30 tile in the contact sheet. Some centres fall on shadow, slots or a neighbour, so these numbers are indicative, not exact.

| Base value (V) | Rendered S compared with base S | Example: base → rendered (S/V) |
|---|---|---|
| 62–77 (light) | about the same, ±6 | 77 12th 30/70 → 34/47; Emmi 28/77 → 34/56; Ascent 24/66 → 29/40 |
| 50–60 (mid) | +10 to +15 | 171 Seventeenth 34/57 → 47/44 |
| 35–45 (dark) | +30 or more | Four Seasons 29/35 → 66/25; 1075 36/43 → 66/31; 10 10th 35/38 → 69/27 |

So, to land under the rendered cap of S 36:

| Base value | Use a base saturation of |
|---|---|
| ≥ 62 | ≤ 30 |
| 50–60 | ≤ 22 |
| 40–50 (the dark family) | ≤ 15. Dark glass should be near-neutral grey with only a slight cool tint. |

These are starting points, not proof: the rendered-pixel check in the PR still decides. For punched-window buildings, where panes are about 4 px at the start camera and ink outlines dominate the median, take the sample from a closer camera at the same sun time.

**An alternative for Sam: fix it in the grade.** Dark glass gaining 30+ saturation points means the cause is upstream of the glass. The colour grade and shadow tint push every dark, cool surface toward saturated blue. A small grade change would fix dark glass on every building at once, with no per-building constants to tune. Two candidates:
- less blue lift in the shadows;
- a saturation rolloff at low values.

But it would also change every other dark surface: roofs, asphalt, water, shaded walls and the whole night look. That makes it an art-direction decision for Sam, not a skin fix. Until he decides, workers compensate in the base constants using the table above.

**Saturation cap:** S ≤ 36, except teal, which is ≤ 40 and photo-backed. Above that, glass reads as paint under the colour grade.

## If Sam approves

1. Add the palette table and the two rules to the shared spec in `docs/building-skins.md`.
2. Export the family names from skin-kit as constants, for example `GLASS.clear` and `GLASS.dark`, each a small set of pane colours inside its range. Then new skins pick a family instead of a hex value.
3. Move the buildings listed above in one small follow-up per worker. Each changes only colour constants, with matched day crops before and after. There are no draw, triangle or program changes.

Landmarks still look real: photo-backed distinctive glass stays, including 1105's green, Hanover's and Square on 5th's teal, the Atlantic and the Proscenium.

## Held branches, ready when Sam picks

Each branch changes colour constants only, for buildings that are already merged. Each needs a rebase and re-shoot before it opens as a PR.

| Branch | Owner | Changes |
|---|---|---|
| `samsolomon/glass-palette-midtown-culture` (d20f8720) | Culture agent | Four Seasons `#3f4b59` → `#4b5868` (V 41). Square on 5th `#4f8a86` → `#558c88` (S 40). Two Midtown Plaza `#5d82ad` → `#6a87a6` (S 36). |
| `samsolomon/glass-saturation-held` | skins-6 | NCR and Midtown Union glass saturation brought to S ≤ 36 |
| `samsolomon/palette-hold-coke-euhm` (a23eed89) | skins-7 | One Coca-Cola `#4b565b` (V 36) → `#6a7378` (S 12, V 47). EUHM stair tower `#5d7f98` (S 39) → `#6d8090` (S 24, V 56). |
| (to confirm) | skins-3 | Amli's dark field `#2f3a44` (V 27) lifted to V ≥ 40 |

**Signature landmarks the pick would move (Sam reviews; no change tonight):** Promenade Tower (`web/src/city/midtown-promenade.ts`). Its glass bases #5a525c, #6b626b and #4e505e are V 36, 42 and 37, so two of the three sit under the V 40 dark-glass floor before the grade. In shade from about 100 m it reads near-black navy, with the granite #826e68 showing as a pink grid. Rendered readings from the default view and a 600 m view will be added here.

Skins merged before the provisional rules that aren't on a held branch yet: 1075 Peachtree, 10 10th, Metropolis (low glass), 903 Peachtree, ViewPoint. Their owners prepare branches only if Sam asks.
