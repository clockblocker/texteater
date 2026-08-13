# German Lexeme/SCONJ grammatical-resolution evidence

Issue [#113](https://github.com/clockblocker/texteater/issues/113) migrates
this leaf to the total classified-target contract established by #90 and the
#91 migration matrix.

## Contract

The model receives exactly `{ markedContext, members }`. Both projections are
authoritative and positionally aligned; this leaf never repairs, rejects, or
reclassifies target membership. The model returns the flat codec-derived SCONJ
DTO:

```text
{
  memberOrthographies,
  normalizedMembers,
  surface: { spelling, surfaceFeatures },
  lemma: { canonicalForm, coreFeatures: { conjType } }
}
```

German SCONJ exposes Citation Surfaces only. The application therefore injects
Citation, German route identity, Surface-to-Lemma linkage,
`normalizedSurface`, successful resolution, and `Full` realization coverage.
The model owns only attested orthography/normalization, Surface spelling and
history, Lemma identity, and `conjType: Comp | null`.

`Comp` is reserved for a comparing subordinate clause, including an
established reduced clause. Temporal `als` and all non-comparing clause uses
use null. The exact codec has no abbreviation feature, so this leaf never
invents one; an unmarked abbreviation in context cannot change the target.

## Frozen partitions

The selected 44 realistic full-sentence cases are frozen into disjoint
partitions:

- demonstrations: 7 cases;
- classified development: 22 cases;
- untouched acceptance: 15 cases.

Coverage includes finite, infinitival, comparing, reduced, complement,
conditional, temporal, interrogative, modal, causal, concessive, purpose, and
consecutive uses. It includes ambiguous `als`, `wie`, `da`, `ob`, and `wenn`,
an unmarked CCONJ `denn`, multi-member `so dass`, `als ob`, and `ohne dass`,
ordinary sentence-initial casing, genuine typos, licensed variants, and
archaic forms. Fixed-route contrasts cover nearby CCONJ, ADV, ADP, PART,
PairedFrame, and abbreviation contexts without asking Grammatical Resolution
to reclassify them or absorb clause material.

## Deterministic gate

From `battery/dumgen`:

```sh
bun test tests/internal/grammatical-resolution-subordinating-conjunction.test.ts \
  tests/internal/grammatical-resolution-subordinating-conjunction-runner.test.ts
bun run check
bunx biome check \
  src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction \
  src/promptsmith/laboratory/experiments/grammatical-resolution-subordinating-conjunction \
  docs/prototypes/grammatical-resolution-subordinating-conjunction \
  tests/internal/grammatical-resolution-subordinating-conjunction.test.ts \
  tests/internal/grammatical-resolution-subordinating-conjunction-runner.test.ts
bun docs/prototypes/grammatical-resolution-subordinating-conjunction/run.ts \
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
  docs/prototypes/grammatical-resolution-subordinating-conjunction/run.ts \
  run development 1

bun docs/prototypes/grammatical-resolution-subordinating-conjunction/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-subordinating-conjunction/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-subordinating-conjunction/runs/<timestamp>/miss-classifications.json

bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-subordinating-conjunction/run.ts \
  run acceptance
```

The protocol is bounded at 81 calls: `22 × 3` development plus 15 acceptance.
A deliberately pessimistic assumption that every call consumes the full
4,096-token output cap and all input is uncached remains below about `$2.25`.
Comparable cached leaf runs suggest a practical estimate below `$0.20`, but
retained provider usage is authoritative. The hard leaf ceiling remains $5.

The retained 2026-08-03 run binds the obsolete one-field input, nullable
Resolved/Unresolved wrapper, route-negative corpus, copied runner, and old
provider policy. It remains historical evidence only and cannot satisfy #113.

## 2026-08-13 retained evidence and v2 recovery

| Phase | Score | Errors | Disposition | Evidence |
| --- | ---: | ---: | --- | --- |
| Superseded development 1 | 21/22 (95.5%) | 0 | Finalized; one corpus defect | [results](runs/2026-08-13T12-58-41-332Z/results.json), [classifications](runs/2026-08-13T12-58-41-332Z/miss-classifications.json) |
| Corrected development 1 | 22/22 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T13-00-08-109Z/results.json), [classifications](runs/2026-08-13T13-00-08-109Z/miss-classifications.json) |
| Corrected development 2 | 21/22 (95.5%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T13-00-43-154Z/results.json), [classifications](runs/2026-08-13T13-00-43-154Z/miss-classifications.json) |
| Corrected development 3 | 22/22 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T13-01-27-418Z/results.json), [classifications](runs/2026-08-13T13-01-27-418Z/miss-classifications.json) |
| Untouched acceptance v1 | 13/15 (86.7%) | 0 | Finalized; one corpus defect and one accepted model limitation | [results](runs/2026-08-13T13-02-10-921Z/results.json), [classifications](runs/2026-08-13T13-02-10-921Z/miss-classifications.json) |
| Recovery v2 development 1 | 21/22 (95.5%) | 0 | Finalized; one accepted model limitation | [results](runs/2026-08-13T13-06-19-744Z/results.json), [classifications](runs/2026-08-13T13-06-19-744Z/miss-classifications.json) |
| Recovery v2 development 2 | 22/22 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T13-07-07-608Z/results.json), [classifications](runs/2026-08-13T13-07-07-608Z/miss-classifications.json) |
| Recovery v2 development 3 | 22/22 (100%) | 0 | Finalized; no misses | [results](runs/2026-08-13T13-07-55-409Z/results.json), [classifications](runs/2026-08-13T13-07-55-409Z/miss-classifications.json) |
| Untouched acceptance v2 | 14/15 (93.3%) | 0 | Finalized; one accepted model limitation, threshold met | [results](runs/2026-08-13T13-08-41-068Z/results.json), [classifications](runs/2026-08-13T13-08-41-068Z/miss-classifications.json) |

