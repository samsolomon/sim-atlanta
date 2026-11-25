# Private four-site highway study

Frozen City 955f5f56e7386575d58381649134d28d723c30b5. The prior I-85 Exit 86 study 82a8ba76 shares ancestor 234d62a3. Its signed lane movement and stock replay concern different ways from the I-75 split at Deering. PR #153 introduced the highway model, #223 the Midtown traffic work and #675 the integrated traffic behavior. They provide shared consumers. None documents these four original views.

## 01. I-75 southbound at Deering

The road and adjacent Norfolk Southern bridges independently locate the split. Travel is southeast. Donor 358758245 v15 has six lanes. Median-side 29013401 v21 takes three and outer through way 9238120 v26 takes four. The reported destinations permit the third donor lane to choose either branch. Destination and maneuver tags do not provide stripe endpoints. Left-to-right receiving ordinals are inferred from the aerial. The existing generic right-link offset assigns the three-lane branch to donor lanes 4–6, crossing the through carriageway. It paints both edges and interior dividers for both resulting rectangles.

[2024 county orthophoto export](deering-source.txt) and [signed station strip](deering-register.png). The strip uses concatenated 358758245 → 9238120 axis station zero at their shared node (−397.32, −4917.12). Across-track ordinate increases to the driver's right at 0.25 m per pixel, from −55 m at row 20. Deering Road 38978854 crosses the receiving ways near +91/+93 m, the NS 38978865 axis near +121/+126 m. The aligned image shows one paved approach well beyond the OSM node, an opening separator around +20 to +55 m, distinct edges before the first overpass, and physically separate branches beyond the rail bridge. The overpasses obscure paint beneath them. Shoulder widths, intermediate sections, exact divider tips and construction elevations are inferred.

## 04. I-85 northeast board edge

USGS 3DEP GA_Statewide_B2_2018 EPT tiles (SHA-256 in east-source-hashes.json). East profiles store source-axis X/Z and NAVD88 median elevations in metres at driver-left 7 m, center and driver-right 7 m. Samples use a 1.7 m radius and prefer classified deck (17) over ground (2). The last flag denotes a bridge-tagged way. The model interpolates the sampled crossfall to five 3.55 m lanes and 1.8 m shoulders. The 0.65 m structural depth is illustrative. Road thickness, pier locations and physical clearance have no measurements in this fixture.

NB 38983378 and 369529892 share one surface across their internal source split. SB 38982156 meets 38983384 inboard. Each landing blends across the last ten metres of the approach to the actual terrain. The cut at x=1800 clips the resulting triangles. It has no source abutment. A distinct GA13 two-lane plus one-lane intake lies southeast. Its paint and stock movement require separate treatment.

## 02. Southbound Exit 250

Frozen 955f5f56 puts two solid edges inside a shared lane. At through-way stations 10, 40, 60 and 90 m, the baseline signed separation of the two lines is −3.557, −3.417, −1.995 and +1.795 m on the rendered terrain. The lamp, curved driveway, triangular bank and stripe tips locate the fork independently of traffic color. The node at (−292.293, −4695.613) is 245.245 m downstream of site 01. Donor 9238120 v26 has four lanes. Its left two continue, the third serves both destinations and the fourth exits. Through 73954042 v21 carries three lanes and exit 27609107 v8 carries two. The signed ordinals follow the one-way travel direction.

[County aerial source](exit250-source.txt) and [rectified crossing](exit250-register.png). The horizontal scale is 0.25 m/pixel along donor → through. The vertical scale increases toward the driver's right from −19 m at row 20. The first common white gore tip appears at about +51 to +53 m on the through axis. Two margins separate beyond it. The bright outer edge and yellow median enclose the shared approach. The aircraft mosaic has a visible join near +155 m. Exact subpixel edges, widths between picked sections and the return to source geometry are inferred.
