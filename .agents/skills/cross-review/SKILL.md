---
name: cross-review
description: Have another model review this branch's diff read-only before a PR (Grok through opencode; Codex or Claude through pnpm review when asked), then triage its findings under docs/review-charter.md. Use when the user says "review", "cross review", "get a second opinion", "have Grok/Codex/Claude look at this", or before opening, updating or merging a PR in this repo.
---

# Cross-model review

1. Run the checks for the change's risk (`docs/review-charter.md`, "Checks by risk"), and make
   sure any visual change has been checked in a browser.
2. Commit, then review with Grok using the command in the charter's "Reviewing with Grok": the
   diff in a file inside the worktree, read-only, stdin from `/dev/null`, output to your scratch
   folder. Delete the diff file afterwards. Run it in the background if your harness allows that.
   If the user asked for Codex or Claude instead, run `pnpm review`
   (`pnpm review -- --reviewer codex|claude`, `--base <ref>` for another base).
3. If the run exits non-zero or ends without MERGEABLE or NEEDS FIXES, the review **did not
   run**. Report the reason. Don't treat it as a clean review.
4. Triage each finding against the charter:
   - CONFIRMED and in your diff: fix it.
   - PLAUSIBLE: record it for the PR body, and don't edit for it.
   - Visual-only: open the named URL, take a screenshot, then confirm or dismiss it.
5. After fixing, review once more (round 2). Stop there, and list anything still open in the PR
   body.
6. Put the verdicts in the PR body, send the coordinator the head, and wait for the merge go.
   Report the result in one line, e.g.
   `Review (Grok, abc1234): MERGEABLE; 1 confirmed (fixed), 2 plausible, 0 dismissed`.
