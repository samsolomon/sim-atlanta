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
3. The sunlit and shaded medians must stay inside the family's range as measured on the generic reference. In practice, rendered S ≤ 36 (teal 40), and rendered V in sun ≥ 40.
4. Put the numbers in the PR body.

**Saturation cap:** S ≤ 36, except teal, which is ≤ 40 and photo-backed. Above that, glass reads as paint under the colour grade.

## If Sam approves

1. Add the palette table and the two rules to the shared spec in `docs/building-skins.md`.
2. Export the family names from skin-kit as constants, for example `GLASS.clear` and `GLASS.dark`, each a small set of pane colours inside its range. Then new skins pick a family instead of a hex value.
3. Move the buildings listed above in one small follow-up per worker. Each changes only colour constants, with matched day crops before and after. There are no draw, triangle or program changes.

Landmarks still look real: photo-backed distinctive glass stays, including 1105's green, Hanover's and Square on 5th's teal, the Atlantic and the Proscenium.
