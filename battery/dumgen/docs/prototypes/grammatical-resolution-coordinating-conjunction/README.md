# German Lexeme/CCONJ Grammatical Resolution evaluation

This route-local pilot implements the classified-target contract for
`grammatical-resolution/de/lexeme/coordinating-conjunction`. It does not change
catalog or runtime assembly and does not edit the generated System Prompt.

## Model contract

The legacy model input was `{ markedContext }`. Its output had a
`Resolved | Unresolved` decision, a nullable `resolution`, model-owned
`realizationCoverage`, and a model-emitted Citation discriminator.

The current input is exactly:

```ts
{ markedContext: string; members: string[] }
```

Both values are authoritative projections of an already-classified target.
The prompt never repairs, rejects, adds, removes, reorders, or reclassifies
membership. The total flat model output is exactly:

```ts
{
  memberOrthographies: ("Standard" | "Typo")[];
  normalizedMembers: string[];
  surface: {
    spelling: "Canonical" | "Variant";
    surfaceFeatures: null | { historicalStatus: "Archaic" | null };
  };
  lemma: {
    canonicalForm: string;
    coreFeatures: { conjType: "Comp" | null };
  };
}
```

The DTO is derived from the German CCONJ Lemma and Citation Surface codecs.
The application owns `language`, `family`, `kind`, fixed Citation kind,
Surface-to-Lemma linkage, normalized Surface, successful resolution, and
`realizationCoverage: "Full"`. None is model output. CCONJ has no Inflection
Surface.

## Frozen corpus partitions

The corpus contains 36 realistic full-sentence resolved occurrences. The
partitions are frozen by grammatical coverage and pairwise disjoint.

Demonstrations (6):

- `grammar-de-cconj-demo-ordinary-und`
- `grammar-de-cconj-demo-comparative-als`
- `grammar-de-cconj-demo-causal-denn`
- `grammar-de-cconj-demo-typo-udn`
- `grammar-de-cconj-demo-variant-bzw`
- `grammar-de-cconj-demo-archaic-allein`

Development (18):

- `grammar-de-cconj-dev-ordinary-oder-nouns`
- `grammar-de-cconj-dev-adversative-aber-clauses`
- `grammar-de-cconj-dev-adversative-doch-clauses`
- `grammar-de-cconj-dev-corrective-sondern`
- `grammar-de-cconj-dev-additive-sowie`
- `grammar-de-cconj-dev-beziehungsweise-full`
- `grammar-de-cconj-dev-sentence-initial-und`
- `grammar-de-cconj-dev-repeated-second-und`
- `grammar-de-cconj-dev-comparative-wie`
- `grammar-de-cconj-dev-comparative-als-mehr`
- `grammar-de-cconj-dev-jedoch-null-position`
- `grammar-de-cconj-dev-aber-not-particle`
- `grammar-de-cconj-dev-doch-not-particle`
- `grammar-de-cconj-dev-denn-verb-second-anchor`
- `grammar-de-cconj-dev-oder-without-paired-frame`
- `grammar-de-cconj-dev-typo-odre`
- `grammar-de-cconj-dev-typo-sonedrn`
- `grammar-de-cconj-dev-variant-bzw-initial`

Untouched acceptance (12):

- `grammar-de-cconj-accept-und-list`
- `grammar-de-cconj-accept-oder-clauses`
- `grammar-de-cconj-accept-aber-adjectives`
- `grammar-de-cconj-accept-sowie-subjects`
- `grammar-de-cconj-accept-variant-u`
- `grammar-de-cconj-accept-comparative-als-tiefer`
- `grammar-de-cconj-accept-comparative-wie-ebenso`
- `grammar-de-cconj-accept-denn-causal`
- `grammar-de-cconj-accept-doch-sentence-initial`
- `grammar-de-cconj-accept-jedoch-null-position`
- `grammar-de-cconj-accept-typo-jedcoh`
- `grammar-de-cconj-accept-archaic-allein`

Together they cover ordinary coordination, comparative `als` and `wie`, the
ambiguous `aber`, `denn`, `doch`, and `jedoch` anchors, CCONJ contrasts with
SCONJ/ADV/PART/PairedFrame analysis, fixed Citation behavior,
sentence-initial casing, licensed abbreviations, genuine typos, repeated source
forms, and archaic adversative `allein`. Explanations are short corpus metadata
for genuine edge cases and never output fields.

