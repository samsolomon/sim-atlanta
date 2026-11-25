# Private Ansley checkpoint

The product source at the parent commit is bb2980fe on 7d57f34c. Sam’s live northern course data is 74e0f9f0. The flag candidate has its own additive overlay. Air owns formal Grok review before integration.

## Reproducing the approved northern rows

The approved context bytes for Brookwood South, Brookwood Station and r16 are the gzip payloads under pipeline/prototypes/combined-canopy. Their hashes match the three actually served on 74e0f9f0. approved-74e0f9f0 holds the verified elevations and manifest for each row, and the matching 6415cd13 pre-canopy contexts to exercise the guarded stage.py on a private copy. Restore the pre-canopy files as context.json and the elevations under DATA/scene/square-board/ROW, then run python3 pipeline/prototypes/combined-canopy/stage.py DATA and compare all nine hashes with approved-74e0f9f0/sha256.json. This gives the approved bowls, flags, tee markers, native crowns and protected deterministic R16 fallback.

The ordinary pnpm data path stages the four band/corner canopy rows via scripts/stage-square-board.mjs and the five tracked Midtown rows via its --midtown invocation. Private r16 is absent from that list. Install the approved three northern row inputs as the private combined packaging step after ordinary staging. For the other seven rows use the canonical canopy and midtown-landscape sources where full mapped coverage is intended. Those seven crown lists were empty in the exact 74e0f9f0 release; restoring those packets is a distinct coverage change. Do not reapply the generic Midtown decorator over the protected northern contexts.

## Optional private legibility study

On a separate copy of approved DATA, run python3 private-checkpoint/ansley/candidate-bb2980fe/apply.py DATA. Its sha256.json holds the expected inputs and outputs. It only overlays golfTees, golfPresentation, and points.golfMarkers. To regenerate these from the pinned inputs, use pipeline/prototypes/ansley-legibility/stage.py APPROVED_DATA NEW_DATA private-checkpoint/ansley/source/ansley-mounted-source.json private-checkpoint/ansley/source/ansley-tree-map.json with Shapely 2.2 and an existing private copy of DATA. The source study records the OSM licence, attribution and map digest. The measured 4.8 m poles and pennants are illustrative. No public or live promotion is part of this checkpoint.
