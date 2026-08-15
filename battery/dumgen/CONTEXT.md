# Dumgen Context

## Glossary

### Knowledge Analysis
A Dumgen model workflow that interprets encounter context and returns a private
candidate DTO. Knowledge Analysis ends before a value crosses the Dumrel
boundary.

### Knowledge Projection
The deterministic conversion of a validated Knowledge Analysis result and any
resolved Morpheme Readings into a Dumrel Knowledge Change or Pending Semantic
Relation. Projection performs no model call, persistence, matching, or cleanup.

### Prompt Source
A leaf directory that is the complete human-authored source for exactly one
executable prompt. Prompt Sources begin in the Laboratory; a reviewed source may
be promoted together with its selected representation and corpus.

`prompt-source.ts` is its interface to Prompt Assembly and exports one
`promptSource` value. That value owns the route, model-facing schemas,
instruction body, and immutable ordered demonstration selection. A
corpus-backed Prompt Source may also expose that Demonstration Selection for
experiment composition. `schemas.ts` keeps the input and output schemas together
and is the runtime catalog's schema interface. A route whose private
representation is unsettled does not attach its Canonical Classification Corpus
to a Prompt Source.

Demonstrations are either schema-validated local examples owned directly by the
Prompt Source or a Case Selection from that source's canonical Golden Corpus.
DTO-shape examples remain local; they do not become Golden Cases merely because
they are rendered into a prompt.

Prompt Source bodies and demonstration selections cannot be inherited from a
different route or maintained in parallel files. Schemas may reuse code-level
Dumling and Prompt Assembly helpers. Shared selection, validation, rendering,
and authoring infrastructure belongs to Prompt Assembly.

### Golden Case
A canonical semantic case containing `input`, `idealOutput`, an optional
trimmed `explanation`, and optional `contaminationKeys`. Its stable ID is the
key in exactly one Golden Corpus or Canonical Classification Corpus and is not
repeated inside the case.

### Golden Corpus
The Prompt Source-owned keyed Golden Case registry for one prompt route, parsed
with that Prompt Source's exact model-facing schema instances.

### Canonical Classification Corpus
The representation-neutral keyed Golden Case registry for a classification
route whose private prompt representation is or was unsettled. Its ideal
outputs are the semantic oracle shared by every Prompt Representation Adapter.
After a representation is selected, the corpus may be promoted unchanged with
the production Prompt Source; demonstration and evaluation roles remain Case
Selections over that one registry.

### Golden Case Collection
A named semantic subdivision of one canonical corpus, such as ADP or Phraseme.
Collection membership describes what a case exercises and never assigns
demonstration or evaluation roles.
_Avoid_: Sub-corpus, ADP corpus, demonstration collection, evaluation collection

### Case Selection
An immutable ordered set of Golden Case IDs bound to one canonical corpus.

Selection and set algebra preserve deterministic order. Named groups resolve to
Case Selections and carry composition meaning only; contamination is expressed
only through IDs, fingerprints, and contamination keys.

### Demonstration Selection
The ordered Golden Cases designated as model guidance. Prompt-owned cases are
embedded directly; Canonical Classification Cases are materialized by an
Adapter.
_Avoid_: Examples to use, training set

### Evaluation Selection
The held-out Case Selection evaluated by one Prompt Experiment. It is chosen
independently of corpus organization and excludes the Demonstration Selection.
_Avoid_: Examples for test, test set

### Local Demonstrations
An immutable ordered list of examples parsed with a Prompt Source's exact schema
instances. Local Demonstrations teach model exchange shape or route-local prompt
behavior without claiming canonical semantic evidence.

### Prompt Representation Adapter
An Adapter at the experimental representation seam that materializes one
representation-neutral Golden Case into a private prompt input/ideal output and
canonicalizes one private model output back into the corpus's semantic output.
It owns no cases, selections, policy, or scoring.

### Prompt Assembly
The stable authoring contracts that Prompt Sources satisfy together with the
code generator that compiles Prompt Sources into Generated System Prompts.

Prompt Assembly lives under `promptsmith/assembly`; it is authoring
infrastructure, not application runtime integration.

