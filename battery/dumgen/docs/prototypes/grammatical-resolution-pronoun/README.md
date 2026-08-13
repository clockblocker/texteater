# German Lexeme/PRON Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/pronoun` Prompt Source. Its Golden Corpus has
39 realistic full-sentence cases: six demonstrations, 21 development cases,
and 12 untouched acceptance cases. The selections are pairwise disjoint and
together exhaust the corpus.

The model input is exactly `{ markedContext, members }`; both projections are
authoritative and alignment-validated. The total model output is the flat
`{ memberOrthographies, normalizedMembers, surface, lemma }` DTO derived from
the German PRON codec. The Surface discriminator remains model-owned because
PRON permits Citation and Inflection. The application injects German
Lexeme/PRON identity, normalized Surface, Surface-to-Lemma linkage, successful
result construction, and `realizationCoverage: Full`.

Coverage includes personal, reflexive, reciprocal, demonstrative, relative,
interrogative, indefinite, negative, total, and substantive possessive uses;
all four cases; first, second, and third person; singular and plural; feminine,
masculine, and neuter; contextual Reflex; formal and informal politeness;
`ExtPos=DET`; `Foreign=Yes`; and every codec PronType. It also exercises
syncretic `sie`, required formal capitalization, an external-apostrophe
contraction, an invariant Citation, a licensed spelling variant, a genuine
typo, and an archaic genitive Surface.

Route distinctions are upstream-fixed. Context containing a DET, ADV, PART, or
governing VERB never causes membership repair or reclassification, and a PRON
selected by an inherently reflexive VERB remains the exact supplied PRON
member.

## Scalar PronType policy

The German Dumling codec exposes one nullable PronType scalar, although source
annotation can associate some homographic paradigms with combined labels. The
total route cannot reject such a valid classified target or emit a value the
codec does not accept. The prompt therefore selects the single value licensed
by this occurrence's grammatical role: `Rel` in a relative clause, `Int` in a
direct question, and the corresponding single value for the other fixed uses.
This is a codec-capacity boundary, not a membership or route-classification
decision.

