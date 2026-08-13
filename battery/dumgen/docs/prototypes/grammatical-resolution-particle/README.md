# German Lexeme/PART Grammatical Resolution evaluation

This route-local prototype evaluates the already-classified
`grammatical-resolution/de/lexeme/particle` route against the total modern
Grammatical Resolution contract. Input is exactly `{ markedContext, members }`;
the supplied ordered membership is authoritative and is never repaired or
reclassified.

The model returns the smallest flat codec-derived DTO:

```ts
{
  memberOrthographies: ("Standard" | "Typo")[];
  normalizedMembers: string[];
  surface: {
    spelling: "Canonical" | "Variant";
    surfaceFeatures: null | { historicalStatus: "Archaic" };
  };
  lemma: {
    canonicalForm: string;
    coreFeatures: {
      abbr: "Yes" | null;
      foreign: "Yes" | null;
      partType: "Inf" | null;
      polarity: "Neg" | "Pos" | null;
    };
  };
}
```

PART is Citation-only in the Dumling codec. Application projection owns German
route identity, `surfaceKind: Citation`, normalized Surface construction,
Surface-to-Lemma linkage, the successful wrapper, and
`realizationCoverage: Full`. The model never emits those fields, decision or
resolution wrappers, `Unresolved`, route data, or membership changes.

## Frozen corpus and partitions

The corpus contains 42 realistic full sentences in disjoint 9/21/12
demonstration, development, and untouched-acceptance partitions. It covers
negative, affirmative-answer, infinitival, modal, focus, intensifying, foreign,
and abbreviated particles; all four codec Core Features; ordinary and erroneous
casing; licensed regional/expressive variation; typo repair; and archaic use.
Context-rich cases pin upstream PART distinctions from ADV, ADP, INTJ, CCONJ,
SCONJ, and separable VERB material without turning those distinctions back into
Grammatical Resolution rejection cases.

Demonstrations:

- `grammar-de-part-demo-negative-nicht`
- `grammar-de-part-demo-infinitival-zu`
- `grammar-de-part-demo-modal-halt`
- `grammar-de-part-demo-focus-sogar`
- `grammar-de-part-demo-typo-ebn`
- `grammar-de-part-demo-archaic-nit`
- `grammar-de-part-demo-distinct-archaic-ni`
- `grammar-de-part-demo-foreign-yes`
- `grammar-de-part-demo-abbreviation-aff`

Development:

- `grammar-de-part-dev-negative-initial`
- `grammar-de-part-dev-answer-ja`
- `grammar-de-part-dev-foreign-not`
- `grammar-de-part-dev-abbreviation-n`
- `grammar-de-part-dev-modal-doch`
- `grammar-de-part-dev-modal-denn`
- `grammar-de-part-dev-modal-wohl`
- `grammar-de-part-dev-modal-mal`
- `grammar-de-part-dev-modal-ja`
- `grammar-de-part-dev-focus-nur`
- `grammar-de-part-dev-focus-selbst`
- `grammar-de-part-dev-intensifying-sehr`
- `grammar-de-part-dev-answer-doch`
- `grammar-de-part-dev-infinitival-beside-adp`
- `grammar-de-part-dev-focus-beside-adv`
- `grammar-de-part-dev-modal-beside-sconj`
- `grammar-de-part-dev-modal-aber-not-cconj`
- `grammar-de-part-dev-beside-verb-particle`
- `grammar-de-part-dev-variant-nich`
- `grammar-de-part-dev-typo-dohc`
- `grammar-de-part-dev-other-eigentlich`

Untouched acceptance:

- `grammar-de-part-accept-v2-negative-nicht`
- `grammar-de-part-accept-v2-infinitival-zu`
- `grammar-de-part-accept-v2-answer-doch`
- `grammar-de-part-accept-v2-foreign-never`
- `grammar-de-part-accept-v2-abbreviation-pos`
- `grammar-de-part-accept-v2-modal-bloss`
- `grammar-de-part-accept-v2-focus-lediglich`
- `grammar-de-part-accept-v2-intensifying-gar`
- `grammar-de-part-accept-v2-modal-ja-not-intj`
- `grammar-de-part-accept-v2-typo-nciht`
- `grammar-de-part-accept-v2-explicit-variant-nedd`
- `grammar-de-part-accept-v2-distinct-archaic-en`

The original modern acceptance suite was observed once at 10/12. Its
corpus/evaluator and prompt-defect dispositions, evidence, and reservation are
retained. The current v2 selection contains entirely fresh IDs, sentences,
inputs, and oracles. Its terminal acceptance evidence is 12/12.

## Retained live evidence

All scored misses are classified, every listed run is finalized, and no run
has an execution error.

- Initial diagnostic development round 1, old prompt:
  `2026-08-13T11-57-05-512Z`, 19/21. Its two prompt defects motivated distinct
  foreign-Lemma and abbreviation demonstrations.
- Original counted development, prompt `00027d6c…`:
  `2026-08-13T11-58-28-829Z` 19/21,
  `2026-08-13T11-59-20-597Z` 19/21, and
  `2026-08-13T12-00-05-231Z` 18/21. The remaining misses were accepted model
  limitations involving sentence-initial normalization and abbreviation
  polarity.
- Original acceptance: `2026-08-13T12-00-49-078Z`, 10/12. The regional
  `nüscht` oracle was classified as a corpus/evaluator defect; the archaic
  `ne` result exposed a prompt defect in the operational lexical-identity rule.
  This run and its suite-specific reservation remain immutable.
- V2 post-failure development, prompt `ba46aaa8…`, suite `505c47cd…`:
  `2026-08-13T12-04-36-651Z`, `2026-08-13T12-05-24-703Z`, and
  `2026-08-13T12-06-06-761Z`, each 19/21 with the same two accepted model
  limitations.
- V2 untouched acceptance: `2026-08-13T12-06-55-496Z`, 12/12, 100%, zero
  misses, `evidenceThresholdMet=true`, prompt `ba46aaa8…`, suite
  `bcb6b23e…`. This suite is terminal and reserved.

Cumulative modern evidence used 171 calls, 447,707 input tokens (432,007
cached and 9,968 cache-write tokens), and 11,394 output tokens. At the current
Luna rates this is approximately $0.1298, below the $5 leaf ceiling.

## Runner protocol

The thin route configuration uses the shared direct Responses runner: serial
calls, zero retries, `store: false`, explicit 30-minute prompt caching with a
breakpoint after the stable System Prompt, atomic retained evidence, offline
miss classification/finalization, suite-specific untouched-acceptance
reservation, and a bounded preflight that creates no provider client.

The shared replacement protocol retained the failed original acceptance,
required a prompt change and entirely fresh v2 suite, then required three
post-failure development rounds bound to that prompt/suite before reserving the
v2 acceptance run.

From `battery/dumgen`, deterministic verification is:

```sh
bun test tests/internal/grammatical-resolution-particle.test.ts \
  tests/internal/grammatical-resolution-particle-runner.test.ts
bun run check
bunx biome check \
  src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/particle \
  src/promptsmith/laboratory/experiments/grammatical-resolution-particle \
  docs/prototypes/grammatical-resolution-particle/run.ts \
  tests/internal/grammatical-resolution-particle.test.ts \
  tests/internal/grammatical-resolution-particle-runner.test.ts
git diff --check
```

Zero-call preflight:

```sh
bun docs/prototypes/grammatical-resolution-particle/run.ts preflight development 1
bun docs/prototypes/grammatical-resolution-particle/run.ts preflight acceptance
```

Further live execution is neither needed nor permitted for the terminal v2
acceptance suite.
