---
status: accepted
---

# Use batch-only Intake and deterministic local Source Segmentation

Dumgen exposes one Section 1 batch operation. It performs exactly one
`gpt-5.6-luna` Intake call for a bounded ordered list of caller-delimited Source
Sentences, then dispatches every accepted item to a deterministic, zero-package
German or Hebrew Source Segmentation module. Intake is not exposed in both
single and batch forms, and Source Segmentation is not an LLM prompt.

The production guardrails are the floors exercised by the live Intake
prototype: at most 9 sentences per batch, 205 Unicode code points per sentence,
and 34 whitespace-delimited words per sentence. Invalid batches are rejected
before a provider call. Model output must preserve item cardinality, order,
boundaries, stable IDs, and every non-whitespace code point; failures return a
typed Section 1 error. The public result is immutable and preserves one decision
per input position.

German optimistically marks Latin word-like spans as `ResolvableText`, including
slang and local code-switching; failed lexical resolution is deferred to the
Click Resolution Chain. Hebrew introduces word-internal boundaries only from a
pinned, independently reviewed source-evident inventory. Unpointed or
context-dependent Hebrew morphology remains a whole `ResolvableText` Segment
and is likewise deferred. Analyzer-backed Hebrew segmentation was rejected for
this path because its footprint and server-only deployment would violate the
lightweight local constraint.

The laboratory uses the public operation and captures its Intake exchange and
deterministic rule trace. It has no parallel segmentation implementation or
second segmentation model call. Production corpus ownership stays with Dumgen;
every accepted German and Hebrew case must match exactly and satisfy
losslessness, non-empty segments, grapheme safety, determinism, and trace
alignment.
