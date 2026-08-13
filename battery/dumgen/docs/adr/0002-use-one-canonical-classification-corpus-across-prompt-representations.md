---
status: accepted
---

# Use one Canonical Classification Corpus across prompt representations

German High-Level Target Classification must compare private membership DTOs
without allowing any candidate representation to define the oracle. Dumgen
therefore keeps one representation-neutral Canonical Classification Corpus with
its own semantic input/output schemas and ordered original-source membership.
Prompt Representation Adapters at the experimental seam materialize its cases
and canonicalize model outputs before the one pure evaluator scores them. Issue
#85 must supply a real Adapter for
each compared representation; the corpus is not attached to today's private
Prompt Source and does not create a parallel demonstration registry.

## Considered options

- Binding the corpus to today's Prompt Source schemas was rejected because it
  would select `additionalMemberSegmentIndices` before the experiment.
- Maintaining separate full-index, additional-index, and mask corpora was
  rejected because semantic cases, selections, and expected memberships would
  drift across representations.

## Consequences

Prompt Source-owned Golden Corpora remain model-facing. The Canonical
Classification Corpus is a distinct Laboratory concept and becomes prompt
material only through an Adapter; after #85 selects a representation, later
work may attach an execution-ready model-facing Golden Corpus without changing
the canonical oracle.

After the additional-indices representation was selected, the unchanged
Canonical Classification Corpus and selected Adapter were promoted together.
Production now materializes its Demonstration Selection through that Adapter;
evaluation and historical development selections remain views over the same
corpus rather than copied registries.
