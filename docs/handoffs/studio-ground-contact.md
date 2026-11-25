# Studio Ground Contact handoff

Work stopped on November 25, 2026. Ground has no queued captures, builds or verification jobs.

The test-only commit is `76248a1ef4d46cf60ea1eb7b43a6f420eec2fe24` on `test/public-north-ground`, based on `8678645f1c42d114e4f5c2057e2e4467145d2bcc`. Four test files passed, 21 tests total, against the public runtime candidate with staged row and GA assets. They exercise ordinary R16 streaming and retry, 13 mounted areas, both terrain tiers, the −6500 m boundary, and rejection of a 0.1 m mismatch on the Brookwood Station seam.

The public checkpoint backup was verified at 77 destinations covering 62 named refs and 15 detached aliases. The local publication packet contains the SHA mapping, eight image exclusions and prior-origin exposure inventory under `~/orca/artifacts/sim-atlanta-private-checkpoints/publication/`. Fifth Street remains frozen at `598a6c27`. Its lower clearance and walk landings remain open.

When Air resumes the clean PR, the integration owner can cherry-pick the test-only commit and rerun the four specs after a fresh `pnpm data` on the final integrated revision. The full merged suite remains outstanding.
