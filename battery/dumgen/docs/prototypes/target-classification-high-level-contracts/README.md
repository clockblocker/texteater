# PROTOTYPE ONLY: German high-level target contract

Question: **Does the lean additional-member-indices contract preserve the
German high-level target policy across the development suite?**

This remains issue #85's logic experiment, not a production Prompt Source or
public DTO. Its frozen Adaptive-5 instruction body has now been promoted as the
first production `prompt-part`; schemas, demonstrations, adapters, and runner
remain laboratory concerns. The experiment retains one private Structured
Output contract: the click is
implicit membership. For every Resolved result, the model returns a top-level
`additionalMemberIndices` array containing only the other members; a
one-segment target uses `[]`. Unresolved uses `target: null` and
`additionalMemberIndices: null`.

The model input is exactly
`{ markedSentence: string, segments: { s: string, i: number }[], clickedIndex: number }`.
`markedSentence` preserves the natural source and wraps the exact clicked
surface once in `<target>...</target>`. The adapter XML-escapes source text so
those are the only real markers. `segments` exposes only `ResolvableText`
candidates; `i` is the stable coordinate among all non-whitespace source
segments, so omitted punctuation or opaque context leaves gaps. `clickedIndex`
equals the marked candidate's `i`. Canonical kinds and original source indices
stay deterministic, and output membership can use only exposed `i` values.
The adapter materializes the selected demonstrations, decodes
into the canonical original-index output, and is scored by the #84 evaluator
over the exact 94-case development suite. Demonstrations are capped at 35 and
kept as small as the current policy coverage permits.

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

Version v7 kept the exact 94 case IDs and 564-call comparison schedule, but
changed nine
Collocation ideals and is therefore a new policy experiment rather than a
representation-only historical comparison. The cases were untouched hold-outs
for the earlier runs, but retained misses directly informed v6 and the policy
change informed v7; they are now a development suite, not independent evidence
of generalization. Any later winner/generalization claim requires a fresh,
analogous, untouched holdout selected before another prompt revision.

Version v8 retires the full-index and fixed-mask alternatives. Only the
additional-indices contract remains, reducing the frozen schedule to 188 calls
without changing the 94 development cases or two-attempt policy.

Version v9 makes transport selection explicit. Every provider run binds a
mandatory `batching` boolean into preflight evidence. Batch mode retains its
checkpointed upload/create/resume workflow; direct mode uses eight concurrent
Responses calls and an atomic checkpoint that skips completed logical attempts
on restart. Each iteration has a conservative $2 ceiling. A winner now requires
each independent 94-case attempt to pass at least 90 cases, plus membership
safety and click-invariance; slice ratios remain diagnostics rather than winner
gates.

Five bounded direct v9 development iterations were run on 2026-08-10. Their
per-attempt scores were 81/84, 84/84, 85/85, 81/82, and 84/84 out of 94. The
empirically best configuration uses 27 demonstrations and is retained in
[`runs/2026-08-10T07-05-38-236Z/results.json`](runs/2026-08-10T07-05-38-236Z/results.json):
85/94 in each attempt, zero provider errors, 91.67% routes, 90.91% boundaries,
and 87.5% robustness. It fails membership safety and click-invariance, so the
honest verdict is `NoWinner`. The five direct runs consumed a combined retained
cost upper bound of $0.335872, well below the $10 session cap. These are
development-suite results, not evidence of generalization.

Version v10 adds an explicit runner pool. `development` preserves the frozen
94-case, 188-call comparison. `diagnostic` is a non-winner-eligible 34-case
selection containing the 14 failures from the best v9 run plus 20 controlled
analogues. The two selections are retained separately: adding diagnostic cases
does not mutate the historical development suite.

Version v11 removes deterministic source metadata from the model contract.
The private input no longer exposes `clickedCompactIndex`, per-segment
`compactIndex`, `clicked`, `kind`, or `text` fields. Its sole click coordinate
is `clickedIndex`, and `segments` is a string array. The private output field is
`additionalMemberIndices`; the internal representation ID remains
`additional-compact-indices` so retained experiment artifacts keep their
historical identity. The lean interface itself is an adapter-seam change. Any
canonical corpus or target-policy edits shipped in the same v11 evidence set
remain separate semantic changes and are bound by the corpus and evaluator
hashes. Because the current v11 worktree also changes Collocation policy and
oracles, a v11 run establishes a new semantic baseline; its score cannot serve
as a DTO-only comparison with retained v10 runs.

