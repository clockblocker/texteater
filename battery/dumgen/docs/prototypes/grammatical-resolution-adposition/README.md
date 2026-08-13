# German Lexeme/ADP Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/adposition` Prompt Source. Its Golden Corpus
has 39 realistic cases: six demonstrations, 21 development cases, and 12
untouched acceptance cases. The selections are pairwise disjoint.

The model input is exactly `{ markedContext, members }`; the model output is the
total flat `{ memberOrthographies, normalizedMembers, surface, lemma }` DTO.
The ADP Surface is Citation-only, so the application injects `surfaceKind`,
German Lexeme/ADP identity, normalized Surface, Surface-to-Lemma linkage,
successful result construction, and `realizationCoverage: Full`.

Coverage includes prepositions, postpositions, multi-member circumpositions,
accusative/dative/genitive and alternating government, sentence-initial casing,
genuine typos, a multiword standard variant, abbreviation, foreign and archaic
forms, and contextual contrasts with a separable particle, governed VERB
member, SCONJ, and Fusion. Authoritative target membership is never repaired or
expanded to include the complement.

## Shared bounded evidence runner

This route is a thin configuration over the shared direct cached evaluation
runner. Each development round makes 21 direct serial Responses API calls; the
acceptance phase makes 12. The policy uses `gpt-5.6-luna`, no reasoning, a
4,096-token output ceiling, zero retries, and `store: false`. Import and
preflight make no provider call.

Every request shares a deterministic cache key, explicit breakpoint after the
stable system prompt, and 30-minute cache TTL. Evidence binds the exact prompt,
schemas, suite, generation and cache policy, raw provider metadata,
field diagnostics, and errors.

Run a deterministic development preflight from `battery/dumgen`:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adposition/run.ts preflight development 1
```

After explicit authorization, run one development round:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adposition/run.ts run development 1
```

Create a JSON sidecar for every scored miss using `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, then finalize
offline:

```sh
bun docs/prototypes/grammatical-resolution-adposition/run.ts finalize \
  docs/prototypes/grammatical-resolution-adposition/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-adposition/runs/<timestamp>/miss-classifications.json
```

After three finalized, fully classified development rounds, the shared runner
permits one reserved untouched acceptance run. Reservation is persisted before
transport creation and can never be relabelled untouched after failure:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adposition/run.ts preflight acceptance
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adposition/run.ts run acceptance
```

The complete protocol is bounded at 75 provider calls: `3 × 21 + 12`. No live
call was made during deterministic implementation.

The assembled prompt is currently about 2,436 tokens by the conservative
characters-per-four estimate; ideal outputs average about 69 tokens. Assuming
four cold batch starts, 71 cache reads, and the published GPT-5.6 Luna rates of
$1.00/M input, $0.10/M cached input, and $6.00/M output, the content estimate is
about $0.06. Structured Output schema overhead and cache-write billing make
$0.15 a practical expected reserve. Even the deliberately pessimistic case in
which every response consumes the full 4,096-token output ceiling and all input
is uncached stays near $2.05, below the leaf's $5 authorization ceiling.
Retained provider usage is authoritative after each authorized run; see the
[OpenAI API pricing page](https://openai.com/api/pricing/).

## Retained classified evidence

The authorized protocol completed on 2026-08-13 with 75 serial provider calls,
zero execution errors, and every scored miss classified.

| Phase | Retained result | Score | Miss disposition |
| --- | --- | ---: | --- |
| Development 1 | `runs/2026-08-13T10-07-15-745Z/results.json` | 14/21 (66.7%) | Seven prompt defects: government, positional casing, abbreviation spelling, and preferred-headword guidance |
| Development 2 | `runs/2026-08-13T10-09-15-691Z/results.json` | 18/21 (85.7%) | Three accepted model limitations: two lexical-government omissions and a two-way-preposition scalar error |
| Development 3 | `runs/2026-08-13T10-10-11-345Z/results.json` | 18/21 (85.7%) | The same three accepted model limitations on the unchanged selected prompt |
| Untouched acceptance | `runs/2026-08-13T10-11-07-484Z/results.json` | 11/12 (91.7%) | One accepted model limitation: omitted Archaic status for `behufs` |

After round 1, the prompt clarified three general policies without adding any
failed case as a demonstration: capitalization is positional; abbreviation
punctuation and explicit preferred-headword cues affect Surface/Lemma fields;
and governedCase follows the occurrence construction, including clausal,
position-sensitive, and morphologically unmarked complements. Round 2 cleared
the score gate. Round 3 reproduced that score on the unchanged binding, which
was then selected for untouched acceptance.

The four retained runs report 189,451 input tokens, including 181,983 cached
tokens and 4,923 cache-write tokens, plus 6,128 output tokens. Applying the
published Luna rates and the 1.25× cache-write multiplier gives an estimated
total of `$0.06366505`, below both the `$0.15` reserve and the authorized `$5`
leaf cap. The acceptance reservation is retained at
`runs/acceptance-reservation.json`; the suite cannot be claimed untouched or
run again.

## Legacy evidence

Existing v3 artifacts bind the old nullable Resolved/Unresolved wrapper,
membership-rejection corpus, and copied route runner. They remain historical
diagnostics and cannot finalize under v4.
