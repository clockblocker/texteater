# Verdict: no production-eligible Segmentation Chain arm

I ran 336 attempts over the frozen 28-case `segmentation-chain-v1` corpus
(three repetitions per case and four arms), producing 488 serial OpenAI
Responses API requests with concurrency 1, no retries, no repair, and zero
provider errors. Every successful request resolved to
`gpt-5-nano-2025-08-07`.

None of the four arms passes the mandatory gates, so this ticket selects no
production prompt or agent:

| Arm | Exact Segmented Sentence | Intake | Boundary+kind F1 | Hebrew exact | Opaque F1 | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| minimal combined direct | 0.0% | 73.8% | 0.9% | 0.0% | 50.0% | $0.002379 |
| explicit combined direct | **52.8%** | 84.5% | **69.3%** | **25.0%** | 57.1% | $0.006381 |
| explicit decomposed direct | 40.3% | 81.0% | 64.4% | 16.7% | 50.0% | $0.006942 |
| explicit combined agentic review | 51.4% | **86.9%** | 62.2% | 8.3% | **71.4%** | $0.012052 |

The explicit combined direct Prompt Source is the next-experiment baseline,
not a production candidate. It leads exact segmentation and boundary+kind F1,
preserves every typo/variant case, and costs less than the other explicit
arms. It still fails reconstruction, `bra w u r him frfr`, local opacity,
Hebrew suffix/stacked-prefix atoms, repeated whitespace, unsupported language,
unintelligible input, and adapter validity.

The physically decomposed intake call is rejected for this model: it accepted
all unsupported-language controls, rejected every `RECON-03`, rejected six of
nine other severe-corruption attempts, reduced exact segmentation to 40.3%,
and required 81% more requests. Keep intake and segmentation logically
separate in the domain contract, but do not insert the tested nano intake call
as a physical bottleneck.

Independent review is also rejected. It raised aggregate intake accuracy only
by over-accepting: macro recall fell from 63.4% to 44.0%, every unsupported
control was accepted, exact segmentation and F1 fell, and cost rose 89%.

The supplied project listed only `gpt-5-nano`. No-retry probes of
`gpt-5-mini`, `gpt-5.4-mini-2026-03-17`, and `gpt-5.4-2026-03-05` each returned
HTTP 403 `model_not_found`, so a stronger-model run was not available under
this credential.

The concrete contract remains: the model emits only a rejected Intake
Decision with no segments or `Accepted` with complete nonempty ordered
`{kind,text}` segments; the application owns immutable ID, local indices, and
derived clickability; empty segments, unknown fields, IDs/indices/alignment,
and rejected-with-segments results are invalid without repair.

Full verdict, Prompt Sources, scorer, corpus, machine-readable summary, and
model-access evidence:
[reproducible issue #4 artifact](https://gist.github.com/clockblocker/cd4ae39f97e14ece1359b95cbe0c972c).

The local raw run additionally retains all 488 response objects and per-request
usage/latency records. No production code was changed or committed.
