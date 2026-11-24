# Handoff: UI design session (sablefish)

From the Claude UI design session (Orca worktree `sablefish`, session
`a9091e2f-8837-42c1-9acb-b443007cf258`; read its history with `orca agent read` if you
need a detail). Written 2026-11-24.

## The role

You are Sam's **UI design session** for Sim Atlanta. You own the interface spec,
`docs/ui-controls-brief.md` on branch `samsolomon/ui-frosted-glass`. You do not build the
app. The **coordinator** Claude session (`city-view-38`) routes build work to Studio
agents and owns production deploys. Design questions from the builders arrive through
it. Answer them, record decisions in the brief, push, and reply with the commit.

Push to `samsolomon/ui-frosted-glass` with `git pull --rebase` first. Never force-push:
build agents push to this branch too. Record who decided and when ("Sam, 2026-11-24")
next to each decision.

## Where things stand

The brief is current through `f0df48a3`. Decisions from 2026-11-24, newest first:

- **Sharing** (`03b1682a`, `f0df48a3`):
  - Icon: Sam's solomon.io "S" favicon set.
  - Default link preview: a daylight downtown render with a glass card reading
    "Sim Atlanta", no tagline.
  - Shared views: the card shows a "SIM ATLANTA" eyebrow over the neighbourhood name,
    with a pre-rendered picture of that neighbourhood.
  - Previews come from static `/s/<slug>/` entry pages generated at build, never Worker
    rewriting, which would cost a Worker request per visit.
  - Status: Sam tested the build and it works. Not yet approved to ship.
- **Search** (`c2008ecd`):
  - Keeps 2D or 3D. The exceptions: a place outside City, picked in City, opens on the
    Map marked "Map only", and a staged View opens in City.
  - Five staged "Views" appear in the empty search.
  - Addresses are a later follow-up.
- **Menu:** a "Source code ↗" row below About & credits. The repo is public (Sam
  approved) and #638 added the MIT licence and public README. The row ships in #656.
- **Controls stay visible** (`772d44c1`):
  - Sam reversed "steps aside". The camera group rides the detail panel's left edge on
    desktop and stays top-right on phones.
  - "Follow in 3D" on vehicles. The selection survives 2D/3D switches.
  - Being built by the studio-ui-follow agent.
- **Radio** (`874e9f7c`, `9bcbc7c5`):
  - Player 340 px wide; ‹ › arrows get 44×44 hit areas; 18 px Next.
  - Loading spinner arc in the play button.
  - iOS `audioSession` playback, still needing a check on a real iPhone.
  - Static full-file fetch, since Cloudflare ignores Range requests.
  - Play/pause is a radius-10 rounded square, one shape in every state.
  - The radio is PR #446, held for Sam.
- **Glass performance** (`302687f3`): in-canvas shader glass over City, a 1 fps budget,
  and denser low-tier fills for panels with running text (PR #420 and #453, held for
  Sam).

## Open items

1. **Fictional artist and station names.** Check them against real bands and stations
   before the radio ships. Sam hasn't asked for it yet; offer.
2. **iPhone silent-switch test.** Sam has to run it on his iPhone.
3. **Final preview renders.** The share images should be daylight renders. The dusk
   mock was too dark.
4. **Answer builder questions** as they arrive from the coordinator.

## Useful files

- Mocks are in `/private/tmp/claude-501/-Users-samsolomon-orca-workspaces-train-map-sablefish/a9091e2f-8837-42c1-9acb-b443007cf258/scratchpad/`:
  - `og/` (share previews)
  - `gh/` (Source code row)
  - `fav/` (solomon.io icons)
  - `canvas/` (design canvas boards)

  These are temporary and may be cleared.
- Design canvas artifact: https://claude.ai/artifact/CCsbqwgHy8fTJ2ujri2iSx (private).
- Final layout captures: `docs/ui-a2c/final/`.
- Radio music: branch `samsolomon/radio-music`, folder `web/public/music/`. ElevenLabs
  audio is excluded from the MIT licence and is not for reuse.

## Rules

- **The repo is public.** No key values, private notes or personal details in commits,
  PRs, issues or comments.
- **Secrets:** never print or commit the MARTA or 511GA keys. Sam deleted the ElevenLabs
  key; ask him for a new one if more music is needed.
- **Cost:** everything stays on the Cloudflare free tier. Flag any per-visitor Worker
  work.
- **Sam's approval:** builds are held for Sam. A test he likes is a passed review, not
  approval to ship.
