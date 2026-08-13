# German Lexeme/NUM grammatical-resolution evidence

Issue [#107](https://github.com/clockblocker/texteater/issues/107) migrates
this leaf to the total classified-target contract established by #90 and the
#91 migration matrix.

## Contract

The model receives exactly `{ markedContext, members }`. Both projections are
authoritative and positionally aligned; this leaf never repairs, rejects, or
reclassifies target membership. The model returns the flat codec-derived NUM
DTO:

```text
{
  memberOrthographies,
  normalizedMembers,
  surface: Citation | Inflection(case, gender, number),
  lemma: { canonicalForm, coreFeatures: { abbr, foreign, numType } }
}
```

The application owns German route identity, Surface-to-Lemma linkage,
`normalizedSurface`, successful resolution, and `Full` realization coverage.
The model owns the Citation/Inflection discriminator because NUM exposes both
Surface kinds. Its provider-facing Inflection union preserves the canonical
requirement that at least one of case, gender, or number is non-null.

The exact codec exposes `Card | Frac | Mult | Range`. Universal UD also names
distributive `Dist` and collective `Sets`, but neither exists in this German
NUM codec. A supplied Card in distributive or set-denoting context therefore
stays Card when the distributive or collective meaning comes from unmarked
context such as `jeweils` or `Paar`.

## Frozen partitions

The 38 realistic full-sentence cases are frozen into disjoint selections:

- demonstrations: 7 cases;
- classified development: 19 cases;
- untouched acceptance: 12 cases.

Coverage includes every codec NumType, word and digit cardinals, decimals,
year/date-like forms, Roman numerals, an abbreviation and foreign form,
multi-member spoken decimals, all four Case values, singular/plural and
feminine/masculine agreement, invariant syncretic controls, sentence-initial
casing, typo, licensed variant, archaic forms, and fixed-route contrasts with
ADJ, DET, PRON, NOUN, and SYM.

Primary policy references are the official UD
[NumType definition](https://universaldependencies.org/u/feat/NumType.html) and
[German-GSD NUM statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-NUM.html).
The executable Dumling NUM codec remains authoritative where broader UD and
German treebank practice differ.

## Deterministic gate

From `battery/dumgen`:

```sh
bun test tests/internal/grammatical-resolution-numeral.test.ts \
  tests/internal/grammatical-resolution-numeral-runner.test.ts
bun run check
bunx biome check \
  src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/numeral \
  src/promptsmith/laboratory/experiments/grammatical-resolution-numeral \
  docs/prototypes/grammatical-resolution-numeral/run.ts \
  tests/internal/grammatical-resolution-numeral.test.ts \
  tests/internal/grammatical-resolution-numeral-runner.test.ts
bun docs/prototypes/grammatical-resolution-numeral/run.ts \
  preflight development 1
```

Preflight is zero-call and must not construct a provider client.

## Authorized live protocol

No provider call is allowed without orchestrator authorization. Once
authorized, run three serial development rounds, classify every scored miss,
and finalize each result offline before continuing. Failed exact cases remain
held out. Run untouched acceptance exactly once only after the development
gate succeeds.

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-numeral/run.ts run development 1

bun docs/prototypes/grammatical-resolution-numeral/run.ts finalize \
  docs/prototypes/grammatical-resolution-numeral/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-numeral/runs/<timestamp>/miss-classifications.json

bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-numeral/run.ts run acceptance
```

The protocol has 69 calls: `19 × 3` development plus 12 acceptance. A
deliberately pessimistic assumption that every call consumes the full
4,096-token output cap and all input is uncached remains below about `$1.90`;
retained provider usage is authoritative after each run. A practical reserve of
`$0.15` is expected from the integrated cached-run evidence, but it is not a
spending guarantee.

The retained `2026-08-03` run predates this input, output, corpus, model
binding, and phase protocol. It remains historical evidence only and does not
satisfy issue #107.

## 2026-08-13 retained evidence

| Phase | Score | Errors | Disposition | Evidence |
| --- | ---: | ---: | --- | --- |
| Development 1 | 17/19 (89.5%) | 0 | Finalized; two prompt defects | [results](runs/2026-08-13T11-57-01-597Z/results.json), [classifications](runs/2026-08-13T11-57-01-597Z/miss-classifications.json) |
| Development 2 | 18/19 (94.7%) | 0 | Finalized; one prompt defect | [results](runs/2026-08-13T11-58-38-767Z/results.json), [classifications](runs/2026-08-13T11-58-38-767Z/miss-classifications.json) |
| Development 3 | 18/19 (94.7%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T12-00-08-826Z/results.json), [classifications](runs/2026-08-13T12-00-08-826Z/miss-classifications.json) |
| Untouched acceptance v1 | 10/12 (83.3%) | 0 | Finalized; two prompt defects require replacement | [results](runs/2026-08-13T12-01-12-190Z/results.json), [classifications](runs/2026-08-13T12-01-12-190Z/miss-classifications.json) |
| Recovery v2 development 1 | 18/19 (94.7%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T12-06-04-300Z/results.json), [classifications](runs/2026-08-13T12-06-04-300Z/miss-classifications.json) |
| Recovery v2 development 2 | 19/19 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T12-06-52-612Z/results.json), [classifications](runs/2026-08-13T12-06-52-612Z/miss-classifications.json) |
| Recovery v2 development 3 | 18/19 (94.7%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T12-07-38-143Z/results.json), [classifications](runs/2026-08-13T12-07-38-143Z/miss-classifications.json) |
| Untouched acceptance v2 | 11/12 (91.7%) | 0 | Finalized; one prompt defect requires another replacement | [results](runs/2026-08-13T12-08-25-817Z/results.json), [classifications](runs/2026-08-13T12-08-25-817Z/miss-classifications.json) |
| Recovery v3 development 1 | 18/19 (94.7%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T12-12-44-400Z/results.json), [classifications](runs/2026-08-13T12-12-44-400Z/miss-classifications.json) |
| Recovery v3 development 2 | 18/19 (94.7%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T12-13-38-692Z/results.json), [classifications](runs/2026-08-13T12-13-38-692Z/miss-classifications.json) |
| Recovery v3 development 3 | 18/19 (94.7%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T12-14-17-819Z/results.json), [classifications](runs/2026-08-13T12-14-17-819Z/miss-classifications.json) |
| Untouched acceptance v3 | 11/12 (91.7%) | 0 | Finalized; threshold met with one accepted model limitation | [results](runs/2026-08-13T12-15-07-220Z/results.json), [classifications](runs/2026-08-13T12-15-07-220Z/miss-classifications.json) |

Development evidence justified general rules for sentence-initial lowercase
normalization and visibly agreeing historical numerals. The persistent
development miss is narrower: despite an explicit mandatory rule, the model
returned Citation rather than Inflection for one archaic agreeing form while
getting its normalization, Variant spelling, modern Lemma, and Archaic status
right. It is retained as an accepted model limitation rather than copied into
demonstrations.

Acceptance v1 exposed two broader prompt defects. Sentence-initial lowercase
normalization was not reliably applied to an Inflection Surface, and a licensed
historical spelling was repaired as a Typo instead of remaining Standard
Variant evidence with Archaic status. The prompt now makes casing independent
of Citation versus Inflection and gives recognized historical spellings
precedence over typo repair. No observed acceptance case was added to a
demonstration.

All twelve observed v1 acceptance IDs, sentences, inputs, and oracles were
retired. The replacement v2 suite contains twelve new unique IDs and sentence
fingerprints with zero overlap against v1. It remains disjoint from the six
demonstrations and nineteen development cases. Its suite SHA is
`993149c0b5aa58837654eae0b3ce4f384d9a248a8ea71b91db23d67db486a1d7`;
the repaired prompt SHA is
`5438f016049afd0d7112be247d17bde2d8b278334841e4cfa49a6c235270e935`.
The replacement ran three newly bound development rounds at 18/19, 19/19, and
18/19 before its suite-specific reserved acceptance. V2 acceptance passed all
new typo and archaic-variant probes, but the fresh sentence-initial feminine
plural quantity numeral repeated the v1 defect: the model preserved initial
capitalization and returned Citation rather than Inflection. The run's numeric
11/12 threshold therefore is not terminal evidence because its sole miss is a
prompt defect. Provider work stopped after classification and finalization;
both v1 and v2 reservations remain retained.

Deterministic recovery v3 adds one genuinely different demonstration for an
initial feminine plural word quantity: `Trillionen` is resolved as contextual
Inflection and normalized to lowercase while its occurrence orthography stays
Standard. The accompanying general rule covers German Million-family and
larger `-illion`/`-illiarde` quantity words; it gives their established
agreement and initial lowercase projection precedence over invariant Citation.
Neither consumed failed quantity case was copied into the prompt or
demonstrations.

All twelve v2 acceptance cases are retired. The pending v3 suite has twelve new
unique IDs and normalized sentence fingerprints with zero overlap against both
v1 and v2. It remains disjoint from seven demonstrations and nineteen
development cases. Its suite SHA is
`e6069e37df7783c07794e4db9ccd3baa11d48dea4d64113a770e541fac0e60db`;
the v3 prompt SHA is
`2b3244e79a3662b01b54fe0bc87ae957fd783b2720fbf204441c153d43e0d744`.
The three newly bound v3 development rounds each scored 18/19; every miss was
the already governed stochastic Citation-versus-Inflection choice for `zween`,
with all other fields correct. V3 acceptance then scored 11/12. The new initial
`Quadrillionen` probe passed every field, demonstrating that the repeated v1/v2
quantity-word prompt defect is fixed. The sole v3 miss was unrelated: the model
did not recognize the documented older spelling `fünff`, repaired it as a
Typo, and lost Variant plus Archaic metadata. Because the prompt already
governs recognized historical spellings, v2's separate historical form passed,
and Citation/Lemma/core remained correct, this is retained as an isolated
lexical-recognition limitation rather than another prompt defect. V3 exceeds
the configured floor with no replaceable defect, so its evidence is terminal
for leaf integration.

All twelve v1–v3 phases retained 631,074 input tokens, including 608,924 cached
and 14,687 cache-write tokens, plus 15,329 output tokens across 207 error-free
calls. At the protocol's published rates, the estimated cumulative cost is
about **$0.1787**, safely below the $5 leaf ceiling. The original and both
suite-specific replacement reservations remain retained.