Prompt-owned Demonstrations and Golden Cases match the minimal model-facing
schemas, while Canonical Classification Cases match their semantic schemas and
cross the private representation seam only through Prompt Representation
Adapters. Runtime mapping and its tests remain outside Prompt Assembly.
An ideal output is a typed reference answer, not a universal
exact-match assertion; route-specific evaluators decide correctness.
An explanation is concise authoring guidance that connects observable input
evidence and prompt rules to the ideal output. Prompt Assembly renders it after
the ideal output and labels it as guidance that is not part of the output.

### Generated System Prompt
A deterministic `systemPrompt` artifact derived from a Prompt Source.

It combines the prompt body and selected demonstrations, and supplies only the
`systemPrompt` property of a `PROMPT_CATALOG` entry. It contains no evaluation
examples, runtime integration, or model-run results. It is disposable,
generated by Prompt Assembly, and never edited manually.

Generated System Prompt modules are committed under the owning Laboratory or
Production stage so their exact model text is reviewable and a fresh checkout
can typecheck without generating files first.
Prompt Assembly generation is deterministic, and CI fails when committed
artifacts are stale.

The prompt body contains instructions only. Prompt Assembly is the sole owner
of demonstration formatting: it appends local demonstrations or selected
Golden Cases in order, serializes inputs and ideal outputs as stable JSON, and
omits case IDs. Evaluation selections are never read during generation.

### Prompt Experiment
A Prompt Source, independently selected evaluation suite, and pure
route-specific evaluator validated as one unit.

Experiment construction binds evaluation to the Prompt Source's canonical
Golden Corpus identity and exact schema instances, then rejects
demonstration/evaluation contamination by case ID, exact parsed-input
fingerprint, additional route fingerprint, and shared contamination key before
a provider runner can make a call. Published suites pin explicit case IDs so
corpus growth cannot silently change an evaluation.

A representation-comparison Prompt Experiment binds every Adapter to the same
Canonical Classification Corpus and evaluates only canonicalized outputs.

### Evaluation Run
An observation produced by running a catalog prompt against a model on an
evaluation suite.

It contains per-example results and run metadata, and is separate from the
Generated System Prompt. Evaluation uses a route-specific evaluator; exact
equality is used only when the route's semantics make it authoritative.

### Source Sentence
The exact source text submitted to sentence-first discovery, before any learner
click is interpreted.

### Stitched Text
The authoritative text produced when Intake minimally repairs whitespace in a
Source Sentence. It may delete whitespace to rejoin blown-off fragments or
insert whitespace to separate accidentally joined words, but it preserves every
non-whitespace code point and their order.

### Source Segmentation
The deterministic partitioning of Stitched Text into learner-facing Segments.
It does not perform lexical-internal morphology or resolve the grammatical
target to which a learner click will later lead.
_Avoid_: Morphological segmentation, tokenization

### Enabled Segmentation Language
A Dumling Supported Language for which Dumgen has an enabled language-specific
Source Segmentation route. German and Hebrew are the Enabled Segmentation
Languages for the Section 1 path; the intended inventory is eventually every
Dumling Supported Language.
_Avoid_: Supported language, when referring specifically to Dumgen route availability

### Intake Decision
The result of minimally stitching a Source Sentence and resolving its language
before Source Segmentation.

It has exactly one outcome:
- `Accepted`, with the Stitched Text and Enabled Segmentation Language to which
  some useful material can be dispatched as `ResolvableText`
- `UnsupportedLanguage`, with no language projection, for valid language input
  that has no enabled Dumgen Segmentation route
- `Unintelligible`, for gibberish or input too corrupted to support a
  defensible interpretation

