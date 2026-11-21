# East Portal art spike · 20 November 2026

The Studio rebased onto 72a2618 before export, including the Air's ground cover, vehicle kit and CQ400. Sam approved the local SDXL base and Pixel Art XL download. The initial outbound mailbox pairing failed. Replies to the Air's incoming thread now have delivery receipts.

The Studio has fetched both GTFS feeds, the Georgia crossing inventory and three rail-network pages. The Overture building query returned 2,280 downtown features. The scene and browser checks are in progress.

**Browser baseline** — At 1 p.m. on 20 November under clear skies, Chrome drew the viaduct above the Connector and the cut edge of red clay. The Studio matches the Air on 64 buildings, 384 road runs, 13 rail runs, 76 trees, 68 traffic nodes, 110 edges, 28 entries and 8 signals. [Studio screenshot](studio-baseline.jpg)

**First Blender render** — [Full board](blender-board.jpg). The 12-sample Cycles render took 192 seconds on Metal for 4,352 × 2,560 pixels. The viaduct stands clear of the Connector on its piers. The 32-colour finish and 69 pyramid tiles retain individual windows, trees and lane dashes.

**First AI redraw** — [Viaduct crop](first-redraw.jpg). SDXL and Pixel Art XL took 9.06 seconds for the first 1024 px window on MPS. At strength 0.38 the bridge still meets the same streets, but the model turns lane dashes into blocks and adds a dark canopy to a small roof. The layer is illustrative.

**Full-board SDXL bake** — [Registered comparison](comparison.jpg). Selected strength 0.26 after inspecting 0.26, 0.38 and 0.54 on the same crossing. The 18 windows took 54.29 s including model load and stitching. At 0.54 the highway began to read as track. The 0.26 bake preserves its route and softens some stall and lane paint.
