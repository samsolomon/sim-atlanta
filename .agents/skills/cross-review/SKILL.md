---
name: cross-review
description: Have the other model (Codex if you are Claude, Claude if you are Codex) review this branch's diff read-only before a PR, then triage its findings under docs/review-charter.md. Use when the user says "review", "cross review", "get a second opinion", "have Codex/Claude look at this", or before opening or merging a PR in this repo.
---

# Cross-model review

1. Run `pnpm test` first, and make sure any visual change has been checked in a browser.
2. Run `pnpm review`. To choose the reviewer yourself, use
   `pnpm review -- --reviewer codex|claude`. For a base other than `origin/main`, add
   `--base <ref>`. This takes one to a few minutes. Run it in the background if your
   harness allows that.
3. If the script exits non-zero, the review **did not run**. Report the reason. Don't treat
   it as a clean review.
4. Triage each finding against `docs/review-charter.md`:
   - CONFIRMED and in your diff: fix it.
   - PLAUSIBLE: record it for the PR body, and don't edit for it.
   - Visual-only: open the named URL, take a screenshot, then confirm or dismiss it.
5. After fixing, run `pnpm review` once more (round 2). Stop there, and list anything still
   open in the PR body.
6. Tell the user the result in one line, e.g.
   `Review (codex): 1 confirmed (fixed), 2 plausible, 0 dismissed`.
