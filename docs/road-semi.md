# Road semi: long-hood sleeper tractor and 53 ft dry van

`web/src/vignette/road-semi.ts` draws a coupled tractor-trailer as one rigid body. The tractor has the proportions of a Peterbilt 589 sleeper, and the trailer is a generic 53 ft composite dry van. Neither carries a badge, oval, script, number or fleet mark. Traffic positions are `illustrative`.

The Model Lab entry is **Long-hood sleeper tractor · 53 ft dry van** (`/models.html?v=semi589`). Its Detail buttons switch forms: High shows the close form, which only the Lab draws. Low shows the traffic form, which City would draw at every distance, street-eye included, because traffic draws one mesh per kind. A midsize sedan follows 4 m behind for scale.

Status (2026-11-26): Sam approved the look with changes: no side skirts, a 1.9 m hood, wrap-around front fenders, grille slats and mirrors in the traffic form, lit amber markers, and varied paint. It replaces the earlier 19.16 m rigid semi as City's `semi` on the High tier.

## Dimensions

| Item | Value | Source |
|---|---|---|
| Bumper to front axle | 31 in (0.787 m) | Peterbilt body-builder manual, figure 3-2, 589-131 |
| Bumper to back of cab | 130.9 in (3.325 m) | same |
| Wheelbase, steer axle to tandem midpoint | 280 in (7.112 m) | dealer build specification |
| Sleeper length | 72 in (1.83 m) | dealer build specification |
| Frame overhang behind the tandem midpoint | 1.51 m | **estimated** from the dealer side photo (steer hub x≈91, tandem midpoint x≈649, frame end x≈768 in an 800 px copy) |
| Fifth-wheel pin | 0.23 m ahead of the tandem midpoint | **estimated** (study) |
| Tractor heights: hood, cab roof, sleeper roof, stack top | 1.9, 3.01, 3.45, 3.71 m | **estimated**: the dealer side photo, scaled by its tyres, reads about 1.9, 3.0, 3.35 and 3.9 m (the study's hood was 2.15 m) |
| Van length, width, height | 53 ft × 102.4 in × 13 ft 6 in (16.154 × 2.600 × 4.115 m) | Great Dane Champion spec; Wabash DuraPlate sheet |
| Kingpin setback | 36 in (0.914 m) | Great Dane; Wabash |
| Coupler (floor) height | 47 in (1.19 m) | Great Dane; the model uses 1.20 m |
| Landing gear | 134.5 in (3.42 m) behind the front wall | Great Dane (Wabash: 147 in) |
| Landing-gear leg spacing | 1.7 m | **estimated** (not published) |
| Tandem axle spread | 49 in (1.245 m) | Great Dane; Hendrickson |
| Rear axle ahead of the rear sill, slider back | 1.3 m | **estimated** (no sheet gives it) |
| Dual spacing | 0.322 m between centres, 62 mm between sidewalls | study; Michelin minimum is 12.5 in |
| Rear impact guard | bottom under 22 in, about 2.3 m wide | 49 CFR 393.86 |
| Gap, sleeper back to van front | 1.60 m | derived from the stations above |
| **Overall, bumper to rear sill** | **22.91 m** (75.2 ft); 22.97 m to the rear lamps, the traffic footprint | derived |

The earlier rigid semi in `vehicles.ts` is 19.16 m.

## Detail and cost

| Form | Triangles | Vertices | Use |
|---|---:|---:|---|
| Close | 7,618 | 14,034 | Model Lab only |
| Traffic | 1,624 | 3,088 | City High traffic at every distance |
| Rigid semi it replaced | 900 | 2,700 | |

Low traffic draws no semis (`road-traffic.ts`), so the semi costs nothing on Low. Both forms pack into one vertex-colour draw on the shared `vehicleMaterial`, so they need no new shader program. The traffic form keeps the grille slats, mirrors and amber markers (as flat quads) that Sam asked for, and drops the panel seams, door hardware, catwalk treads, fifth-wheel plate and air cleaners. It also uses eight-sided wheels with two-ring inner duals and six-sided tanks, stacks and fenders.

The study kit's faces are not wound consistently: 838 of the close rig's 3,147 come out inside out in construction order. The port therefore orients every face away from an interior point. A test raycasts both forms from both sides, above, front and rear, and fails on any back face. Fender undersides face only the ground.

## What each part follows

- **Tractor:** a level long hood about 1.9 m tall with a cowl step up to the windshield, separate fender headlamp pods, chrome grille surround, wrap-around front fenders that run from below the hub in front to behind the tyre with a deep outer face, a raised 72 in sleeper with a service door and inset window, twin stacks, air cleaners, strapped tanks and steps, frame rails, a catwalk and a slotted fifth wheel. The grille was changed from the study's three horizontal bars to vertical slats with three heavier dividers, and the bumper deepened to 0.42 m, to match the dealer front photo.
- **Van:** composite side panels with vertical seams, top and bottom rails, a rear frame with a centre door seam, four lock rods and hinges, a slid-back tandem on a subframe (no side skirts, dropped at review as uncommon), landing gear, mud flaps, and a rear impact guard.

## Lighting

- **Photographs.** The dealer walkaround is a daytime set. The night reference is a Peterbilt 389, the 589's predecessor with the same long-hood form, pulling a van before sunrise. It shows warm headlamps, five lit amber cab-roof markers, and a row of amber clearance lamps along the van's top rail. No reliable night photo of a 589 itself or of a van's rear lamps turned up; the rear layout follows FMVSS 108 as described in the manufacturer sheets: three red ID lamps in the header (Wabash wires them as stop lamps), red tail/stop lamps in the sill, red rear corner clearance lamps, and amber front corner and mid-ship side markers.
- **Model.** `vehicleMaterial` glows only the headlamp and tail kinds. Lit at night: headlamps, the sill tail lamps, the three ID lamps, the rear corner clearance lamps and the red rear side markers. All the red lamps also flash with the brakes in traffic. Amber (kind 5) lights at night too: the five cab-roof markers, the van's front corner clearance lamps and its mid-ship side markers. The amber branch lives inside the existing vehicle shader, whose program key does not change, so it adds no program.
- **Paint.** The tractor takes the slot's colour from City's traffic paint list. The van box is kind 6: white, except about one van in seven, which takes a plain blue, red or green. The van colour index rides on the per-instance `braking` float as `lamp + 2 × index` (`vanPaintIndex` in `vehicles.ts`), so it needs no new attribute either.

## References

Links only; the photographs are not committed.

- Tractor dimensions: [Peterbilt body-builder manual, figure 3-2](https://www.peterbilt.com/static-assets/documents/resources/HD_Body_Builder_Manual_Rev_D.pdf) · [dealer build specification (280 in WB, 72 in sleeper)](https://www.tlgtrucks.com/trucks-for-sale/new-peterbilt-trucks/sd766937) · [589 exterior features](https://www.peterbilt.com/static-assets/documents/resources/Model%20589_Exterior_Features.pdf)
- Daytime walkaround, TLG stock VD827641: [front](https://tlgtrucks.salesoverdrive.cdkglobal.com/Pictures/TLGTRUCKS/vehicle/VD827641/VD827641-08.jpg) · [side](https://tlgtrucks.salesoverdrive.cdkglobal.com/Pictures/TLGTRUCKS/vehicle/VD827641/VD827641-02.jpg) · [rear](https://tlgtrucks.salesoverdrive.cdkglobal.com/Pictures/TLGTRUCKS/vehicle/VD827641/VD827641-04.jpg)
- Night: [Peterbilt 389, Dryden, Ontario, before sunrise (Wikimedia Commons)](https://commons.wikimedia.org/wiki/File:Peterbilt_389,_Dryden,_Ontario_-_Before_Sunrise.jpg)
- Van: [Great Dane Champion factory spec](https://www.maximinc.com/media/RK614703%20-%20RK614713%20Tandem%20Dry%20Vans%20NP.pdf) · [Wabash DuraPlate build sheet](https://trailerimages.haletrailer.com/inv/docs/trailer/A029467-1.pdf) · [Wabash DuraPlate product sheet](https://onewabash.com/docs/default-source/wabash-trailer-downloads/van-trailers-product-sheets/Dry-van-duraplate-cell-core-tech.pdf) · [Hendrickson VANTRAAX](https://hendrickson-intl.com/products/vantraax/vantraax-hkant-40k) · [49 CFR 393.86 rear impact guards](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-393/subpart-G/section-393.86) · [California kingpin-to-rear-axle rule](https://www.dot.ca.gov/programs/traffic-operations/legal-truck-access/vehicle-lengths)
- Origin: the everyday-cars finish study on `codex/sedan-rear-polish` (729ca2b6, 8cf37b81, de4b3d50, 08669e18).

## Review notes

- **Eye-level ink.** In the close form, the van's far panel seams alias into a zigzag at a raking eye-level angle.
- **Rigid body.** Like the semi it replaced, the rig is one rigid body placed by front and rear points on its course. On a bend it cuts the chord. Generated arterial turns already carry no semis (`arterial-turns.ts`).

## Stills

[¾ front, day and night](log/road-semi/lab-day-night.jpg) · [side against a sedan](log/road-semi/lab-side-scale.jpg) · [rear, day and night](log/road-semi/lab-rear.jpg) · [traffic form](log/road-semi/lab-traffic-form.jpg) · [eye level](log/road-semi/lab-eye-level.jpg)
