# Sentence-wide model architecture

## Goal

Analyze a German Segmented Sentence once, before any click, and produce every
grammatical result that the current click-driven path could return. Clicking a
Segment then becomes a lookup into the stored Sentence Analysis.

The intended flow is:

```text
Source Sentence
    |
Dumgen Intake
    |
deterministic Source Segmentation
    |
one local sentence-analysis invocation
    |
validated Sentence Analysis
    |
persist or cache
    |
learner click -> target lookup -> existing Reading and Knowledge LLM calls
```

This preserves [Dumgen ADR 0001](../../dumgen/docs/adr/0001-batch-intake-and-local-source-segmentation.md).
Source Segmentation remains deterministic and does not become a learned
tokenizer. The local model has its own subword or character tokenizer, but its
token boundaries are private and retain an offset map back to Dumgen Segments.

## External seam

Dumtrain should eventually produce a model adapter behind one deep module. A
caller supplies a Segmented Sentence and receives one validated Sentence
Analysis:

```ts
interface SentenceAnalyzer<L extends "de"> {
	readonly release: ModelReleaseIdentity;

	analyze(sentence: SegmentedSentence<L>): Promise<SentenceAnalysis<L>>;
}
```

Callers do not select model heads, reconcile wordpieces, group targets, repair
invalid predictions, or construct Dumling values. Those jobs stay inside the
module. Tests use the same interface as production callers.

A conceptual result shape is:

```ts
type SentenceAnalysis<L extends "de"> = Readonly<{
	sentenceId: SegmentedSentenceId;
	targetIndexBySegmentIndex: readonly (number | null)[];
	targets: readonly ResolvedSentenceTarget<L>[];
	modelRelease: ModelReleaseIdentity;
	annotationPolicyVersion: string;
}>;

type ResolvedSentenceTarget<L extends "de"> = Readonly<{
	memberSegmentIndices: readonly [number, ...number[]];
	attestation: Attestation<L>;
}>;
```

Every `ResolvableText` Segment maps to one target. `OpaqueText`, `Whitespace`,
and `Punctuation` map to `null`. Marked context, Attestation members, and the
one-space normalized Surface projection are derived from the authoritative
Segments and target membership rather than predicted as duplicate strings.

## Model shape

The first Model Candidate should use a small shared contextual encoder with a
structured decoder. A six-layer, hidden-size-384 Transformer is a reasonable
starting point. The whole model, including task heads and bounded text-editing
support, should remain near 25 to 35 million parameters.

```text
Segmented Sentence
       |
private tokenizer and Segment offset map
       |
shared Transformer encoder
       |
Segment embeddings
       |
       +-- target-anchor head
       +-- correlated Family/Kind head
       +-- member orthography and normalization heads
       +-- route-specific Surface and Lemma heads
       |
constrained decoder and deterministic assembler
       |
Dumgen and Dumling validation
```

The encoder runs once for the sentence. The heads may be decoded in dependency
order inside the same invocation. "One invocation" does not require every
tensor to be computed simultaneously. It means the application does not call
the model again for each Segment or target.

## Segment representations

The private tokenizer returns offsets into the stitched text. Wordpiece
representations that overlap one Dumgen Segment are pooled into one Segment
embedding. Whitespace and punctuation remain available as context even though
only `ResolvableText` participates in target membership.

Exact source text always comes from the Segmented Sentence. The model never
reconstructs the sentence from tokens.

## Target grouping

High-Level Whole Unit targets can be discontinuous. A contiguous BIO tagger is
therefore insufficient.

Each `ResolvableText` Segment predicts the earliest member of its target as an
anchor. A singleton target points to itself:

```text
Er      -> Er
passt   -> passt
gut     -> gut
auf     -> passt
```

The constrained decoder turns those links into target groups:

```text
[Er]
[passt, auf]
[gut]
```

This representation has no arbitrary target IDs in the training labels. It
also encodes click invariance directly: every member of one target resolves to
the same group.

The decoder enforces these invariants before any result crosses the module
interface:

- every `ResolvableText` Segment belongs to exactly one target;
- every anchor belongs to its own target;
- member indices are non-empty, ordered, unique, and in bounds;
- every member references `ResolvableText`;
- discontinuity is allowed;
- one Segment cannot belong to overlapping High-Level Whole Unit targets.

Later drill-down policies may analyze individual members again. They require a
separate policy and result, not overlapping targets in this one.

## Route and grammar prediction

The target embedding combines its member embeddings, its anchor, and the
whole-sentence representation. One correlated label predicts Family and Kind,
such as `Lexeme/VERB`. Predicting them independently could create routes that
Dumling does not support.

Route-specific heads then predict only the fields licensed by the selected
Dumling schemas:

- realization coverage;
- member orthography;
- normalized members;
- Surface kind, spelling, and applicable inflectional features;
- Lemma Canonical Form and Core Features.

Categorical grammar uses masked classification heads. Normalized members use a
bounded character-edit transducer whose common operations are copy, ordinary
sentence-initial lowercasing, and local typo repair. Canonical Form uses Lemma
retrieval with a character-level fallback for an unseen Lemma. A large
autoregressive text decoder is not required for the ordinary path.

All targets are decoded as one batch over the shared sentence representation.

## Deterministic assembly

The assembler owns facts that follow mechanically from accepted predictions:

- exact Attestation member text from each participating Segment;
- marked context from ordered target membership;
- `normalizedSurface` from normalized members;
- language, Family, Kind, and Surface-to-Lemma linkage;
- Segment-to-target lookup;
- immutable public DTO construction.

The assembler validates the same Dumgen and Dumling contracts as the existing
runtime path. Structurally invalid predictions do not become partial public
results. A Model Candidate records them as evaluation failures. A production
adapter returns a typed analysis failure so the host can retain the existing
LLM path as a fallback during rollout.

## Training objective

Training combines losses for the decisions that the public result exposes:

```text
total loss =
    target-anchor loss
  + correlated route loss
  + member orthography loss
  + normalization edit loss
  + realization-coverage loss
  + Surface feature losses
  + Lemma feature losses
  + Canonical Form retrieval or generation loss
```

Losses are masked by the authoritative route schema. A NOUN case does not
train VERB-only fields. Corpus reports must publish performance for each head
and for the exact assembled target, since a good average loss can hide an
unusable end-to-end result.

## Release and cache identity

Every Sentence Analysis records both the Model Release and Annotation Policy.
The cache key is conceptually:

```text
(language, stitched text, source-segmentation version,
 annotation-policy version, model-release identity)
```

Changing a label, grouping rule, Dumling schema, tokenizer, or model weights
creates a new identity. Old analyses can coexist during a staged rollout and
can be replaced lazily or by bulk reanalysis.

## Semantic work after a click

The lookup returns the resolved Attestation and its Lemma immediately. Dumgen
then performs its existing learner-scoped work:

1. Reading Resolution receives marked context, the Lemma, and existing learner
   Emoji Descriptions.
2. Knowledge Generation receives the selected Reading, marked context, and the
   requested Knowledge mask.

Dumtrain does not train or invoke either semantic operation in this plan.
