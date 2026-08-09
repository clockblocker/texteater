# PROTOTYPE ONLY: German high-level target contract representations

Question: **Which private compact membership representation most reliably
preserves the frozen German high-level target contract under identical evidence
and evaluation?**

This is issue #85's throwaway logic experiment, not a production Prompt Source
or public DTO. It compares three private Structured Output contracts:

1. every member as a compact index;
2. only compact member indices additional to the click;
3. one fixed-length boolean mask over the compact sequence.

All arms use the same compact input. Whitespace is removed while Punctuation
and OpaqueText remain. Each adapter owns compact↔original maps, materializes the
same twenty #84 demonstrations, decodes into the canonical original-index output,
and is scored by the same #84 evaluator over the exact frozen 94 held-outs.

The retained v3 run ended in `NoWinner` and exposed representation-independent
prompt failures. Version v4 replaces that prompt with a policy-first account of
the high-level task and twenty deliberately varied teaching cases. The 94
held-outs and the exact 564-call comparison schedule are unchanged, so a new
run remains comparable while the failed run stays as historical evidence.

## Deterministic preflight

From `battery/dumgen`, run the one package command:

```sh
bun run prototype:target-classification-high-level-contracts
```

Preflight performs no provider call. It proves adapter ideal round-trips,
private-stimulus uniqueness, shared compact stimuli, exact selections and call
cap, and prints the model/config, corpus, prompt, schema, and adapter hashes.
The evidence binding also pins the evaluator version and executable function
source, plus an executed frozen semantic fixture matrix. That matrix covers
Resolved and Unresolved decisions, route errors, schema and membership
validation, cross-click semantic fingerprints, and passing/failing click
aggregates, so helper and schema semantic drift changes the binding. Preflight
also binds the exact thresholds and inclusive tie rule and explicit valid and
invalid postcondition fixtures for every adapter. The additional-index adapter
rejects unordered or duplicate additional indices before it inserts the click.

The approved schedule would make exactly **564 direct Responses calls**:
94 cases × 3 arms × 2 attempts. It uses `gpt-5.6-luna`, reasoning `none`, low
verbosity, 1,024 maximum output tokens, `maxRetries: 0`, and `store: false`.
The runner is serial and refuses any schedule other than the frozen one.

The price binding is OpenAI Standard pricing observed on 2026-08-09:

- short context: $0.20/M input, $0.02/M cached input, $0.25/M cache write,
  $1.20/M output;
- long context: $0.40/M input, $0.04/M cached input, $0.50/M cache write,
  $1.80/M output.

See the [official pricing table](https://developers.openai.com/api/docs/pricing).
Preflight chooses the tier independently for every request, treats UTF-8 bytes
plus framing allowance as a conservative input-token upper bound, charges the
higher input/cache-write rate, and refuses a ceiling above **$5.00**. The
current deterministic request set estimates a maximum below that hard cap.

The official page is mutable and publishes `gpt-5.6-luna` as the only Luna
snapshot identifier; it provides no separately dated immutable snapshot or
price revision. Preflight binds that exact identifier as both the requested and
expected resolved model, and every successful response must return exactly
`response.model: "gpt-5.6-luna"`. The runner retains and binds the value, and
rejects any other identifier or within-run drift. This cannot detect a provider
backend revision served later under the same identifier, and the recorded date
and rates document an observation rather than an immutable price snapshot.

## Explicit live mode and offline finalization

No live call is part of this change. After human approval only, the same package
command can be given the explicit `run` mode:

```sh
bun --env-file ../../.env.local \
  run prototype:target-classification-high-level-contracts run
```

The complete JSON returned by Responses, raw output text, response/model
metadata, latency, usage, conservative billed-cost upper bound, canonical
output, and independent diagnostics are retained for every attempt. Canonical
JSON UTF-8 byte counts bind both the exact deterministic request and retained
response. The run is bound to all preflight hashes and cannot yield a winner
before offline finalization. Immediately after a successful `responses.create`,
the runner serializes the full response and measures its bytes before response
schema or usage parsing. Envelope-parse and usage-parse errors therefore retain
the raw response and byte evidence that produced them.

Create a JSON object keyed by each failed
`<arm>/<attempt>/<case>` with a classification and non-empty explanation, then
finalize without a provider call:

```sh
bun run prototype:target-classification-high-level-contracts finalize \
  docs/prototypes/target-classification-high-level-contracts/runs/<run>/results.json \
  docs/prototypes/target-classification-high-level-contracts/runs/<run>/miss-classifications.json
```

Finalization rejects source drift, incomplete calls, provider errors, missing or
extra classifications, and recomputes every adapter decode and evaluator result.
Before scoring, it rederives every scheduled case from the frozen selections and
byte-compares its canonical input, canonical ideal, private input, and private
ideal with the retained attempt. It also recomputes request/response byte counts,
checks raw response fields against retained metadata, and rejects resolved-model
drift or a changed run-level model binding.
An arm is eligible only with all 188 attempts, zero provider errors, zero
unclassified misses, all membership-safety and click-invariance gates, at least
80% overall score, and at least 80% in each route/boundary/robustness slice. A
unique arm must lead by more than one percentage point; otherwise the verdict is
`Tie`. If no arm is eligible, the verdict is `NoWinner`.
