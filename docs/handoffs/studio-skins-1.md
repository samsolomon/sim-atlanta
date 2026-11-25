# Downtown building skins handoff

The skins-1 author owns the three contributions and their verification. The skyline lead owns their combined integration into main. Work paused on 2026-11-25. The table records the product commits for all three checkpoint branches. Each branch contains its own screenshots under `docs/log/ui/`.

| Contribution and feature commit | Completed evidence | Pending evidence and next action |
|---|---|---|
| 30 Allen Plaza · `samsolomon/30-allen-plaza-skin` · `7293e089282eb08e88087bafbf4c6f79dc2aced3` | Build passed. Downtown audit found zero vertices beyond the footprint allowance and zero detached parts. The sunlit south glass measured S 12%, V 58%. Day, night, close and four-side captures are in `thirty-allen/`. Second cross-review found no issues. | On resume, queue the full suite, build and performance check when the window opens. The previous run had test timeouts and exceeded the low-zoomout timing ceiling. |
| H5 Data Centers · `samsolomon/h5-courtland` · `0039bd38423e83182f0f3243d33e2a1d9cadeea1` | First build and footprint/detachment audit passed. Day, night, close, four-side and sunlit captures in `h5-courtland/` show the earlier plinth. Review found the portal head overlapped the first glazing row. | The head includes the grade correction and a staged footprint test. Refresh the captures, inspect the portal, remeasure sunlit glass, run the new test and full gates, then complete second review. |
| Baker Street garage roof · `samsolomon/260-peachtree-roof-bays` · `531749043b8b7d37f6e0db6f8485a35f24ba64be` | Build and footprint/detachment checks passed. Day, night, close and four-side captures in `peachtree-260-roof/` show seven cars in twelve stalls. Cross-review found no code issues. | Complete full test and performance checks. The change stacks on #657 at `e8101917`. Confirm its integration base with the skyline lead. |

## Integration and cleanup

30 Allen and H5 both edit the downtown landmark chain, group mount, batching list and night update in `web/src/city/city.ts`. Preserve both entries when combining the branches. All three append to the build log. The garage follow-up depends on the #657 skin. Retain the feature checkouts and the measured baseline until the lead accepts the contributions. The verification queue and watcher were stopped before the first job started. On resume, request the shared performance window for 30 Allen first.

After each branch passes, publish its reviewed contribution with screenshots and low/high draw, triangle and geometry-memory deltas. Send it to the skyline lead for a single combined integration. Final verification of the combined head is pending.
