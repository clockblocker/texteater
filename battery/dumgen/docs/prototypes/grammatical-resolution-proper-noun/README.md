# German Lexeme/PROPN Grammatical Resolution evaluation

This prototype evaluates the total already-classified
`grammatical-resolution/de/lexeme/proper-noun` route. Input is exactly
`{ markedContext, members }`; the complete ordered membership is authoritative
and is never repaired or reclassified.

The model returns the smallest flat codec-derived DTO:

```ts
{
  memberOrthographies: ("Standard" | "Typo")[];
  normalizedMembers: string[];
  surface:
    | { spelling; surfaceFeatures }
    | { spelling; surfaceKind: "Inflection"; surfaceFeatures;
        inflectionalFeatures: { case; number } };
  lemma: { canonicalForm; coreFeatures: { abbr; foreign; gender } };
}
```

Citation's fixed discriminator, German route identity, normalized Surface,
Surface-to-Lemma linkage, successful result, and `realizationCoverage: Full`
are application-owned. Inflection keeps its model-owned discriminator and
non-empty case/number feature bag.

## Frozen corpus

The 46 realistic full sentences are frozen into 13 demonstrations, 21
development cases, and 12 untouched acceptance cases. The partitions are
disjoint. Coverage includes personal, geographic, organizational, product,
work-title, acronym, foreign, and other proper-name uses; single and
multi-member names; nominative, accusative, dative, genitive, vocative, singular,
and plural; Citation and Inflection; abbreviation, stylized casing, typo,
variant, transliteration-like, and archaic forms; and fixed upstream boundaries
against neighboring NOUN, DET, ADJ-like, title, and repeated material.

Demonstrations:

- `grammar-de-propn-demo-person-maria`
- `grammar-de-propn-demo-place-berlin`
- `grammar-de-propn-demo-multi-angela-merkel`
- `grammar-de-propn-demo-genitive-hans`
- `grammar-de-propn-demo-acronym-nato`
- `grammar-de-propn-demo-typo-koelnn`
- `grammar-de-propn-demo-citation-work-tonio-kroeger`
- `grammar-de-propn-demo-org-unesco`
- `grammar-de-propn-demo-vocative-clara`
- `grammar-de-propn-demo-stylized-ebay`
- `grammar-de-propn-demo-org-rotes-kreuz`
- `grammar-de-propn-demo-work-physiker`
- `grammar-de-propn-demo-integrated-lego`

Development has 21 `grammar-de-propn-dev-*` cases selected explicitly in the
evaluation suite. The current replacement acceptance suite has 12 fresh
`grammar-de-propn-accept-v3-*` cases, also explicitly pinned. Its IDs, marked
sentences, inputs, and oracles are disjoint from both observed acceptance
suites.

## Retained live evidence

The first live cycle used prompt `39705df5…` for its counted development gate:
19/21, 20/21, and 20/21, with every miss classified and finalized. Earlier
diagnostic development runs (15/21, 16/21, 17/21, and 16/21) are retained but
are not part of that counted sequence. The v1 acceptance reservation at
`runs/2026-08-13T12-34-45-690Z` is immutable and finalized at 10/12 (83.3%).
Its Buddenbrooks gender miss is an accepted model limitation. Its
Aix-la-Chapelle oracle is a corpus/evaluator defect because the sentence never
establishes the asserted relation to Aachen; there was no prompt defect.

The v2 corpus-defect recovery kept prompt `39705df5…` unchanged. Its three
fresh development rounds were each 20/21 and fully finalized. The immutable v2
acceptance reservation at `runs/2026-08-13T12-40-14-982Z` is finalized at
10/12 (83.3%). The Cöln canonical-form miss is an accepted model limitation.
The Moritz miss exposed a prompt defect: an apostrophe outside the authoritative
member was imported into `normalizedMembers`.

The v3 prompt `c0c2d2f9…` makes the narrow evidence-driven rule explicit:
apostrophes are preserved only when inside the supplied member, and surrounding
punctuation is never imported. The wholly fresh v3 acceptance suite is:

- `grammar-de-propn-accept-v3-person-leonie`
- `grammar-de-propn-accept-v3-place-saarland`
- `grammar-de-propn-accept-v3-multi-garmisch-partenkirchen`
- `grammar-de-propn-accept-v3-org-zdf`
- `grammar-de-propn-accept-v3-product-thermomix`
- `grammar-de-propn-accept-v3-work-nibelungenlied`
- `grammar-de-propn-accept-v3-citation-mainz`
- `grammar-de-propn-accept-v3-foreign-rio-de-janeiro`
- `grammar-de-propn-accept-v3-genitive-max`
- `grammar-de-propn-accept-v3-typo-hannnover`
- `grammar-de-propn-accept-v3-variant-preussen`
- `grammar-de-propn-accept-v3-plural-balearen`

The v3 development rounds are finalized at 19/21, 19/21, and 20/21. Their
misses are the established Peters-genitive and Pressburg model limitations.
The immutable v3 acceptance reservation at
`runs/2026-08-13T12-47-01-389Z` is finalized at 10/12 (83.3%) and meets the
declared evidence threshold. Mainz and Rio de Janeiro each missed only lexical
gender while matching every other field; both are accepted model limitations,
with no prompt, corpus, or evaluator defect.

All 16 modern runs used 309 calls, 904,570 input tokens (877,373 cached and
16,036 cache-write), and 26,159 output tokens, an estimated $0.276 at the
configured Luna rates, far below the $5 leaf ceiling. The two older 2026-08-03
runs use the retired contract and remain historical only.

## Runner protocol

The thin runner uses the shared direct Responses evaluator: serial calls, zero
retries, `store: false`, explicit 30-minute prompt caching, atomic retained
evidence, offline miss classification/finalization, suite-specific acceptance
reservation, and bounded preflight without provider-client construction.

The replacement protocol completed three fresh 21-case development rounds bound
to the current prompt and development suite, followed by the one 12-case v3
acceptance reservation. The retained v3 acceptance is terminal for this
binding.

From `battery/dumgen`:

```sh
bun test tests/internal/grammatical-resolution-proper-noun.test.ts \
  tests/internal/grammatical-resolution-proper-noun-runner.test.ts
bun run check
bunx biome check \
  src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun \
  src/promptsmith/laboratory/experiments/grammatical-resolution-proper-noun \
  docs/prototypes/grammatical-resolution-proper-noun \
  tests/internal/grammatical-resolution-proper-noun.test.ts \
  tests/internal/grammatical-resolution-proper-noun-runner.test.ts
git diff --check
```

Zero-call preflight:

```sh
bun docs/prototypes/grammatical-resolution-proper-noun/run.ts preflight development 1
bun docs/prototypes/grammatical-resolution-proper-noun/run.ts preflight acceptance
```

Live execution requires explicit orchestrator authorization.
