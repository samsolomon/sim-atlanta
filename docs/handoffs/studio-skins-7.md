# Building skins handoff · 25 November 2026

**Paused.** Both product heads below are published. The waiting test jobs were stopped before execution. Resume with the Centergy train audit first.

Skins-7 owns the models, verification and follow-up fixes below. The skyline lead owns integration of reviewed contributions into the combined skin train and main.

| Work | Exact feature commit | Evidence and next action |
|---|---|---|
| Centergy One, PR #578 | `b845f6198eddc66b1702851debe00383a7363102` on `samsolomon/centergy-one` (pushed) | The integrated model previously had 25 detached parts, with a worst gap of 0.45 m. The fix seats the upper glazing on the tower wall planes and follows each lobby setback. On resume, run the unchanged footprint audit against train commit `0096d25b34febee620ddab7812029a8bd09b9169` with the fix applied. Result and updated visual evidence pending. Send the tested head to the skyline lead after the audit passes. |
| Medical Arts garage | `159d925def430da2e87612abfbe7c2b5ae0864fe` on `samsolomon/skins7-medical-arts-garage` (pushed) | The focused test passed during development. The first full suite encountered timeouts and was interrupted. The final full suite is pending. At the feature commit, `docs/log/ui/medical-arts-garage/` contains matched day and night views, a close view, a four-side sheet and the lidar and photo evidence. Before opening a PR, reconcile with current main, verify the final build and tests, compare baseline and feature perf, and complete cross-review. |
| Fairlie–Poplar, PR #659 | `8006119ead58cbc83e3fa508084738eabd28ec60` | Sunlit southeast faces at 10:30 EDT on June 20, City high tier. Median rendered RGB from 5 × 5 pixel patches gave Haas-Howell S 11.6%, V 43.9% and Aderhold S 18.7%, V 42.0%. Both pass. The skyline lead cleared the glass check. |
| T Deck, PR #632 | `5910174b` (8d candidate) | After 8d lands, darken the light-well walls in a follow-up and capture the matched views. Pending. |

The garage changes the downtown landmark list in `web/src/city/city.ts`, a shared integration file. Preserve the Centergy fix branch and train test checkout while verification is pending. The One Coca-Cola Plaza and EUHM palette changes on `samsolomon/palette-hold-coke-euhm` remain held for the project owner.
