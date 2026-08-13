# German Lexeme/X Grammatical Resolution prototype

This route resolves one valid, already classified German Lexeme/X Analysis
Target. The legacy contract treated X as a diagnostic rejection leaf. The
current contract accepts exactly `{markedContext,members}` and returns one total
flat codec-derived DTO. Both input projections are authoritative; Grammatical
Resolution never reclassifies or repairs membership and never returns
`Unresolved`.

This dispatchable leaf does not change product reachability or fabricate a
clickable X target. The orchestrator owns inventory and High-Level Target
Classification policy. If upstream supplies valid X, this leaf must resolve it
instead of converting the classification into a failure.

## Codec ownership

The model owns member orthography and normalization, Citation or Inflection
Surface spelling/features, Lemma `canonicalForm`, and all codec-supported Lemma
Core Features:

```text
{ abbr: Yes|null, foreign: Yes|null, hyph: Yes|null,
  numType: Card|Mult|Range|null }
```

Citation is used when the occurrence expresses no codec-supported inflection,
including invariant contextual foreign or slang forms. Inflection is used only
when syntax supports at least one value in its mandatory five-key feature bag:

```text
{ case: Acc|Dat|Gen|Nom|null, gender: Fem|Masc|Neut|null,
  mood: Imp|Ind|Sub|null, number: Plur|Sing|null,
  verbForm: Fin|Inf|Part|null }
```

The application owns German language, Lexeme family, X kind, Citation
`surfaceKind`, normalized Surface construction, Surface-to-Lemma linkage, Full
realization coverage, and the successful-result wrapper. Inflection retains its
model-owned `surfaceKind: "Inflection"` discriminator. Unsupported distinctions
remain null; the prompt never invents a feature merely to choose Inflection.

## Frozen corpus

The v2 recovery corpus contains 36 original synthetic full sentences in
exhaustive,
pairwise-disjoint partitions:

- 8 demonstrations: unknown Citation identity, code-switched foreign form, two
  conservatively inflected unknown nominal forms, a different reported-speech
  subjunctive nonce verb, genuine typo, foreign abbreviation, and readable word
  fragment;
- 18 development cases: all four nominal cases; feminine, masculine, neuter,
  singular, and plural cues; finite indicative and imperative, infinitive, and
  participle; foreign/code-switched Latin material; integrated and foreign
  slang; sentence-initial casing; archaic use; licensed spelling Variant;
  mixed alphanumeric spelling; repetition; OpaqueText and nearby PROPN,
  abbreviation, INTJ, SYM, and identifiable German-POS controls; and a numeric
  X feature;
- 10 replacement acceptance cases: wholly fresh IDs, sentences, and oracles
  covering unseen Citation, determinate nominal and reported-speech verbal
  Inflection, foreign and abbreviated forms, readable fragments, an
  unambiguous hyphen-bearing foreign form, typo repair, and archaic foreign use.
  The observed v1 acceptance cases are absent from this corpus; no v2 case
  carries underdetermined gender or a disputed NumType value.

All route contrasts are unmarked context. They do not become negative outputs
and cannot change the authoritative X target. Exact observed development cases
cannot become demonstrations; only genuinely different teaching examples may
be added after classified evidence.

The examples are natural synthetic sentences; no external sentence is claimed
as an attestation. Citation `spelling` is Canonical for ordinary forms and
repaired typos. British `colour` is the licensed Variant mapped to canonical
`color`. Sentence-initial `Whatever` remains Standard while normalizing to
`whatever`. Mixed spellings such as `w00t`, `3D`, and `off-grid` are not typos
solely because they combine writing systems or character classes. Archaic
`thou` and replacement `hither` carry an Archaic Surface Feature because the
forms' grammatical use is historical.

## Shared evidence runner

The thin route configuration uses the shared direct cached runner with
`gpt-5.6-luna`, no reasoning, low text verbosity, no retries, `store:false`, a
4,096-token response ceiling, and an explicit 30-minute cache breakpoint after
the stable system prompt. Import and preflight make no provider call.

The v1 protocol used 64 calls: three 18-case development rounds followed by one
10-case untouched acceptance. It retained 208,439 input tokens (196,465 cached
and 9,535 cache writes), 4,950 output tokens, and zero reasoning tokens, for a
content estimate of approximately $0.061. V1 scores were 10/18, 13/18, 16/18,
and 7/10; every miss is classified and every run has zero execution errors.

The failed v1 acceptance is finalized and its reservation remains retained.
Its replaceable prompt and corpus defects triggered the shared replacement
protocol. V2 added one genuinely different indirect-speech subjunctive teaching
example and a narrow rule; no observed failed sentence became a demonstration.
The v2 acceptance suite is wholly fresh and passed the runner's ID, input, and
oracle-fingerprint freshness checks.

V2 used another 64 calls after three new finalized current-binding development
rounds unlocked replacement acceptance. Retained v2 usage is 239,356 input
tokens (233,226 cached and 3,702 cache writes), 4,957 output tokens, and zero
reasoning tokens, for an estimated content cost of approximately $0.060. Across
v1 and v2, the measured estimate is approximately $0.121, safely below the $5
leaf cap. Provider billing remains authoritative.

## Retained v2 recovery evidence

All four v2 runs are finalized, have zero execution errors and zero unclassified
misses, and use the selected v2 prompt. Round 3 and replacement acceptance meet
the shared score threshold:

| Phase | Score | Evidence |
| --- | ---: | --- |
| Development 1 | 12/18 (66.7%) | `runs/2026-08-13T13-08-40-024Z/results.json` |
| Development 2 | 14/18 (77.8%) | `runs/2026-08-13T13-09-38-425Z/results.json` |
| Development 3 | 16/18 (88.9%) | `runs/2026-08-13T13-10-31-301Z/results.json` |
| Fresh replacement acceptance | 8/10 (80%) | `runs/2026-08-13T13-11-21-718Z/results.json` |

Development misses were fully classified as bounded residual-X model
limitations after the prompt's nominal, verbal, casing, and current-use rules
were explicit. The recurring limitations are Citation bias for an unknown noun,
conservative nonce-base lemmatization, and occasional overmarking of Foreign.
Replacement acceptance was invoked exactly once. Its two misses are accepted
model limitations, not replaceable defects: one repeats the nominal Citation
bias, and one assigns Neut where the syncretic determiner `dieses` supports only
conservative gender null. The fresh acceptance reservation is retained at
`runs/acceptance-reservation-92750345f3a33e24.json`.

The retained 2026-08-03 v2 evidence binds the obsolete markedContext-only
input, all-Unresolved policy, nullable decision wrapper, negative corpus, and
copied runner. It remains a historical diagnostic and is not evidence for this
migration.

From `battery/dumgen`, deterministic checks and offline preflight are:

```sh
bun test tests/internal/grammatical-resolution-other.test.ts \
  tests/internal/grammatical-resolution-other-runner.test.ts
bun run check
bun run docs/prototypes/grammatical-resolution-other/run.ts \
  preflight development 1
```
