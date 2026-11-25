# Private City verification

The baseline is `9c2e854ada179f4b750db5289f33c1b65e471171`. The integrated private candidate is `6f3e902149aca859e35cf6c7433cdbd8c2d55efb`. Both use the November 20, 2026 timetable at 08:01:12 EST and clear weather. Matching orbit views have a 1200 × 720 viewport at DPR 1. The drive is an instrumented camera 1.65 m above the sampled lower road. Both recordings move east to west; the rearward one looks back.

| Rendered check per tier | Result on the candidate |
|---|---|
| Lower center and wheel tracks | 5,325 / 5,325 floor hits. Largest absolute profile discrepancy 1.386 mm. |
| Left and right shoulder edges | 3,550 / 3,550 supported by the roadway or the unmarked lining margin. Largest absolute discrepancy 4.608 mm. |
| Roof and usable passage | 4,122 interior columns. Modeled headroom 5.648–5.655 m. Zero intervening terrain. The reported inventory minimum of 5.51 m has no surveyed station in this fixture. |
| Upper and adjacent road surfaces | All 569 carrying-road controls match the baseline exactly. These comprise 94 NB, 154 SB and 321 GA 13 stations. One terrain triangle below the NB upper road was removed by the mouth opening; the NB tread stays at the same height. |
| Retaining wall | 1,380 wall quads and 28 ramp slab fascia quads in the mounted mesh. At the board cut the single outside edge is x 860.22437. Top and toe are −60.81715 and −70.00056 scene metres. Side views show the exterior wall across the cut and daylight below the distinct Clear Creek girder. |
| Stock traffic | No stock east approach or through-bore course. The west course loses its source-keyed height at the mouth. Nearest observed stock centers in the 15-minute scan are +28.20 m Low and +27.52 m High from the west exit. The camera drive and traffic replay exercise different owners. |

The southern and northern panels are a schematic treatment of the photographed retaining faces. Actual foundations, vertical faces, individual column positions and interior geometry beyond the supplied imagery remain uncertain. The lower bore floor and roofing interpolate observations. The walls and floor remain continuous in the driving view. The view washes out near station +2 m at the east mouth on both tiers. Inside the bore the floor, edge stripes, sidewalls and ceiling are readable. Low terrain-painted lanes and the return to ground at the west end appear softer than mesh-painted lanes. High resolves more of the individual markings. The stop records this visible resolution change.

[Low geometry](mounted-low.json) · [High geometry](mounted-high.json) · [Low upper-road comparison](upper-low.json) · [High upper-road comparison](upper-high.json) · [Stock simulation](../stock-results.json)

[Low matched views](low-comparison.webp) · [High matched views](high-comparison.webp) · [Decoded drive frames](drive-frames.webp) · [Camera matrices](matched-cameras.json) · [Raw image and movie hashes](capture-manifest.json) · [Independent Low profile checks](verified-6f3e9021-low.json) · [Independent High profile checks](verified-6f3e9021-high.json)

The six numbered station views pair the baseline (upper image) and candidate (lower image) at equivalent world-space poses. [Low station joins](low-joins.webp) · [High station joins](high-joins.webp)
