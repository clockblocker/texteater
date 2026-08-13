# German Lexeme/NOUN Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/noun` Prompt Source. Its Golden Corpus has 40
realistic cases partitioned into six demonstrations, 21 development cases, and
13 untouched acceptance cases. The three selections are pairwise disjoint.

The model contract is the total flat DTO
`{ memberOrthographies, normalizedMembers, surface, lemma }`. Input is exactly
`{ markedContext, members }`, with members matching TARGET spans in source
order. App-owned codec constants restore language, family, kind, the Surface
to Lemma link, and Full realization coverage; the model neither repeats those
fields nor emits an Unresolved decision.

Coverage includes all German noun cases, singular and plural, vocative null
case, invariant and plural-only forms, casing repair, a licensed spelling
variant, archaic Surface Features, substantivized forms, and orthographic
hyphens. The narrow route-local suspended-compound projector additionally
supports one trailing `-`, `‐`, or `‑` member in binary `und`/`oder`
coordination with one full right compound. It completes only the literal shared
terminal suffix and otherwise delegates to the strict shared projection. The
development and acceptance suites include positive suspended forms across
case, number, spelling, conjunction, and Divis variants; deterministic tests
cover the rejected boundaries from the issue #93 decision.

## Shared bounded evidence runner

This route is a thin configuration over the shared direct cached evaluation
runner. A development round makes 21 direct serial Responses API calls; the
acceptance phase makes 13. The policy uses `gpt-5.6-luna`, no reasoning, a
4,096-token output budget, zero retries, and `store: false`. Import and preflight
make no provider call.

Every call shares a deterministic cache key for the stable assembled system
prompt, an explicit cache breakpoint at its end, and a 30-minute TTL. Retained
evidence binds prompt, schemas, suite, generation policy, cache policy, raw
provider metadata, exact field diagnostics, and errors.

Run a no-provider development preflight from `battery/dumgen`:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-noun/run.ts preflight development 1
```

An explicitly authorized development run uses:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-noun/run.ts run development 1
```

Draft results are written atomically below `runs/<timestamp>/results.json` and
cannot qualify until offline human classification. Create a JSON sidecar keyed
by every miss, using `prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`, each with a non-empty explanation, then finalize:

```sh
bun docs/prototypes/grammatical-resolution-noun/run.ts finalize \
  docs/prototypes/grammatical-resolution-noun/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-noun/runs/<timestamp>/miss-classifications.json
```

After three separately finalized, fully classified development rounds, the
shared runner permits one untouched acceptance reservation and run:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-noun/run.ts preflight acceptance
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-noun/run.ts run acceptance
```

The acceptance reservation is persisted before provider transport is created,
so a failed attempt is never relabelled untouched. Across the complete protocol
the upper bound is 76 calls: 3 × 21 development plus 13 acceptance.

The assembled prompt is currently about 1,969 tokens by the conservative
characters-per-four estimate; ideal outputs average about 72 tokens. Assuming
three cold batch starts, 73 cache reads, and the published GPT-5.6 Luna rates of
$1.00/M input, $0.10/M cached input, and $6.00/M output, the content estimate is
about $0.06. Structured Output schema overhead and cache-write billing make
$0.15 a practical expected reserve. Even the deliberately pessimistic case in
which every response consumes the full 4,096-token output ceiling stays near
$2.00, well inside the shared $20 ceiling. Retained provider usage is
authoritative after each authorized run; see the
[OpenAI API pricing page](https://openai.com/api/pricing/).

## Retained v5 evidence

The authorized protocol completed on 2026-08-13 with zero execution errors:

- development round 1: 19/21 (90.5%),
  `runs/2026-08-13T09-43-21-117Z/results.json`; both misses classified as
  prompt defects (licensed-variant guidance and Typo-prefix completion);
- development round 2: 20/21 (95.2%),
  `runs/2026-08-13T09-45-01-109Z/results.json`; the remaining variant miss was
  reclassified as a corpus/evaluator defect after the official rule showed the
  two spellings are equal variants;
- development round 3: 21/21 (100%),
  `runs/2026-08-13T09-46-27-556Z/results.json`, with no misses; and
- untouched acceptance: 12/13 (92.3%),
  `runs/2026-08-13T09-47-12-383Z/results.json`; one isolated
  `oder`/singular suspended-completion miss is classified as an accepted model
  limitation.

The corpus correction does not declare a universal preferred spelling. The
[official 2024 word list](https://grammis.ids-mannheim.de/rechtschreibung/6790)
treats `Fotografie` and fachsprachlich `Photographie` as licensed variants, so
the revised development sentence explicitly supplies an editorial headword.

Across all 76 calls, retained usage records 163,016 input tokens, of which
154,263 were cached and 6,328 were cache writes, plus 6,186 output tokens. At
the rates above, the measured content cost is approximately $0.06 before any
separate cache-write surcharge, safely below both the $0.15 reserve and the $5
leaf authorization cap.

## Legacy evidence

Any existing v4 NOUN artifacts bind the earlier nullable
Resolved/Unresolved wrapper, old corpus, old schemas, and duplicated runner.
They remain historical diagnostics only and cannot finalize under v5.
