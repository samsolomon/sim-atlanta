# Low-tier species mask claw-back

The frozen A16 probes on 546ab349 identify the species foliage mask as the main
rollout cost: control 18.5 fps, mask-off 23.6/23.3, shadow-off19.6/18.9, and
foliage-off25.0/24.3 (upper bound). The second control had inconsistent counts and
was discounted by the coordinator. These are probe runs, not final fix acceptance.

The mask redraws the leaf cards and activates extra full-screen ink sampling.
Simply disabling it in near views visibly darkens the interior crown lines:
[1180 day](log/ui/tree-species/mask-clawback/1180-day-sheet.jpg),
[1180 night](log/ui/tree-species/mask-clawback/1180-night-sheet.jpg),
[Prado day](log/ui/tree-species/mask-clawback/prado-day-sheet.jpg),
[Prado night](log/ui/tree-species/mask-clawback/prado-night-sheet.jpg).
These show forced mask on/off, not the shipping near-view result.

The candidate changes only low quality. It unregisters species masks beyond600m
**camera-to-orbit-target distance**, restoring below500m. Between those thresholds
it retains its previous state. This is a whole-view gate, not per-tree distance.
At the approved420m Prado and350m terrace views the mask remains enabled. High
quality, crown geometry, seasonal colour, shadows, leaf tips and carpets are unchanged.
The batch owns its low mask registrations, reapplies the state when rows mount,
and unregisters them before rebuilding/disposal. No new material or texture.

`?perf=run&treeprobe=mask-on` forces the old low behaviour for same-SHA A/B.
`mask-off`, `shadow-off`, `foliage-off`, `carpet-off` remain diagnostic probes;
all require active perf and low quality. Ordinary visits ignore these switches.

Unit coverage exercises hysteresis, area mounts while far, removal/reopen and the
mask-pass empty-registry reset (`uFoliage=0`, empty texture). Browser transitions
1000→420→550→700→350m produce disabled/enabled/enabled/disabled/enabled, with962
registered species instances. Instance count is not a visible-crown count.

Pan investigation: local and phone-perf frozen runs completed all12 areas.
Coordinator identifies the failed “Details” as the final line of a Node/CDP error,
not app UI; full original logs were unavailable. No scene defect was reproduced.
Final phone runs will retain complete failure logs and screenshots.

Release needs a web rebuild only. Coordinator deployment stays held until the final
frozen A16 default/pan comparison meets the agreed performance gate.

Exact384×692 candidate camera audit (all12 board areas):

| View | Orbit distance | Suppressed / registered species instances |
|---|---:|---:|
| Default, no cam parameter | 21,084.375 m | 962 / 962 (100%) |
| Default with motion=pan | 21,084.375 m | 962 / 962 (100%) |
| Prado | 420 m | 0 / 962 |
| 1180 | 350 m | 0 / 962 |

[Raw metrics](log/ui/tree-species/mask-clawback/metrics.json) and
[transition observations](log/ui/tree-species/mask-clawback/transitions.txt).
These count registered instances, not visible crowns. The large whole-board
starting view explains why a600m orbit gate covers the measured default/pan.

Validation:20 Rust,939 web and5 worker tests pass (1 web skipped; Python pipeline
checks skipped without .venv). Build passes. Both performance ceilings pass:
low536 calls/2,336,759 triangles; high1,169/13,783,617. High startup target missed
at4,883ms, but that is not an enforced ceiling or phone performance evidence.
Cross-review found one visual risk: changed interior ink beyond600m needs explicit
far day/night evidence and coordinator review. No code/lifecycle findings.

Final normal candidate versus forced-mask control, low near:
[Prado day](log/ui/tree-species/mask-clawback/verified-prado-day-sheet.jpg),
[Prado night](log/ui/tree-species/mask-clawback/verified-prado-night-sheet.jpg),
[1180 day](log/ui/tree-species/mask-clawback/verified-1180-day-sheet.jpg),
[1180 night](log/ui/tree-species/mask-clawback/verified-1180-night-sheet.jpg).
The registered species mask is enabled in both near panels. Separate page loads can
show differences in ambient generic-tree detail; the candidate does not modify it.

Review's far visual risk is now illustrated at700m:
[day](log/ui/tree-species/mask-clawback/prado-far-day-sheet.jpg),
[night](log/ui/tree-species/mask-clawback/prado-far-night-sheet.jpg).
Species crowns have more internal ink at this range, particularly the bright round
crowns east of the junction. This is an explicit visual tradeoff for coordinator/Sam
approval, not a claim that far pixels are unchanged. The600m threshold preserves the
approved close views while removing the full-screen mask cost from the phone's
whole-board default and pan views.

Sam accepted the darker far-crown interiors at low beyond 600 m through the
coordinator on 2026-11-23. Final A16 default/pan results and the coordinator's
merge OK remain pending; the frozen rendering candidate is fb699bbb.

Follow-up idea: if the darker far look becomes distracting, try replacing distant
species crowns at low quality with a single clump. Preserve the approved near
views and measure both appearance and A16 performance before adopting it.
