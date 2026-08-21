# Dumtrain Context

Dumtrain owns the evidence and release lifecycle for local models that analyze
an entire Segmented Sentence before any learner click. It does not own learner
interaction, grammatical identity, Reading resolution, or Knowledge generation.

## Language

**Sentence Analysis Case**:
A policy-versioned labelled Segmented Sentence with the complete expected
Analysis Target partition and grammatical resolution for every clickable
Segment.
_Avoid_: Training example, clicked example

**Sentence Analysis Corpus**:
A versioned collection of Sentence Analysis Cases with provenance and fixed
training, development, and evaluation assignments.
_Avoid_: Golden Corpus, dataset dump

**Annotation Policy**:
The exact Dumgen and Dumling interpretation under which a Sentence Analysis
Case is labelled. A policy change makes affected labels different evidence,
even when the source sentence is unchanged.
_Avoid_: Prompt version, labelling convention

**Coverage Cell**:
A named slice of the Sentence Analysis Corpus whose members exercise one route,
feature value, target-membership pattern, orthographic condition, or difficult
contrast. Coverage Cells describe evidence and never assign evaluation roles.
_Avoid_: Class bucket, sub-corpus

**Evaluation Suite**:
A fixed, source-disjoint selection of Sentence Analysis Cases used to measure a
Model Candidate. It is never used for fitting, checkpoint selection, or model
instructions.
_Avoid_: Test examples, holdout bucket

**Challenge Suite**:
A small fixed Evaluation Suite concentrated on policy boundaries and rare
failures rather than natural frequency.
_Avoid_: Adversarial examples

**Model Candidate**:
A trained artifact evaluated for possible release but not yet accepted for
sentence analysis.
_Avoid_: Model Release, checkpoint

**Model Release**:
An immutable accepted model artifact tied to its Sentence Analysis Corpus,
Annotation Policy, evaluation record, tokenizer, and output contract versions.
_Avoid_: Latest model, production checkpoint

**Sentence Analysis**:
The click-independent result that maps every clickable Segment in one Segmented
Sentence to exactly one resolved Analysis Target and its Dumling Attestation.
Reading and Knowledge are outside this result.
_Avoid_: Click Resolution, Knowledge Analysis