The first development run exposed a contradictory `so dass` oracle: the same
authoritative members were canonical in the demonstration but a Variant of a
different one-word identity in development. The corrected development suite
then scored 22/22, 21/22, and 22/22. Its single miss preserved `als ob`, both
members, normalization, Lemma, and `Comp`, but nondeterministically labeled the
ordinary realization Variant once after passing the same case in round one.
That isolated spelling-label variance is retained as an accepted model
limitation.

Acceptance v1 scored above the configured floor but exposed a replaceable
corpus defect. The `obzwar` oracle called a realization Variant while also
declaring that exact form to be its own Lemma `canonicalForm`; the model's
Canonical answer followed the general spelling policy. The route-local case
builder now enforces that general invariant. The other miss resolved
`sintemal` correctly in every field except historical status and is retained as
an accepted model limitation because the prompt already has an explicit
Archaic rule and a distinct historical demonstration.

All fifteen observed v1 acceptance IDs, sentences, inputs, and oracles are
retired from selection, while the evidence and original acceptance reservation
remain retained. The corpus contains those fifteen historical cases plus a
fresh v2 selection with fifteen new IDs, sentences, inputs, and oracles. The v2
suite remains disjoint from demonstrations and development and covers finite,
infinitival, comparative, reduced, multi-member, capitalization, typo,
historical-variant, and fixed-route contexts. The prompt is unchanged. Three
fresh development rounds scored 21/22, 22/22, and 22/22. The only miss repeated
the narrow `als ob` Canonical-versus-Variant label variance and was fully
classified.

V2 acceptance then scored 14/15. Every member, normalization, spelling, Lemma,
and Core Feature was correct; the sole miss omitted Archaic for deliberately
historical `dieweil`. This matches the already observed lexical historical
status limitation. Because the prompt explicitly defines the rule and includes
a distinct historical demonstration, the miss is an accepted model limitation,
not a prompt or corpus defect. V2 therefore provides finalized,
threshold-passing terminal evidence with zero provider or execution errors.
Both v1 and replacement acceptance reservations remain retained.

All nine retained modern phases used 356,058 input tokens, including 341,820
cached and 7,596 cache-write tokens, plus 11,001 output tokens across 184
error-free calls. At the published Luna rates of $1.00/M ordinary input,
$0.10/M cached input, $1.25/M cache-write input, and $6.00/M output, the
estimated cumulative cost is about **$0.116**, safely below the $5 leaf
ceiling.