The syntax policy follows the IDS grammis descriptions of
[coordinating expressions](https://grammis.ids-mannheim.de/systematische-grammatik/905),
[coordination](https://grammis.ids-mannheim.de/systematische-grammatik/2548),
and [coordinator word order](https://grammis.ids-mannheim.de/kontrastive-grammatik/4432).
The feature and abbreviation inventories follow
[UD German GSD CCONJ](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-CCONJ.html)
and [UD `ConjType=Comp`](https://universaldependencies.org/u/feat/ConjType.html).

## Shared evidence runner

The thin route configuration uses the shared direct Responses runner with the
repository model policy, no reasoning, zero retries, `store: false`, explicit
30-minute prompt caching, and a 4,096-token output ceiling. It supports three
classified development rounds followed by one reserved untouched acceptance
run. Acceptance cannot start until rounds 1, 2, and 3 are finalized with zero
execution errors and every scored miss classified.

The complete authorized protocol is 66 provider calls: `18 × 3` development
calls plus `12 × 1` acceptance calls. The shared prompt-cache prefix makes only
the first request of each batch a cache write when the cache is cold. No live
call was made during deterministic implementation.

The assembled prompt is currently about 1,408 tokens by the conservative
characters-per-four estimate; ideal outputs average about 48 tokens. Assuming
four cold batch starts, 62 cache reads, and the published GPT-5.6 Luna rates of
$1.00/M input, $0.10/M cached input, and $6.00/M output, the content estimate is
about $0.04. Cache-write billing and Structured Output schema/tokenization
overhead make $0.10 a safer authorization reserve, still far below the shared
$20 ceiling. Even the deliberately pessimistic assumption that all 66 calls
consume their full 4,096-token output cap and all input is uncached stays below
about $1.75 at those rates. Retained provider usage remains authoritative after
each run. See the [OpenAI API pricing page](https://openai.com/api/pricing/).

Run deterministic preflight from `battery/dumgen`:

```sh
bun docs/prototypes/grammatical-resolution-coordinating-conjunction/run.ts \
  preflight development 1
```

After explicit authorization, a development round is:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-coordinating-conjunction/run.ts \
  run development 1
```

Finalize a draft offline after classifying every scored miss as
`prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`:

```sh
bun docs/prototypes/grammatical-resolution-coordinating-conjunction/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-coordinating-conjunction/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-coordinating-conjunction/runs/<timestamp>/miss-classifications.json
```

After three finalized development rounds, acceptance is deliberately consumed
once:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-coordinating-conjunction/run.ts \
  run acceptance
```

The retained 2026-08-03 v2 run predates this input, output, corpus, model,
runner, and evidence protocol. It is historical only and cannot satisfy the
current binding.

## Retained classified evidence

The authorized protocol completed on 2026-08-13 with 66 serial provider calls,
zero execution errors, and no accepted model limitations or domain tensions.

| Phase | Retained result | Score | Miss disposition |
| --- | --- | ---: | --- |
| Development 1 | `runs/2026-08-13T09-43-21-623Z/results.json` | 18/18 (100%) | None |
| Development 2 | `runs/2026-08-13T09-44-02-194Z/results.json` | 17/18 (94.4%) | `grammar-de-cconj-dev-variant-bzw-initial`: prompt defect; sentence-initial abbreviation kept `Bzw` instead of `bzw` |
| Development 3 | `runs/2026-08-13T09-45-08-616Z/results.json` | 18/18 (100%) | None; the narrow casing repair passed the previously missed case |
| Untouched acceptance | `runs/2026-08-13T09-45-50-557Z/results.json` | 12/12 (100%) | None |

After round 2, the prompt added one narrow rule: when an abbreviation begins a
sentence and its punctuation is immediately outside the closing TARGET tag,
lowercase the supplied member but do not copy the unmarked period into
`normalizedMembers`. The exact failed case never became a demonstration. Round
3 selected this repaired contract for untouched acceptance.

The four retained runs report 97,416 input tokens, including 92,349 cached
tokens and 2,889 cache-write tokens, plus 3,894 output tokens. Applying the
published Luna rates and the 1.25× cache-write multiplier gives an estimated
total of `$0.03838815`, below both the `$0.10` reserve and the authorized `$5`
leaf cap. The acceptance reservation is retained at
`runs/acceptance-reservation.json`; the suite cannot be claimed untouched or
run again.
