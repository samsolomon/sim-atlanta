# Midtown arterial traffic

Downtown's arterial traffic (`ArterialTraffic`) now continues onto Midtown's nine named arterials: Peachtree Street, West Peachtree, Spring, Juniper, Piedmont Avenue, 10th, 14th and 17th Streets and North Avenue. Volumes are **inferred**, from FHWA HPMS annual averages shaped by `traffic.json`'s hourly profile, as downtown's are. Car positions, spacing and colours are **illustrative**. The layer uses downtown's engine and route rules: each trip follows one corridor, and a fork, missing join or sharp turn ends it with a fade. There are no turns or signals, the same as downtown. No buses are drawn; live buses stay with `CityBuses`, and model cars yield to them through `buses.occupies()`.

## Bake

`pipeline/prototypes/midtown-arterials/build.py` writes `web/src/city/fixtures/midtown-arterials.json`. It caches HPMS to `data/raw/hpms_midtown.json` and applies downtown's tests (`pipeline/scripts/arterials.py`) to each drawn Midtown road on a named arterial:

- **Direction** comes from the OSM way the road was drawn from (shared vertices, `oneway` tag). The one-way pairs come out as expected: Spring and Juniper southbound, West Peachtree and Piedmont northbound.
- **Volume** comes from the HPMS record that wins a vote of 5 m samples within 15 m and 20°. The record must be F_SYSTEM 3 or 4, cover at least 60% of the road, and agree on direction. A one-way carriageway of a two-way record carries half its volume.
- **Names.** A road matches when its name is any of the record's `;`-separated names ("ALPHARETTA HIGHWAY;PEACHTREE STREET"), or when the record's ROUTE_ID is confirmed by name on exactly one street ("Spring St;9SO" confirms the unnamed "9SO" pieces). SR 9's "Roswell Road" runs over Peachtree, 14th and West Peachtree, so it identifies none of them. North Avenue's unnamed US 29 pieces stay unmatched.

The bake also rejects reversible and conditional one-ways, records that are not FACILITY_TYPE 1 or 2, and vertex pairs that two OSM ways claim in different directions. It matches 204 runs and rejects 90. North Avenue is the thinnest, with 10 runs. The client fixture keeps only the fields it reads (43 KB). Provenance and every rejection reason are in `pipeline/prototypes/midtown-arterials/report.json`. The layer loads as its own 6 kB (gzipped) chunk when a Midtown row mounts, and warns in the console if a mounted row's roads have drifted from the bake.

## Cost

At the low tier, from the wide camera (`cam=300,-3300,0,55,900`, 4:30 pm), the layer adds 2 draw calls and about 7.5k triangles (+0.5%). It uses downtown's cap: 24 cars at low, 60 at high. That's roughly 6% of the HPMS peak-hour count, the same proportion as downtown. Raising the cap would cost about 300 triangles per car and no extra draw calls.

[Before and after on Peachtree](log/ui/midtown-traffic/compare-peachtree-traffic.jpg) · [Night and low tier](log/ui/midtown-traffic/compare-traffic-night-low.jpg)
