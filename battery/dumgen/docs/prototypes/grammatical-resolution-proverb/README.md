# German Phraseme/Proverb Grammatical Resolution prototype

This route resolves one already classified German Proverb Analysis Target. The
legacy contract accepted only `markedContext`, reopened route and membership
decisions, and returned a `Resolved | Unresolved` wrapper around a nullable
payload. The current contract accepts exactly `{markedContext,members}` and
returns one total flat codec-derived DTO. Both input projections are
authoritative.

The model owns one orthography classification and normalized string per member,
`Full | Partial` realization coverage, Citation spelling/features, and the
Lemma `canonicalForm`. The application owns German language, Phraseme family,
Proverb kind, empty Lemma Core Features, Citation `surfaceKind`,
Surface-to-Lemma linkage, normalized Surface construction, and successful
result construction. This Dumling route has Citation only.

Grammatical Resolution never repairs membership. Attributions, discourse
framing, punctuation, modifiers, and nearby Aphorism, Idiom,
DiscourseFormula, slogan, quotation, or ordinary-statement material remain
context when unmarked. Repeated and discontinuous supplied members retain every
position in source order. Lack of familiarity or provenance is not a reason to
reopen the already-settled Proverb route.

## Frozen corpus

The 34 original synthetic full-sentence cases are frozen as:

- 6 demonstrations covering quoted attribution, member-level typo repair,
  internal punctuation, explicit ellipsis Partial, pre-reform spelling Variant,
  and a reporting clause interrupting one Proverb quotation;
- 18 development cases covering well-established complete sayings,
  punctuation and framing, repeated members, initial-casing and lexical typos,
  an archaic grammatical use, and an explicitly truncated two-clause Proverb;
- 10 untouched acceptance cases covering unseen complete and Partial sayings
  plus unmarked slogan, DiscourseFormula, Idiom, arbitrary quotation, ordinary
  assertion, and Aphorism contrasts.

The three selections are explicit, exhaustive, and pairwise disjoint. Exact
observed development cases cannot become demonstrations; a genuinely different
sentence may teach the same grammatical distinction.

`realizationCoverage: "Partial"` occurs only in three visibly broken-off
quotations whose missing fixed tail is genuinely unrealized and whose complete
wording remains recoverable: `Wer anderen eine Grube gräbt …`,
`Reden ist Silber …`, and `Wer im Glashaus sitzt …`. A present but unmarked
word, extra supplied member, component substitution, or mixed occurrence is an
upstream membership or identity matter and cannot be repaired with Partial.

Canonical Forms contain the complete current wording with appropriate initial
and German noun capitalization, lexical words joined by single spaces, and no
punctuation. For an ordinary Full Canonical Surface, `canonicalForm` is exactly
`normalizedMembers.join(" ")`. The pre-reform `muß` case remains Standard in
member orthography and normalized Surface, uses Variant spelling, and maps to
current `muss` in the Lemma. Typo repair remains Canonical spelling. The
historical `Wes Brot ich ess, des Lied ich sing` use has Canonical spelling and
an Archaic Surface Feature because its case forms and apocopated verbs belong to
the grammatical use rather than to a mere historical orthography.

## Textual authority and transcription

The category authority for the traditional sayings is the Leibniz Institute
for the German Language's [OWID Sprichwörterbuch complete list](https://www.owid.de/service/stichwortlisten/sprw).
OWID describes the resource as a corpus-based lexicographic documentation of
current fixed German sentence forms and explains its Kernform and variant
policy in [About the dictionary](https://www.owid.de/wb/sprw/ueber.html) and
[usage guidance](https://www.owid.de/wb/sprw/hilfe/hinweise.html). Existing
article-level anchors include [Aller Anfang ist schwer](https://www.owid.de/artikel/404225),
[Andere Länder, andere Sitten](https://www.owid.de/artikel/404233),
[Ende gut, alles gut](https://www.owid.de/artikel/401702),
[Übung macht den Meister](https://www.owid.de/artikel/401787),
[Viele Köche verderben den Brei](https://www.owid.de/artikel/401852),
[Wer anderen eine Grube gräbt, fällt selbst hinein](https://www.owid.de/artikel/401865),
[Stille Wasser sind tief](https://www.owid.de/artikel/401836), and
[Wer rastet, der rostet](https://www.owid.de/artikel/401798).

All contextual sentences are original synthetic examples; no external sentence
is represented as a verbatim attestation. Commas, periods, quotation marks, and
other punctuation are transcribed in context but excluded from member identity,
normalized Surface, and Canonical Form.

## Shared evidence runner

The thin route configuration uses the shared direct cached runner with
`gpt-5.6-luna`, no reasoning, low text verbosity, no retries, `store:false`, a
4,096-token response ceiling, and an explicit 30-minute cache breakpoint after
the stable system prompt. Import and preflight make no provider call.

The authorized protocol used 18 calls for each of three development rounds and
10 calls for untouched acceptance: 64 calls total. Retained usage is 161,339
input tokens, of which 150,822 were cached and 4,802 were cache writes, plus
5,046 output tokens and zero reasoning tokens. At published Luna rates of
$1.00/M ordinary input, $0.10/M cached input, $1.25/M cache-write input, and
$6.00/M output, the measured content estimate is approximately $0.058, safely
below the $5 leaf cap. Exact billed cost remains authoritative in the provider
billing export.

## Retained current-contract evidence

All four runs are finalized, have zero execution errors, classify every miss,
and meet the shared evidence threshold:

| Phase | Score | Evidence |
| --- | ---: | --- |
| Development 1 | 16/18 (88.9%) | `runs/2026-08-13T11-57-10-647Z/results.json` |
| Development 2 | 18/18 (100%) | `runs/2026-08-13T11-58-40-084Z/results.json` |
| Development 3 | 18/18 (100%) | `runs/2026-08-13T11-59-39-431Z/results.json` |
| Untouched acceptance | 10/10 (100%) | `runs/2026-08-13T12-00-34-619Z/results.json` |

Round 1 exposed two prompt defects. The model called a conventional
apocopated verb member a Typo even while preserving it, and inserted a comma
into a Partial Proverb's Canonical Form. The prompt now states that fixed
proverbial contractions, apocope, and older morphology are Standard rather than
free-prose spelling errors, and applies a final punctuation-free lexical
serialization check to every Full or Partial Canonical Form. No failed case
became a demonstration and no corpus case moved between partitions.

Rounds 2 and 3 both scored 100%, selecting the repaired prompt for acceptance.
Untouched acceptance was reserved and invoked exactly once, scored 100%, and
therefore required no replacement. The reservation is retained at
`runs/acceptance-reservation.json`.

The retained 2026-08-03 v4 file binds the obsolete markedContext-only input,
decision wrapper, mixed positive/negative suite, copied runner, and old
prompt/schema. It remains a historical diagnostic and is not evidence for this
migration.

From `battery/dumgen`, deterministic checks and offline preflight are:

```sh
bun test tests/internal/grammatical-resolution-proverb.test.ts \
  tests/internal/grammatical-resolution-proverb-runner.test.ts
bun run check
bun run docs/prototypes/grammatical-resolution-proverb/run.ts \
  preflight development 1
```

The four retained runs are already finalized. The untouched suite cannot be
claimed or run again under the current reservation.
