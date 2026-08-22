# Result expectations

This document records planning targets for the first German Model Candidate.
They are hypotheses to measure, not benchmark results.

## Functional result

One successful analysis must cover the complete Segmented Sentence. It is not
a bag of independent token predictions.

The accepted result must satisfy all of these conditions:

- exact stitched text and Segment order are preserved;
- every `ResolvableText` Segment resolves to exactly one Analysis Target;
- non-clickable Segments resolve to none;
- clicking any member of one target returns the same target;
- target members are ordered, unique, in bounds, and source-aligned;
- fixed realized components required by the current German policy remain in
  the same target and Attestation;
- Family and Kind form a supported correlated route;
- Attestation, Surface, and Lemma pass Dumling validation;
- normalized members preserve or repair source members under the route policy;
- all derived projections agree positionally;
- no Reading or Knowledge appears in the result.

The deterministic decoder and assembler should make structural validity 100%
for accepted results. Linguistic correctness remains empirical and must be
measured against the Evaluation Suite.

## Proposed quality gates

The first production discussion should use end-to-end measures. Head-level
accuracy is diagnostic, not sufficient.

| Measure | Proposed release floor |
| --- | ---: |
| Accepted-result schema and invariant validity | 100% |
| Source and Segment preservation | 100% |
| Exact target partition per sentence | 99.5% |
| Family/Kind macro F1 | 99.5% |
| Exact Attestation membership per target | 99.5% |
| Exact complete grammatical target | 99.0% |
| Critical Challenge Suite | 100% |

"Exact complete grammatical target" means that membership, orthography,
normalization, realization coverage, Surface, and Lemma all match. It is the
number closest to what a learner experiences.

These floors are deliberately demanding. If the learning curves level off
below them, the experiment should locate the failing Coverage Cells before
changing the interface or hiding errors behind an average.

## Model size and runtime memory

The planning model is a German-only six-layer Transformer with hidden size 384,
structured heads, and bounded character editing.

| Item | Expected range |
| --- | ---: |
| Parameters | 25M to 35M |
| INT8 artifact | 30 MB to 50 MB |
| FP16 artifact | 60 MB to 100 MB |
| Incremental CPU resident memory | 150 MB to 350 MB |
| GPU model and batch workspace | 300 MB to 800 MB |
| Complete GPU process including runtime | 1 GB to 2 GB |

A conservative deployment allowance doubles the model workspace to 1 GB. That
does not change the product economics.

## Throughput and latency

Assumptions:

- average input length of 30 to 40 private tokens;
- maximum input length of 64 private tokens;
- INT8 or FP16 compiled inference;
- native tokenization and assembly;
- dynamic batching for throughput measurements;
- retrieval or bounded editing on the ordinary Canonical Form path;
- no Reading or Knowledge call included.

| Hardware | Batch-one end-to-end latency | Batched throughput target |
| --- | ---: | ---: |
| Modern laptop or server CPU | 3 to 10 ms | 300 to 1,000 sentences/s |
| High-end 16 to 32 core server CPU | 2 to 6 ms | 800 to 2,000 sentences/s |
| NVIDIA L4-class GPU | 1 to 3 ms | 8,000 to 20,000 sentences/s |

Capacity planning should use the deliberately reduced figures of 500
sentences/s on CPU and 5,000 sentences/s on one L4-class GPU until a real
artifact proves otherwise.

At those reduced rates:

| Corpus | CPU at 500/s | GPU at 5,000/s |
| --- | ---: | ---: |
| 10M sentences | 5.6 hours | 33 minutes |
| 100M sentences | 2.3 days | 5.6 hours |
| 1B sentences | 23 days | 2.3 days |

An autoregressive character decoder for every Canonical Form would likely cut
GPU throughput to roughly 2,000 to 5,000 sentences/s. The first implementation
should benchmark that choice against retrieval plus bounded editing rather
than assuming generation is necessary.

## Stored result size

For a typical sentence with 15 to 25 Segments and 8 to 15 targets:

| Representation | Expected size per sentence |
| --- | ---: |
| Compact binary | 1 KB to 3 KB |
| Carefully shaped JSON | 5 KB to 15 KB |
| Live JavaScript object graph | 15 KB to 40 KB |

The compact shape stores targets once and maps Segment indices to target
indices. It does not duplicate a complete Attestation for every member click.
One million compact analyses should therefore occupy roughly 1 GB to 3 GB
before database and index overhead.

## Click-time behavior

Click handling performs no local model inference. It reads the target index for
the clicked Segment and then reads the target. The remaining latency is normal
application and persistence latency plus any Reading or Knowledge LLM call the
workflow chooses to make.

## Retraining expectations

A new label that does not change membership or segmentation adds negligible
runtime weight. On a hidden size of 384, one additional categorical value adds
roughly one row to a prediction head.

| Change | Expected adaptation effort on one L4 or 4090-class GPU |
| --- | ---: |
| Add a feature value within an existing route | 10 to 60 minutes |
| Add a similar route | 30 minutes to 3 hours |
| Change target membership policy | 2 to 12 hours |
| Change Source Segmentation policy | 6 to 30 GPU-hours plus corpus relabelling |

These estimates assume fine-tuning from the previous release with all new
cases, difficult neighbors, and a representative replay sample. Training a
language model from scratch is outside the plan.

The cost that matters after a policy change is corpus review and cached-result
invalidation. Re-exporting and serving the model should be routine.
