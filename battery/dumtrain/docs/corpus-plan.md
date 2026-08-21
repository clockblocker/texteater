# Sentence Analysis Corpus plan

## What one case contains

A Sentence Analysis Case labels the whole sentence, not one synthetic click.
It must contain enough information to reproduce the public result and every
training target without consulting a prompt transcript.

```ts
type SentenceAnalysisCase = Readonly<{
	id: string;
	language: "de";
	source: SourceProvenance;
	annotationPolicyVersion: string;
	stitchedText: string;
	segments: readonly Segment[];
	targetIndexBySegmentIndex: readonly (number | null)[];
	targets: readonly {
		memberSegmentIndices: readonly [number, ...number[]];
		attestation: Attestation<"de">;
	}[];
	coverageCells: readonly string[];
}>;
```

The authoritative annotation includes:

- Stitched Text and deterministic Source Segments;
- the complete High-Level Whole Unit target partition;
- Family and Kind for every target;
- one orthography judgment and normalized member for every member;
- realization coverage;
- Surface kind, spelling, and applicable features;
- Lemma Canonical Form and Core Features;
- source provenance, licensing status, and Annotation Policy;
- corpus split and Coverage Cell membership.

Marked context and normalized Surface are derived and checked. They are not
separate human-authored labels. Reading, Emoji Description, Definition,
Translation, Transcription, and other Knowledge are excluded.

## How many cases

One ordinary German sentence should yield roughly 10 to 20 resolved targets,
so sentence count understates the amount of supervision.

| Milestone | Fully annotated sentences | Approximate target occurrences | Purpose |
| --- | ---: | ---: | --- |
| Annotation calibration | 1,000 | 15,000 | Fix the handbook and adjudication process |
| Architecture checkpoint | 10,000 | 150,000 | Prove that every head and the assembler learn |
| First credible corpus | 50,000 | 750,000 | Evaluate a useful end-to-end Model Candidate |
| Strong production corpus | 250,000 to 500,000 | 4M to 8M | Cover grammar and difficult membership broadly |
| Long-tail corpus | 1M+ | 15M+ | Improve rare forms, domains, typos, and drift |

Training should begin at 5,000 cases and repeat at 10,000, 20,000, 50,000,
100,000, and later milestones. Learning curves by Coverage Cell decide what to
collect next.

## Required distribution

Natural frequency alone will bury Phrasemes, `INTJ`, `SYM`, unusual
Constructions, discontinuous Lexemes, and difficult participial boundaries.
The first 50,000 cases should intentionally mix natural and selected evidence:

| Slice | Sentence target |
| --- | ---: |
| Natural-distribution text | 30,000 |
| Rare-route enrichment | 10,000 |
| Boundary and near-neighbor contrasts | 5,000 |
| Typos, variants, damaged context, and unusual forms | 5,000 |

This is a collection plan, not an evaluation weighting rule. The Evaluation
Suite should publish both natural-frequency and macro results.

Before calling the first corpus credible, require:

- at least 1,000 training targets for every reachable Family/Kind route;
- a preferred 3,000 to 5,000 targets for each serious production route;
- at least 500 examples of every important grammatical feature value;
- 200 to 500 examples for every named policy contrast;
- several thousand discontinuous targets across their supported routes;
- several thousand genuine or source-faithful typo and variant cases;
- explicit negative neighbors for every rare positive class.

Counts do not replace variety. Five thousand repetitions of one idiom do not
provide five thousand useful Idiom cases.

## Coverage Cells

Coverage Cells make corpus gaps queryable without turning the corpus into a
directory tree. A case may belong to several cells.

Initial cells should cover:

- every reachable Family/Kind route;
- singleton and discontinuous target membership;
- governed prepositions, inherently reflexive pronouns, separable members, and
  perfect, future, passive, and productive state-passive auxiliaries;
