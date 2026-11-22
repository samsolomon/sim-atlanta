# Downtown major arterials (input data for City traffic)

`scene/downtown/arterials.json` lists the drawn downtown roads that are defensibly matched to a
federal major-arterial record. Each one carries its permitted direction, per-direction volume and
lanes. The data is **inferred**: HPMS annual averages, shaped by the hour using `traffic.json`'s
TMAS profile. It is typical traffic, not live. The types and selector are in
`web/src/city/arterials.ts` (`loadArterials(json, vd)`).

## Generate

This runs as part of `pnpm data:city`, after `vignette.py downtown`:

```sh
.venv/bin/python pipeline/scripts/extract_overture.py roads   # includes the access restrictions
.venv/bin/python pipeline/scripts/arterials.py               # add --refresh to re-query HPMS
```

**Inputs:**
- `web/public/data/scene/downtown/vignette.json`, the drawn roads. Each run is an index into its
  `roads` array.
- `data/raw/overture_downtown_roads.geojson`, Overture `2026-11-18.0` segments with `id`, `name`,
  `class` and `access_restrictions`.
- The FHWA HPMS national map service, cached to `data/raw/hpms_downtown.json` along with the
  service name and data-edit date. An ArcGIS error or an empty result aborts the bake instead of
  being cached.

## Recorded source vintages

- **HPMS:** service `HPMS_National_2024_FullJoin`, records with `DATA_YEAR` 2024 and AADT value date
  (`AADT_VD`) 2024-01-01 on every matched run. The service data was last edited 2026-11-03. Each
  run also stores `match.hpmsYear`, `match.aadtDate` and `match.hpmsRoute`.
- **Overture:** release `2026-11-18.0`.

## What counts as a major arterial here

A drawn run is included only when every test passes. Otherwise it appears in
`coverage.rejected` with the reason.

1. It's an Overture `primary`, `secondary` or `trunk` road that is drawn. That means at-grade
   streets and street bridges; tunnels are excluded. Bridges keep their original `vd.roads` object,
   and the renderer's surface callback handles deck heights. This bake has 21 bridge runs.
2. The HPMS record that wins a length-weighted vote of 5 m samples has F_SYSTEM 3 (other principal
   arterial) or 4 (minor arterial). Samples must lie within 15 m, with bearings within 20°.
3. The names agree after normalisation (Street → St, Northeast → NE, a trailing direction dropped).
   There are two sourced exceptions:
   - **Shirley Clarke Franklin Blvd = Central Ave** in HPMS. The Atlanta City Council renamed
     Central Ave SW, from Decatur St SE to Pryor St SW, on 2025-02-03.
   - **Northside Dr:** HPMS has no RouteName for these records. They are identified by route
     number instead (RouteSigning 3, a U.S. route, number 19); US 19/41 runs along Northside Dr
     through the board. Such runs carry `match.by: "route-number"`.
4. At least 60% of the run is covered by that route.
5. Direction evidence agrees. A plain Overture one-way (`access_restrictions` denied on one
   heading, unconditional, covering the whole segment) needs HPMS `FACILITY_TYPE` 1 (one-way).
   - A two-way Overture road needs `FACILITY_TYPE` 2.
   - A conditional or partial restriction is rejected (`conditional-oneway`).
   - **Divided roads:** HPMS inventories a divided road once as two-way, while Overture draws two
     opposite one-way carriageways. Each carriageway gets half the AADT (`aadtBasis: carriageway`),
     and only when the opposite carriageway of the same HPMS record is also drawn. Otherwise it's
     rejected as `unpaired-carriageway`, so a divided road is never counted twice.

**Direction:** `allow` is relative to the run's own point order (`forward` means a → b).
Per-direction `aadt` and `lanes` are already directional, so count them once:
- a two-way road splits AADT and lanes in half (`two-way-split`);
- a one-way road gets all of both (`one-way`).
- A lane count is published only where HPMS supports it for that direction. A missing
  `THROUGH_LANES`, or one lane shared by two directions, leaves `lanes` without that key.

**Joining runs:** `from`/`to` are endpoint ids (0.5 m snap). The selector drops any run whose
baked endpoints are more than 0.5 m from the current drawn road, so an older or skewed bake
degrades by run. A missing or malformed file gives no arterials.

## Coverage (this bake)

There were 233 candidate primary/secondary/trunk runs. **155 matched**, in 16 corridors.

| Corridor | F_SYSTEM | Runs | Direction | AADT (per HPMS record) |
|---|---|---|---|---|
| Northside Dr | 3 | 9 | two-way | 33,700 |
| Courtland St | 4 | 15 | one-way southbound | 6,220–19,800 |
| Piedmont Ave | 4 | 15 | one-way northbound | 9,720–18,800 |
| Pryor St / Central Ave (Shirley C. Franklin Blvd) | 4 | 2 / 6 | one-way S / N pair | 5,070 / 9,870 |
| Washington St | 4 | 3 | one-way southbound | 19,800 |
| Marietta St, MLK Jr Dr, Decatur St, Edgewood Ave, Mitchell St | 4 | 10–22 each | two-way, with divided carriageways | 3,550–16,300 |
| Ivan Allen Jr Blvd, Ralph McGill Blvd, Trinity Ave, Peters St, Centennial Olympic Park Dr | 4 | 2–9 each | as mapped | 1,865–16,300 |

Courtland, Pryor, Piedmont and Central are checked in tests against their known one-way
directions.

**Rejected, by reason:**

| Reason | Runs |
|---|---|
| HPMS major collector (F_SYSTEM 5), including **Peachtree St** and Baker St | 42 |
| Local (F_SYSTEM 7) | 11 |
| Name disagrees | 14 |
| No HPMS record within 15 m | 4 |
| Unpaired carriageway | 3 |
| Freeway (F_SYSTEM 1/2) | 2 |
| Conditional one-way | 1 |
| Direction disagrees | 1 |

The name rejections include Capitol Ave SE, which HPMS calls Hank Aaron Dr; Spring Techwood
Connector against Spring St; and Ivan Allen Jr Blvd against Ralph McGill Blvd. That last rename
link is unverified, so it stays rejected.

**Known limits:**
- HPMS AADT is one annual average per record, and records are long, so many runs share a value.
- Lane splits for two-way roads assume symmetry.
- Turning movements aren't modelled.
- The older `traffic.json` keeps its own nearest-segment volumes for all roads. Some of those are
  false (for example, a service road carrying 33,700). Prefer `arterials.json` for arterial
  traffic.
