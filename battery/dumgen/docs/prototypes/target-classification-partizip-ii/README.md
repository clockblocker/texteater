# German Partizip II target-classification benchmark

This targeted benchmark runs the 20 paired German examples in the canonical
corpus: ten **Verbal Partizip II** sentences and ten participial-adjective
sentences. Each sentence is tested from both the finite/copular member and the
participle, for exactly 40 scored cases.

The runner uses the shared direct Responses harness. It sends one request,
awaits its response, and only then sends the next case. It does not use the
OpenAI Batch API or a concurrent request pool. Explicit prompt caching can reuse
the unchanged system-prompt prefix, but never a case output. Retries are disabled
and every provider response retains its raw output, response ID, resolved model,
usage, and latency in the run result.

From `battery/dumgen`, inspect the bound prompt and 40-case limit without making
a provider call:

```sh
bun run prototype:target-classification-partizip-ii preflight
```

Run the single direct-serial round:

```sh
bun run prototype:target-classification-partizip-ii run
```

Results are written to `runs/<UTC timestamp>/results.json`. The console reports
the exact 40-case score plus 20-pair totals for Verbal Partizip II and
participial adjectives. The existing `Die Banken sind geöffnet` demonstration
is intentionally not scored: putting a verbatim prompt demonstration into its
own evaluation would be contaminated rather than held out.
