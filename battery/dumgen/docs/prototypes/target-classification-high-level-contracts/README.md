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
and OpaqueText remain. Every remaining segment carries its zero-based compact
index and an explicit click marker, redundant with the top-level clicked index;
the input schema rejects disagreements. Each adapter owns compact↔original
maps, materializes the same twenty #84 demonstrations, decodes into the
canonical original-index output, and is scored by the same #84 evaluator over
the exact 94-case development suite.

The retained v3 run ended in `NoWinner` and exposed representation-independent
prompt failures. The retained v5 run's policy-first prompt materially improved
all arms—full indices reached 66.49%, additional indices 61.17%, and the fixed
mask 59.57%—but still ended in `NoWinner`. Version v6 responded to its systematic
misses with a click-first decision procedure, redundant per-segment click
identity, explicit literal/Fusion/SYM rules, a silent validation pass, and
twenty high-information contrast demonstrations. Its retained run improved
additional indices to 81.38%, full indices to 80.32%, and the mask to 76.06%,
but still failed the robustness and click-invariance gates.

Version v7 changes the product oracle rather than merely tuning the prompt:
ordinary non-idiomatic Collocations are now separate Lexeme targets. Fixed
governed prepositions, idioms, sufficiently fixed expressions, and analytic or
separable verb members remain grouped. `Phraseme/Collocation` remains a valid
Dumling route for other explicit policies but is not reachable from this
high-level classifier. No provider call is part of the v7 change.

The exact 94 case IDs and 564-call schedule remain, but v7 changes nine
Collocation ideals and is therefore a new policy experiment rather than a
representation-only historical comparison. The cases were untouched hold-outs
for the earlier runs, but retained misses directly informed v6 and the policy
change informed v7; they are now a development suite, not independent evidence
of generalization. Any later winner/generalization claim requires a fresh,
analogous, untouched holdout selected before another prompt revision.

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

The approved schedule contains exactly **564 Responses requests** inside one
OpenAI Batch input:
94 cases × 3 arms × 2 attempts. It uses `gpt-5.6-luna`, reasoning `none`, low
verbosity, 1,024 maximum output tokens, `maxRetries: 0`, and `store: false`.
Every JSONL line uses `POST /v1/responses`, has a unique `custom_id`, and is
bound back to its frozen `<arm>/<attempt>/<case>` schedule key. The Batch uses a
`24h` completion window and refuses any schedule other than the frozen one.

GPT-5.6 prompt caching is explicit. Every request sets
`prompt_cache_options: { mode: "explicit", ttl: "30m" }` and marks the end of
the stable arm system prompt with an explicit breakpoint. Cache keys are a
deterministic arm-and-shard projection: each key receives no more than twelve
scheduled requests, below OpenAI's approximate fifteen-requests-per-minute
guideline, while every request within a shard shares the identical stable
system prefix. The cache and Batch transport policy are part of the preflight
binding.

The price binding is OpenAI Batch pricing for GPT-5.6 Luna observed on
2026-08-09:

- short context: $0.10/M input, $0.01/M cached input, $0.125/M cache write,
  $0.60/M output;
- long context: $0.20/M input, $0.02/M cached input, $0.25/M cache write,
  $0.90/M output.

See the [official GPT-5.6 Luna model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna),
the [Batch guide](https://developers.openai.com/api/docs/guides/batch), and the
[prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching).
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

## Explicit Batch mode and offline finalization

No live call is part of this change. After human approval only, submit the
frozen Batch explicitly:

```sh
bun --env-file ../../.env.local \
	  run prototype:target-classification-high-level-contracts batch-submit
```

The command prints the retained `batch-manifest.json` path. Poll or resume the
same Batch without resubmitting it:

```sh
bun --env-file ../../.env.local \
  run prototype:target-classification-high-level-contracts batch-resume \
  docs/prototypes/target-classification-high-level-contracts/runs/<run>/batch-manifest.json
```

While the Batch is nonterminal this records the latest raw Batch object and
prints its status. Once completed, the same command downloads both output and
error artifacts, maps their unordered `custom_id` values to the frozen schedule,
and writes `results.json`. It never silently submits a replacement Batch.

Submission is checkpointed at both remote-mutation boundaries. The uploaded
input file ID is written atomically before Batch creation, and the Batch ID plus
raw creation snapshot are written atomically immediately after creation. If the
process stops after either checkpoint, rerun `batch-submit` with that same run
directory: it continues from the retained phase and never uploads the input or
creates the Batch twice. Once a Batch ID exists, use `batch-resume`; retrieval
and collection do not create replacement remote objects.

The remote-success/local-write gap is reconciled as well. The upload uses a
deterministic filename containing the exact input SHA-256; before uploading, the
runner pages through purpose=`batch` Files and reuses exactly one filename-and-
byte-count match. Batch creation carries deterministic prototype, binding-SHA,
and input-SHA metadata; before creating, the runner pages through Batches and
reuses exactly one metadata, input-file, and endpoint match. More than one
matching File or Batch is an ambiguity error. A retained pre-call attempt marker
causes bounded polling before any replacement mutation, allowing for eventual
list consistency after a process failure. This recovery does not depend on an
undocumented idempotency header.

The complete raw Batch envelope and Responses body, raw output text, response/model
metadata, latency, usage, conservative billed-cost upper bound, canonical
output, and independent diagnostics are retained for every attempt. Batch
objects and every envelope/body also retain canonical UTF-8 byte counts. Canonical
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
