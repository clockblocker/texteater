# German Relation Semantics human gate

This surface is the only human decision point for issue #193. It binds the
review to the frozen judgment contract, corpus reservation, semantic evaluator,
thresholds, prompt/model policy, and retained #192 result. It never calls a
provider or writes a verdict merely by being opened.

From `battery/dumgen`, run:

```sh
bun run review:german-relation-human-gate
```

The command verifies every frozen SHA-256 fingerprint, starts a loopback-only
review server, and opens it in the default browser. The page shows every target
emitted by the best retained #192 topology, every material null/omission, every
execution error, the per-kind semantic metrics, and the isolated Antonym signal
from the stopped all-kinds arm.

## State machine

1. `awaiting-reservation-approval`: a non-empty, fingerprinted 12-case
   reservation exists but no human has approved its one-time reveal. This is
   the current state.
2. `approved-awaiting-acceptance`: approval exists; the sealed selection may be
   revealed and run exactly once under the frozen execution-failure policy.
3. `awaiting-verdict`: retained untouched acceptance evidence exists and is
   bound to the same candidate.
4. `complete`: one explicit human verdict exists for every relation kind.

The review command will not replace an existing approval, acceptance result, or
verdict. `promote` remains invalid unless the corresponding relation kind
passes retained untouched acceptance. A development-only result can never
unlock production publication.

## Handoff contract

[`candidate-manifest.json`](candidate-manifest.json) is the machine-readable
frozen candidate. A future human decision is written beside it as
`verdict.json` with format `german-relation-human-verdict-v1`; that file is
intentionally absent. Production consumers must treat an absent verdict, a
candidate-ID mismatch, or any non-`promote` decision as disabled.

## Exact human action

Run the one command above, enter a reviewer name, and click **Approve seal & run
once**. The confirmation shows and requires authorization of the deterministic
USD `0.108635100` maximum before the first provider call. After the retained
acceptance report appears, choose `promote`, `revise`, or `do-not-generate` for
all six kinds and click **Record frozen verdict**. Approval and verdict are
separate irreversible writes; neither is performed by preflight or page load.
