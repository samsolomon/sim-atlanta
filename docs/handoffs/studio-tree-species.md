# studio-tree-species — gpt-6.2 handoff, 2026-11-23

## Current stopping point

Branch `samsolomon/tree-low-clawback`. PR #348 is OPEN and draft, not merged.
Rendering/tested SHA `fb699bbb1fd9d4db74931cb4c182375f61aca3a1` is frozen by
phone-perf at :4619. Commit `86750083` only records Sam approval and a follow-up
in docs/tree-mask-clawback.md. This handoff is another documentation-only commit.
Do not rebuild or change the frozen source during the coordinator's A16 runs.

Original four-species City rollout #336 merged at
`831662eff79d5ea8eb2e0926e7c3735107a7fadf`. It includes crape myrtle A,
loblolly A, sweetgum A and Japanese maple A. Actual 1180 terrace count is eight.
Original evidence: docs/tree-species.md and docs/log/ui/tree-species/rollout/.

## #348 implementation and evidence

A16 isolated #336 cost: default -8%, pan -11%. Probe builds showed foliage-mask
redraw/full-screen sampling dominates; mask-off recovered about 5 fps.
Low-tier RolloutBatch now unregisters species masks above 600 m camera-to-orbit-
target distance and restores below 500 m, with hysteresis. This is a whole-view
orbit metric, not distance to each tree. High and near rendering are unchanged.
Same-SHA control: active `perf=run&q=low&treeprobe=mask-on`; normal omits treeprobe.
Other perf-only probes are mask-off/shadow-off/foliage-off/carpet-off.

Source: web/src/trees/rollout-city.ts, web/src/city/city.ts;
tests: web/src/trees/rollout-probe.test.ts. Tests cover far-area mounts,
hysteresis, removal/reopen, and resetting uFoliage/EMPTY_MASK. Avoid registration
or allocation every frame. Preserve Winn carpet filtering when integrating main.

Full evidence and sheet index: docs/tree-mask-clawback.md.
Screenshots/metrics: docs/log/ui/tree-species/mask-clawback/.
Exact 384x692 all-12-area default and pan: orbit 21,084.375m; 962/962 registered
species instances suppressed. Prado 420m / 1180 350m: none suppressed.
Browser sequence 1000→420→550→700→350: off/on/on/off/on.
These are registered-instance counts, not visible crown counts.

Validation: 20 Rust, 939 web, 5 worker tests pass; one web skipped, pipeline
skipped without .venv. Build passes. test:perf low 536 calls / 2,336,759 tris;
high 1169 / 13,783,617, ceilings pass. High non-enforced startup target missed.
Cargo PATH needed /Users/samsolomon/.rustup/toolchains/stable-aarch64-apple-darwin/bin.
Claude cross-review: one visual risk at far distance, addressed with 700m day/night
sheets; no code/lifecycle findings. Sam accepted darker far interiors via
coordinator msg_92a329d9b040. Requested follow-up (already logged): single-clump far
species at low if darker interiors become distracting. Do not implement now.

Near cameras: Prado cam=1194,-4352,20,50,420;
1180 cam=650,-3690,0,0,350 (dev __setView(0,0,350,650,-3690,2), lens2).
Far Prado cam=1194,-4352,20,50,700. Matched Nov20 14:00 /23:00 ET.
Always-off looked worse near 1180, hence gate. Preserve near masks.

Pan probe failure was a Node/CDP Details line, not scene UI. Original full log lost;
local/frozen pan reproduced successfully all12. Phone-perf owns harness diagnosis;
no speculative scene patch. Final A16 runs retain full errors/screenshots.

## Next steps, in order

1. Wait for coordinator's final A16 pan rerun and explicit merge OK for #348.
   Sam visual gate has passed; performance/merge gate has NOT yet passed.
2. Resolve integration conflicts if needed. Main has advanced substantially;
   preserve both build-log entries on conflicts and rerun tests. Preserve Winn
   carpet exclusions. Tell phone-perf if rendering changes relative to frozen SHA.
3. Merge only after gates, then verify with
   `gh pr view 348 --json state,mergeCommit`; quote actual state and merge commit
   in notices. Never announce MERGED based only on a merge command attempt.
   Only the coordinator deploys. Release requires web rebuild, no data rebuild.
4. AFTER #348 merges, plan round 2: elm A, dogwood A, magnolia A3, white oak A,
   willow oak A, water oak A. Send placement proposal and low-tier cost estimate
   BEFORE building. Reuse mask gate; retain A16 and Sam day/night sheet gates.

## Coordination / promises

Our predecessor session: orca_session_id:752c9656-15cc-4501-99e1-e59257d6fdcb.
CLI: /Applications/Orca.app/Contents/Resources/bin/orca.
Direct Studio→Air sends fail pairing token; reply to coordinator incoming thread.
Coordinator: term_05a952fa-de06-4064-8655-3e98e1caf1e0 on Sam's MacBook Air.
Useful reply IDs: msg_68a775b113fe (6.2 migration), msg_82d32d6ae289 (round2),
msg_92a329d9b040 (Sam approval). Use your own session as --from after takeover.

Phone-perf: orca_session_id:dd052a89-7838-444f-a6d9-f1dfde9fcc25.
Owe final result/merge notice and any source SHA change. They freeze and compare;
no overlapping source edits. Frozen ports:4616 baseline d1411a9e,4617 rollout
b4993131,4618 probe546ab349,4619 fixfb699bbb. 53 staged files identical.
Do NOT stop these other-agent servers. Latest reply msg_7c211368680f confirms
docs-only head equivalent to frozen rendering. Target roughly within3% baseline.

Tree-lab: orca_session_id:48c0c9e4-ceda-4b87-adf1-6ada97d12390.
Magnolia A3 #345 verified f1f638b0a4714feb6d6f31c2098fe4cb82a3b194;
dogwood A #352 ab68dea70208ff535920f8795edb03d8e560999d;
white oak A #353 b1ad388f1e5287538268f255dea2e6d3a3b0677a.
Use preferred variants. White oak 193/81 tris incl carpet, near tips +120 per
eligible tree; winter retention crown-wide. cardHeight/bloomFill opt-in API.
No City wiring in lab PRs. Original coordinator request to remeasure High ginkgo
with __lab.crownStats remains unfulfilled; C4 City swap needs separate approval.

Winn: orca_session_id:ef6ac039-f20d-4773-bbff-e84554815860.
PR349 VERIFIED MERGED a64509686c54314f208ddd9eafcd64323a8e1e5d (earlier notice
was wrong then corrected). Carpet exclusion4710a123 adds optional RowTrees flag,
carpeted-list filter and rolloutSpecies exclusion rings, no mask/update edits.

## Cleanup / local resources

Own port5471 dev server was stopped; no listener at migration check. Own research
and capture tabs already closed. Other-agent Chrome/proxy/frozen servers remain
untouched. Do not shut down shared resources. Temp logs: /tmp/tree-mask-review.log,
/tmp/tree-mask-perf.log, /tmp/tree-mask-build.log, /tmp/studio-tree-species-tests.log.
No deployment performed. Coordinator requested this clean pushed handoff, then
no new work until successor takes over.
