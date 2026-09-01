# Dumgen context

Dumgen turns learner encounters into segmented text, grammatical attestations,
Readings, and Knowledge proposals.

## Language

**Knowledge Analysis**:

A model-supported workflow that interprets an encounter and drafts a private candidate. It ends before any value crosses the Dumrel boundary.

**Knowledge Projection**:

The deterministic conversion of validated Knowledge Analysis results into Dumrel Knowledge Changes or Pending Semantic Relations. Projection performs no model call, persistence, or matching.

**Requestable Relation**:

A direct Semantic Relation kind that Dumgen may ask a model to propose. Dumrel owns the complete relation vocabulary and its meaning; Dumgen owns this narrower generation boundary.

**Prompt Source**:

The complete human-authored definition of one executable prompt route: its model-facing schemas, instruction body, and ordered demonstrations. A Prompt Source may own one Golden Corpus.

**Golden Case**:

A canonical semantic case with an input, ideal output, optional explanation,
optional structured sources, and optional contamination keys. A source names
the claim it supports and cites either a web URL or repository path. The
case's stable ID is its key in the Golden Corpus.

**Golden Corpus**:

A Prompt Source-owned registry of Golden Cases parsed by that source's exact model-facing schemas.

**Canonical Classification Corpus**:

A representation-neutral semantic oracle for a classification route. Prompt Representation Adapters project its cases into private prompt representations and canonicalize their outputs.

**Golden Case Collection**:

A semantic subdivision of one Golden Corpus. Collection membership describes what a case exercises, not whether it is used for demonstration or evaluation.

**Case Selection**:

An immutable, ordered set of Golden Case IDs bound to one Golden Corpus.

**Demonstration Selection**:

The ordered Golden Cases used as model guidance.

**Evaluation Selection**:

The held-out Case Selection scored by a Prompt Experiment. It is chosen independently of corpus organization and must not overlap the Demonstration Selection.

**Local Demonstrations**:

Ordered, schema-validated examples owned directly by a Prompt Source. They teach exchange shape or route-local behavior without claiming canonical semantic evidence.

**Prompt Representation Adapter**:

The seam that projects a representation-neutral Golden Case into a private model exchange and converts the private output back to the canonical semantic output.

**Prompt Assembly**:

The authoring contracts and deterministic generation process that compile Prompt Sources into Generated System Prompts.

**Generated System Prompt**:

A disposable, reviewable system-prompt artifact derived from a Prompt Source. It contains the instruction body and selected demonstrations, never evaluation cases or model-run results.

**Prompt Experiment**:

A Prompt Source, an independent Evaluation Selection, and a route-specific evaluator bound as one unit.

**Evaluation Run**:

An observation produced by evaluating a prompt against a model. It contains results and run metadata, not prompt policy.

**Source Sentence**:

The exact text submitted to sentence-first discovery before a learner click is interpreted.

**Stitched Text**:

The authoritative text produced when Intake repairs only whitespace in a Source Sentence. It preserves every non-whitespace code point and their order.

**Source Segmentation**:

The deterministic partition of Stitched Text into learner-facing Segments. It does not perform lexical-internal morphology or resolve the learner's eventual target.

**Enabled Segmentation Language**:

A Dumling Supported Language for which Dumgen has an active Source Segmentation route.

**Intake Decision**:

The result of stitching a Source Sentence and resolving whether it is accepted for an Enabled Segmentation Language, unsupported, or unintelligible.

**Intake Batch**:

A bounded, non-empty ordered set of caller-delimited Source Sentences handled by one Intake model call. Each input position has exactly one corresponding Intake Decision.

**Segmented Sentence**:

A versioned, immutable, ordered Source Segmentation of Stitched Text and the authoritative interactive text shown to the learner.

**Segment**:

A non-empty contiguous part of a Segmented Sentence. Its kind is `ResolvableText`, `OpaqueText`, `Whitespace`, or `Punctuation`.

**Unresolved**:

The domain error returned when a click on `ResolvableText` does not yield exactly one defensible result from the Click Resolution Chain.

**Resolution Route Not Implemented**:

The result returned when Target Classification selects a valid route whose downstream resolution is not enabled. It is distinct from Unresolved because the classification itself is valid.

**Analysis Target**:

The ordered Segments resolved as one unit, together with the Lemma Family and Kind to which that unit is routed. It is invariant across clicks on any of its fixed members.

**Component Drilldown**:

A future resolution boundary for one realized member inside a multi-member Analysis Target. It does not reclassify the original high-level target.

**Attestation and Interaction**:

A successful grammatical resolution yields one click-independent Attestation plus Dumgen-owned interaction context. The interaction records the Segmented Sentence, clicked Segment, and all member Segment indices.

**Surface**:

A reusable global grammatical form shared by normalized-equivalent Attestations. It records the normalized occurrence form, spelling status, grammatical features, and one Lemma.

**Lemma**:

The normalized grammatical identity behind a Surface, defined by its language, canonical form, Family, Kind, and core features.

**Lexeme**:

A lexical Lemma whose fixed realization may contain one or more members. Lexeme is one Lemma Family, not a synonym for Lemma.

**Grammatical Resolution**:

The post-target stage that resolves the Surface and Lemma grammar for one fixed language, Lemma Family, and Lemma Kind.

**Resolution Branch**:

The route-specific continuation chosen after Target Classification fixes the language, Family, and Kind.

**Open Route**:

A route whose established resolution branch may generate a result and then replace an exact fixed-population match with its authored value.

**Closed Route**:

A route whose fixed catalog is its complete resolution boundary. It never falls through to the corresponding Open Route.

**Catalog Miss**:

A structured non-success result from a Closed Route whose fixed catalog lacks the required Lemma, Reading, or Reading Knowledge.

**Reading**:

A learner-scoped semantic value made from one Lemma and one Emoji Description. Another use of the same Lemma reuses an existing Reading when it is close enough or creates a new one when the distinction helps the learner.

**Emoji Description**:

An emoji-only semantic label for a Reading: one to four Unicode RGI emoji graphemes that distinguish the Lemma's learner-facing meanings without depicting incidental scene details.

**Segmentation Chain**:

The pre-click chain from an Intake Batch through accepted Intake Decisions to Source Segmentation.

**Click Resolution Chain**:

The post-click chain from one clicked `ResolvableText` Segment through Analysis Target, Attestation, Surface, Lemma, and Reading resolution.
