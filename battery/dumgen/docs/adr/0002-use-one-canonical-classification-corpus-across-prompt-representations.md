---
status: superseded by system ADR-0037
---

# Use one Canonical Classification Corpus across prompt representations

German High-Level Target Classification uses one representation-neutral
Canonical Classification Corpus as its semantic oracle. Prompt Representation
Adapters materialize private exchanges and canonicalize their outputs, which
prevents separate representation-specific corpora from drifting.

Superseded on 2026-09-25 by [system ADR 0037](../../../../docs/adr/0037-make-the-dumling-spec-own-the-golden-corpus-and-classification-rules.md):
the canonical corpus moves to `dumspec` as Spec Records, and Dumgen projects
its stage cases from them. Private prompt representations remain Dumgen's.
