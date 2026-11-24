# Atlanta freight consists

Sam approved the direction on November 23, 2026. The rolling-stock workstream owns the car library and the downtown and Brookwood consist builders. The Model Lab shows one vehicle per freight entry. City will assemble those vehicles into illustrative passages. Today downtown repeats two locomotives and five boxcars, while Brookwood repeats two NS-like locomotives and eight boxcars.

## Car kit and build order

Dimensions below are **proposed modelling envelopes** in metres, length over couplers × width × height above rail. They represent one common silhouette per class. Confirm a build drawing or roster specification before cutting each final body. Triangle ceilings include trucks, couplers and load. Estimates are focused artist/developer days including both tiers, screenshots and tests, excluding Sam’s review time. The existing 16.8 m boxcar remains the reference for scale.

| Order and vehicle | Envelope | Low / high triangles | Work | Atlanta evidence and identifying features |
| --- | --- | ---: | ---: | --- |
| 1. Covered grain hopper | 18.0 × 3.2 × 4.7 | 900 / 2,200 | 1–1.5 d | Covered hoppers photographed at Inman and Doraville support a grain unit or a light-grey manifest block. Model roof hatches and three tapered discharge bays. [NS gallery](https://www.norfolksouthern.com/en/newsroom/multimedia/photos/trains--yards--and-commodities) · [Doraville, June 2012](https://www.rrpicturearchives.net/showPicture.aspx?id=3077598) |
| 2. Boxcar, existing body | 16.8 × 3.2 × 4.55 | 900 / 1,800 | 0.5 d | A boxcar photographed on a CSX freight through Tilford supports this manifest staple. Retain its sliding door and ribbed roof, add faded oxide and blue options. [Tilford boxcar photo album](https://www.rrpicturearchives.net/albums/3829) |
| 3. Intermodal well, single 53-foot platform | 21.3 × 3.1 × 6.2 stacked | 950 / 2,200 | 1.5–2 d | Container staging alongside tracks at Inman anchors the intermodal recipe. Low well sides expose the upper container. Model one independent two-truck well first. An articulated set needs shared trucks at platform joints. [Atlanta Regional Commission, figure 21](https://cdn.atlantaregional.org/wp-content/uploads/nw-atlanta-freight-cluster-plan-industrial-dev-jobs-report-draft.pdf) |
| 4. General-service tank, DOT-117 family study | 18.4 × 3.2 × 4.7 | 1,000 / 2,400 | 1–1.5 d | A tank car alongside a hopper at Doraville supports mixed traffic. Rounded heads, protected fittings, walk and ladder distinguish it at distance. The photograph establishes the car family only. The DOT-117 choice and ethanol recipe are illustrative. [Doraville car identification](https://www.rrpicturearchives.net/showPicture.aspx?id=3077598) · [Railroad equipment photos](https://www.up.com/news/service/tr181121-rail-car-types) |
| 5. Open mill gondola | 17.4 × 3.2 × 3.0 empty | 800 / 1,800 | 1 d | The Winder photograph gives regional evidence for a scrap or empty block. Deep open trough, ribbed sides and a low, irregular scrap load distinguish it from a closed hopper. [Georgia freight car album](https://www.rrpicturearchives.net/albums/57990) |
| 6. Centerbeam lumber flat | 24.0 × 3.2 × 4.7 | 950 / 2,200 | 1–1.5 d | The empty car on NS at Mableton exposes the center truss and tall end bulkheads. Alternate empty and wrapped lumber loads within a block. [Mableton, January 2015](https://www.rrpicturearchives.net/showPicture.aspx?id=4086885) |
| 7. Enclosed autorack | 28.6 × 3.2 × 5.8 | 1,000 / 2,400 | 1.5 d | A photographed autorack train on the NS main downtown supports an automotive passage. Use screened side panels, end doors and a high arched roof. Long truck spacing needs a dedicated curve-clearance check. [Atlanta area photo album](https://www.rrpicturearchives.net/albums/3468) |
| 8. Open coal hopper | 16.3 × 3.2 × 3.8 | 850 / 2,000 | 0.75–1 d | A Southern hopper was photographed passing Howell Tower A. Use the open rim, sloped bays and dark heaped load for an optional unit recipe. Load and current frequency are estimates. [Alan Page, Howell, July 2017](https://www.rrpicturearchives.net/albums/126318) |

Use a shared two-axle truck, wheel diameter, knuckle coupler, sill and bolster builder with per-class truck centers and length. A well needs a depressed floor, a tank needs stub sills, and a hopper needs open space below its bays. Bake those parts into one vertex-coloured geometry per car/LOD/load for instancing. Use painted ribs at low detail and geometry for projecting handbrakes, running boards and end ladders at high detail. Seed restrained dust, fading and rust by block. Omit lettering, reporting marks, graffiti, logos and road numbers. The equipment gallery provides cross-checks for silhouette and cargo. [Union Pacific equipment photographs](https://www.up.com/news/service/tr181121-rail-car-types)

### Built: three-bay covered grain hopper

The envelope follows Greenbrier's 5,400 ft³ covered hopper data sheet (October 2019): 58 ft 8 in over couplers, 10 ft 8 in wide and 15 ft 6 in tall. [Greenbrier 5400 data sheet](https://www.gbrx.com/wp-content/uploads/2021/06/5400cf-Covered-Hopper-Railcar.pdf). The model is 17.88 m long, 3.25 m wide and about 4.72 m to the roof walk. The 13.4 m truck centres, bay slopes, outlet gates, roof walk, end platforms and ladders are estimated from the Doraville and Inman photographs above. It uses the boxcar's trucks, wheels and couplers on a narrow through sill, in a light-grey paint with no lettering. Triangles: 660 low, 1,000 high. Lab entry `freightGrainHopper`. Brookwood Main 2 now runs two NS-like locomotives, three hoppers and five boxcars. Low tier keeps separate meshes with the reduced shape and the shared freight Lambert, so it adds no shader program (90/90). [Lab and City, day and night, both tiers](log/freight/grain-hopper/comparison.jpg)

### Built: boxcar paints

The existing 50-foot-class boxcar now comes in three paints, all with the same shape and material. Each paint is one baked vertex-colour geometry, so it adds a draw only where it appears and adds no shader program.

- **Oxide.** The original paint.
- **Faded.** A sun-bleached brown with three darker painted-out patches per side where markings were removed. Reference: [SOU 531111, June 26, 2016](https://commons.wikimedia.org/wiki/File:SOU_531111_(27843222280).jpg), CC BY-SA 2.0, by Dan from PQ. That car is ex-Southern and is still in Southern lettering under NS. Its graffiti and lettering are omitted.
- **Blue.** The dark blue of CSX-family plug-door cars. Reference: [Boxcar, CSX, Danville IL, 1987](https://commons.wikimedia.org/wiki/File:Boxcar,_CSX_-_10586756734.jpg), CC0, by Gary Lee Todd. The yellow lettering is omitted.

Colours were set by eye against the photos in rendered Lab frames, with inputs brighter than the photos because the grade crushes dark blues. Downtown, the CSX-like train now runs three blue cars and two oxide. Brookwood's NS-like train runs three hoppers, three faded cars and two oxide. Each car is 800 triangles, unchanged; the faded paint adds 12 for its patches. [Lab and City, day and night](log/freight/boxcar-variants/comparison.jpg)

### Built: 53-foot double-stack well car

The envelope follows Greenbrier's [53′ Husky-Stack](https://www.gbrx.com/railcars/53-all-purpose-double-stack-car/): 76 ft 8.75 in (23.39 m) over couplers, with a 53 ft well. The plan's 21.3 m estimate was short. The model has:
- truck centres at 19.2 m (estimated);
- a well floor 0.36 m above the rail (estimated);
- deep side girders, with end platforms over the trucks.

Containers are 53-foot domestic high cubes, 16.15 × 2.59 × 2.90 m. The double stack tops out at 6.16 m, within Plate H's 20 ft 2 in. Three loads are baked as separate geometries, so colour adds no shader permutation:
- `wellA`: white over red-brown;
- `wellB`: blue over grey;
- `wellC`: a single faded mustard box.

There is no lettering. Triangles: 1,652 high and 524 low (1,160 and 512 single-stack). Lab entries: `freightWellA`, `freightWellB` and `freightWellC`.

### Built: general-service tank car (DOT-117 family)

The envelope follows Greenbrier's 30,600-gallon ethanol tank car drawing: 59 ft 10 in over pulling faces (18.24 m) and 46 ft 7.5 in truck centres (14.21 m). [Greenbrier tank cars](https://gbrx.com/?p=1125)

**Estimated from photographs:**
- the 3.05 m tank diameter;
- the 2.45 m centreline height;
- the head shields and stub sills;
- the end platforms and ladders;
- the protective housing over the top fittings.

**Model:**
- Black, with one faint rust streak and no placards or lettering.
- The DOT-117 choice is illustrative, and so is any "ethanol" reading of a tank unit train.
- The paint inputs sit well above true black (`#45484d`), because the City grade crushes near-black into a silhouette.
- At night the unlit black cars are nearly invisible from orbit.
- Triangles: 1,392 high and 636 low. The Lab entry is `freightTank`.

**Use in trains.** Tanks join the manifest car list, and unit trains now choose grain hoppers or tanks. `CONSIST_VERSION` is 2, so every slot is re-dealt.

### Built: City consists

Each passage is a pure function of the line, the signed slot and `CONSIST_VERSION`, in `web/src/city/freight-consist.ts`.
- **Hashing.** FNV-1a and mulberry32, with Fisher–Yates for type choice. There is no `Math.random` or frame state.
- **Downtown.** Uses fixed 15-minute slots from the epoch, alternating direction. The longest possible train is checked against the mapped span.
- **Brookwood.** Keeps its 20-minute alternating slots and still yields to the Crescent.
- **Recipes:**
  - Downtown (CSX-like): manifest 65 %, unit 35 %. There is no intermodal downtown, because double-stack clearance through the cut is unverified.
  - Brookwood (NS-like): manifest 45 %, intermodal 35 %, unit 20 %.
- **Manifest blocks.** Six to 24 cars in blocks of 3–8, using up to three types from the three boxcar paints and the covered hopper.
- **Intermodal.** Eight to 30 wells, using two of the three loads.
- **Unit trains.** Twelve to 30 covered hoppers.
- **Power.** One unit below 180 m of trailing cars, two up to 399 m, three from 400 m. The lead always faces forward; trailing units may run long hood forward. One road type is used per lash-up:
  - CSX-like: CM44AC or ES44AH, with a GP38-2 on short CSX manifests.
  - NS-like: AC44-type, ES44AC or SD70ACe.
  - About one multi-unit passage in twelve has a foreign trailing unit.
- **Deferred.** Distributed power is optional in this plan and not built yet.
- **Draw cap.** Each passage draws at most two power kinds and three car kinds (manifest), two (intermodal) or one (unit). That makes the cost a fixed number of instanced draws per train, the same on both tiers.

**Measured (Studio, dev build, low tier, `?q=low`):**

| Train | Draws |
| --- | --- |
| 15-car downtown manifest | 3 |
| 22-car downtown unit train | 2 |
| 31-unit Brookwood intermodal | 3 |
| 16-unit Brookwood intermodal | 3 |

- `update()` averaged 0.006–0.007 ms per train in a Node microbenchmark on the Studio. That is not a phone figure.
- **Programs.** The same production build and URLs were measured with and without low-tier instancing:
  - `t=2026-11-23T14:02-05:00&speed=60`: 88 → 90.
  - `22:02` swept: 91 → 93.
  - The swept night baseline already exceeds the 90 ceiling that the stock 14:00 perf clock reports.
- **Clip-plane padding.** three.js compiles one program per clipping-plane count. So every freight material is padded to 6 planes (`FREIGHT_CLIP_PLANES`) with planes that never clip, and all instanced freight shares one program. The same production builds, measured on the low tier before and after padding:

  | URL | Programs before | Programs after |
  | --- | ---: | ---: |
  | Stock `2026-11-20T14:00` | 82 | 80 |
  | Day `2026-11-23T14:44` | 81 | 80 |
  | Night `22:22:30` | 86 | 84 |
  | Day sweep `14:02&speed=60` | 84 | 82 |
  | Night sweep `22:02&speed=60` | 87 | 85 |

  Draws were unchanged. Mouth and board-edge cuts still clip ([downtown mouth](log/freight/consists/clip-mouth.jpg), [Brookwood west edge](log/freight/consists/clip-edge.jpg)).
- **Not changed yet.** Road traffic's instanced, clipped Lambert cars (`road-traffic.ts`) carry the 4 board-edge planes. Padded to the same 6, they would share the freight program. Buses and streetcars set clip planes too, but they are not instanced Lambert in the same way; check their program keys before padding.
- **Card.** It reads the passage record: railroad, consist summary and lead unit. It is no longer derived from the line name, which closes #291's plausible finding. It stays Illustrative.

## Passage selection and power

Derive the passage index from a fixed UTC epoch and fixed line-specific slot length. Use floor division for dates before the epoch. Hash the stable line ID, signed slot and recipe version. Draw direction, recipe, length, locomotive selection, trailing orientation, blocks and paint from that seed. Never advance shared random state from animation frames. Give downtown a slot long enough for the longest approved train to leave the board. Keep Brookwood’s 20-minute slots and yield to the scheduled Crescent. Compute tail clearance from the chosen cars’ lengths and coupler gaps. Seeking a given instant from either direction, reloading and changing quality must select the same train.

* **Manifest.** Start with 6–24 cars in blocks of 3–8 like cars. Draw boxcar, hopper, tank, gondola, centerbeam or autorack blocks. Partition length first so the final block has at least three. Favour manifest on the downtown CSX-like passage, with smaller locals; include it on the NS Norcross District through Brookwood. Howell mixed freight is a useful visual reference. [Howell and Inman photo sequence](https://www.rrpicturearchives.net/albums/126318)
* **Intermodal.** Use 8–30 wells. Vary container colours and single/double stacks within the available clearances. Weight this recipe most heavily on a mapped Inman approach; allow it on through CSX and NS mains. Verify clearance before using double stacks in the downtown cut. Inman, Howell, and the former Tilford yard provide geographic context; they are not all modelled operating yards. [Inman yard photographs](https://cdn.atlantaregional.org/wp-content/uploads/nw-atlanta-freight-cluster-plan-industrial-dev-jobs-report-draft.pdf)
* **Unit.** Choose a single commodity and car type for 12–30 cars: covered hoppers for grain, open hoppers for coal or tanks for an illustrative ethanol movement. An autorack-only automotive train is another single-type option. Avoid randomly interleaving commodities. A photographed grainer waiting beside the Tilford transfer supports a grain option. [Howell transfer and grain train](https://www.rrpicturearchives.net/pictures/1940524)

Scale the proposed power count by trailing length: one unit below 180 m, two at 180–399 m, three from 400 m. Point the lead cab toward travel in both directions, using truck samples ordered along travel even when chainage decreases. A seeded flip applies only to trailing units. Choose CSX-like power on CSX lines and NS-like power on NS lines using explicit line metadata. Allow at most one foreign trailing unit on roughly one in twelve multi-unit passages. Prefer road power for long trains and reserve the GP38-2 for locals. For a train at least 450 m long, occasionally place its third unit two-thirds back or at the rear as distributed power. Count it within the three-unit total. Frequencies and thresholds are art choices.

## Rendering, selection and acceptance

Use the existing FreightBatches key of geometry plus clipping material. Reuse existing material instances and shader programs. In the current renderers high tier uses instancing and low tier uses individual meshes. Both tiers now draw each train as one instanced batch per car kind and clip material (see *Built: City consists*). Instancing the clipped Lambert on low costs two programs, measured below; every car reuses the one freight material. Measure the actual renderer program count, especially across tunnel mouths. Any additional program at the stated 90/90 ceiling blocks that integration.

For one unobstructed visible train, target low/high colour draws of 2–3 / 2–5 for a unit or intermodal train and 3–5 / 3–8 for a manifest. Budget one draw per distinct visible geometry/load and power variant per clipping group. Shared paint across a block can be baked into a bounded geometry variant; count each active variant. Do not enable per-instance colour if it creates a shader permutation. A downtown train spanning openings can draw several clipping groups; report actual peak calls and occupied groups separately. Reuse instance capacity across passages without creating a new pool each slot. Preserve pickable car poses and stable train IDs.

Phone fallback uses a simpler far mesh for the **same** cars and loads, preserving train length, DPU position, selection and replay. Remove wheel backs, roof walks and small fittings first; merge shade changes into vertex colours. Validate both City tiers with the full board and both travel directions. Record day/night Lab and City shots per car or small group, triangles, draw calls, program counts and memory. Include clipped endpoints and a long car on a curve.

The freight card keeps **Illustrative**. Example: “Manifest · 15 cars · 2 locomotives” and “Modelled consist for this passage.” Derive count, scheme and recipe from the passage record; keep source tier illustrative even where line ownership is known. Do not claim cargo, dispatch time or actual consist as reported. Ambient scenery needs no new label.

## Delivery

Start with a three-bay covered hopper and the common running gear alongside the existing boxcar. Give it a standalone Lab entry and a short illustrative block for City review. Subsequent car PRs follow the table; each gets both tiers, day/night captures, performance results and Sam’s visual approval before merge. Allow another 2–3 focused days for the full seeded selector, power orientation, clipping/picking and recipe card once the required bodies exist. Test forward lead on both signs, stable seed across seeks and tiers, 1–3-unit thresholds, block sizes, DPU eligibility and retained Crescent priority.
