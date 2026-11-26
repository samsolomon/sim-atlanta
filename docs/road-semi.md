# Road semi: long-hood sleeper tractor and 53 ft dry van

`web/src/vignette/road-semi.ts` draws a coupled tractor-trailer as one rigid body. The tractor has the proportions of a Peterbilt 589 sleeper, and the trailer is a generic 53 ft composite dry van. Neither carries a badge, oval, script, number or fleet mark. Traffic positions are `illustrative`.

The Model Lab entry is **Long-hood sleeper tractor · 53 ft dry van** (`/models.html?v=semi589`). Its Detail buttons switch forms: High shows the close form, which only the Lab draws. Low shows the traffic form, which City would draw at every distance, street-eye included, because traffic draws one mesh per kind. A midsize sedan follows 4 m behind for scale.

Status (2026-11-26): this is a Lab study awaiting Sam's approval. City traffic still draws the earlier 19.16 m rigid semi from `vehicles.ts`.

## Dimensions

| Item | Value | Source |
|---|---|---|
| Bumper to front axle | 31 in (0.787 m) | Peterbilt body-builder manual, figure 3-2, 589-131 |
| Bumper to back of cab | 130.9 in (3.325 m) | same |
| Wheelbase, steer axle to tandem midpoint | 280 in (7.112 m) | dealer build specification |
| Sleeper length | 72 in (1.83 m) | dealer build specification |
| Frame overhang behind the tandem midpoint | 1.51 m | **estimated** from the dealer side photo (steer hub x≈91, tandem midpoint x≈649, frame end x≈768 in an 800 px copy) |
| Fifth-wheel pin | 0.23 m ahead of the tandem midpoint | **estimated** (study) |
| Tractor heights: hood, cab roof, sleeper roof, stack top | 2.15, 3.01, 3.45, 3.71 m | **estimated** (study); the dealer side photo, scaled by its tyres, reads about 1.9, 3.0, 3.35 and 3.9 m |
| Van length, width, height | 53 ft × 102.4 in × 13 ft 6 in (16.154 × 2.600 × 4.115 m) | Great Dane Champion spec; Wabash DuraPlate sheet |
| Kingpin setback | 36 in (0.914 m) | Great Dane; Wabash |
| Coupler (floor) height | 47 in (1.19 m) | Great Dane; the model uses 1.20 m |
| Landing gear | 134.5 in (3.42 m) behind the front wall | Great Dane (Wabash: 147 in) |
| Landing-gear leg spacing | 1.7 m | **estimated** (not published) |
| Tandem axle spread | 49 in (1.245 m) | Great Dane; Hendrickson |
| Rear axle ahead of the rear sill, slider back | 1.3 m | **estimated** (no sheet gives it) |
| Dual spacing | 0.322 m between centres, 62 mm between sidewalls | study; Michelin minimum is 12.5 in |
| Rear impact guard | bottom under 22 in, about 2.3 m wide | 49 CFR 393.86 |
| Side skirts | 0.30 m ground clearance, about 8.8 m long | clearance from a 2010 National Academies table; length **estimated** |
| Gap, sleeper back to van front | 1.60 m | derived from the stations above |
| **Overall, bumper to rear sill** | **22.9 m** (75.2 ft) | derived |

The earlier rigid semi in `vehicles.ts` is 19.16 m.

## Detail and cost

| Form | Triangles | Vertices | Use |
|---|---:|---:|---|
| Close | 7,662 | 14,158 | Model Lab only |
| Traffic | 1,370 | 2,580 | City High traffic at every distance (proposed) |
| Today's rigid semi | 900 | 2,700 | City High traffic (current) |

Low traffic draws no semis (`road-traffic.ts`), so the semi costs nothing on Low. Both forms pack into one vertex-colour draw on the shared `vehicleMaterial`, so they need no new shader program. The traffic form drops the panel seams, door hardware, grille slats, catwalk treads, fifth-wheel plate, air cleaners, cab markers and mirrors. It also uses eight-sided wheels with two-ring inner duals and six-sided tanks, stacks and fenders.

The study kit's faces are not wound consistently: 838 of the close rig's 3,147 come out inside out in construction order. The port therefore orients every face away from an interior point. A test raycasts both forms from both sides, above, front and rear, and fails on any back face. Fender undersides face only the ground.

## What each part follows

- **Tractor:** the study's level long hood, separate fender headlamp pods, chrome grille surround, swept front fenders, a raised 72 in sleeper with a service door and inset window, twin stacks, air cleaners, strapped tanks and steps, frame rails, a catwalk and a slotted fifth wheel. The grille was changed from the study's three horizontal bars to vertical slats with three heavier dividers, and the bumper deepened to 0.42 m, to match the dealer front photo.
- **Van:** composite side panels with vertical seams, top and bottom rails, a rear frame with a centre door seam, four lock rods and hinges, a slid-back tandem on a subframe, aerodynamic skirts, landing gear, mud flaps, and a rear impact guard.

