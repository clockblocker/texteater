# Dumgen Context

## Glossary

### Prompt Source
A prompt authoring unit for one `language + task` pair.

It contains the human-authored inputs used to build and evaluate a prompt:
- `taskDescription`
- optional `agentRole`
- optional `inputSchema`
- optional `outputSchema`
- ordered `examples`
- `numOfFirstExamplesToUse`

### Example
A gold example with:
- `id`
- `input`
- `idealOutput`

Examples are ordered. Their order is semantic, not cosmetic.

### Prompt Build
A deterministic build artifact derived from a Prompt Source.

It contains generated prompt text and build metadata, but no model-run results.

### Prompt Experiment
A validated, owned Prompt Source together with its deterministic Prompt Build
and fixed example split.

Callers create an experiment once, inspect its build, and evaluate through the
same experiment. Evaluation does not accept a separate source/build pair, so a
run cannot accidentally combine mismatched artifacts.

### Evaluation Run
An observation produced by running a built prompt against a model on the eval-only examples.

It contains per-example results and run metadata, and is separate from Prompt Build.

### Source Sentence
The exact source text submitted to sentence-first discovery, before any learner
click is interpreted.

### Intake Decision
The language-agnostic decision made about a Source Sentence before segmentation.

It has exactly one outcome:
- `Accepted`, when some useful material can be segmented as `ResolvableText` in
  one supported language
- `UnsupportedLanguage`, for valid language input outside the supported inventory
- `Unintelligible`, for gibberish or input too corrupted to support a
  defensible interpretation

Unsupported language input is not malformed input.
Malformed but intelligible language remains accepted. An accepted sentence may
contain local `OpaqueText`; intake does not require a count or percentage of
resolvable material.

### Segmented Sentence
A versioned, immutable, ordered segmentation of a Source Sentence and the
authoritative interactive text shown to the learner.

Each Segmented Sentence has a stable `SegmentedSentenceId`. Every Segment is
indexed by its position within that sentence; Segments do not have independent
global IDs. Any correction or re-segmentation produces a new Segmented Sentence
and ID. There is no learner click before segmentation.

Ordinary misspellings remain as written so later classification can preserve
them as attested spelling. Only severely corrupted but intelligible input is
reconstructed. When reconstruction is necessary, the reconstructed Segmented
Sentence replaces the original for downstream interaction; dumgen does not
retain an alignment back to the original.

### Segment
A non-empty, contiguous part of a Segmented Sentence.

Each Segment has exactly one structural kind:
- `ResolvableText`
- `OpaqueText`
- `Whitespace`
- `Punctuation`

`ResolvableText` means that the material can be passed to click resolution. It
does not assert a part of speech, Lemma, morpheme, or other lexical identity.
`OpaqueText` preserves local material that cannot be interpreted defensibly
without making the rest of an accepted sentence non-interactive.

For now, only `ResolvableText` is clickable. All four Segment kinds remain
indexed.

### Selection
A successfully resolved, attestation-local node identified by one
`(SegmentedSentenceId, clickedSegmentIndex)` pair.

A Selection contains:
- the clicked `ResolvableText` index;
- ordered, unique `surfaceSegmentIndices` that reference only `ResolvableText`
  and include the clicked index;
- `attestedSurface`, a stored verbatim projection constructed in application
  code from the participating Segments;
- `selectedOrthography`, explicitly `Standard` or `Typo`, describing only the
  clicked Segment;
- one resolved global Surface.

`spelledSelection` is derived from the immutable Segmented Sentence and clicked
index and is not stored. A resolution request, failed attempt, or prompt
candidate is not a Selection. The canonical Selection requires Segment indices,
although experiments may compare whether a model should emit those indices
directly or an adapter should resolve another output representation to them.

### Surface
A reusable global grammatical form shared by normalized-equivalent Selections.

A Surface contains:
- `normalizedSurface`, which normalizes attested material without inserting,
  reordering, or lemmatizing lexical constituents;
- `spelling`, explicitly `Canonical` or `Variant`;
- `realizationCoverage`, explicitly `Full` or `Partial`, describing how the
  Surface realizes its Lemma;
- its Surface kind and applicable inflectional features;
- one Lemma identity.

Surface identity includes its language, normalized form, Surface kind,
inflectional features, and Lemma identity. Identically spelled noun and verb
forms, and overlapping inflections with different grammatical analyses, are
different Surfaces.

Typos stop at Selection and are repaired in `normalizedSurface`. Licensed
variants survive normalization and are marked on Surface. For example,
`armuor` may be a Typo Selection of the Variant Surface `armour` for a Lemma
whose canonical form is `armor`.

`realizationCoverage: Partial` does not license Surface normalization to invent
missing material. For `heulte mit` resolving to the idiom
`mit den Wölfen heulen`, both `attestedSurface` and `normalizedSurface` remain
`heulte mit`; the complete citation form belongs to the Lemma.

### Meaning
A learner-owned, note-worthy grouping of contextual uses for one Lemma.

A Meaning has a compact emoji description and other semantic description
blocks. When a learner encounters another use of the same Lemma, classification
either reuses one of that learner's existing Meanings or drafts a new Meaning.

Meaning boundaries are intentionally learner-local. A Meaning is not guaranteed
to correspond to a lexicographic sense, homonym, or smallest semantic
distinction. Dumgen does not split semantic pennies unless the distinction is
useful enough to deserve a separate learner-facing note.

### Segmentation Chain
The pre-click chain.

It takes source text through an Intake Decision and, for accepted input, routes
to language-specific segmentation. Its successful result is the Segmented
Sentence the learner can click.

### Click Resolution Chain
The post-click chain.

It begins with a Segmented Sentence and one clicked `ResolvableText` index. It
resolves one valid Selection containing the complete contextual Surface
membership, then resolves the global Surface and its Lemma, and finally either
selects an existing learner-owned Meaning or drafts a new one.

Each chain can be investigated by multiple Prompt Experiments. A chain is not
itself an experiment.

## Relationships

- A **Segmented Sentence** contains one or more indexed **Segments**.
- A **Selection** belongs to exactly one **Segmented Sentence** and clicked
  `ResolvableText` Segment.
- A **Selection** resolves one or more `ResolvableText` Segments to exactly one
  **Surface**.
- Many noisy **Selections** may resolve to one global **Surface**.
- A **Surface** realizes exactly one **Lemma** under one grammatical analysis.
- A **Meaning** groups learner-owned uses of one **Lemma**.

## Example dialogue

> **Dev:** "Does clicking `gvae` create a misspelled Surface?"
> **Domain expert:** "No. It creates a Typo Selection whose attested Surface is
> `gvae up`; that Selection resolves to the global normalized Surface `gave up`
> and Lemma `give up`."

## Flagged ambiguities

- **Lemma identity** remains unresolved. A purely morphogrammatical identity
  policy was rejected because cross-linguistic homonyms such as Russian `коса`
  may share spelling, part of speech, gender, and paradigm. Whether to introduce
  a separate Lexeme and redefine Lemma as a citation form remains a separate
  wayfinder decision.
- **Valency** is outside the dumgen chain wayfinder. Whether attested and
  normalized Surface data should later carry valency realizations belongs in a
  separate backlog issue.
