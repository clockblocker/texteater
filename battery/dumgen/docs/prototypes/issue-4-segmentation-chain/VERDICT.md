# Segmentation Chain prompt experiments: verdict

Date: 2026-07-31  
Issue: [clockblocker/texteater#4](https://github.com/clockblocker/texteater/issues/4)  
Corpus: `segmentation-chain-v1`

## Decision

**No tested Prompt Experiment is reliable enough to advance.** All four arms
fail at least one mandatory acceptance gate. Do not productionize a prompt,
agent, or output schema from this ticket.

For the next experiment, use **explicit combined direct** as the comparison
baseline, not as a production candidate. It produced the highest exact
Segmented Sentence accuracy (52.8%), the highest boundary-and-kind F1 (69.3%),
perfect typo/variant preservation, the lowest cost among explicit arms, and
half the requests of agentic review. It still fails decisively on severe
reconstruction, `bra w u r him frfr`, local opacity, Hebrew fused atoms,
unintelligible/unsupported intake, repeated spaces, and adapter validity.

Keep the domain chain logically split into a language-agnostic Intake Decision
and language-specific segmentation contract, but do **not** spend an additional
model call on the tested nano intake specialist. That physical decomposition
reduced exact segmentation to 40.3%, rejected every `RECON-03` attempt, labeled
all six unsupported-language controls `Accepted`, and cost more than the
explicit combined baseline. A future physical split needs a materially more
capable intake model or deterministic/high-confidence routing evidence before
it is competitive.

Independent model review is also rejected. It raised aggregate intake accuracy
from 84.5% to 86.9% only by over-accepting: macro intake recall fell from 63.4%
to 44.0%, all six unsupported controls were accepted, exact segmentation fell
to 51.4%, boundary-and-kind F1 fell to 62.2%, and cost rose 89%.

## Measured run

The clean run made 336 case attempts (28 cases × 3 repetitions × 4 arms) and
488 serial Responses API requests. It used concurrency 1, no retries, no
repair, `store: false`, default service tier, and a fixed shuffled order.
Every successful request resolved to `gpt-5-nano-2025-08-07`.

The run consumed 254,360 input tokens, 37,592 output tokens, 0 cached tokens,
and 0 reported reasoning tokens. Total measured model cost was $0.0277548
against OpenAI standard pricing effective 2026-07-31. There were zero provider
errors and 17 strict adapter failures. Raw responses, request timing, usage,
cost, and adapter errors are retained in the run JSONL.

| Arm | Exact sentence | Intake | Intake macro recall | Boundary+kind F1 | Hebrew exact | Opaque F1 | Reconstruction | False reconstruction | Adapter failures | Requests | p95/request | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| minimal combined direct | 0.0% | 73.8% | 49.1% | 0.9% | 0.0% | 50.0% | 0.0% | 10.9% | 12 | 84 | 2,321 ms | $0.002379 |
| explicit combined direct | **52.8%** | 84.5% | **63.4%** | **69.3%** | **25.0%** | 57.1% | 25.0% | **16.4%** | 5 | 84 | 2,860 ms | $0.006381 |
| explicit decomposed direct | 40.3% | 81.0% | 62.0% | 64.4% | 16.7% | 50.0% | 0.0% | 18.6% | **0** | 152 | **2,603 ms** | $0.006942 |
| explicit combined agentic | 51.4% | **86.9%** | 44.0% | 62.2% | 8.3% | **71.4%** | **41.7%** | 28.3% | **0** | 168 | 3,094 ms | $0.012052 |

Every arm has minimum per-class exact accuracy 0%. The lower apparent false
reconstruction rates above count only predictions that actually returned an
accepted replacement; wrong intake and adapter failures are penalized by their
own metrics rather than invented as reconstructions.

## Required Prompt Sources

These are the frozen human-authored prompt sources in `prototype.ts`. The
evaluation corpus does not appear in any prompt or example.

1. `SC-COMB-ZS-v1` — minimal combined direct: one compact task description, no
   role, no examples, combined decision-and-segments schema.
2. `SC-COMB-FS-v1` — explicit combined direct: combined specialist role, full
   domain/boundary instructions, combined schema, five ordered examples, all
   five used.
3. `SC-INTAKE-FS-v1` + `SC-SEGMENT-FS-v1` — explicit decomposed direct:
   language-agnostic intake role and decision schema, followed only on
   `Accepted` by the language-specific segmenter role and segments schema.
4. `SC-COMB-FS-v1` + `SC-REVIEW-v1` — explicit combined agentic: the same
   combined draft, then an independent reviewing agent sees source plus draft
   and must emit a replacement final result.

Structured Outputs constrain shape, while the application adapter enforces
nonempty segments and constructs the canonical immutable
`SegmentedSentenceId`, local indices, and clickability. Models never emit IDs,
indices, click flags, or source alignment.

## Rejected alternatives and failure modes

### Minimal combined direct

The compact instruction set was not enough. Although it often preserved the
authoritative string, it usually emitted the entire sentence as one
`ResolvableText` segment. Exact sentence accuracy was 0%, Hebrew exact was 0%,
and 12/84 attempts violated semantic adapter requirements such as empty segment
text or rejected decisions carrying segments.

### Explicit combined direct

Few-shot explicit instructions materially improved segmentation, but did not
make it stable:

- repeated spaces were collapsed in every `DE-BOUND-04` attempt, and one
  attempt also changed `zwei` to `zweoi`;
- only one of four Hebrew cases (`HE-FUSED-01`) was reliably split; suffixes
  and stacked prefixes remained fused or produced empty segments;
- `RECON-03` was never exact: it was rejected twice and preserved `bra w`
  rather than reconstructing `braw` once;
- local gibberish was often marked `ResolvableText`; opacity F1 was 57.1%;
- four of six unintelligible controls and two of six unsupported controls were
  accepted;
- reconstruction frequently omitted required inserted whitespace or changed
  kinds instead of conservatively reconstructing.

### Explicit decomposed direct

The separate intake call eliminated adapter failures but became a destructive
information bottleneck. All unsupported-language controls were accepted.
`RECON-03` was rejected as `Unintelligible` three times, and six of nine other
severe-corruption attempts were rejected. Once intake rejects, segmentation
cannot recover. It required 81% more calls than combined direct.

### Explicit combined agentic

The reviewer corrected output-shape failures, but became biased toward
`Accepted`. It accepted all unsupported controls and four of six unintelligible
controls. It did somewhat better on reconstruction and local opacity, but
worsened exact segmentation, boundary-and-kind F1, Hebrew accuracy,
preservation, and false reconstruction while nearly doubling cost.

## Stronger-model boundary

The supplied OpenAI project listed only `gpt-5-nano`. Direct no-retry probes of
`gpt-5-mini`, `gpt-5.4-mini-2026-03-17`, and `gpt-5.4-2026-03-05` each returned
HTTP 403 `model_not_found`. The “cheap versus stronger where available”
comparison was therefore unavailable under this credential and is not
silently approximated by a prompt or reasoning-effort change.

## Concrete contracts to retain

- Canonical model output is either a rejected Intake Decision with no segments,
  or `Accepted` with a complete ordered array of nonempty `{kind, text}`
  segments.
- The schema admits exactly the four domain kinds and no other fields.
- Concatenated segment text is the authoritative replacement.
- The application, not the model, owns the stable immutable ID, zero-based
  local indices, and `clickable == (kind == ResolvableText)`.
- Reject empty segments, rejected results with segments, accepted results
  without segments, model-emitted IDs/indices/alignment, and unknown fields.
- Do not retry, repair, majority-vote, or silently sort primary experiment
  output.
- Preserve source bytes unless the case is severe, structurally corrupted, and
  intelligible. Structural reconstruction may insert/remove boundaries but
  must not normalize, expand `u r`, lemmatize, or resolve downstream identity.

## Reproducibility

- Harness: `prototype.ts`
- Fixed corpus: `corpus.ts`
- Raw clean run: `runs/2026-07-31T06-51-02-291Z/attempts.jsonl`
- Machine-readable metrics: `runs/2026-07-31T06-51-02-291Z/summary.json`
- Human-readable full results:
  `runs/2026-07-31T06-51-02-291Z/RESULTS.md`
- Stronger-model evidence:
  `runs/2026-07-31T06-51-02-291Z/availability.json`

This verdict answers issue #4 but does not establish production readiness. A
future experiment should start from `SC-COMB-FS-v1`, change one factor at a
time, use a stronger accessible model, and evaluate on a new hidden or
versioned corpus rather than tuning against and re-reporting
`segmentation-chain-v1`.