Unsupported language input is not malformed input.
Malformed but intelligible language remains accepted. An accepted sentence may
contain local `OpaqueText`; intake does not require a count or percentage of
resolvable material. The Dumgen module dispatches an accepted result to
`SourceSegmentation<language>`; it does not hardcode a segmentation language
after Intake. For now, Intake resolves exactly one primary language per Source
Sentence, and Source Segmentation preserves non-primary-language spans as
`OpaqueText`. Multilingual and code-switched routing is deferred to
[texteater#19](https://github.com/clockblocker/texteater/issues/19).

### Intake Batch
A bounded, non-empty ordered list of caller-delimited Source Sentences handled
by exactly one Intake model call.

Every input position produces exactly one Intake Decision at the same output
position. Stable internal item IDs enforce cardinality and order; Stitching
never crosses an item boundary, and one bad item does not discard its
neighbors. Accepted items in one Intake Batch share one primary Enabled
Segmentation Language. A public single-item Intake operation is not exposed.

### Segmented Sentence
A versioned, immutable, ordered Source Segmentation of Stitched Text and the
authoritative interactive text shown to the learner.

Each Segmented Sentence has a stable `SegmentedSentenceId`. Every Segment is
indexed by its position within that sentence; Segments do not have independent
global IDs. Any correction or re-segmentation produces a new Segmented Sentence
and ID. There is no learner click before segmentation.

Ordinary misspellings remain as written so later classification can preserve
them as attested spelling. Intake's whitespace-only repair produces the Stitched
Text; Source Segmentation never reconstructs it. The Stitched Text replaces the
Source Sentence for downstream interaction, and Dumgen retains no alignment
back to the original.

### Segment
A non-empty, contiguous part of a Segmented Sentence.

Each Segment has exactly one structural kind:
- `ResolvableText`
- `OpaqueText`
- `Whitespace`
- `Punctuation`

`ResolvableText` means that the segmenter asserts the material can be resolved
defensibly by the downstream Click Resolution Chain. It does not yet assert
which part of speech, Lexeme, morpheme, or other linguistic identity will be
resolved.
`OpaqueText` preserves local material for which the segmenter cannot make that
resolution assertion without making the rest of an accepted sentence
non-interactive.

For now, only `ResolvableText` is clickable. All four Segment kinds remain
indexed.

`Lexeme/PUNCT` and `Lexeme/X` remain in the downstream German route inventory,
but neither is reachable from High-Level Target Classification. Source
Segmentation classifies punctuation as `Punctuation`, while unintelligible
material, fragments, and unanalyzed non-primary-language spans belong upstream
as `OpaqueText`; target membership admits only `ResolvableText`. Canonical
high-level corpora record these as inventory/clickability domain gaps; they
must not fabricate clickable punctuation or residual X material as
`ResolvableText` merely to claim route coverage.

### Unresolved
A domain error produced when a click on `ResolvableText` fails to yield exactly
one defensible result from the Click Resolution Chain.

`Unresolved` creates no Attestation and indicates that the segmentation or
classification prompts violate the `ResolvableText` promise. Material known to
be unresolvable is handled during segmentation as `OpaqueText`; `Unresolvable`
is not a downstream classification outcome.

### Resolution Route Not Implemented
A Dumgen application result produced when Target Classification selects a valid
language, Lemma family, and Lemma kind whose downstream resolution route is not
enabled yet.

It is represented as `decision: "NotImplemented"` together with the selected
correlated route. It stops the chain before another model call, creates no
Attestation, and remains distinct from `Unresolved`: the classification is valid,
but implementation is intentionally incremental.

### Analysis Target
A Dumgen-owned result that groups the ordered Segments resolved as one unit by
a Target Classification policy and names the Lemma Family and Kind to which
that unit is routed.

High-Level Target Classification exposes the Analysis Target as a public
Dumgen action result. It is not an Attestation, a persisted linguistic entity,
part of Dumling, or the private model response. Its indices are non-empty,
ordered, unique, in bounds, point only at `ResolvableText`, include the click,
and identify the same unit whichever member was clicked.

For German, fixed realized components belong to one target even when they are
discontinuous or have different parts of speech. These components include
governed prepositions, inherently reflexive pronouns, separable members, and
perfect/future/passive auxiliaries. Modal auxiliaries with lexical verbs,
copulas with predicates, free arguments, contextual reflexives, adjuncts, and
modifiers remain separate targets. High-level membership does not prevent a
later drill-down analysis of an individual AUX, preposition, pronoun, or other
member.

The target level is policy-owned. German High-Level Target Classification does
not group an ordinary non-idiomatic Collocation merely because its lexical
choices are conventional. In `eine Entscheidung treffen`, clicks on `eine`,
`Entscheidung`, and `treffen` resolve separate Lexeme targets. Collocation
remains a valid Dumling Lemma kind for explicit policies and supplied targets,
but it is not reachable from this high-level policy.

### Attestation and interaction
A successful grammatical resolution projects its click-independent Analysis
Target into one Attestation plus Dumgen-owned interaction context.

An Attestation contains a non-empty ordered `members` list, occurrence-level
`realizationCoverage`, and one resolved global Surface. Each member pairs the
exact participating Segment text as `attested` with its `Standard | Typo`
orthography. The public interaction value contains the Segmented Sentence ID,
clicked Segment index, and non-empty ordered member Segment indices.

The target member indices align one-to-one and positionally with the marked
context's `TARGET` pairs, Grammatical Resolution's member orthographies, and
`attestation.members`; every index points to the Segment whose exact text is in
the corresponding member. No fixed target member may disappear because its
role is auxiliary, reflexive, governed-prepositional, or separable. Marked
context remains a Dumgen result artifact.

Clicks on different member Segments of one resolved unit reuse the same
Attestation value. Only the interaction's clicked index changes.

### Surface
A reusable global grammatical form shared by normalized-equivalent Attestations.

A Surface contains:
- `normalizedSurface`, which is the normalized one-space projection of exactly
  the ordered target members without reordering or lemmatizing occurrence
  constituents, except for the narrow German NOUN Ergänzungsstrich completion
  fixed by system ADR 0004;
- `spelling`, explicitly `Canonical` or `Variant`;
- its Surface kind and applicable inflectional features;
- one Lemma.

The private Grammatical Resolution DTO does not ask a model to construct that
scalar. It returns `normalizedMembers`, one entry per target member in the same
order as member orthographies. The shared projection validator rejects
cardinality drift, reordered or unrelated Standard material, and leading,
trailing, or repeated whitespace; Dumgen alone joins the validated entries
with one space to construct public `normalizedSurface`. Typo repair remains a
route-level linguistic judgment rather than a character-distance policy.

Surface identity includes its language, normalized form, Surface kind,
inflectional features, and Lemma identity. Identically spelled noun
and verb forms, and overlapping inflections with different grammatical
analyses, are different Surfaces.

Typos remain member evidence on Attestation and are repaired in
`normalizedSurface`. Licensed
variants survive normalization and are marked on Surface. For example,
`armuor` may be a Typo Attestation member of the Variant Surface `armour` for a Lexeme
whose Canonical Form is `armor`.

Attestation `realizationCoverage: Partial` does not license Surface normalization to invent
missing material. For `heulte mit` resolving to the idiom
`mit den Wölfen heulen`, Attestation members preserve `heulte` and `mit`, while
`normalizedSurface` remains `heulte mit`; the complete Canonical Form belongs
to the Lemma.

For a German VERB target, Surface inflectional features describe the
route-owning lexical head rather than every member or the whole clause. A
perfect or passive lexical head therefore remains Participle morphology and a
future lexical head remains Infinitive morphology; finite features from the
auxiliary are not copied onto it. Lemma `canonicalForm` likewise remains the
lexical identity, such as `warten`, `sich erinnern`, or `aufpassen`, rather than
a concatenation of occurrence members.

### Lemma
The normalized grammatical identity behind a Surface.

Every Lemma consists of its language, `canonicalForm`, `family`, `kind`, and
`coreFeatures`. `Lexeme`, `Phraseme`, `Morpheme`, and `Construction` are peer
families. Grammatically indistinguishable homonyms share one Lemma; homographs
with different grammatical analyses are different Lemmas.

### Lexeme
A word-like Lemma.

Lexeme is one Lemma family, not a synonym for Lemma. Semantic differences do
not split a Lexeme when its canonical form, kind, and core features are the
same.

### Grammatical Resolution
The post-target stage that resolves the Surface and Lemma grammar for one fixed
language, Lemma family, and Lemma kind.

_Avoid_: Grammar Resolution

### Reading
The learner-scoped semantic identity formed by one Lemma and one emoji
description.

A Reading is exactly `{ lemma, emojiDescription }`. When a learner encounters
another use of the same Lemma, classification reuses one of that learner's
existing Readings when it is close enough or drafts a new Reading. This is the
no-splitting-semantic-pennies policy: semantic identity is learner-local and is
split only when a separate learner-facing Reading is useful.

### Emoji Description
The emoji-only learner-facing semantic label for a Reading: a minimum sufficient
lexical mnemonic of one to four Unicode RGI emoji graphemes, never Lemma text, a
gloss, prose, or incidental scene detail. Simple concepts prefer one direct
emoji; transparent lexical components may use a consistent compact sequence.
_Avoid_: Emoji gloss, emoji-plus-gloss label

### Segmentation Chain
The pre-click chain.

It has two internal stages behind one public batch operation:

1. One bounded LLM Intake call minimally stitches every Source Sentence in an
   Intake Batch, resolves one primary language context, and returns one ordered
   Intake Decision per item.
2. Only when Intake returns `Accepted`, the application uses the resolved
   language to run deterministic language-specific Source Segmentation.

Intake and Source Segmentation remain distinct internal stages. An
`UnsupportedLanguage` or `Unintelligible` Intake Decision stops the chain after
Intake. Successful Source Segmentation returns the Segmented Sentence the learner
can click.

### Click Resolution Chain
The post-click chain.

It begins with a Segmented Sentence and one clicked `ResolvableText` index. It
classifies one click-invariant Analysis Target, projects every fixed realized
member into one valid Attestation, resolves the global Surface and its Lemma,
and finally either
selects an existing learner-owned Reading or drafts a new one.

Each chain can be investigated by multiple Prompt Experiments. A chain is not
itself an experiment.

### Laboratory Prompt Namespace

The current executable prompts are laboratory instruments. The pre-click chain
makes one model call, registered as `laboratory.intake`. Accepted German and
Hebrew items then use deterministic Source Segmentation modules; these are
observable through laboratory rule traces but are not prompt routes. Post-click
classification begins at
`laboratory.targetClassification.de.highLevelWholeUnit`, then dispatches to
physically distinct `laboratory.grammaticalResolution.de.<Family>.<Kind>`
leaves. Reading Resolution depends only on the language and is registered once
as `laboratory.readingResolution.de`. The high-level policy registers Lexeme,
Phraseme, and Construction routes; it deliberately excludes Morpheme routes.

Human-authored Prompt Sources use a stage-first hierarchy under
`laboratory/prompt-source`: Intake has no language level; every language-specific
stage places the language immediately after the stage, followed only by the
dimensions on which that stage depends. Language-first authoring paths are not
used.

Filesystem routes use lowercase kebab-case, while the shared typed catalog uses
camelCase stage names and preserves canonical Dumling discriminants. For
example,
`prompt-source/grammatical-resolution/de/lexeme/noun` supplies
`laboratory.grammaticalResolution.de.Lexeme.NOUN`.

Prompt Assembly writes disposable `systemPrompt` assets under
`laboratory/generated-system-prompt`, mirroring the Prompt Source routes. The
handwritten `PROMPT_CATALOG` imports those assets together with each authored
`schemas.ts` module.

The structured Prompt Source scope is batch Intake, Target Classification<de,
HighLevelWholeUnit>, the enabled German Grammatical Resolution inventory, and
Reading Resolution<de>. Target Classification retains its explicit policy
dimension so later target policies can have distinct contracts. Every route
reachable from the current German classifier has a total flat Grammatical
Resolution prompt. `Lexeme/X` is authored for upstream compatibility but is not
currently selected by that classifier. `Lexeme/PUNCT`, Morphemes, and
`Phraseme/Collocation` remain explicitly NotImplemented. Every successfully
resolved German Lemma continues through the shared German Reading Resolution
prompt.

The production prompt namespace contains the promoted German High-Level Target
Classification policy and its generated System Prompt. The catalog imports that
production asset before dispatching an accepted target to the laboratory-owned
German Grammatical Resolution inventory. Batch Intake, Grammatical Resolution,
and German Reading Resolution remain under the laboratory namespace;
laboratory evidence and paths do not by themselves claim production readiness.

## Relationships

- A **Segmented Sentence** contains one or more indexed **Segments**.
- An **Analysis Target** belongs to exactly one **Segmented Sentence** and is
  invariant across clicks on any of its member `ResolvableText` Segments.
- An **Attestation** contains one ordered member value for every Analysis
  Target index, in the same position as its marked-context pair and member
  orthography.
- Many noisy **Attestations** may resolve to one global **Surface**.
- A **Surface** realizes exactly one **Lemma** under one grammatical
  analysis.
- A **Lexeme** is a word-like **Lemma**.
- A **Reading** combines exactly one **Lemma** and one learner-scoped Emoji
  Description.

## Example dialogue

> **Dev:** "Does clicking `gvae` create a misspelled Surface?"
> **Domain expert:** "No. It creates an Attestation with a Typo member `gvae`
> and Standard member `up`; that Attestation resolves to the global normalized
> Surface `gave up` and Lexeme Lemma whose Canonical Form is `give up`."

## Flagged ambiguities

- **Valency** is outside the dumgen chain wayfinder. Whether attested and
  normalized Surface data should later carry valency realizations belongs in a
  separate backlog issue.
