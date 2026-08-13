# German Lexeme/SYM Grammatical Resolution evaluation

This prototype evaluates the total already-classified
`grammatical-resolution/de/lexeme/symbol` route. Input is exactly
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
        inflectionalFeatures: { case; gender; number } };
  lemma: {
    canonicalForm;
    coreFeatures: { foreign: "Yes" | null; numType: "Card" | "Range" | null };
  };
}
```

Citation's fixed discriminator, German route identity, normalized Surface,
Surface-to-Lemma linkage, successful result, and `realizationCoverage: Full`
are application-owned. Inflection keeps its model-owned discriminator and
structurally non-empty contextual feature bag.

## Frozen corpus

The 45 realistic full sentences are frozen into 12 demonstrations, 21
development cases, and 12 untouched acceptance cases. The partitions are
disjoint by case ID, exact parsed input, route fingerprint, and contamination
key.

Demonstrations:

- `grammar-de-sym-demo-percent-unit`
- `grammar-de-sym-demo-times-nominal`
- `grammar-de-sym-demo-euro-currency`
- `grammar-de-sym-demo-section-dative`
- `grammar-de-sym-demo-equals-genitive`
- `grammar-de-sym-demo-feminine-hash`
- `grammar-de-sym-demo-foreign-arabic-percent`
- `grammar-de-sym-demo-card-number-sign`
- `grammar-de-sym-demo-range-dash`
- `grammar-de-sym-demo-variant-fullwidth-plus`
- `grammar-de-sym-demo-typo-ocr-euro`
- `grammar-de-sym-demo-sections-plural`

Development:

- `grammar-de-sym-dev-math-plus`
- `grammar-de-sym-dev-math-minus`
- `grammar-de-sym-dev-science-integral`
- `grammar-de-sym-dev-measurement-micro`
- `grammar-de-sym-dev-measurement-degree`
- `grammar-de-sym-dev-measurement-permille`
- `grammar-de-sym-dev-currency-dollar`
- `grammar-de-sym-dev-currency-pound`
- `grammar-de-sym-dev-legal-copyright`
- `grammar-de-sym-dev-coordinator-ampersand`
- `grammar-de-sym-dev-marker-hash`
- `grammar-de-sym-dev-emoticon-wink`
- `grammar-de-sym-dev-repeated-plus-second`
- `grammar-de-sym-dev-numeric-neighbor-percent`
- `grammar-de-sym-dev-punctuation-neighbor-star`
- `grammar-de-sym-dev-opaque-neighbor-hash`
- `grammar-de-sym-dev-abbreviation-neighbor-section`
- `grammar-de-sym-dev-inflection-acc-plus`
- `grammar-de-sym-dev-inflection-gen-percent`
- `grammar-de-sym-dev-inflection-feminine-at`
- `grammar-de-sym-dev-archaic-dagger`

Untouched acceptance:

- `grammar-de-sym-accept-v2-division-inflection`
- `grammar-de-sym-accept-v2-not-equal`
- `grammar-de-sym-accept-v2-sum`
- `grammar-de-sym-accept-v2-rupee`
- `grammar-de-sym-accept-v2-registered`
- `grammar-de-sym-accept-v2-double-arrow`
- `grammar-de-sym-accept-v2-basis-point`
- `grammar-de-sym-accept-v2-card-numero`
- `grammar-de-sym-accept-v2-range-tilde`
- `grammar-de-sym-accept-v2-foreign-japanese-reference`
- `grammar-de-sym-accept-v2-variant-small-percent`
- `grammar-de-sym-accept-v2-typo-double-permille`

Coverage includes currency, mathematical, scientific, measurement, legal, and
other word-like symbols; Citation and explicitly nominal Inflection; all four
cases, three genders, singular and plural; both codec-supported NumType values
and explicit Foreign; single- and multi-grapheme forms; repeated occurrences;
surrounding numeric context; canonical, Unicode Variant, casing-sensitive,
Typo, and archaic forms. Fixed upstream distinctions are exercised with
unmarked NUM, PUNCT, OpaqueText emoji, abbreviation, ordinary lexical, and
repeated-symbol neighbors.

The retained 2026-08-03 run uses the retired decision-wrapper contract and is
historical only. Current-contract development diagnostics scored 18/21 and
19/21 before the determiner-governed Inflection rule and two distinct teaching
examples produced three consecutive 21/21 rounds. The immutable v1 acceptance
reservation at `runs/2026-08-13T13-03-19-920Z` is finalized at 10/12 (83.3%).
The cardinal-number-marker miss is an accepted model limitation. The division
case is a corpus/evaluator defect: its `ein ÷` syntax requires contextual
Acc/Neut/Sing Inflection, not the retained Citation oracle.

The approved corpus-defect recovery keeps the prompt unchanged and uses the 12
fresh `grammar-de-sym-accept-v2-*` cases listed above. Their IDs, sentences,
inputs, and oracles are disjoint from the observed v1 acceptance suite. V1
evidence and its suite-specific reservation remain immutable.

V2 development is finalized at 21/21, 21/21, and 20/21; the sole round-three
genitive Citation fallback is accepted model variance after two passes under an
explicit rule and distinct demonstration. The immutable v2 acceptance
reservation at `runs/2026-08-13T13-08-09-014Z` is finalized at 11/12 (91.7%)
with `evidenceThresholdMet=true`. Its sole division-symbol Citation fallback is
an accepted model limitation: the prompt mandates determiner-governed
Inflection and a distinct plus-sign case repeatedly teaches the same
Acc/Neut/Sing pattern. No prompt, corpus, or evaluator defect remains.

## Runner protocol

The thin runner uses the shared direct Responses evaluator: serial calls, zero
retries, `store: false`, explicit 30-minute prompt caching, atomic retained
evidence, offline miss classification/finalization, suite-specific acceptance
reservation, and bounded preflight without provider-client construction.

The two protocols used 192 calls, 525,374 input tokens (505,770 cached and
13,413 cache-write), and 11,458 output tokens, an estimated $0.142 at the
configured Luna rates, far below the $5 leaf ceiling.

From `battery/dumgen`:

```sh
bun test tests/internal/grammatical-resolution-symbol.test.ts \
  tests/internal/grammatical-resolution-symbol-runner.test.ts
bun run check
bunx biome check \
  src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol \
  src/promptsmith/laboratory/experiments/grammatical-resolution-symbol \
  docs/prototypes/grammatical-resolution-symbol \
  tests/internal/grammatical-resolution-symbol.test.ts \
  tests/internal/grammatical-resolution-symbol-runner.test.ts
git diff --check
```

Zero-call preflight:

```sh
bun docs/prototypes/grammatical-resolution-symbol/run.ts preflight development 1
bun docs/prototypes/grammatical-resolution-symbol/run.ts preflight acceptance
```

Live execution requires explicit orchestrator authorization.
