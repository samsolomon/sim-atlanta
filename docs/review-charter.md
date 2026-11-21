# Review charter

This is how anyone reviewing a change in this repo works: a person, an agent reviewing its
own work, or the cross-model reviewer that `pnpm review` runs. A reviewer asked to find gaps
will always find some. This charter limits what gets reported, so that review time goes to
the failures this project can actually ship.

The finding shapes and severity scale are in `AGENTS.md`, between the `review-bounds`
markers. They live there because every agent, the reviewer included, loads that file
automatically. Edit them there.

## How `pnpm review` works

1. It diffs the branch, including uncommitted changes, against the merge base with
   `origin/main` (or a base ref you pass in) and lists any untracked files.
2. It picks the *other* model as the reviewer. Inside Claude Code that is Codex
   (`codex exec`, read-only sandbox, pinned model). Inside Codex it is Claude (`claude -p`,
   limited to Read, Grep and Glob). You can force one with `--reviewer codex|claude`.
3. It prints the review and saves it to `<git-common-dir>/train-review/<head-sha>-<time>.md`.

A review that finds nothing is a pass. A review that did not run is a failure: the script
exits with an error and saves nothing. Never treat those two as the same.

## Triage (the authoring agent)

- **CONFIRMED** means you reproduced it, or read the code and the failing input is certain.
  Check that the file really is in your diff, then fix it.
- **PLAUSIBLE** means inferred but not verified. List it in the PR body. Don't edit for it.
- **Visual-only findings** mean opening the named URL in a browser and screenshotting it.
  That turns them into CONFIRMED or dismissed.
- Ask the user before any fix that deploys, rotates a secret, or rewrites published data.
  Everything else is your call, with the reasoning written in the PR body.
- **Two rounds per task.** Fixes produce a new commit, which needs a new review. If round 2
  still finds Blocking issues, stop and record them in the PR body instead of looping.
- Put a summary line in the PR body:
  `Review (<reviewer>): N confirmed, M plausible, K dismissed`.

## Calibrations

- Never present PLAUSIBLE as CONFIRMED.
- When an approach is sound, say so outright rather than inventing alternatives.
- "I searched and found nothing" counts as evidence only if the search could have found it.
