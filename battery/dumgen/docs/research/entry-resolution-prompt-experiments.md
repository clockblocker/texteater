# Linguistic Entry resolution prompt experiments

Status: completed negative prototype for
[`clockblocker/texteater#7`](https://github.com/clockblocker/texteater/issues/7).
The experiment identifies an architecture worth carrying into a future
evaluation, but **no tested arm is eligible for production**. This artifact
does not change the dumgen or dumling runtime.

## Question and acceptance gate

The experiment asks which prompt ordering and decomposition most reliably
resolves a normalized contextual Surface to:

- an opaque Linguistic Entry identity or an explicit `ProposeNew` decision;
- the Entry family and concrete subkind;
- its Citation Form, which is the Lemma Form for a Lexeme; and
- applicable inherent features.

The fixed corpus and scoring contract come from
[#5](https://github.com/clockblocker/texteater/issues/5#issuecomment-5140070425),
the identity policy from
[#11](https://github.com/clockblocker/texteater/issues/11#issuecomment-5140122481),
and the accepted
[identity ADR](../../../../docs/adr/0001-separate-entry-identity-from-lemma-form.md).
The production gate is therefore deliberately strict:

1. zero invalid outputs;
2. 100% exact opaque identity and every populated Entry field; and
3. 100% of the cross-case identity relations.

A field average, a majority vote, or grammar-equivalent output cannot
compensate for an identity error. Matching language, spelling, Citation Form,
part of speech, inherent features, or paradigm may retrieve candidates and
prove difference, but cannot prove sameness.

## Reproducible prototype

The throwaway runner, immutable corpus, prompts, scorer, raw attempts, model
manifests, and summaries live under
[`prototypes/issue-7-entry-resolution`](../../prototypes/issue-7-entry-resolution/README.md).
Each raw attempt records the prompt-build hash, repetition, model response IDs,
actual model, token usage, latency, parsed result, and validation result.

The corpus has 21 cases: 18 German cases and three Russian boundary probes,
each run three times. Opaque IDs are arbitrary corpus identifiers. The German
cases cover the #5 Entry rows plus:

- one Entry for the lock and palace uses of `Schloss`;
- different Entries for financial `Bank`/plural `Banken` and bench
  `Bank`/plural `Bänke`;
- different Entries for adjective and adposition `laut`;
- one Entry for motor and clock uses of `laufen`;
- a `Ton` clay use whose catalog deliberately contains only the sound Entry,
  requiring `ProposeNew`; and
- German Lexeme, Phraseme/Idiom, and Morpheme/Circumfix examples.

The three Russian `коса` cases have identical Citation Form, family, subkind,
and gender, yet must resolve to distinct braid, scythe, and sand-spit Entries.
These cases make grammar-only identity fail visibly.

All prompts use the checked-in concrete Dumling inventory: Entry families,
family-specific subkinds, and the applicable German noun, verb, adjective, and
adposition feature names
([prompt inventory](../../prototypes/issue-7-entry-resolution/prompts.ts)).
Surface kind and inflectional features are inputs but cannot be copied into
Entry-inherent features.

From the repository root, a fresh reproduction of the original matrix is:

```sh
set -a
source .env.local
set +a
RUN_ID=reproduction-v1 \
ARM_FILTER=direct-family-first,direct-citation-first,progressive-grammar-first,progressive-identity-first,progressive-citation-first,agentic-candidate-inspection \
bun battery/dumgen/prototypes/issue-7-entry-resolution/run.ts
```

The one permitted evidence-driven refinement is:

```sh
set -a
source .env.local
set +a
RUN_ID=reproduction-v2 \
ARM_FILTER=agentic-hydrated \
bun battery/dumgen/prototypes/issue-7-entry-resolution/run.ts
```

The committed measurements are preserved separately as
[`results/v1`](../../prototypes/issue-7-entry-resolution/results/v1/summary.md)
and
[`results/v2`](../../prototypes/issue-7-entry-resolution/results/v2/summary.md).

## Access and cost limits

The project exposed only the `gpt-5-nano` alias. It resolved to
`gpt-5-nano-2025-08-07`; a live `gpt-5-mini` probe returned
`403 model_not_found`. A model-quality comparison was therefore unavailable,
and this result must not be generalized to stronger models.

The seven measured arms cost $0.048695 in total, excluding the small access
probes and preliminary smoke requests. Cost uses the price snapshot captured
in each manifest: $0.05 per million input tokens, $0.005 per million cached
input tokens, and $0.40 per million output tokens for `gpt-5-nano` on
2026-07-31
([official model pricing](https://developers.openai.com/api/docs/models/gpt-5-nano)).

## Original matrix

Each cell below summarizes 63 attempts, except the relational score: six
cross-case assertions per repetition, or 18 assertions per arm.

| Arm | Full contract | Identity | Citation Form | Family | Subkind | Features | Relations | Invalid | p95 | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| direct, family first | 47.6% | 58.7% | 93.7% | 96.8% | 93.7% | 82.5% | 38.9% | 0.0% | 2507 ms | $0.004723 |
| direct, citation first | 52.4% | 66.7% | 92.1% | 95.2% | 95.2% | 81.0% | 44.4% | 0.0% | 3046 ms | $0.004883 |
| progressive, grammar first | 36.5% | 68.3% | 92.1% | 98.4% | 93.7% | 55.6% | 38.9% | 0.0% | 5668 ms | $0.008552 |
| progressive, identity first | 36.5% | 68.3% | 84.1% | 90.5% | 85.7% | 52.4% | 44.4% | 4.8% | 4917 ms | $0.007113 |
| progressive, citation first | 49.2% | 66.7% | 84.1% | 93.7% | 90.5% | 68.3% | 50.0% | 0.0% | 4830 ms | $0.006657 |
| agentic candidate inspection | **76.2%** | **84.1%** | **95.2%** | **100.0%** | **93.7%** | **85.7%** | **61.1%** | **0.0%** | 5085 ms | $0.008534 |

The agentic arm is the clear experimental leader, but it is far below the
fixed gate. It failed financial-versus-bench `Bank` in two repetitions,
adjective-versus-adposition `laut` in one, same-Entry motor/clock `laufen` in
one, and `Ton` `ProposeNew` in all three. It also regenerated descriptors after
selecting an existing ID, occasionally adding or dropping features.

Every original arm falsely merged the missing `Ton` clay identity in all three
repetitions. The direct and progressive arms also repeatedly collapsed the
Russian `коса` homonyms or split the two intended same-Entry `laufen` uses.

## Fixed refinement

One refinement tested the specific failure mode observed in the leading arm:

1. require inspection of the complete candidate catalog;
2. ask the model only for `Existing(entryId)` or `ProposeNew`;
3. for `Existing`, hydrate Citation Form, family, subkind, and features
   deterministically from the selected catalog Entry; and
4. prompt for a descriptor only after `ProposeNew`.

| Arm | Full contract | Identity | Citation Form | Family | Subkind | Features | Relations | Invalid | p95 | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| agentic, hydrated descriptor | 30.2% | 30.2% | 82.5% | 93.7% | 88.9% | 71.4% | 0.0% | 0.0% | 6868 ms | $0.008232 |

Deterministic hydration does prevent descriptor drift after a correct existing
ID, but the identity-only prompt became overconservative and proposed new
Entries too often. It failed all six relational assertions in every
repetition, still falsely merged `Ton`, and had one 48.7-second outlier. The
refinement is rejected as an arm; no further tuning was performed.

## Ordering and decomposition findings

- **Family first versus Citation Form first:** citation-first direct prompting
  improved full-contract exactness from 47.6% to 52.4% and identity from 58.7%
  to 66.7%, but both are unreliable. There is no production recommendation
  between them.
- **Identity before versus after morphogrammar:** the progressive
  grammar-first and identity-first arms tied at 68.3% identity and 36.5% full
  contract. Identity-first additionally produced 4.8% invalid attempts. Asking
  for grammar first did not establish identity; asking for identity first did
  not make the later descriptor dependable.
- **Explicit Citation Form intermediate:** progressive citation-first was
  worse than the one-call direct citation-first arm on both full contract
  (49.2% versus 52.4%) and Citation Form itself (84.1% versus 92.1%). The data
  do not justify a separate Citation Form prompt.
- **Monolithic versus progressive:** every progressive arm cost more, was
  slower, and had lower full-contract exactness than direct citation-first.
  Narrower stages propagated early mistakes rather than correcting them.
- **Direct versus agentic:** required candidate inspection produced the best
  result by a large margin. It is the only tested architecture worth carrying
  forward, but its identity errors remain disqualifying.
- **Schema direction:** the concrete inventory made family classification
  comparatively strong, reaching 100% in the leading arm. It did not solve
  opaque identity, because the missing evidence is a lexical-boundary decision
  rather than a schema value.

## Dependency cycles and verdict

The experiment exposes a contract dependency, not a winning prompt order:

```text
context + descriptive evidence
  -> candidate retrieval
  -> boundary-policy identity decision
  -> catalog hydration for Existing
     OR descriptor construction for ProposeNew
```

Family, subkind, Citation Form, inherent features, and inflectional evidence
help retrieve candidates. Candidate boundary glosses and context are then
needed to decide identity. Once an existing identity is known, its reusable
descriptor should come from the catalog rather than be regenerated. A genuinely
new Entry needs a descriptor only after the no-match decision. Trying to make a
single model call prove identity from the descriptor silently recreates the
grammar-only policy rejected by #11; splitting the calls does not supply the
missing authority.

**Verdict: no production-eligible winner.** Preserve
`agentic-candidate-inspection` as the recommended *experimental architecture*,
not as a selected runtime strategy. A future evaluation may retry that
architecture only when it has either a stronger identity-capable model or a
non-LLM lexical-authority resolver. It must rerun the unchanged boundary cases
and meet the fixed 0%-invalid, 100%-field, and 100%-relation gate before
productionization.

