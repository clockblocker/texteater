# Dumrel Vision

Dumrel is the domain kernel for the linguistic knowledge that surrounds a
resolved Lemma or Reading.

A learner begins with text, encounters a segment, and resolves it through
grammar to an opaque semantic Reading. Dumrel describes what the system may
know about that Lemma and Reading, how new knowledge accumulates, and how
semantic relations imply other relations. It does not generate, persist, or
present that knowledge itself.

## The model

Knowledge is an identityless value owned one-to-one by an exact linguistic
identity:

```text
Lemma   -> Knowledge<Lemma>
Reading -> Knowledge<Reading>
```

The owner supplies identity. A Knowledge bundle never has an identity of its
own, and Knowledge belonging to one owner is never merged into Knowledge
belonging to another owner.

A Lemma owns grammatical knowledge that is independent of semantic identity.
For the initial model, this is one default Transcription.

A Reading owns semantic and learner-facing linguistic knowledge:

- a Definition;
- literal Translations keyed by Target Language;
- a Morphological Tree;
- a Lexical Breakdown where one is useful;
- direct Semantic Relations to other Readings.

Translations are strings, not cross-language Reading relations. A
Morphological Tree is a semantic-choice-aware hierarchy that may combine
morphemic Readings with unresolved lexical Unit Shadows. A Lexical Breakdown
is an ordered decomposition into component Readings for Phrasemes and selected
Lemma kinds.

## Accumulation

Knowledge is expected to grow gradually. A generation or import produces a
partial, additive `KnowledgeContribution<Owner>` rather than replacing the
owner's complete Knowledge.

```text
Knowledge<Owner> + KnowledgeContribution<Owner>
    -> Knowledge<Owner>
```

Omitted aspects mean that nothing was contributed. They never mean deletion.
Correction and retraction are separate concerns. A contribution may merge only
with Knowledge belonging to the exact same Lemma or opaque Reading identity.

The complete reusable bundle is stored by whichever product mode is active.
User settings select which aspects should be generated or displayed; they do
not redefine the Knowledge model.

## Unit Shadows

The system must be able to mention a potentially useful linguistic unit
without recursively resolving and enriching the entire language.

A Unit Shadow is the shallow, identityless outline of a not-yet-resolved
Reading. It carries enough grammatical shape to make later discovery possible,
but it is not a provisional identity and owns no Knowledge.

Unit Shadows allow relation generation and morphological analysis to stop at a
bounded frontier. When real context later resolves the intended Reading, the
containing structure may replace its Unit Shadow with that Reading.

## Semantic relations

The canonical semantic graph connects Readings:

```text
Reading --Semantic Relation--> Reading
```

An unresolved target is only a transitional state:

```text
Reading --Pending Relation--> Unit Shadow
```

Resolving the shadow consumes that transition and establishes the canonical
Reading-to-Reading relation and its required inverse.

Dumrel defines one uniform relation engine driven by relation-specific
algebra. Each relation declares the properties that make sense for it, such as
an inverse, symmetry, transitivity, or substitution through exact Synonyms.
The engine's rules are shared, but the algebra is not flattened into one
behavior for every relation.

Dumrel defines propagation; another part of the system chooses a graph and
executes it. Propagation derives relations only. It never propagates a
Definition, Translation, Breakdown, Morphological Tree, or any other owned
Knowledge across Reading identities.

Component structure is not represented by flat `consistsOf`, `usedIn`,
`derivedFrom`, or `sourceFor` relations. Morphological Tree and Lexical
Breakdown are the canonical structures for those learner-facing analyses.

## DTO seam

The public model is intentionally small:

```text
Knowledge<Lemma>
Knowledge<Reading>
KnowledgeContribution<Lemma>
KnowledgeContribution<Reading>
UnitShadow
SemanticRelation
PendingRelation
MorphologicalTree
LexicalBreakdown
RelationAlgebra
```

These DTOs describe semantic values and rules. They do not expose prompt
representations, database records, synchronization state, model providers, or
user-interface navigation.

## Putting the system together

The complete product follows three connected flows:

```text
Resolution
Text -> Sentence -> Segment -> grammatical resolution -> Reading

Enrichment
Lemma or Reading -> Knowledge Contribution -> accumulated Knowledge

Presentation
accumulated Knowledge + the user's resolved contexts
    -> learner-facing note and relation projections
```

Dumling owns grammatical identity. Dumgen and other producers perform model
calls and produce resolutions or Knowledge Contributions. Dumrel owns the
Knowledge vocabulary, DTOs, validation, merge semantics, and relation algebra.
Storage applies those rules and retains the resulting state. The UI decides
how to project that state for a learner.

The stored path from Text through Sentence and Segment to Reading naturally
records many contextual encounters. Those contexts are not intrinsic Reading
Knowledge. A user's view selects the contexts originating in that user's
texts, combines them with reusable Knowledge, and applies relation propagation
over the Readings relevant to that user.

Map and Route are useful presentation ideas, not Dumrel entities. A Map can
group what a textual form may lead to. A Route can explain how one context
traversed grammatical layers to reach a Reading. Neither needs independent
domain identity or persistence in Dumrel.

## Three product modes

### 1. User-provided model access

The user supplies model access and generates Knowledge for themselves. The
same resolution and enrichment pipeline produces Dumrel DTOs, while local
storage accumulates the resulting Knowledge and contextual history. Unit
Shadows keep generation bounded when related or component Readings have not
been encountered.

### 2. Hosted shared service

The user connects to the hosted service. Resolved Lemmas and Readings can reuse
shared accumulated Knowledge and cached generation results. Missing aspects
are contributed incrementally. The linguistic Knowledge is reusable, while
the contexts selected for presentation remain specific to the requesting
user.

### 3. Local first, hosted later

The user begins with local generation and later connects to the hosted
service. Local and hosted operation use the same Dumrel Knowledge and
Contribution contracts, so accepted knowledge does not need a different
semantic representation.

Reconciling locally created opaque Reading identities with hosted identities,
migrating state, and preserving references are explicit integration concerns
outside Dumrel. Once an owner identity is reconciled, the same owner-preserving
merge and relation rules apply.

## Boundary

Dumrel succeeds when every producer, store, and presentation can share one
precise model of linguistic Knowledge without forcing Dumrel to become an LLM
pipeline, database, synchronization engine, learner-history service, or UI
framework.
