# Freight PR 2 — locomotive variety

Add NS-like ES44AC, CSX-like ES44AH, NS-like SD70ACe and CSX-like GP38-2 as distinct lab selections. Existing CM44AC and City consists stay stable until PR 4. Source dated Commons photos, compare two angles and night lighting where available; record dimension estimates and gaps.

Implement ES44 variants in the GE builder using an explicit body family. Add EMD bodies with shared frame/truck/lamp helpers only where geometry truly matches. Extend FreightUnit lengths and truck centres together, then lab names, track visibility, camera presets and navigation. Keep lamps in finishStockGeometry and preserve __lab controls. No textures, logos, wordmarks or numbers.

Verify wheel/rail contact, unit envelopes and leading-end lamp attributes with geometry tests; inspect all new lab choices by day/night and record triangle counts. City integration is PR 4, so do not advertise these as present in City. Run full tests, build and cross-review, publish photos and matched lab captures, then request coordinator approval. Web rebuild only.

## Architect review — 2026-11-23

Checked freight-stock.ts and models/main.ts consumers. Both FREIGHT_LENGTH and FREIGHT_TRUCK_SPACING must cover every unit. Lab has four selection integration points (names, track visibility, preset lookup, navigation); include all four to avoid a valid URL with missing camera presets. No new rendering/material system needed. Existing City keys retain their geometry and dimensions.

## Product design review — 2026-11-23

Reuse lab navigation and day/night controls. Labels distinguish ES44AC vs ES44AH and EMD families; copy explicitly says look-alike and lab study. Present solo locomotives with the same view presets for comparison. Link source notes instead of adding a new control panel. Night images must expose lamp placement without claiming City lighting, whose plain material ignores stockLight.
