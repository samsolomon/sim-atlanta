# Studio skins 1 handoff

Sam asked to “skin the remaining large/important buildings.” This worker owns Marquis One, then Marquis Two, with one branch and one PR per tower. The Air coordinator holds both merges until they relay Sam’s explicit approval. After each approved merge, run `gh pr view <number> --json state,mergeCommit` and report both fields.

## Marquis One is ready for approval

- Branch `samsolomon/marquis-one`, implementation `de78fc45`, open [PR #393](https://github.com/samsolomon/sim-atlanta/pull/393). No merge approval received.
- Shaft and tower-side entrances are in `web/src/city/marquis-offices.ts`. Downtown preserves adjacent masses. The body uses `landmarkShell` and `StaticLandmarkMaterial` and the sparse window lighting follows the City night factor.
- `pnpm test` passed including 11 Python pipeline tests with a local `.venv` and 1 skipped web test. `pnpm test:perf` passed on all 12 areas against `origin/main` at `59b8cbc9`. Low 2,358,768 triangles, 569 calls, 90 programs. High 13,898,703 triangles, 1,193 calls, 105 programs. Main programs were also 90 and 105. Draw and triangle deltas are in the PR.
- `pnpm review` round one identified a pier crossing the stairs and a close capture missing the entrance. Both were corrected. Claude found no issues in round two.
- `pnpm audit:ground --url http://localhost:5173` was attempted and produced no usable report. The avenue staircase and the Harris hood were visually checked. The saved pairing token for `orca --environment air` was rejected, so the review page could only be opened in the local worktree. The coordinator has the PR and camera links.
- Match day and full night at City `cam=557,-862,-14,52,490` with `t=2026-11-20T11:30:00-05:00` and `t=2026-11-20T23:30:00-05:00`. Avenue `cam=529,-811,40,65,27`, Harris hood `cam=565,-798,-29,65,40`, both with `&dev&mindist=20` at 11:30 AM. Local captures, dimensions and references are under [Marquis One](../log/ui/marquis-one/README.md).

## Next steps

1. Keep #393 open until the Air coordinator relays approval. Re-fetch current main, resolve any conflicts, and rerun affected checks before the approved merge. Quote the GitHub merge state and commit.
2. Create `samsolomon/marquis-two` from then-current `origin/main`. Reuse the shared shell approach from One, with Two’s own entrance geometry. The skyline lead confirmed shaft, base and tower-side connection only. Preserve shared podium and skybridge spans. The current lead is Claude Opus, `orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`.
3. Read `docs/building-skins.md` on `origin/samsolomon/studio-building-skins` at `682b78aa` or later. Two has Overture ID `2b0270ee-9f6a-44c9-bf0d-e6fb20e6c47c`, mapped height 115.2 m, approximate plan 57 × 31 m, City centre `553,-902`. The north wall has pairs of wider panes forming elongated Vs while the other faces repeat narrow bays. The north ring is split at a skybridge mapping node, so treat the collinear north segments as one course when laying out the V.
4. Research Two in fresh Orca tabs. The leasing photo shows the bay rhythm and tower-side bridge throat. The district survey (p. 48, photos 236–250 referenced) describes the angle and pattern. SKYDB has additional daylight angles. The night skyline source consulted for One lacks a positive read of either lobby or crown. Look for stronger Two-specific night evidence and record remaining gaps. [Leasing exterior](https://peachtreecre.com/property/marquis-two/) · [District nomination](https://saportareport.com/wp-content/uploads/2017/09/Peachtree-Center-HD-Final-4-24-17.pdf#page=48) · [SKYDB photos](https://www.skydb.net/building/254338499/marquis-ii/) · [Night skyline](https://explorecams.com/photos/WwAPDZzyzW?lens=sony-fe-35mm-f1-4-za)
5. Use `pnpm dev` with the staged data already in this worktree. Capture a normal 400–500 m day/night pair at 45–55° tilt, a close entrance angle and a view toward the north wall. Include a Peachtree Center Avenue comparison with both towers in frame. The spec starts Two at `553,-902,32,60,345` before reframing.
6. Run `pnpm test`, `pnpm test:perf` on both tiers against current main, and `pnpm review` per the repo charter. The low-tier budget is full at 90 shader programs. Add no shader variants. Document captures and estimates, add the build log, open Two’s own PR and send the coordinator the same evidence. Hold until explicit approval.

Reply through the Air welcome thread `msg_60902cb085ee` using `orca orchestration reply`. Direct Air orchestration sends fail. Clean up any local dev server and research tabs when done.
