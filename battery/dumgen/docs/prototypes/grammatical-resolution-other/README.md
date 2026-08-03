# German Lexeme/X Grammatical Resolution evaluation

This route-local prototype evaluates the exact
`grammatical-resolution/de/lexeme/other` Prompt Source. Its Golden Corpus has
26 explicit cases: four minimized demonstrations, 19 disjoint authoritative
held-out cases, and three corpus-only feature-ownership probes. Every oracle is
`Unresolved` by deliberate domain policy.

## Reachable policy

There is currently no defensible German-scope `ResolvableText` X identity.
Dumgen Intake resolves one primary language, and `Segmentation<de>` preserves
every non-primary-language span as `OpaqueText`. Multilingual and code-switched
click routing remains explicitly deferred to
[texteater#19](https://github.com/clockblocker/texteater/issues/19).

Universal Dependencies defines X restrictively, principally for
unintelligible material, word fragments, and wholly unanalyzed foreign
material. Those three legitimate families are unreachable here:

- gibberish and unintelligible material are `OpaqueText`;
- incomplete word fragments are `OpaqueText`; and
- foreign or code-switched spans outside the one primary language are
  `OpaqueText`.

The remainder of German GSD's X inventory is not a stable positive class. It
contains abbreviations, symbols, punctuation, alphanumeric codes, foreign
multiword fragments, and annotation inconsistencies that have more informative
routes or are not Lexemes. UD itself discourages X for identifiable native
words merely because their distribution is unusual.

Consequently this scoped resolver is an intentionally negative diagnostic
leaf. Any downstream call means Segmentation violated the `ResolvableText`
promise or Target Classification selected X instead of a real route. The
resolver returns `Unresolved` to expose that upstream defect; it does not
normalize or invent a residual Lemma. This is coherent with Dumgen's current
chain, but it means an eventual live score would validate rejection behavior,
not demonstrate a reachable learner-facing X analysis.

Primary references are the
[universal UD X definition](https://universaldependencies.org/u/pos/X.html),
[UD guidance for foreign expressions](https://universaldependencies.org/foreign.html),
and [German GSD X statistics](https://universaldependencies.org/treebanks/de_gsd/de_gsd-pos-X.html).

## Corpus and demonstrations

The four demonstrations reject distinct upstream failures:

- English `green` is non-primary-language `OpaqueText`, not German X;
- `Kaffe` is a recoverable typo of German NOUN `Kaffee`, so normalization
  belongs to the NOUN route rather than an invented X Lemma;
- `Computer` is an established German loan with ordinary NOUN syntax; and
- `xqzv` is gibberish owned by `OpaqueText`.

The 19 held-out cases cover additional Hebrew, French, Japanese, and Swedish
non-primary-language spans; a German abbreviation and recoverable verb typo;
foreign spans with explicit hypothetical NOUN and INTJ identities; established
PROPN, SYM, and PUNCT; a punctuation-only placeholder, fragment, email address,
overbroad phrase, repeated targets, and unbalanced markup. There are no
positive semantic twins in demonstrations or evaluation.

Three corpus-only probes record dormant Core Feature ownership without
asserting an X Lemma. `Drive-in` has German NOUN syntax despite the X codec's
`Hyph` field; foreign abbreviation `og` remains `OpaqueText` despite GSD's
`Abbr=Yes` X attestation; and opaque code `S8` does not become X merely because
GSD can attach `NumType=Card` to similar codes.

## Exact DTO and dormant output shapes

The model DTO remains faithful to every Dumling German Lexeme/X Surface kind.
It derives the Lemma, Citation Surface, and Inflection Surface from Dumling and
omits only fixed `language`, `family`, `kind`, and the Surface's linked Lemma.
The Inflection schema structurally requires at least one non-null value among
case, gender, mood, number, and verb form, matching Dumling's refined contract
in generated JSON Schema as well as Zod parsing.

Citation and Inflection outputs are intentionally dormant: the current domain
policy has no reachable positive X identity, so no corpus oracle constructs a
Surface or Lemma. Keeping both shapes prevents the model boundary from lying
about Dumling and allows a future #19 decision to activate X without first
repairing a narrowed DTO. Focused schema and evaluator tests exercise both
dormant shapes directly.

The pure evaluator scores decision coherence, member count and orthography,
Surface kind, normalization, spelling, coverage, Surface Features,
Inflectional Features, canonical form, and Core Features. It canonicalizes only
the codec-equivalent null-only Surface Feature bag.

## Bounded evidence runner

Runner v1 makes one serial call for each of the 19 held-out cases using the
shared `gpt-5.6-luna` model, no reasoning, a 2,048-token output budget, zero
retries, and `store: false`. A 25-case cap prevents accidental corpus growth
from expanding a live run. No live call was made while authoring this slice.

Each retained run binds the route, runner version, model policy, assembled
prompt and schema hashes, exact ordered evaluation IDs, and current Golden Case
inputs and ideals. Successful responses retain raw output, response ID,
resolved model, and usage metadata. JSON or exact-schema failures retain that
complete response metadata with the error; transport errors remain error-only.

After shared generated-prompt and package integration, an explicitly
authorized live run can invoke the runner from `battery/dumgen`:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-other/run.ts
```

The draft exits unsuccessfully until every scored miss is classified offline
as `prompt-defect`, `corpus-or-evaluator-defect`, or
`accepted-model-limitation`. Finalize without a provider call:

```sh
bun docs/prototypes/grammatical-resolution-other/run.ts finalize \
  docs/prototypes/grammatical-resolution-other/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-other/runs/<timestamp>/miss-classifications.json
```

Evidence qualifies with at least 15 cases, at least 80% exact-contract score,
zero execution errors, and zero unclassified misses. Finalization rejects stale
policy, prompt, schema, suite, and Golden Case bindings and atomically replaces
the retained result.

## Retained evidence

The finalized run at
`runs/2026-08-03T12-55-20-418Z/results.json` scored 19/19 (100%) with zero
execution errors and zero unclassified misses. This validates the current
negative diagnostic policy only: every illegitimate downstream X target was
rejected. It does not establish a positive learner-facing X identity while the
German-only segmentation and code-switching boundary remains unchanged.