The feature policy follows the
[German UD overview](https://universaldependencies.org/de/), the lexical
[German DET/PRON boundary](https://universaldependencies.org/de/pos/DET.html),
and the
[German GSD PRON inventory](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-PRON.html).
All corpus sentences are synthetic; no external sentence text is reproduced.

## Shared bounded evidence runner

This route is a thin configuration over the shared direct cached evaluation
runner. Each development round makes 21 direct serial Responses API calls; the
acceptance phase makes 12. The policy uses `gpt-5.6-luna`, no reasoning, a
4,096-token output ceiling, zero retries, and `store: false`. Import and
preflight make no provider call.

Every request shares a deterministic cache key, an explicit breakpoint after
the stable system prompt, and a 30-minute cache TTL. Evidence binds the exact
prompt, schemas, suite, generation and cache policy, raw provider metadata,
field diagnostics, and errors.

Run deterministic preflight from `battery/dumgen`:

```sh
bun docs/prototypes/grammatical-resolution-pronoun/run.ts \
  preflight development 1
```

After explicit authorization, run and finalize three development rounds:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-pronoun/run.ts run development 1

bun docs/prototypes/grammatical-resolution-pronoun/run.ts finalize \
  docs/prototypes/grammatical-resolution-pronoun/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-pronoun/runs/<timestamp>/miss-classifications.json
```

Every scored miss must have a JSON sidecar classification of `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`. After three
finalized development rounds with zero execution errors, the shared runner
permits one reserved untouched acceptance run. Reservation is persisted before
transport creation and can never be relabelled untouched after failure:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-pronoun/run.ts preflight acceptance
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-pronoun/run.ts run acceptance
```

The standard protocol is bounded at 75 provider calls: `3 × 21 + 12`.
Acceptance prompt defects trigger the #90 recovery protocol: retain and
classify the failed acceptance, change the prompt from evidence, replace every
observed acceptance case, then run three newly bound development rounds before
one suite-specific replacement acceptance. The 2026-08-13 work required three
such recovery cycles plus one superseded development draft and one initial
diagnostic draft, for 342 observed calls.

The final provider requests contained about 4,040 input tokens and 104–110
output tokens each, with roughly 4,009 stable input tokens served from cache
after a cold write. Retained provider usage is authoritative; see the
[OpenAI API pricing page](https://openai.com/api/pricing/).

## 2026-08-13 retained evidence

| Phase | Score | Errors | Disposition | Evidence |
| --- | ---: | ---: | --- | --- |
| Initial diagnostic D1 | 7/21 (33.3%) | 1 | Ineligible schema-error draft; classifications retained | [results](runs/2026-08-13T10-25-06-884Z/results.json), [classifications](runs/2026-08-13T10-25-06-884Z/miss-classifications.json) |
| Initial D1 | 16/21 (76.2%) | 0 | Finalized; all misses classified | [results](runs/2026-08-13T10-28-40-306Z/results.json), [classifications](runs/2026-08-13T10-28-40-306Z/miss-classifications.json) |
| Initial D2 | 20/21 (95.2%) | 0 | Finalized; threshold met | [results](runs/2026-08-13T10-30-40-204Z/results.json), [classifications](runs/2026-08-13T10-30-40-204Z/miss-classifications.json) |
| Initial D3 | 20/21 (95.2%) | 0 | Finalized; threshold met | [results](runs/2026-08-13T10-31-58-849Z/results.json), [classifications](runs/2026-08-13T10-31-58-849Z/miss-classifications.json) |
| Acceptance v1 | 8/12 (66.7%) | 0 | Failed; four prompt defects | [results](runs/2026-08-13T10-33-21-563Z/results.json), [classifications](runs/2026-08-13T10-33-21-563Z/miss-classifications.json) |
| Recovery 1 D1 | 21/21 (100%) | 0 | Finalized | [results](runs/2026-08-13T10-39-02-481Z/results.json), [classifications](runs/2026-08-13T10-39-02-481Z/miss-classifications.json) |
| Recovery 1 D2 | 21/21 (100%) | 0 | Finalized | [results](runs/2026-08-13T10-39-51-487Z/results.json), [classifications](runs/2026-08-13T10-39-51-487Z/miss-classifications.json) |
| Recovery 1 D3 | 20/21 (95.2%) | 0 | Finalized; one accepted stochastic limitation | [results](runs/2026-08-13T10-40-36-406Z/results.json), [classifications](runs/2026-08-13T10-40-36-406Z/miss-classifications.json) |
| Acceptance v2 | 9/12 (75.0%) | 0 | Failed; three prompt defects | [results](runs/2026-08-13T10-41-34-627Z/results.json), [classifications](runs/2026-08-13T10-41-34-627Z/miss-classifications.json) |
| Recovery 2 D1 | 21/21 (100%) | 0 | Finalized | [results](runs/2026-08-13T10-44-37-056Z/results.json), [classifications](runs/2026-08-13T10-44-37-056Z/miss-classifications.json) |
| Recovery 2 D2 | 21/21 (100%) | 0 | Finalized | [results](runs/2026-08-13T10-45-45-720Z/results.json), [classifications](runs/2026-08-13T10-45-45-720Z/miss-classifications.json) |
| Recovery 2 D3 | 21/21 (100%) | 0 | Finalized | [results](runs/2026-08-13T10-46-50-541Z/results.json), [classifications](runs/2026-08-13T10-46-50-541Z/miss-classifications.json) |
| Acceptance v3 | 10/12 (83.3%) | 0 | Numeric threshold passed, but two prompt defects required recovery | [results](runs/2026-08-13T10-47-39-353Z/results.json), [classifications](runs/2026-08-13T10-47-39-353Z/miss-classifications.json) |
| Recovery 3 superseded D1 | 20/21 (95.2%) | 0 | Finalized; prompt defect caused binding restart | [results](runs/2026-08-13T10-50-17-010Z/results.json), [classifications](runs/2026-08-13T10-50-17-010Z/miss-classifications.json) |
| Recovery 3 counted D1 | 20/21 (95.2%) | 0 | Finalized; one accepted stochastic limitation | [results](runs/2026-08-13T10-51-33-259Z/results.json), [classifications](runs/2026-08-13T10-51-33-259Z/miss-classifications.json) |
| Recovery 3 counted D2 | 21/21 (100%) | 0 | Finalized | [results](runs/2026-08-13T10-52-18-350Z/results.json), [classifications](runs/2026-08-13T10-52-18-350Z/miss-classifications.json) |
| Recovery 3 counted D3 | 20/21 (95.2%) | 0 | Finalized; one accepted stochastic limitation | [results](runs/2026-08-13T10-53-06-806Z/results.json), [classifications](runs/2026-08-13T10-53-06-806Z/miss-classifications.json) |
| Acceptance v4 | 12/12 (100%) | 0 | Finalized; threshold met, no prompt defects | [results](runs/2026-08-13T10-54-36-025Z/results.json), [classifications](runs/2026-08-13T10-54-36-025Z/miss-classifications.json) |

The initial diagnostic prompted an official-GSD correction of demonstrative
`das` to the `der` Lemma and general rules for contextual Inflection,
sentence-initial normalization, number, politeness, contraction morphology,
`was für`, and archaic genitives. Later evidence justified narrower rules for
plural `sie`, invariant `sich`, substantive-possessive Lemmas,
Typo-versus-Variant spelling, co-referential Reflex, demonstrative gender,
inflecting `wer`/`jemand`/`niemand` paradigms, compound indefinite Lemmas, and
foreign identity and morphology. No failed development or acceptance case was
added to demonstrations. Each observed acceptance suite was retired in full
and replaced with 12 new IDs and sentences before the next reserved run.

Across all 18 retained v2 drafts, provider metadata records 1,298,155 input
tokens, including 1,249,992 cached tokens, and 36,022 output tokens. At the
published token rates used for the estimate, that is approximately **$0.3893**,
safely below the $5 leaf ceiling. The only execution error occurred in the
initial ineligible diagnostic draft; all 321 subsequent calls were error-free.
The selected final binding has development scores 20/21, 21/21, and 20/21,
followed by untouched acceptance 12/12 with no prompt defects.

## Legacy evidence

The retained 2026-08-03 v1 artifacts bind the old one-field input, nullable
Resolved/Unresolved wrapper, route-negative corpus, copied runner, and obsolete
model policy. They remain historical diagnostics and cannot finalize under v2.
