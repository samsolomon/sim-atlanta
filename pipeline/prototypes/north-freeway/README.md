# Brookwood northbound I-85 tread

Sam’s 9.05.28 crop shows the northbound mainline beyond the three Brookwood spans. Its Low morning view could be reconstructed from the bridge outlines, parallel rail and neighboring roads. The original camera URL, exact clock and viewport were unavailable. Both members of each comparison use the same camera, Low tier, clear weather, 1200 × 720 viewport, DPR 1 and the paused clock at 08:01:12 EST on November 20, 2026.

| View | Before, d0251f98 | After, 9c2e854a |
|---|---|---|
| Northbound approach, camera 799,−5660,15,55,280 | [Before](evidence/before-nb-ground.webp) | [After](evidence/final-nb-ground.webp) |
| Neighboring spans, reverse camera 674,−5570,195,55,320 | [Before](evidence/before-decks-reverse.webp) | [After](evidence/final-decks-reverse.webp) |

## Surface evidence

OSM 1416312985 v1 and 369529900 v12 each report six northbound lanes. Their ground classification caused City to grade the driving surface down the side of an embankment outside the mapped bridge 484857197. The USGS Georgia Block 2 cloud has class-17 deck returns along both ways. On 369529900, all 39 center windows from 0 to 375.26 m have a class-17 band. At station 120 m the source-left, center and source-right medians are 260.65, 260.69 and 260.54 m NAVD88. Those three 1.8 m-radius windows contain 11, 10 and 12 class-17 returns. The physical soffit, pier locations, shoulder widths and permitted clearance remain unresolved. [Classified point source](https://usgs-lidar-public.s3.amazonaws.com/GA_Statewide_B2_2018/ept.json) · [Recorded classes, counts, medians and spreads](windows.json) · [OSM way](https://www.openstreetmap.org/way/369529900)

The portable fitter interpolates transverse heights from the two side bands and the center on the owning carriageway. Center height and its change along the road determine longitudinal grade. Crossfall comes from same-station differences between the three surface samples. The inferred surface retains the crown. The side bands are located at ±36% of travel width. City models each lane as 3.55 m here, for 21.30 m of travel width and two inferred 1.80 m shoulders. The tread adds a modeled 3.5 cm for terrain quantization and ties to the existing span’s 12 cm rendering offset over 10 m. Only the short exposed, class-2 landing transitions meet the drawn ground. A single dashed-marking phase and full-width triangulation precede clipping at the row seam. Traffic uses the indexed triangles of its owning source road. [Fitted rows](sections.json) · [Renderer and source adapter](carrier.ts)

The south tie begins on 28038801 and continues across 1416312985. The existing six-lane span 484857197 retains its profile. North of it, 369529900 continues over the row seam. At its mapped split, mainline 369529886 reports five lanes and exit 9238434 reports one. Both receive the shared tread until the observed deck bands transition to exposed class-2 pavement. The last 10 m of the 40 m landing return to the drawn terrain. The exact physical gore markings are inferred. At its terminal cross-section, the maximum through-road surface difference from terrain was 0.02 mm across the left, center and right control tracks.

The three continuing NS ways 144485854, 874902949 and 874902961 have no mapped intersection with a motorway, trunk or their links in the frozen R16 row. No rail grade enters the freeway fit. The one-lane lower ramp 38981788 is tagged tunnel, layer −1, beneath both mainlines. Its separate ground continuation 38981789 has a pre-existing drop of 3.62 m over the first 4 m of the sampled portal approach near (863.12, −5780.03). The before and after samples agree there. Physical portal grade and clearance remain unresolved.

## Measurements

Heights below are left, center and right on the rendered Low tread in metres NAVD88. Left-to-right crossfall is signed in travel direction. Longitudinal grade is the change in center height from the preceding 4 m station. The transverse probes span the inner 98% of travel width to avoid raster edge ambiguity. At station 125 m, this gives a 20.874 m baseline. Sam's visual estimate of 30° was never a fitted parameter.

| Source station on 369529900 | Before L / C / R | After L / C / R | Crossfall before → after | Longitudinal grade before → after |
|---:|---|---|---:|---:|
| 25 m | 257.43 / 256.60 / 255.81 | 257.56 / 257.55 / 257.43 | −7.76% → −0.65% | −4.18% → +3.70% |
| 61 m | 258.49 / 255.36 / 252.05 | 258.75 / 258.77 / 258.55 | −30.89% → −0.98% | −3.50% → +3.27% |
| 97 m | 259.61 / 256.31 / 252.45 | 259.92 / 259.94 / 259.77 | −34.27% → −0.75% | +2.81% → +3.00% |
| 125 m | 260.73 / 257.39 / 253.22 | 260.85 / 260.90 / 260.69 | −36.01% → −0.76% | +5.33% → +3.50% |
| 157 m | 261.73 / 258.97 / 255.39 | 261.87 / 261.93 / 261.78 | −30.39% → −0.45% | +1.93% → +3.10% |

All station samples and both tiers are in [stations.csv](stations.csv). The worst absolute transverse slope farther north on 369529900 dropped from 48.67% to 0.70% on the north row. Southbound mainline, adjacent ramp, both Buford-Spring carriageways and three previously drawn bridge spans retained their sampled heights. The final matched view shows the visible southbound car on pavement.

On each tier, all 2,808 synthetic sedan wheel paths on 1416312985 and 369529900 hit the uploaded asphalt triangles. The maximum difference from the traffic lookup was 0.00574 mm. Twenty-one lateral tracks queried 2 mm either side of the row boundary had a maximum height difference of 0.149 mm. A bounded Low replay using the normal ConnectorTraffic placement code, downtown weekday demand and the 48-car cap produced 18 northbound sedan poses at one-second intervals starting at the comparison clock. All 72 wheel locations hit pavement. Wheel-bottom gaps were +5.86 to +55.56 mm with the common 30 mm vehicle lift and pitch-only car pose. This is a separate road placement check from the train-follow evidence.

## Reproduce

Run from the repository root with pnpm dependencies and the staged downtown traffic data. The checks construct the City terrain and shared structural mesh in memory.

```sh
python3 pipeline/prototypes/north-freeway/bake.py
python3 pipeline/prototypes/north-freeway/verify.py > /tmp/north-freeway-stations.csv
cmp /tmp/north-freeway-stations.csv pipeline/prototypes/north-freeway/stations.csv
```

Portable geometry head `b170b534af59e2397ab52aaecdd75a88dfc46b9b`. The private City integration at `9c2e854ada179f4b750db5289f33c1b65e471171` wraps the row's existing transport inventory with `northFreeway` before City constructs its terrain. The public map has no fixture registration.
