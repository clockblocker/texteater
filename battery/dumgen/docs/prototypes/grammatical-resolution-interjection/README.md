# German Lexeme/INTJ grammatical-resolution evidence

Issue [#110](https://github.com/clockblocker/texteater/issues/110) migrates
this leaf to the total classified-target contract established by #90 and the
#91 migration matrix.

## Contract

The model receives exactly `{ markedContext, members }`. Both projections are
authoritative and positionally aligned; this leaf never repairs, rejects, or
reclassifies target membership. The model returns the flat codec-derived INTJ
DTO:

```text
{
  memberOrthographies,
  normalizedMembers,
  surface: { spelling, surfaceFeatures },
  lemma: { canonicalForm, coreFeatures: { partType } }
}
```

German INTJ exposes Citation Surfaces only. The application therefore injects
Citation, German route identity, Surface-to-Lemma linkage,
`normalizedSurface`, successful resolution, and `Full` realization coverage.
The model owns only attested orthography/normalization, Surface spelling and
history, Lemma identity, and the codec's sole Core Feature:
`partType: Res | null`.

`Res` is reserved for an answer or response occurrence such as standalone
`ja`, `nein`, corrective `doch`, or `jawohl`. Expressive, emotive, greeting,
hesitation, prompting, sound-effect, and secondary interjections use null. The
exact codec has no abbreviation or foreign feature; acronymic INTJ identities
remain literal and are not expanded.

## Frozen partitions

The 42 realistic full-sentence cases are frozen into disjoint selections:

- demonstrations: 7 cases;
- classified development: 21 cases;
- untouched acceptance: 14 cases.

Coverage includes primary and secondary interjections, response uses,
independent onomatopoeia, punctuation outside the authoritative target,
sentence-initial and lexical capitalization, standalone and parenthetical
uses, expressive lengthening and reduplication, genuine typos, licensed written
variants, archaic forms, and an acronymic identity. Fixed-route contrasts cover
nearby DiscourseFormula, PART, ADV, onomatopoeia, and ordinary lexical uses
without asking Grammatical Resolution to reclassify them.

## Deterministic gate

From `battery/dumgen`:

```sh
bun test tests/internal/grammatical-resolution-interjection.test.ts \
  tests/internal/grammatical-resolution-interjection-runner.test.ts
bun run check
bunx biome check \
  src/promptsmith/production/grammatical-resolution/de/lexeme/interjection \
  src/promptsmith/laboratory/experiments/grammatical-resolution-interjection \
  docs/prototypes/grammatical-resolution-interjection \
  tests/internal/grammatical-resolution-interjection.test.ts \
  tests/internal/grammatical-resolution-interjection-runner.test.ts
bun docs/prototypes/grammatical-resolution-interjection/run.ts \
  preflight development 1
```

Preflight is zero-call and must not construct a provider client.

## Authorized live protocol

No provider call is allowed without orchestrator authorization. Once
authorized, run three serial development rounds, classify every miss, and
finalize each result offline before continuing. Exact failed cases remain held
out. Run untouched acceptance once only after the development gate succeeds.

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-interjection/run.ts run development 1

bun docs/prototypes/grammatical-resolution-interjection/run.ts finalize \
  docs/prototypes/grammatical-resolution-interjection/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-interjection/runs/<timestamp>/miss-classifications.json

bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-interjection/run.ts run acceptance
```

The protocol is bounded at 77 calls: `21 × 3` development plus 14 acceptance.
A deliberately pessimistic assumption that every call consumes the full
4,096-token output cap and all input is uncached remains below about `$2.10`.
Comparable cached leaf runs suggest a practical estimate below `$0.20`, but
retained provider usage is authoritative. The hard leaf ceiling remains $5.

The retained 2026-08-03 run binds the obsolete one-field input, nullable
Resolved/Unresolved wrapper, route-negative corpus, copied runner, and old
provider policy. It remains historical evidence only and cannot satisfy #110.

## 2026-08-13 retained evidence

| Phase | Score | Errors | Disposition | Evidence |
| --- | ---: | ---: | --- | --- |
| Development 1 | 21/21 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T12-25-27-254Z/results.json), [classifications](runs/2026-08-13T12-25-27-254Z/miss-classifications.json) |
| Development 2 | 21/21 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T12-26-13-503Z/results.json), [classifications](runs/2026-08-13T12-26-13-503Z/miss-classifications.json) |
| Development 3 | 21/21 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T12-26-51-934Z/results.json), [classifications](runs/2026-08-13T12-26-51-934Z/miss-classifications.json) |
| Untouched acceptance v1 | 11/14 (78.6%) | 0 | Finalized; two corpus defects and one accepted model limitation; below floor | [results](runs/2026-08-13T12-27-38-220Z/results.json), [classifications](runs/2026-08-13T12-27-38-220Z/miss-classifications.json) |
| Recovery v2 development 1 | 21/21 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T12-32-04-710Z/results.json), [classifications](runs/2026-08-13T12-32-04-710Z/miss-classifications.json) |
| Recovery v2 development 2 | 21/21 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T12-32-55-405Z/results.json), [classifications](runs/2026-08-13T12-32-55-405Z/miss-classifications.json) |
| Recovery v2 development 3 | 21/21 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T12-33-43-650Z/results.json), [classifications](runs/2026-08-13T12-33-43-650Z/miss-classifications.json) |
| Untouched acceptance v2 | 14/14 (100%) | 0 | Finalized; threshold met with no misses | [results](runs/2026-08-13T12-34-41-564Z/results.json), [classifications](runs/2026-08-13T12-34-41-564Z/miss-classifications.json) |

The prompt remained unchanged through three perfect development rounds.
Acceptance v1 exposed no prompt defect. Two cases had ambiguous or incorrect
oracles: Duden records [`jawoll`](https://www.duden.de/rechtschreibung/jawoll)
as its own colloquial headword rather than merely a spelling variant, while
historical German sources attest `pfiu` alongside `pfui`, so it is not an
unambiguous transposition typo. The third miss omitted Archaic only for
[`sapperlot`](https://www.duden.de/rechtschreibung/sapperlot), although the
dictionary marks it obsolete and the prompt's separate historical examples
passed. That isolated lexical-recognition miss is retained as an accepted model
limitation.

Because v1 remained below the configured score floor, all fourteen observed
acceptance IDs, sentences, inputs, and oracles were retired. The pending v2
suite has fourteen new unique IDs and normalized sentence fingerprints with
zero overlap against v1. It remains disjoint from the seven demonstrations and
twenty-one development cases. The prompt remains bound to SHA
`f3452d56e92405af7a51e6d00ceb582ab02a75d41b9888f667a19f8ab5ea22fa`;
the replacement suite SHA is
`c2f0d5a69daed723dff8259f3067ddbf5686fa89fbe95efdef0594bb7781ed6a`.
Three fresh bound development rounds and v2 acceptance all passed completely:
21/21, 21/21, 21/21, then 14/14. The unchanged prompt therefore has terminal
threshold-passing evidence with no prompt defect, corpus defect, execution
error, or accepted limitation in the selected suite. Both acceptance
reservations and all superseded evidence remain retained.

The eight v1 and v2 phases retained 327,305 input tokens, including 317,680
cached and 4,180 cache-write tokens, plus 8,581 output tokens across 154
error-free calls. At the protocol's published rates, the estimated cumulative
cost is about **$0.0939**, safely below the $5 leaf ceiling.
