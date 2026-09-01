# German Relation Semantics human gate

This surface is the human inspection point for issue #193. It binds the review
to the Golden Corpus, corpus reservation, semantic evaluator, thresholds, six
cumulative combined-prompt revisions, model policy, and the retained #192
result. It never calls a provider or writes a verdict merely by being opened.

From `battery/dumgen`, run:

```sh
bun run review:german-relation-human-gate
```

The command verifies every frozen SHA-256 fingerprint, starts a loopback-only
review server, and opens it in the default browser. The page shows all six
prompt revisions, every target emitted by the final revision, every material
omission, every execution error, each Golden Case's structured sources, and the
per-kind semantic metrics. It also keeps the 50 post-stop calls visible as an
operational regression while excluding them from the decision metrics.

## State machine

The current and only valid state is `development-gate-failed`. No revision
cleared the exact per-kind development gate, so #193's acceptance precondition
is false. Approval, acceptance, and verdict endpoints return a hard conflict.
The 12-case reservation remains sealed, with zero cases revealed and zero
acceptance calls made.

If an approval, acceptance result, or verdict appears despite the failed
development gate, the review enters `invalid-post-development-artifact`. A
development-only result can never unlock production publication.

## Handoff contract

[`candidate-manifest.json`](candidate-manifest.json) is the machine-readable
frozen evidence inventory. `verdict.json`, `reservation-approval.json`, and
`acceptance-result.json` are intentionally absent. Production consumers treat
the absent verdict as an empty allowlist, so all six relation kinds remain
disabled while base Knowledge generation continues.

## Exact human action

Run the one command above and inspect the evidence. There is no paid action and
no promotion control. The page recommends `do-not-generate` for all six kinds,
but it does not record a human verdict on the reviewer's behalf. A future
candidate must first clear every required development threshold and receive a
new frozen manifest before the untouched reservation can be approved.
