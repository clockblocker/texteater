# German Phraseme/DiscourseFormula Grammatical Resolution prototype

This route resolves one already classified German DiscourseFormula Analysis
Target. The former model contract accepted only `markedContext`, reopened route
and membership decisions, and returned a `Resolved | Unresolved` wrapper around
a nullable payload. The current contract accepts exactly
`{markedContext,members}` and returns one total flat codec-derived DTO. Both
input projections are authoritative.

The model owns one orthography classification and normalized string per member,
`Full | Partial` realization coverage, Citation spelling/features, the Lemma
`canonicalForm`, and the nullable scalar `discourseFormulaRole`. The application
owns German language, Phraseme family, DiscourseFormula kind, Citation
`surfaceKind`, Surface-to-Lemma linkage, normalized Surface construction, and
successful result construction. This Dumling route has Citation only.

Grammatical Resolution never repairs membership. Names, vocatives, modifiers,
punctuation, free complements, and nearby INTJ, Idiom, Proverb, Aphorism,
Collocation, quotation, or compositional material remain context when they are
unmarked. A one-member target is valid. Repeated or discontinuous supplied
members retain every position in source order.

Under [ADR 0002](../../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md),
Core Features participate in grammatical Lemma identity. Context therefore
selects one scalar role identity rather than mutating one role-neutral Lemma.
The same `bitte schön` wording has a Request identity in an order and a null-role
presentation identity. Apologetic `tut mir leid` and sympathetic `tut mir leid`
likewise have distinct Apology and null-role identities. Null is reserved for a
valid classified formula function, such as wish, congratulation, presentation,
or sympathy, that the ten-value enum does not name.

## Frozen corpus

The 34 original synthetic full-sentence cases are frozen as:

- 6 demonstrations covering greeting, apology with discontinuity, thanks with
  a free complement, reaction plus vocative, the single-member `MfG`
  abbreviation Variant, and an explicit ellipsis Partial;
- 18 development cases covering all ten enum roles plus null, same-form role
  ambiguity, one-member repetition, formula-internal and free-context
  discontinuity, ordinary initial casing, noun-casing and spelling typos,
  contracted spelling Variant, archaic use, Partial leave-taking, and a wish
  distinguished from a nearby compositional phrase;
- 10 untouched acceptance cases covering unseen greetings, farewells, thanks,
  apology, acknowledgment, refusal, initiation, reaction, a one-member formula,
  and an explicitly truncated thanks formula.

The three selections are explicit, exhaustive, and pairwise disjoint. Exact
observed development cases cannot become demonstrations; a genuinely different
sentence may teach the same grammatical distinction.

`realizationCoverage: "Partial"` occurs only in three broken-off formulas whose
missing fixed tail is genuinely unrealized and whose full wording remains
recoverable: `es tut mir …`, `mit freundlichen …`, and
`vielen herzlichen …`. Present but unmarked words, extra supplied members, or
mixed occurrences are upstream membership errors and cannot be repaired with
Partial.

Canonical Forms use the route's established lowercase dictionary convention,
including nouns. `normalizedMembers` instead preserves required German noun
capitalization. Ordinary utterance-initial casing is Standard and normalizes to
citation casing. A real selected-member error such as `morgen` for noun
`Morgen` or `wilkommen` for `willkommen` is Typo and uses Canonical spelling.
Licensed contractions and abbreviations stay Standard in member orthography,
use Variant spelling, and map to the full current Lemma wording. The archaic
`Gott befohlen` use is Canonical spelling with
`{historicalStatus:"Archaic"}`.

