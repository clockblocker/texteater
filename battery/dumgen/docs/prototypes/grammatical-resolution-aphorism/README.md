# German Phraseme/Aphorism Grammatical Resolution evaluation

This route-local prototype covers exactly
`grammatical-resolution/de/phraseme/aphorism`. It adds no shared prompt
generation, package command, catalog, runtime wiring, or live evidence. The
Golden Corpus has 27 cases: four necessary demonstrations, 20 explicitly pinned
held-out cases, and three corpus-only policy probes. Demonstration and
evaluation selections are disjoint by case, normalized input, and explicit
lemma contamination keys.

The four demonstrations teach distinct policies: punctuation is outside
whole-unit membership; a one-member spelling error is repaired and marked
`Typo`; the attested historical spelling `muß` is a `Standard` member and a
`Variant` Surface rather than a typo; and an anonymous traditional saying is a
Proverb rather than an Aphorism. The held-out suite contains 12 positive
Aphorisms and eight boundaries: Proverb, Idiom, Collocation, arbitrary direct
speech, a famous dramatic quotation, an ordinary sentence, incomplete target
scope, and members spanning two independent aphorisms. It also exercises
internal punctuation, quotation punctuation, inappropriate initial casing, and
one-member typo repair.

The model DTOs are projected from Dumling's German Phraseme/Aphorism Lemma and
Citation Surface schemas. Fixed route fields (`language`, `family`, `kind`) and
the Surface's linked Lemma are absent from model exchange. The complete Core
Feature object is `{}`. Aphorism exposes no Dumling Inflection Surface, so
`surfaceKind` is always `Citation` and `inflectionalFeatures` is never emitted.

Whole-unit membership follows the Selection contract rather than treating the
quotation as one opaque string. Every participating `ResolvableText` member has
its own `<TARGET>...</TARGET>` pair, and `memberOrthographies` maps one-to-one
to those pairs in textual order. Whitespace and punctuation remain untagged.
The normalized Surface is the space-separated projection of targeted lexical
members, so it excludes commas, quotation marks, and terminal punctuation.
Only a complete, single conventional Aphorism can resolve; partial, overbroad,
or two-unit scope is `Unresolved` rather than `Partial`.

The pure evaluator reports exact diagnostics for decision/coherence, mechanical
TARGET-member count and orthographies, every Citation Surface field, Canonical
Form, and the empty Core Feature object. It canonicalizes only an all-null
`surfaceFeatures` bag to `null`, matching the route-local codec.

The bounded runner makes one serial `gpt-5-nano` call per held-out case with low
reasoning, no retries, `store: false`, and a 2,048-token route-local response
budget. Import and preflight make no provider call. Draft evidence is written
atomically and cannot meet the evidence threshold until offline finalization.
The retained schema binds the exact prompt, schemas, ordered case IDs, model
policy, attempts, and recomputed summary. Provider metadata and raw output are
retained even when response parsing fails. Runs with an execution/provider
error cannot be finalized.

After root integration registers a package command, a deliberate live run can
be started from `battery/dumgen`. Until then, invoke the runner directly with an
explicit environment file. Finalization is offline:

```sh
bun --env-file ../../.env.local \
  docs/prototypes/grammatical-resolution-aphorism/run.ts

bun run docs/prototypes/grammatical-resolution-aphorism/run.ts \
  finalize \
  docs/prototypes/grammatical-resolution-aphorism/runs/<timestamp>/results.json \
  docs/prototypes/grammatical-resolution-aphorism/runs/<timestamp>/miss-classifications.json
```

Each scored miss must be classified as `prompt-defect`,
`corpus-or-evaluator-defect`, or `accepted-model-limitation`, with a non-empty
explanation. Final evidence additionally requires at least 15 attempted cases,
an 80% score, and zero execution/provider errors.

## Textual source and transcription policy

Every positive lemma is from Marie von Ebner-Eschenbach's explicitly titled
collection *Aphorismen*, in the public-domain 1893 first volume of her
*Gesammelte Schriften*. The route uses the proofread
[Project Gutenberg transcription, eBook 77889](https://www.gutenberg.org/ebooks/77889),
which is derived from scans made available by the Internet Archive. The
[Wikisource author bibliography](https://de.wikisource.org/wiki/Marie_von_Ebner-Eschenbach)
independently identifies the 1893 volume and its scan witnesses.

Punctuation is transcribed in context but excluded from grammatical membership.
Except for explicit test perturbations (`höhrt` and lowercase initial `die`),
member spelling follows the source. The `muß` case deliberately preserves the
source's licensed historical spelling in `normalizedSurface` while its
`canonicalForm` uses current `muss`. Other selected aphorisms avoid words whose
1893 spelling differs materially from current standard spelling. Author names
are provenance only and never Phraseme members.

The three corpus-only probes preserve uncertain or structurally invalid inputs
without using them as model evidence: an anonymous maxim-like saying whose
Proverb/Aphorism status lacks authorship evidence, an author attribution
incorrectly included in scope, and punctuation incorrectly tagged as a member.

## Deferred shared registration

Root integration must register the Prompt Source with the generated-prompt
manifest, add any package prototype command, generate the committed prompt
module, and decide whether a policy tension belongs in the persistent prompt
logbook. Catalog and runtime wiring remain outside this route slice.
