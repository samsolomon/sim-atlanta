# Midtown station plaza: detached parts (November 24)

The skin detachment check (#562) flagged 11 loose clusters on the Midtown station east entrance and 3 on North Avenue station. Two kinds were really floating, and both are fixed:

- **Coffer lamps.** Four 1 m light panels hung 0.84 m below the coffered slab. Their tops were 1.5 cm under the rib bottoms and 0.5 m from the nearest rib, with nothing holding them up. They're now recessed against the slab's underside as coffer downlights. The City orbit can't look up under the slab, so there's no matched before frame. [After, under the canopy](plaza-coffers-after.jpg)
- **Bench seats.** The timber seats beside the planters hovered 0.32 m above the paving with no legs. Each is now a solid bench standing on the paving. [Before and after](plaza-bench-before-after.jpg)

The remaining parts are declared in `skin-footprint.test.ts` with reasons. Midtown east entrance has 6: the free-standing coffered canopy on its six piers, two entrance headers on posts, two draped plaza pavings, and the end cross-rib. That rib crosses the long ribs, but no vertex lies within 0.3 m of them; #589 removes that false positive. North Avenue has 3: Tower Square's station-entrance door sets, drawn 0.23 m proud of that separate building's walls.

Bench camera: `?view=city&dev&mindist=8&cam=478,-3026,0,60,60`, then `__setView(15,80,22,452,-2999,1.6)`, on November 20, 2026 at 11:30. Web rebuild only.