The interactional interpretation of the principal formula families follows
direct descriptions in IDS grammis and Duden: [Guten Morgen as a greeting](https://grammis.ids-mannheim.de/verbs/view/400670),
[es tut mir leid as apology or regret](https://grammis.ids-mannheim.de/verbs/view/400735/2),
[vielen/besten Dank](https://www.duden.de/rechtschreibung/Dank),
[gern geschehen as a response to thanks](https://www.duden.de/rechtschreibung/geschehen),
[nein danke as polite refusal](https://www.duden.de/rechtschreibung/danke),
[darf ich bitten as a request or invitation](https://www.duden.de/rechtschreibung/bitten),
[dann wollen wir mal as initiation](https://www.duden.de/rechtschreibung/wollen_moechten_wuenschen),
and [ach du meine Güte as surprise or fright](https://www.duden.de/rechtschreibung/Guete).
All corpus sentences are original and are not represented as verbatim
attestations from those sources.

## Shared evidence runner

The thin route configuration uses the shared direct cached runner with
`gpt-5.6-luna`, no reasoning, low text verbosity, no retries, `store:false`, a
4,096-token response ceiling, and an explicit 30-minute cache breakpoint after
the stable system prompt. Import and preflight make no provider call.

The authorized protocol used 18 calls for each of three development rounds and
10 calls for untouched acceptance: 64 calls total. Retained usage is 154,566
input tokens, of which 143,902 were cached and 7,026 were cache writes, plus
4,729 output tokens and zero reasoning tokens. At published Luna rates of
$1.00/M ordinary input, $0.10/M cached input, $1.25/M cache-write input, and
$6.00/M output, the measured content estimate is approximately $0.056, safely
below the $5 leaf cap. Exact billed cost remains authoritative in the provider
billing export.

## Retained current-contract evidence

All four runs are finalized, have zero execution errors, classify every miss,
and meet the shared evidence threshold:

| Phase | Score | Evidence |
| --- | ---: | --- |
| Development 1 | 15/18 (83.3%) | `runs/2026-08-13T11-09-11-226Z/results.json` |
| Development 2 | 15/18 (83.3%) | `runs/2026-08-13T11-10-29-857Z/results.json` |
| Development 3 | 16/18 (88.9%) | `runs/2026-08-13T11-11-45-784Z/results.json` |
| Untouched acceptance | 9/10 (90%) | `runs/2026-08-13T11-12-59-125Z/results.json` |

Round 1 exposed one prompt defect shared by three outputs: ordinary Full
`canonicalForm` was not mechanically bounded to authoritative members. The
prompt now requires lowercasing and joining every normalized supplied member,
preserving repetition and excluding unmarked context; only explicit Partial or
licensed Variant can depart from this equality. This fixed the discontinuous
request and repeated thanks cases in later rounds.

Round 2 showed that the model could still invent a longer related formula for
an unbroken shorter one and could preserve ordinary initial capitalization on
a Variant. The prompt now states that an unbroken formula without ellipsis is
Full and applies initial-casing normalization equally to Canonical and Variant
Surfaces. No exact failed case became a demonstration and no corpus case moved
between partitions.

Round 3 selected this final prompt for acceptance. Its two persistent misses
are classified as accepted model limitations: the model continued to prefer a
longer related sympathy formula and retained ordinary initial capitalization
on one contracted Variant despite the explicit general rules.

Untouched acceptance was reserved and invoked exactly once. Its single miss is
also an accepted model limitation: the model invented uppercase on an already
correct lowercase adjective and classified that supplied Standard member as a
Typo despite the explicit orthography and noun-capitalization rules. It was not
a prompt defect, so the shared replacement protocol was not triggered. The
reservation is retained at `runs/acceptance-reservation.json`.

The retained 2026-08-03 v2 files bind the obsolete markedContext-only input,
decision wrapper, mixed positive/negative suite, copied transport, and old
prompt/schema. They are historical artifacts and are not evidence for this
migration.

From `battery/dumgen`, deterministic checks and offline preflight are:

```sh
bun test tests/internal/grammatical-resolution-discourse-formula.test.ts \
  tests/internal/grammatical-resolution-discourse-formula-runner.test.ts
bun run check
bun run docs/prototypes/grammatical-resolution-discourse-formula/run.ts \
  preflight development 1
```

The retained evidence can be revalidated offline with `finalize` only before a
draft has already been finalized. The untouched suite cannot be claimed or run
again under the current reservation.
