# German Lexeme/ADJ Grammatical Resolution evaluation

This route-local evaluation implements the classified-target contract for
`grammatical-resolution/de/lexeme/adjective`. It does not change catalog or
runtime assembly and does not edit the generated System Prompt.

## Model contract

The legacy model input was `{ markedContext }`. Its output contained a
`Resolved | Unresolved` decision, a nullable `resolution`, and model-owned
realization coverage. The current input is exactly:

```ts
{ markedContext: string; members: string[] }
```

Both fields are authoritative projections of an already-classified target.
The prompt never repairs, rejects, adds, removes, reorders, or reclassifies
membership. The total flat output is exactly:

```ts
{
  memberOrthographies: ("Standard" | "Typo")[];
  normalizedMembers: string[];
  surface: CitationSurface | InflectionSurface;
  lemma: {
    canonicalForm: string;
    coreFeatures: {
      abbr: "Yes" | null;
      foreign: "Yes" | null;
      numType: "Card" | "Ord" | null;
      variant: "Short" | null;
    };
  };
}
```

The Surface union and Lemma are derived from Dumling's German ADJ codecs.
Citation owns no inflectional features. Inflection owns nullable `case`,
`degree`, `gender`, and `number`, with at least one non-null value. The model
owns the Citation/Inflection discriminator, spelling, Surface Features,
Inflectional Features, canonical form, and Core Features. The application owns
language, route discriminants, Surface-to-Lemma linkage, normalized Surface,
successful resolution, and `realizationCoverage: "Full"`.

## Frozen corpus partitions

The corpus contains 36 realistic full-sentence resolved occurrences. The
partitions are pairwise disjoint and frozen by grammatical coverage.

Demonstrations (6):

- `grammar-de-adj-demo-citation-sanft`
- `grammar-de-adj-demo-attributive-klein`
- `grammar-de-adj-demo-adverbial-schnell`
- `grammar-de-adj-demo-comparative-besser`
- `grammar-de-adj-demo-ordinal-erste`
- `grammar-de-adj-demo-typo-freundlcih`

Development (18):

- `grammar-de-adj-dev-attributive-acc-fem-rot`
- `grammar-de-adj-dev-attributive-dat-neut-kalt`
- `grammar-de-adj-dev-attributive-gen-plur-neu`
- `grammar-de-adj-dev-attributive-nom-plur-alt`
- `grammar-de-adj-dev-predicative-blau`
- `grammar-de-adj-dev-adverbial-leise`
- `grammar-de-adj-dev-attributive-comparative-teuer`
- `grammar-de-adj-dev-attributive-superlative-hoch`
- `grammar-de-adj-dev-adverbial-superlative-sorgfaeltig`
- `grammar-de-adj-dev-predicative-comparative-nah`
- `grammar-de-adj-dev-cardinal-siebenhundert`
- `grammar-de-adj-dev-foreign-special`
- `grammar-de-adj-dev-abbreviation-sog`
- `grammar-de-adj-dev-typo-grsser`
- `grammar-de-adj-dev-participial-geschlossen`
- `grammar-de-adj-dev-participial-spannend`
- `grammar-de-adj-dev-invariant-lila`
- `grammar-de-adj-dev-archaic-hold`

Untouched acceptance (12):

- `grammar-de-adj-accept-citation-mild`
- `grammar-de-adj-accept-attributive-dat-fem-lang`
- `grammar-de-adj-accept-attributive-acc-neut-gruen`
- `grammar-de-adj-accept-attributive-gen-masc-stark`
- `grammar-de-adj-accept-predicative-ruhig`
- `grammar-de-adj-accept-adverbial-deutlich`
- `grammar-de-adj-accept-irregular-superlative-beste`
- `grammar-de-adj-accept-adverbial-comparative-schnell`
- `grammar-de-adj-accept-ordinal-zweite`
- `grammar-de-adj-accept-typo-wunderschoen`
- `grammar-de-adj-accept-participial-glaenzend`
- `grammar-de-adj-accept-invariant-rosa`

Together the partitions cover attributive agreement, predicative and
adverbial position, regular and suppletive comparison, superlatives, ordinals,
syncretic or contextually underdetermined agreement, Citation versus
Inflection, casing, typo repair, foreign and abbreviated forms, archaic and
invariant adjectives, and adjectival participles. Route-anchor explanations
distinguish productive adverbial ADJ from lexical ADV, adjectival cardinals
from NUM, color adjectives from color-name NOUN, and established adjectival
participles from verbal-participle analyses already fixed upstream.

