# Studio skins rework, 2026-11-27

Owner: the Studio skin-rework agent (Claude). Coordinator: the Air city-view Claude. Nothing merged; all three PRs are held for the coordinator's final check and merge go.

| PR | Branch head | What changed | High night calls (main 629/630) |
|---|---|---|---|
| [#634](https://github.com/samsolomon/sim-atlanta/pull/634) Olympia Building | `35371006` | Generic colour-block ad on the rooftop sign; sign and office panes glow through one night-only additive overlay (no lamp mesh); slimmer mast | 630 (+1; accepted by the coordinator after #721 brought High night to 486) |
| [#573](https://github.com/samsolomon/sim-atlanta/pull/573) 1075 Peachtree | `efdb5923` | Reveal strips only at the two outside joints (4, all outside both masses), Juniper joint included, 0.25 m proud, above neighbouring roofs | 629 (+0) |
| [#587](https://github.com/samsolomon/sim-atlanta/pull/587) Centergy glass wing | `c7588892` | Facade on the mapped edges, clear of the 23 m south block (on its own ground); heights from the lidar grade; lamp look merged with batch-cell neighbours | 629 (+0) |

Checks on each head: `pnpm test` and `pnpm build` pass; after the last rebase onto main `69126699` (web diffs byte-identical to the gated heads); the crossing gate (daaa6bbd checker, 439abf84 limits, `--expect repaired`) is byte-identical to main `0d2225c2`; Codex `gpt-6.2-sol` medium, two rounds, confirmed findings fixed. The road lint could not run: it exists only on `road-kit-1-overlaps`, and its harness times out on current main itself (`0/0 areas loaded`).

Stills: each PR's `docs/log/ui/<building>/` folder (`olympia-rework-*.jpg`, `reveal-*.jpg`, `rework-*.jpg`); scratch originals in this session's scratchpad.

Open items:
- #634's +1 night call: accepted (coordinator, 2026-11-27; #721 took High night to 486).
- #573's Peachtree-side reveal is geometrically right but does not read at City range (occluded or turned away); an art call if it should.
- Branches are rebased on main `69126699` and mergeable.

Next action: Sam reviews the stills; the coordinator then gives the merge go. The coordinator has logged the broken crossing gate (439abf84 check.py) and road-lint harness on main for an owner.
