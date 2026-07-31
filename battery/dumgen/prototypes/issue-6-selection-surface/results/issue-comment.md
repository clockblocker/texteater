## Measured verdict

Use canonical Segment indices at the prompt/application boundary. Bare quoted
member text is not viable: all nine attempts covering the three repeated-`auf`
click cases failed the exact-text adapter as ambiguous.

For the next experiment, keep two narrow stages:

1. membership returns ordered, unique `ResolvableText` indices including the
   click plus clicked-only `selectedOrthography`;
2. application code validates them and constructs `attestedSurface`;
3. normalization works only over those validated members;
4. a guarded adapter accepts exactly one whitespace-free normalized item per
   member index, in order, and rejects rather than repairs anything else.

This is a research direction, **not a production winner**. No arm passed the
fixed `click-resolution-chain-v1` gates.

### Fixed run

- 24 click cases × 3 repetitions × 5 arms = 360 attempts
- `gpt-5-nano` → returned snapshot `gpt-5-nano-2025-08-07`
- low reasoning, 2,048 maximum output tokens, concurrency 4, seed 6006
- total measured cost: $0.151135
- price schedule: OpenAI, effective 2026-07-31

| arm | full exact | membership exact | membership F1 | normalization exact given correct membership | whitespace-token expansions | exact known lemmatizations | invalid | p95 latency | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| one prompt, indices | 40.3% | 52.8% | 77.6% | 92.1% | 0 | 0 | 0.0% | 13,611 ms | $0.025636 |
| one prompt, quoted text | 23.6% | 43.1% | 71.3% | 77.4% | 0 | 0 | 12.5% | 14,743 ms | $0.028017 |
| chained, free normalization | **44.4%** | **58.3%** | 83.1% | **90.5%** | 1 | 3 | 0.0% | 18,183 ms | $0.030050 |
| chained, guarded normalization | **44.4%** | **58.3%** | **83.5%** | 88.1% | **0** | 2 | 2.8% | 21,079 ms | $0.035009 |
| agentic membership inspection | 30.6% | 44.4% | 74.9% | 81.3% | 0 | 1 | 0.0% | 14,485 ms | $0.032423 |

The structural inspection tool did not add the missing linguistic judgment, so
the agentic arm was less accurate and more expensive than direct indices.
Guarded normalization had zero observed whitespace-token expansions, but this
does **not** prove general insertion safety: its adapter cannot detect every
lexical insertion inside a whitespace-free member. The fixed exact oracle also
found five known lemmatizations across the chained arms.

Important unresolved failures:

- no strategy reliably distinguished lexical membership in
  `Pass auf dich auf`;
- every strategy was unreliable on `heulte mit`, generally calling the partial
  realization `Full`;
- the discontinuous `ge-…-t` morpheme was often inflated to the full
  participle;
- the two chained arms preserved `armour` as Variant in all runs, but produced
  three total false typo-propagation errors.

Project access exposed only `gpt-5-nano`; a real `gpt-5-mini` request returned
HTTP 403 `model_not_found`. The verdict therefore applies to the measured nano
snapshot, not larger models.

Reproducible runner, raw responses, sanitized model-access evidence, scoring,
all 120 per-arm/case rows, 12 required-case group macros, per-repetition
relational assertions, and complete latency/byte/token/retry/cost aggregates
are captured under:

- `battery/dumgen/prototypes/issue-6-selection-surface/`
- `battery/dumgen/docs/research/selection-membership-surface-normalization-experiment-verdict.md`

No production code or public interface was changed.