The analysis follows the IDS grammis descriptions of
[adjectives](https://grammis.ids-mannheim.de/terminologie/6) and
[adjective inflection](https://grammis.ids-mannheim.de/kontrastive-grammatik/3609).
The feature inventory and attested comparison, participial, and adverbial ADJ
patterns follow [UD German](https://universaldependencies.org/de/) and
[UD German GSD ADJ](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-ADJ.html).

## Shared evidence runner

The thin route configuration uses the shared direct Responses runner with the
repository model policy, no reasoning, zero retries, `store: false`, explicit
30-minute prompt caching, and a 4,096-token output ceiling. It supports three
classified development rounds followed by one reserved untouched acceptance
run. Acceptance cannot start until rounds 1, 2, and 3 are finalized with zero
execution errors and every scored miss classified.

The complete protocol is 66 provider calls: `18 × 3` development calls plus
`12 × 1` acceptance calls. No live call was made during deterministic
implementation. With Luna's published $1.00/M input, $0.10/M cached input,
and $6.00/M output prices, the expected cost is well below $0.10 after prompt
caching. Even the pessimistic assumption that all 66 calls consume their full
4,096-token output cap and all input is uncached remains below about $1.75.
Retained provider usage is authoritative after each run. See the
[OpenAI API pricing page](https://openai.com/api/pricing/).

Run deterministic preflight from `battery/dumgen`:

```sh
bun docs/prototypes/grammatical-resolution-adjective/run.ts \
  preflight development 1
```

After explicit authorization, run a development round with:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adjective/run.ts \
  run development 1
```

Classify every scored miss as `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, then finalize
offline:

```sh
bun docs/prototypes/grammatical-resolution-adjective/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-adjective/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-adjective/runs/<timestamp>/miss-classifications.json
```

After three finalized development rounds, acceptance is consumed once:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-adjective/run.ts run acceptance
```

Any retained evidence from the legacy ADJ runner predates this input, output,
corpus, and phase protocol. It is historical only and cannot satisfy the
current binding.

## Retained classified evidence

The authorized protocol completed on 2026-08-13 with 66 serial provider calls,
zero execution errors, and every development miss classified.

| Phase | Retained result | Score | Miss disposition |
| --- | --- | ---: | --- |
| Development 1 | `runs/2026-08-13T10-07-06-686Z/results.json` | 15/18 (83.3%) | Three prompt defects: initial predicative casing, abbreviation Core Features, and archaic Surface status |
| Development 2 | `runs/2026-08-13T10-08-58-646Z/results.json` | 17/18 (94.4%) | Initial casing and abbreviation fixed; persistent `holdes` Surface status remained a prompt defect |
| Development 3 | `runs/2026-08-13T10-10-20-587Z/results.json` | 16/18 (88.9%) | `holdes` remained an accepted model limitation after an unrelated archaic demonstration; isolated `lila` Foreign feature was also accepted as a model limitation |
| Untouched acceptance | `runs/2026-08-13T10-11-40-546Z/results.json` | 12/12 (100%) | None |

After round 1, the prompt made three narrow repairs: suffixless predicative
adjectives obey sentence-initial lowercasing; an abbreviated Surface of a full
adjective Lemma uses `abbr: "Yes"` rather than `variant: "Short"`; and old
poetic adjective uses map to Surface Archaic. Round 2 fixed the first two
misses. Round 3 added a genuinely different archaic adjective demonstration,
but it did not fix the persistent `holdes` miss and coincided with one new
isolated `lila` miss. The unsuccessful demonstration was removed, restoring
the better round-2 contract for untouched acceptance. No exact failed
development case became a demonstration.

The four retained runs report 168,793 input tokens, including 159,083 cached
tokens and 7,591 cache-write tokens, plus 6,347 output tokens. Applying the
published Luna rates and the 1.25× cache-write multiplier gives an estimated
total of `$0.06559805`, below the `$0.10` reserve and the authorized `$5` leaf
ceiling. The untouched acceptance reservation is retained at
`runs/acceptance-reservation.json`; the suite cannot be claimed untouched or
run again.
