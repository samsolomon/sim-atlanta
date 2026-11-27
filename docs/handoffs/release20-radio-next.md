# Radio: Next starts playback (release 20, item 3)

- **Owner:** Studio release-20 agent. Coordinator: the Air.
- **Branch:** `samsolomon/radio-next-plays`, from main `0d2225c2`, which includes #719's picker.
  Worktree `release20-radio-next`.
- **Status:** PR open, waiting for the merge go.
- **Change:** `radio.next()` while not playing now skips to the next track and starts it.
  - Before the first Play, it creates the AudioContext inside the press.
  - After a pause, it cuts to the next track with no fade.
  - The Media Session next-track action follows.
- **Tests:** two cases in `web/src/ui/next/radio.test.ts`. Both fail with the fix reverted.
- **Screenshot:** `docs/log/ui/radio-next/next-from-off.jpg`.
