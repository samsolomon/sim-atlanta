# Follow B

Give downtown and Norcross illustrative consists distinct stable namespaced ids. Preserve per-car length and orientation. Pass ids through picking; resolve freight Follow fixes from currently drawn, clip-tested cars. Update freight before resolving Follow, and end Follow when no cars remain rather than framing stale meshes or claiming a mapped tunnel. Add freight selection to the existing card Follow control, reset it when another selection opens, and retain Illustrative position/card chips and manual-camera cancellation. Check both consists, clipping, disappearance, and stop/restart; run tests, browser day/night checks, perf and cross-review before PR.

Architect review — 2026-11-23: current freight update runs after Follow, so move it before lookup. Filter using drawnCar, not mesh visibility alone; downtown clones can straddle mouths. No feed or pipeline changes.

Product design review — 2026-11-23: retain existing Follow train action and reduced-motion recenter. Distinguish freight selections by id even when card text matches. Clear freight selection on train/bus/map selection to avoid restarting an old consist. A vanished passage ends Follow; no underground claim without evidence.