Version v12 makes optional information structurally absent. A Resolved target
whose only member is the click now returns `membership: null`. A multi-segment
target returns a non-null membership object with at least one
`additionalMemberIndices` entry. The adapter restores the implicit click in
both cases, and the schema rejects a non-null empty membership object. The
diagnostic follow-up artifact is correspondingly versioned as v3.

Version v13 reactivates the retained policy-first historical prompt, with only
the private contract vocabulary migrated to the lean positional input,
nullable membership, and currently reachable Collocation route. The newer
three-rule prompt remains retained beside it as an inactive comparison
artifact. This creates a direct development-suite comparison against the v12
prompt under the same model and generation settings.

Version v14 moves `additionalMemberIndices` beside `decision` and `target`, so
the target object describes only the Family/Kind route. The materialized
demonstration and evaluation corpus now uses `[]` for a Resolved singleton and
`null` only for Unresolved. The deterministic adapter continues to restore the
implicit click before producing canonical `memberSegmentIndices`; the
canonical corpus itself retains that richer internal shape. Both retained
prompts describe the v14 contract, and the newer three-rule prompt is active
for this run. Adapter fixtures are v4, as is the diagnostic follow-up artifact.
The direct v14 development run completed all 188 calls without provider
errors. Its two attempts scored 47/94 and 48/94 (95/188, 50.53%), versus
54/94 and 52/94 for v12's earlier use of the newer prompt. Structured output
always supplied the new fields, but 37 answers failed deterministic
canonicalization: 20 repeated the implicit click and 22 selected punctuation
or opaque context, with five answers doing both. The run therefore fails the
membership-safety and click-invariance gates and remains unfinalized pending
miss classification.

Version v15 ran five adaptive direct iterations on the unchanged 94-case
development selection, with two replicates each. Concrete examples were
removed from active policy prose; all examples are corpus-backed,
contamination-checked, and selected at most once per source sentence. The
marked-input seam eliminated v14's deterministic punctuation/opaque-index
failures immediately. Scores progressed 82/83, 85/84, 87/86, 83/83, and
89/88. Iteration 5 is the best aggregate configuration at 177/188 (94.15%)
with 21 unique-sentence demonstrations, zero provider errors, 93.33% routes,
98.86% boundaries, and 85% robustness. It remains below the predeclared
threshold because neither replicate reached 90/94; demonstration ablation did
not activate. Its one safety miss repeated `clickedIndex` in one governed-
preposition answer. These are adaptive development scores, not generalization
evidence.

Version v16 narrows this classifier's route interface again: Dumling's global
German model still supports `Phraseme/Collocation`, but this prompt and its
canonical development corpus omit it just as they omit the Morpheme Family.
All 18 former Collocation ideals retain their historical case IDs. Seventeen
now select only the clicked singleton Lexeme; the fused `zur` occurrence
independently routes as singleton `Construction/Fusion`. The active Structured
Output and canonical corpus schemas share one local route table that rejects
Collocation; the global Dumling route table remains unchanged. The removed
route and demonstration space is spent on explicit PairedFrame
operator-versus-payload rules and governed-preposition membership checks. This
is a policy-oracle change, so its run is a new development baseline rather than
a directly comparable improvement over v15.

The direct, non-batch v16 run completed both replicates at 87/94, for 174/188
(92.55%) overall, with zero execution errors and a $0.0461968 billed-cost
upper bound. Every evaluated former-Collocation occurrence followed the new
singleton-Lexeme oracle in both replicates. Membership safety passed, but the
click-invariance gate failed because two clicks inside the same four-member
Idiom were classified outside that Idiom. The seven stable misses per
replicate were Fusion `zum`; both `je ... desto` comparative fillers; the free
adverb inside a perfect; two fixed-function-word clicks inside `mit den
Wölfen heulen`; and the first, prepositional `auf` near a later separable
particle. Retained results are in
`runs/2026-08-13T04-43-20-629Z/results.json`.

