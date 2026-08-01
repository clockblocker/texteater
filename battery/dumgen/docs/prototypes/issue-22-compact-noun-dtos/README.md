# Issue #22 compact German noun DTO experiment

**Question:** Can a strict, codec-backed compact model DTO preserve the same
canonical German noun Grammar and Reading results while materially reducing
model-bound tokens?

This is an opt-in prototype. It is not imported by Dumgen's default
`PROMPT_CATALOG` or public API. The two arms use the same four fixed cases and
`gpt-5-nano` configuration; only model DTO schemas, prompt legends, and examples
differ.

Write the deterministic byte and estimated-token comparison:

```sh
cd battery/dumgen && bun run experiment:issue-22
```

Run the bounded live comparison (eight serial calls, no retries, `store:false`)
with the repository-local credentials:

```sh
cd battery/dumgen && bun run experiment:issue-22:live
```

Regenerate or check the experiment's disposable system prompts:

```sh
cd battery/dumgen && bun run generate:experiment:issue-22
cd battery/dumgen && bun run check:experiment:issue-22
```

The runner retains JSON under `runs/`. See [REPORT.md](./REPORT.md) for the
decision and interpretation.
