# Review charter

This is how a change gets checked and reviewed in this repo, whoever reviews it: a person, an
agent reviewing its own work, Grok, or the cross-model reviewer that `pnpm review` runs. A reviewer asked to find gaps
will always find some. This charter limits what gets reported, so that review time goes to
the failures this project can actually ship.

The finding shapes and severity scale are in `AGENTS.md`, between the `review-bounds`
markers. They live there because every agent, the reviewer included, loads that file
automatically. Edit them there.

## Before a pull request merges

1. Run the checks for the change's risk (below).
2. Review it yourself with Grok, then triage the findings.
3. Put the verdicts in the PR body, one line per round with the head it read.
4. Send the coordinator the head. The coordinator runs one final check and gives the merge go.
   **Nothing merges without that go.**

## Checks by risk

| Change | Checks |
| --- | --- |
| Docs or data only | Tests and build |
| Geometry (roads, bridges, buildings) | Tests and build; the road lint (once it exists); the `439abf84` crossing gate where relevant; matched stills. `pnpm test:perf` only if the change adds meshes, materials or shader programs |
| Shared or per-frame code (traffic, loading, shaders, materials) | All of the above that apply, plus `pnpm test:perf`. The coordinator decides whether it needs an iPhone run |
| A release | The full packaging pass and the iPhone A/B. Once per release, not once per PR |

- **Tests and build** are what CI runs on every pull request (`.github/workflows/ci.yml`:
  `pnpm test:release`, the type check and the web build), so no separate fresh-clone run is
  needed. CI has no GPU: it skips the browser tests in `web/tests/` and doubles the build-step
  time limits. Run `pnpm test` on a Mac when you change City's camera, follow, board edges or
  build slicing.
- The crossing gate is the frozen checker in `pipeline/prototypes/crossing-checks/check.py` at
  that fixture commit (see `docs/connector-repairs.md`). Use it where a change touches a
  Connector crossing.
- Visual changes still need a browser check and a screenshot (`AGENTS.md`, "Seeing your work").
- The Studio is for timed performance and GPU work. Ask its integrator for the window before a
  timed run.

## Reviewing with Grok

Run it read-only, from your worktree, with the diff in a file **inside the worktree** (its plan
agent cannot read outside it). Don't commit that file, and delete it afterwards.

```sh
git diff origin/main...HEAD > review-diff.tmp   # three dots: this branch's changes only
OUT=$(mktemp "${TMPDIR:-/tmp}/grok-review.XXXXXX")
opencode run --agent plan -m xai/grok-4.7 "You are a read-only code reviewer. Do not edit, create
or delete files, and do not run builds, tests, servers or browsers. Review this branch's changes
against origin/main under docs/review-charter.md and the finding list in the Review section of
AGENTS.md. The diff is in ./review-diff.tmp. Report each finding with severity, file and line,
and the concrete input that makes it fire. End with exactly MERGEABLE or NEEDS FIXES." < /dev/null > "$OUT"
rm review-diff.tmp; cat "$OUT"
```

It takes a few minutes. Redirecting stdin from `/dev/null` keeps it from waiting for input.
A run that ends without a verdict **did not happen**. Review before opening a pull request and
again before updating one. Don't change opencode's configuration or sign-in, and don't install
it: if it isn't available, send the coordinator the branch head and range instead.

## How `pnpm review` works

`pnpm review` gets a second opinion from Codex or Claude. Use it when asked for one.

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
- Put a summary line in the PR body for each round:
  `Review (<reviewer>, <head>): MERGEABLE or NEEDS FIXES; N confirmed, M plausible, K dismissed`.

## Calibrations

- Never present PLAUSIBLE as CONFIRMED.
- When an approach is sound, say so outright rather than inventing alternatives.
- "I searched and found nothing" counts as evidence only if the search could have found it.