The following five-profile adaptive study used a separate frozen 30-case set:
the seven v16 misses plus 23 novel analogues. Adaptive-5 had the strongest
replicate floor and aggregate score at 28/30 and 27/30 (55/60), but no profile
was formally eligible: every profile retained unclassified misses and failed
the click-invariance gate. Adaptive-5 is therefore not a winner. Its exact
prompt and exact 21 demonstration IDs are frozen into `frozen-94` only as the
explicitly ineligible best-score fallback for the requested final regression.
The assembled system-prompt hash and demonstration IDs are byte-identical
between `adaptive-5` and `frozen-94`; no prompt or demonstration changes are
permitted after this freeze.

Across the five direct adaptive runs, replicate scores were 23/21, 23/24,
23/25, 23/25, and 28/27 out of 30. The final frozen-94 regression then scored
89/94 in both replicates, or 178/188 (94.68%), with zero execution errors,
membership safety passing, and a $0.04645772 billed-cost upper bound. Its ten
missed observations occupy five case slots: `Dank` was split from `Herzlichen
Dank`; the comparative payload `früher` remained singleton but routed ADV
instead of ADJ; and clicks within `mit den Wölfen heulen` produced incomplete
or standalone targets. Click invariance therefore remained false. The final
artifact is `runs/2026-08-13T05-29-01-478Z/results.json`; the five immediately
preceding adaptive artifacts retain every intermediate profile binding.

## Deterministic preflight

From `battery/dumgen`, run the one package command:

```sh
bun run prototype:target-classification-high-level-contracts preflight --batching=true --pool=development
```

Preflight performs no provider call. It proves adapter ideal round-trips,
private-stimulus uniqueness, exact selections and call
cap, and prints the model/config, corpus, prompt, schema, and adapter hashes.
The evidence binding also pins the evaluator version and executable function
source, plus an executed frozen semantic fixture matrix. That matrix covers
Resolved and Unresolved decisions, route errors, schema and membership
validation, cross-click semantic fingerprints, and passing/failing click
aggregates, so helper and schema semantic drift changes the binding. Preflight
also binds the exact thresholds and explicit valid and invalid postcondition
fixtures for the adapter. The additional-index adapter
rejects unordered or duplicate additional indices before it inserts the click.

The approved schedule contains exactly **188 Responses requests**, either
inside one OpenAI Batch input or as one bounded direct run:
94 cases × 1 contract × 2 attempts. It uses `gpt-5.6-luna`, reasoning `none`, low
verbosity, 1,024 maximum output tokens, `maxRetries: 0`, and `store: false`.
Every JSONL line uses `POST /v1/responses`, has a unique `custom_id`, and is
bound back to its frozen `<contract>/<attempt>/<case>` schedule key. The Batch uses a
`24h` completion window and refuses any schedule other than the frozen one.

GPT-5.6 prompt caching is explicit. Every request sets
`prompt_cache_options: { mode: "explicit", ttl: "30m" }` and marks the end of
the stable contract system prompt with an explicit breakpoint. Cache keys are a
deterministic contract-and-shard projection: each key receives no more than twelve
scheduled requests, below OpenAI's approximate fifteen-requests-per-minute
guideline, while every request within a shard shares the identical stable
system prefix. The cache and Batch transport policy are part of the preflight
binding.

The Batch price binding for GPT-5.6 Luna was observed on 2026-08-09:

- short context: $0.10/M input, $0.01/M cached input, $0.125/M cache write,
  $0.60/M output;
- long context: $0.20/M input, $0.02/M cached input, $0.25/M cache write,
  $0.90/M output.