- modal-plus-lexical-verb and copula-plus-predicate non-membership controls;
- the TIGER participle distinctions fixed by
  [system ADR 0007](../../../docs/adr/0007-use-the-tiger-boundary-for-german-participles.md);
- multi-member Lexemes classified by whole-unit POS under
  [system ADR 0009](../../../docs/adr/0009-classify-multi-member-lexemes-by-whole-unit-pos.md);
- Phraseme and free-phrase contrasts;
- Fusion and nearby ordinary ADP/DET analyses;
- canonical spelling, licensed variants, historical use, ordinary casing, and
  genuine typos;
- Surface-kind and feature combinations for every enabled route;
- unsupported, opaque, and damaged local context at the Source Segmentation
  seam.

## Collection sources

Every case must retain source provenance and redistribution terms. Candidate
sources include licensed books, news, learner text with consent, public-domain
text, conversational material, and purpose-written challenge sentences.

Existing Dumgen Golden Cases and Canonical Classification Cases are valuable
policy evidence. They should seed the Challenge Suite or annotation handbook,
not silently enter both training and evaluation. Their prompt demonstration and
evaluation roles remain Dumgen concerns.

Synthetic material is useful for controlled contrasts and typo generation, but
it must be marked as synthetic and kept visible in corpus reports. A model that
looks strong only because evaluation repeats its templates is not ready.

## Annotation workflow

The first 1,000 cases are for improving the annotation system. They should not
be rushed into a large labelling run.

1. Generate deterministic Source Segments with the pinned Dumgen version.
2. Have an annotator label the complete target partition and grammatical
   result.
3. Validate all mechanically checkable Dumgen and Dumling invariants.
4. Send uncertain and policy-sensitive cases to a second annotator.
5. Adjudicate disagreements against the Annotation Policy and applicable ADRs.
6. Add recurring disagreements to the handbook and Challenge Suite.
7. Freeze the case, its provenance, and its split assignment.

For the calibration set and Evaluation Suites, use independent double
annotation before adjudication. For later ordinary training cases, targeted
second review may be enough once measured agreement is stable. Rare routes and
all policy boundaries continue to require second review.

Automated labels may propose work, but a case does not become trusted evidence
merely because the current Dumgen LLM and the local Model Candidate agree.

## Splits and contamination

Assign splits before training and preserve them across corpus versions. Split
by source document and source family, not by individual sentence. Near
duplicates, translations, edited variants, and generated templates stay in one
split.

Maintain at least these selections:

- training selection;
- development selection for checkpoint and threshold decisions;
- natural-frequency Evaluation Suite;
- macro-balanced Evaluation Suite;
- fixed Challenge Suite;
- unseen-Lemma Evaluation Suite for normalization and Canonical Form
  generalization.

A practical first 50,000-case allocation is 40,000 training, 5,000
development, and 5,000 evaluation cases. The Challenge Suite can overlap the
evaluation assignment but must be reported separately.

No Evaluation Suite case, source sibling, contamination key, or normalized
near-duplicate may influence fitting, data augmentation, checkpoint selection,
or model instructions.

## Corpus versioning

A corpus release records:

- immutable case IDs and content hashes;
- Annotation Policy version;
- Dumgen Source Segmentation version;
- Dumling schema version;
- source provenance and license status;
- split assignments and contamination groups;
- Coverage Cell counts;
- annotation and adjudication status;
- derived validation results.

Correcting a label creates a new corpus version and invalidates evaluation
records that used the old label. Reassigning a case between training and
evaluation also creates a new version and requires a fresh contamination audit.

## Decision point

The 10,000-case checkpoint answers whether the architecture learns the task at
all. The 50,000-case checkpoint answers whether corpus growth is buying useful
end-to-end accuracy. Only then should Dumtrain commit to the expense of a
250,000-case production corpus.

The main output of the early corpus is a trustworthy learning curve. A single
accuracy number is not enough to justify training at scale.
