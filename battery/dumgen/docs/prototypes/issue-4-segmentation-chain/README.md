# Issue #4 Segmentation Chain prototype

**Question:** Which prompt and agent decomposition most reliably implements the
Segmentation Chain on the frozen `segmentation-chain-v1` corpus?

This is throwaway experiment code, not production code. It compares direct and
agentic strategies, combined and decomposed intake/segmentation, two
instruction/example sets, and every stronger model exposed by the supplied
OpenAI project. The evaluator adds the application-owned immutable ID and
checks the canonical boundary contract; models only decide intake and segment
content.

Run the complete, serial, three-repetition experiment:

```sh
cd battery/dumgen && bun --env-file ../../.env.local docs/prototypes/issue-4-segmentation-chain/prototype.ts run
```

Rebuild summaries from retained JSONL without API calls:

```sh
cd battery/dumgen && bun docs/prototypes/issue-4-segmentation-chain/prototype.ts summarize
```

Browse the latest run in a small terminal UI:

```sh
cd battery/dumgen && bun docs/prototypes/issue-4-segmentation-chain/prototype.ts browse
```

`run` uses concurrency 1, no retries, `store: false`, deterministic seeded case
order, and writes raw response objects before deriving summaries.