See the [official GPT-5.6 Luna model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna),
the [Batch guide](https://developers.openai.com/api/docs/guides/batch), and the
[prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching).
Direct mode binds the corresponding standard Responses prices observed on
2026-08-10: $0.20/M input, $0.02/M cached input, $0.25/M cache write, and
$1.20/M output for short context; long-context input/cache rates are doubled
and output is $1.80/M.

Preflight chooses the tier independently for every request, treats UTF-8 bytes
plus framing allowance as a conservative input-token upper bound, charges the
higher input/cache-write rate, and refuses a ceiling above **$2.00**. The
current deterministic request set estimates a maximum below that hard cap.

The official page is mutable and publishes `gpt-5.6-luna` as the only Luna
snapshot identifier; it provides no separately dated immutable snapshot or
price revision. Preflight binds that exact identifier as both the requested and
expected resolved model, and every successful response must return exactly
`response.model: "gpt-5.6-luna"`. The runner retains and binds the value, and
rejects any other identifier or within-run drift. This cannot detect a provider
backend revision served later under the same identifier, and the recorded date
and rates document an observation rather than an immutable price snapshot.

## Explicit transport modes and offline finalization

Run the direct transport with bounded concurrency eight:

```sh
bun --env-file ../../.env.local \
  run prototype:target-classification-high-level-contracts run \
  --batching=false --pool=development [run-directory]
```

For failure triangulation only, run the 34-case diagnostic selection twice
(68 logical calls total):

```sh
bun --env-file ../../.env.local \
  run prototype:target-classification-high-level-contracts run \
  --batching=false --pool=diagnostic [run-directory]
```

After that first-turn diagnostic run, request neutral second-turn diagnostics
without changing or rescoring its evidence:

```sh
bun --env-file ../../.env.local \
  run prototype:target-classification-high-level-contracts \
  diagnostic-follow-up --batching=false \
  docs/prototypes/target-classification-high-level-contracts/runs/<run>/results.json \
  [follow-up-artifact-directory]
```

The follow-up selection contains every failed attempt across both original
replicates, plus at most one passing control from each of six mechanism
clusters: Fusion, PairedFrame, idiom membership, optional reflexive, copula,
and separable/position. Each control is the lowest passing attempt key
in its cluster. Selection reason and cluster are retained as artifact metadata,
but the model is blind to both, as well as to evaluator flags and the oracle.
It sees only a fixed neutral diagnostic instruction, the original private
input, and its retained first answer.

This direct-only workflow permits at most 40 physical dispatches and has its
own conservative $0.10 ceiling. The retained 29 misses plus six controls bind
35 logical calls with a $0.07806625 conservative ceiling, leaving room for at
most five crash-gap replays while both guards still apply. Before every
dispatch and after every result it atomically rewrites
`diagnostic-follow-up.json`; rerunning the same command and artifact directory
skips completed keys. The artifact binds the exact source file bytes and hash,
the source's own historical evidence binding, the neutral instruction, and the
follow-up request schedule. It is explicitly non-winner-eligible and never
overwrites or mutates the source `results.json`, its attempts, or its scores.

On resume, a retained follow-up provider error is retried only when it satisfies
the direct runner's transient policy: network/transport failures, HTTP 429, or
HTTP 5xx, with at most two retries for that logical key. Each retry dispatch is
checkpointed first and consumes the same 40-dispatch and $0.10 ceilings. A
successful retry or exhausted final error atomically replaces the earlier
provider-error result. Successful diagnostics, model/schema-output errors, and
non-transient provider errors are terminal and are never replayed.

Direct mode atomically writes `direct-checkpoint.json` before every dispatch and
after every completed logical attempt. Rerunning the command with the same
directory skips completed keys. A dispatched but incomplete key is replayed;
every dispatch, including such a crash-gap replay, counts against the retained
$2 conservative ceiling. The Responses API cannot reconcile that gap remotely
when `store: false`, so the checkpoint records dispatch counts separately from
the 188 logical result slots.

Direct mode also retries a logical request at most twice, and only for transport
or network failures, HTTP 429, or HTTP 5xx. It never retries a valid provider
response merely because its model output, schema, or semantic classification is
wrong. Each retry is checkpointed as another physical dispatch before the call
and must fit under the same $2 ceiling. Exhaustion retains the final provider
error in the request's one logical result slot.

Alternatively, submit the frozen Batch explicitly:

```sh
bun --env-file ../../.env.local \
	  run prototype:target-classification-high-level-contracts batch-submit \
  --batching=true --pool=development [run-directory]
```

The command prints the retained `batch-manifest.json` path. Poll or resume the
same Batch without resubmitting it:

```sh
bun --env-file ../../.env.local \
  run prototype:target-classification-high-level-contracts batch-resume \
  --batching=true \
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
`<contract>/<attempt>/<case>` with a classification and non-empty explanation, then
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
The retained contract is eligible only with all 188 attempts, zero provider
errors, zero unclassified misses, all membership-safety and click-invariance
gates, and at least 90/94 exact passes in each independent attempt. Route,
boundary, and robustness slice ratios remain reported diagnostics but are not
winner gates. If eligible, the verdict names `additional-compact-indices` as
the winner; otherwise the verdict is `NoWinner`.
