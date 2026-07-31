# PROTOTYPE — issue #6 Selection and Surface experiments

Throwaway prototype for
[`clockblocker/texteater#6`](https://github.com/clockblocker/texteater/issues/6).
It answers one question: which prompt-facing membership representation,
decomposition, adapter, and contextual-normalization strategy performs best on
the fixed `click-resolution-chain-v1` Selection/Surface subset?

This is deliberately not production code. It does not alter Dumgen's public
interfaces or persist domain entities. The automated corpus runner is the
logic-prototype state driver: after each batch it prints the full measured arm
state, while raw API responses and canonical adapter outcomes are retained under
`results/`.

## Run

From `battery/dumgen`:

```sh
set -a && source ../../.env.local && set +a
bun run prototype:issue-6
```

Defaults are three repetitions of all 24 click cases, concurrency four,
`gpt-5-nano`, low reasoning, and 2,048 maximum output tokens. Override only
through `REPETITIONS`, `CONCURRENCY`, `SHUFFLE_SEED`, `MODEL`,
`REASONING_EFFORT`, or `MAX_OUTPUT_TOKENS`; the manifest records every value.

The five arms are:

1. `monolith-indices` — one structured response with canonical indices.
2. `monolith-text` — one structured response with exact member strings and a
   deterministic exact-text-to-index adapter.
3. `chain-free-normalization` — narrow index membership, then free contextual
   normalization.
4. `chain-guarded-normalization` — narrow index membership, then one
   whitespace-free normalized item per validated member.
5. `agentic-inspection` — a tool call validates candidate indices and returns
   application-derived `attestedSurface` before the final structured result.

The eval corpus is never used as few-shot material.

`bun run prototype:issue-6:summarize` regenerates all metrics from the retained
JSONL rows without calling the API. It enriches every attempt with parsed JSON
bytes and the primary-contract retry count, then writes:

- `results/summary.json` for arm-level micro and operational aggregates;
- `results/detailed.json` for every arm/case, required-case-group macro, and
  per-repetition relational assertion;
- `results/summary.md` for the complete human-readable report.

The normalization audit intentionally distinguishes observed whitespace-token
expansion from general lexical insertion. The guarded response shape does not
prove insertion safety within a whitespace-free member item.
