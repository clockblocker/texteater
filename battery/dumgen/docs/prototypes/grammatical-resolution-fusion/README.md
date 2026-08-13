# German Construction/Fusion Grammatical Resolution prototype

This route resolves one already classified German Fusion Analysis Target. The
legacy contract accepted only `markedContext`, reopened route and membership
decisions, and returned a `Resolved | Unresolved` wrapper around a nullable
payload. The current contract accepts exactly `{markedContext,members}` and
returns one total flat codec-derived DTO. Both input projections are
authoritative.

The model owns the singleton member's orthography classification and normalized
string, Citation spelling/features, and Lemma `canonicalForm`. The application
owns German language, Construction family, Fusion kind, empty Lemma Core
Features, Citation `surfaceKind`, Surface-to-Lemma linkage, normalized Surface,
Full realization coverage, and successful-result construction. The Dumling
Fusion route has Citation Surface only.

Grammatical Resolution never repairs membership. The classified fused member
stays one member; it is not split into hidden preposition/article members and a
following article, noun, complement, or Idiom word is never absorbed. Plain
ADP/DET sequences, lexicalized or nondecomposable lookalikes, dialectal forms,
and neighboring Idiom or PairedFrame material remain context when unmarked.

## Frozen corpus

The 34 original synthetic full-sentence cases are frozen as:

- 6 demonstrations covering initial casing, following-noun control, typo
  repair, historical apostrophe Variant, and nearby standalone, Idiom, and
  dialect controls;
- 18 development cases covering the standard productive inventory, singleton
  membership beside uncontracted words, initial casing, two typos, a historical
  Variant, and archaic wording that does not make the Fusion use archaic;
- 10 untouched acceptance cases covering unseen contexts, repeated identical
  occurrences, and further productive fused forms.

The three selections are explicit, exhaustive, and pairwise disjoint. Exact
observed development cases cannot become demonstrations; a genuinely different
sentence may teach the same grammatical distinction.

All contexts are original synthetic examples. Current spellings use Citation
`spelling: "Canonical"`. Ordinary sentence-initial capitalization remains
Standard and lowercases in `normalizedMembers`. Evident local typos repair only
the supplied member and remain Canonical spelling. Licensed historical
apostrophe spellings such as `für's` and `in's` remain Standard as attested,
use Variant spelling, and map to current `fürs` and `ins` Lemmas. Historical or
archaic unmarked wording does not itself make the current Fusion use Archaic.

## Shared evidence runner

The thin route configuration uses the shared direct cached runner with
`gpt-5.6-luna`, no reasoning, low text verbosity, no retries, `store:false`, a
4,096-token response ceiling, and an explicit 30-minute cache breakpoint after
the stable system prompt. Import and preflight make no provider call.

The authorized protocol used 18 calls for each of three development rounds and
10 calls for untouched acceptance: 64 calls total. Retained usage is 107,790
input tokens, of which 103,950 were cached and 1,650 were cache writes, plus
2,938 output tokens and zero reasoning tokens. At published Luna rates of
$1.00/M ordinary input, $0.10/M cached input, $1.25/M cache-write input, and
$6.00/M output, the measured content estimate is approximately $0.032, safely
below the $5 leaf cap. Exact billed cost remains authoritative in the provider
billing export.

## Retained current-contract evidence

All four runs are finalized, have zero execution errors, contain no misses, and
meet the shared evidence threshold:

| Phase | Score | Evidence |
| --- | ---: | --- |
| Development 1 | 18/18 (100%) | `runs/2026-08-13T12-25-34-604Z/results.json` |
| Development 2 | 18/18 (100%) | `runs/2026-08-13T12-26-13-821Z/results.json` |
| Development 3 | 18/18 (100%) | `runs/2026-08-13T12-26-48-330Z/results.json` |
| Untouched acceptance | 10/10 (100%) | `runs/2026-08-13T12-27-15-073Z/results.json` |

Every development case passed on every round, so no miss classification or
prompt change was warranted. No case moved between partitions and no observed
case became a demonstration. Untouched acceptance was reserved and invoked
exactly once, scored 100%, and therefore required no recovery run. The
reservation is retained at `runs/acceptance-reservation.json`.

The retained 2026-08-03 v2 files bind the obsolete markedContext-only input,
decision wrapper, mixed positive/negative suite, copied Batch/direct runner, and
old prompt/schema. They remain historical diagnostics and are not evidence for
this migration.

From `battery/dumgen`, deterministic checks and offline preflight are:

```sh
bun test tests/internal/grammatical-resolution-fusion.test.ts \
  tests/internal/grammatical-resolution-fusion-runner.test.ts
bun run check
bun run docs/prototypes/grammatical-resolution-fusion/run.ts \
  preflight development 1
```
