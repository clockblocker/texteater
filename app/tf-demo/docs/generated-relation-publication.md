# Generated relation publication

Generated Semantic Relations are fail-closed. Production derives its relation
request and publication allowlist from the retained human verdict for #193. An
absent, unreadable, incomplete, unsigned, duplicate, or candidate-mismatched
verdict produces an empty allowlist. Dumrel applicability never promotes a
kind. Resolving a proposed Unit Shadow to an existing Lemma is a storage outcome
reported as a direct match, not semantic validation.

The deterministic compilation step is:

```sh
cd app/tf-demo
bun run compile:relation-policy
```

It verifies every candidate-manifest artifact hash and candidate ID, then reads
the frozen verdict and its untouched acceptance result. A `promote` decision is
compiled only when that exact kind's retained acceptance gate passed. The
output is `convex/model/compiledRelationVerdict.ts`; Convex imports only this
local frozen value and never reads the filesystem. `bun run check` compares the
compiled value with the gate artifacts, so adding or changing a verdict cannot
silently leave production disconnected. Missing or malformed evidence compiles
to an empty allowlist with an invalidation reason.

The runtime binds an accepted verdict to five identifiers: the production
prompt, output schema, semantic evaluator, model, and judgment/publication
policy. A change to any identifier invalidates the whole verdict and requires a
new frozen candidate, untouched acceptance reservation, human review, and
per-kind verdict. Adding a relation kind likewise leaves that kind disabled
until its own explicit `promote` verdict. A changed corpus reservation,
threshold, acceptance evidence, or candidate identifier also requires
requalification even when the prompt text is unchanged.

The operational rollback row is checked again in the Convex mutation that
writes Dumdict. Turning rollback on stops new generated direct claims and new
pending relation records while retaining base Knowledge from the same response.
It does not delete historical direct claims. Re-enabling the switch cannot
bypass a missing or invalid verdict.

Every requested kind records generated targets or a semantic null separately
from pending-shadow and direct-match storage outcomes. Invalid model output and
publication failure have independent counters. Target proposals retain the
source Reading, source occurrence Attestation (the marked-context reference),
target Unit Shadow, generation attempt/run, verdict artifact, and all five
fingerprints. A deterministic sample is queued for human review; rejected
samples are regression evidence and operators can engage rollback without
changing base Knowledge generation.
