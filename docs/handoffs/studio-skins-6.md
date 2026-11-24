# Studio skins-6 handoff

Updated 2026-11-24. Skins-6 owns the 150 Carnegie Way model, tests, visual evidence and feature PR. The skyline lead owns integration into main through the combined skin train.

## Feature checkpoint

Branch `samsolomon/150-carnegie-garage`, commit `bae6342c5840e1b9a6a80565f52f15666c01a07f`. The garage replaces generic footprint `5dd0ec77-d3b8-4168-b01a-9de821a6ee60`. The adjoining skybridge has its own mapped footprint, `6a08f0c0-d808-4de4-af33-d7af31528b57`. The garage models its receiving landing.

The April 2019 lidar yielded 6,731 interior returns. The roof median is 24.7 m above the surrounding ground and the lift core reaches 352.4 m NAVD88. Opposing daytime photographs show the Carnegie frontage, parking slots and vehicle entrance. Night lighting is estimated. [Southern Exchange approach photographs](https://www.blackenterprise.com/wp-content/blogs.dir/1/files/2024/04/Driving-Directions-to-Southern-Exchange.pdf)

## Evidence and next action

- Two garage-specific tests passed on the earlier prototype. Verification of the exact checkpoint is pending after changes to the entrance.
- Full tests, build, perf, and browser captures are queued under the shared lock. Only #670 currently has the Studio timing window.
- Four-side sheet, matched daylight and full-night screenshots, 500 m recognition check, build-log entry, independent cross-review and feature PR are pending. Proposed recognition camera is `cam=244,-482,225,55,500`.
- Next action for skins-6 is to inspect the queued results and renders. Resolve verified issues, account for intervening main changes, then send the independently reviewed feature to the skyline lead for integration.

## Ownership and cleanup

The City creator chain in `web/src/city/city.ts` is shared with other skins. Coordinate integration there. The queued validation jobs depend on the Studio lock and this worktree. The local Python environment link is borrowed for pipeline validation. Keep both available through the jobs.

The prior handoff at commit `7947d0fe` records the earlier train and its PRs. The glass-saturation branch remains held for Sam. The downtown audit owner took the coplanar lint branch. Check with their owners before cleaning up those branches or any queued train heads.
