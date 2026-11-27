# Retry a failed City area from its notice (release 20, item 2)

- **Owner:** Studio release-20 agent. Coordinator: the Air.
- **Branch:** `samsolomon/board-retry`, from main `0d2225c2`. Worktree `release20-board-retry`.
- **Status:** PR open, waiting for the coordinator's merge go.

## What changed
- The menu's "Show full board" / "Frame the full board" row is removed. City's hidden `#city-info`
  button stays, because `web/tests/board-exterior.test.ts` and `scripts/ground-audit.mjs` click it.
- An area-failure notice now ends in **Retry**: "Could not load the north section.", "King
  Memorial could not load…", "Sweet Auburn could not load…", "King Memorial rail could not load."
- Retry reloads only the failed areas (`SquareMosaic.retryFailed`, King Memorial, Sweet Auburn,
  King rail).
- Brookwood's station model, prepared at boot, gets no Retry.
- A failure the camera has given up clears its notice (`SquareMosaic.onForget`). The exception is
  while the full board still needs it.
- A failed load keeps a camera link's pending destination.

## Evidence
- `web/src/square-board/sections.test.ts`: the three "notice" tests.
- The browser check blocks `north-band` in a private headless Chrome, sees the notice with Retry,
  unblocks, presses Retry, and the notice clears and stays clear: `docs/log/ui/board-retry/`.
