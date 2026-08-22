# Dumtrain

Dumtrain is the proposed training battery for sentence-wide local grammatical
analysis. It will own corpus construction, training experiments, evaluation,
model release records, and the evidence needed to decide whether a local model
can replace Dumgen's per-click Target Classification and Grammatical Resolution
calls.

This first version is documentation-only and is not yet an executable
workspace. It fixes neither a machine-learning framework nor a model
checkpoint. The point is to make the experiment concrete enough to estimate,
collect the right corpus, and reject a weak design before runtime code depends
on it.

## Working hypothesis

Dumgen continues to run Intake and deterministic Source Segmentation. Dumtrain
trains a local model that receives the complete resulting Segmented Sentence
and resolves every clickable Segment in one sentence-wide invocation. The
result is stored once. A later click only looks up the target already assigned
to that Segment.

Reading Resolution and Knowledge Generation remain the existing Dumgen LLM
operations. They depend on learner-owned Reading candidates and the requested
Knowledge mask, so eager sentence-wide generation would do expensive work that
may never be used.

## Documents

- [Architecture](./docs/architecture.md) describes the proposed model and the
  narrow sentence-analyzer interface around it.
- [Result expectations](./docs/result-expectations.md) records the output
  contract, quality gates, memory, speed, storage, and retraining estimates.
- [Corpus plan](./docs/corpus-plan.md) defines what must be annotated, how much
  evidence is needed, and how to prevent evaluation contamination.
- [Context](./CONTEXT.md) defines Dumtrain's vocabulary.

## Scope

The first experiment is German-only and targets the current Dumgen
High-Level Whole Unit policy. It includes Source Segments, Analysis Target
membership, Family and Kind, Attestation member evidence, Surface grammar, and
Lemma grammar. It excludes Reading selection, emoji descriptions, definitions,
translations, other Knowledge, learner dictionaries, and application
persistence.

The numbers in these documents are planning estimates. A Model Candidate must
be benchmarked on its exact exported graph, tokenizer, assembler, hardware, and
corpus before any estimate becomes a release claim.
