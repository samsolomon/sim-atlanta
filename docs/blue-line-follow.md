# Follow a Blue Line train in City

> **Superseded (2026-11-23).** Follow is now on by default for every MARTA rail line, the Crescent and live MARTA buses. `?follow=0` turns it off, `?follow=<route id>` follows the nearest train on that route, and the `?follow=1` used below is no longer needed. See [the follow review sheets](log/ui/follow/README.md). The Blue Line notes below remain accurate as history.

Open the [paused local preview](http://localhost:5173/?view=map&follow=1&q=high&t=2026-11-20T14:11:25-05:00&speed=0&controls=1#19.1/33.75251/-84.38940/-148) on a running development server with downtown assets staged. Select **City**, tap a silver passenger car in the cut, then choose **Follow train** on the Blue Line card. Press **1×** to ride east. The train is scheduled trip `marta:trip:4-50520-20261120` to Indian Creek. The trip ID includes its service date. A different service date needs a new selection.

The camera holds a bearing of −148°, a 26° tilt and a 300 m distance from its ground target. The selected car opens the card. The follow target is the centre of that trip’s drawn consist while cars are on the board. This lets a trailing car remain in view at a portal. Once every car is under cover, the camera moves above the source path and the card keeps its position tier. City draws the same train when its cars emerge. The camera stays above the board throughout.

| Atlanta time on Friday, November 20, 2026 | What to look for |
| --- | --- |
| 2:11:25 p.m. | The eastbound consist spans the open cut between Pryor Street and Shirley Clarke Franklin Boulevard. [East cut](log/ui/2026-11-22-follow-east-cut.jpg) |
| 2:12:02 p.m. | At Georgia State the train is fully covered. The card reads “Under cover” and identifies the MARTA timetable. The roof and streets remain in view. [Covered passage](log/ui/2026-11-22-follow-covered.jpg) |
| 2:12:32 p.m. | The same trip is visible again east of the station. [Viaduct](log/ui/2026-11-22-follow-viaduct.jpg) |

**Stop following** leaves the camera where it is. Dragging, wheeling or using the City navigation keys returns camera control to the viewer. Escape, closing the card, another selection, or switching to Map clears follow. Follow also ends if the train leaves the board or its identity, path or position source changes. If City has no drawn car and no recorded cover at the source position, the card says “Train out of view.”

With reduced motion enabled, **Follow train** frames the trip once. The card continues tracking its status while the camera stays still. **Recenter** frames the current position on demand. During follow, the narrow card keeps the destination, source tier and controls above the train. Stopping restores the detailed card. [Night view at 360 × 560](log/ui/2026-11-22-follow-night-narrow.jpg)

The preview is enabled with `?follow=1`. It uses the existing train source, drawn cars, ground sampler and rail cover bake. Shipping it requires a web rebuild and redeploy. The camera adds no data fetch or upstream service.