## Lighting

- **Photographs.** The dealer walkaround is a daytime set. The night reference is a Peterbilt 389, the 589's predecessor with the same long-hood form, pulling a van before sunrise. It shows warm headlamps, five lit amber cab-roof markers, and a row of amber clearance lamps along the van's top rail. No reliable night photo of a 589 itself or of a van's rear lamps turned up; the rear layout follows FMVSS 108 as described in the manufacturer sheets: three red ID lamps in the header (Wabash wires them as stop lamps), red tail/stop lamps in the sill, red rear corner clearance lamps, and amber front corner and mid-ship side markers.
- **Model.** `vehicleMaterial` glows only the headlamp and tail kinds. Lit at night: headlamps, the sill tail lamps, the three ID lamps, the rear corner clearance lamps and the red rear side markers. All the red lamps also flash with the brakes in traffic. Dark at night: the amber cab markers and the amber front corner and side markers. They are fixed trim, because lighting amber would need a new kind in the shared material.

## References

Links only; the photographs are not committed.

- Tractor dimensions: [Peterbilt body-builder manual, figure 3-2](https://www.peterbilt.com/static-assets/documents/resources/HD_Body_Builder_Manual_Rev_D.pdf) · [dealer build specification (280 in WB, 72 in sleeper)](https://www.tlgtrucks.com/trucks-for-sale/new-peterbilt-trucks/sd766937) · [589 exterior features](https://www.peterbilt.com/static-assets/documents/resources/Model%20589_Exterior_Features.pdf)
- Daytime walkaround, TLG stock VD827641: [front](https://tlgtrucks.salesoverdrive.cdkglobal.com/Pictures/TLGTRUCKS/vehicle/VD827641/VD827641-08.jpg) · [side](https://tlgtrucks.salesoverdrive.cdkglobal.com/Pictures/TLGTRUCKS/vehicle/VD827641/VD827641-02.jpg) · [rear](https://tlgtrucks.salesoverdrive.cdkglobal.com/Pictures/TLGTRUCKS/vehicle/VD827641/VD827641-04.jpg)
- Night: [Peterbilt 389, Dryden, Ontario, before sunrise (Wikimedia Commons)](https://commons.wikimedia.org/wiki/File:Peterbilt_389,_Dryden,_Ontario_-_Before_Sunrise.jpg)
- Van: [Great Dane Champion factory spec](https://www.maximinc.com/media/RK614703%20-%20RK614713%20Tandem%20Dry%20Vans%20NP.pdf) · [Wabash DuraPlate build sheet](https://trailerimages.haletrailer.com/inv/docs/trailer/A029467-1.pdf) · [Wabash DuraPlate product sheet](https://onewabash.com/docs/default-source/wabash-trailer-downloads/van-trailers-product-sheets/Dry-van-duraplate-cell-core-tech.pdf) · [Hendrickson VANTRAAX](https://hendrickson-intl.com/products/vantraax/vantraax-hkant-40k) · [49 CFR 393.86 rear impact guards](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-G/section-393.86) · [California kingpin-to-rear-axle rule](https://www.dot.ca.gov/programs/traffic-operations/legal-truck-access/vehicle-lengths)
- Origin: the everyday-cars finish study on `codex/sedan-rear-polish` (729ca2b6, 8cf37b81, de4b3d50, 08669e18).

## Open questions for review

- **Hood height.** The model's hood rises to 2.15 m at the cowl (study). Scaled by its tyres, the dealer side photo reads about 1.9 m. The gap is unresolved.
- **Front fenders.** The photo shows full-coverage fenders that wrap well down the front of the steer tyre and run back to the step. The model keeps the study's thinner swept fender over the tyre crown.
- **Traffic-form detail.** City draws one mesh per kind, so street-eye shows the traffic form: a plain grille plate, octagonal wheels and no mirrors. Approximate prices to promote details into it: grille slats and dividers +168 triangles, mirrors +72, twelve-sided outer wheels +160 (ten wheels, 16 each).
- **Amber lamps.** Lighting the amber cab and van markers at night would need a new kind in the shared vehicle material.
- **Eye-level ink.** In the close form, the van's far panel seams alias into a zigzag at a raking eye-level angle.

## Stills

[¾ front, day and night](log/road-semi/lab-day-night.jpg) · [side against a sedan](log/road-semi/lab-side-scale.jpg) · [rear, day and night](log/road-semi/lab-rear.jpg) · [traffic form](log/road-semi/lab-traffic-form.jpg) · [eye level](log/road-semi/lab-eye-level.jpg)
