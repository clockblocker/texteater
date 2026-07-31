# PROTOTYPE — issue #7 Linguistic Entry resolution experiments

Throwaway prototype for
[`clockblocker/texteater#7`](https://github.com/clockblocker/texteater/issues/7).
It answers one question: which prompt decomposition most reliably resolves a
Surface to its opaque Linguistic Entry identity, family, subkind, Citation
Form, and inherent features without deriving identity from spelling or grammar?

This is not production code. It uses an immutable eval-only corpus and writes
raw measured attempts plus summaries under `results/<run-id>/`.

## Run

From the repository root:

```sh
set -a && source .env.local && set +a && bun battery/dumgen/prototypes/issue-7-entry-resolution/run.ts
```

Defaults are three repetitions, six concurrent attempts, `gpt-5-nano`, and run
ID `current`. Override with `REPETITIONS`, `CONCURRENCY`, `SHUFFLE_SEED`,
`MODEL`, `RUN_ID`, `CASE_LIMIT`, or `ARM_FILTER`. The manifest records every
override, prompt hash, model response ID, token count, latency, and price
snapshot.

The original matrix has six arms:

1. `direct-family-first` — one schema-directed response, family/subkind before
   Citation Form and identity after grammar.
2. `direct-citation-first` — one schema-directed response, Citation Form before
   family/subkind and identity after grammar.
3. `progressive-grammar-first` — descriptor call followed by identity
   disambiguation.
4. `progressive-identity-first` — identity disambiguation followed by
   descriptor resolution.
5. `progressive-citation-first` — Citation Form call followed by the remaining
   descriptor and identity.
6. `agentic-candidate-inspection` — candidate stubs first, a required
   `inspect_entry_candidates` tool call, then the canonical structured result.

One fixed evidence-driven refinement was then run separately:

7. `agentic-hydrated` — evidence-driven refinement: inspect the complete
   candidate catalog, return only the identity decision, hydrate an Existing
   descriptor deterministically, and prompt for a descriptor only on
   ProposeNew.

The eval corpus is never used as few-shot material.
