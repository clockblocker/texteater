---
status: accepted
---

# Use Reading-owned, Lemma-targeted Semantic Relations

The default Semantic Relation mode stores a direct claim on one exact source
Reading and targets one exact Lemma. Generated Unit Shadows resolve to Lemmas
or remain pending. This keeps relation Knowledge Reading-owned. Deterministic projections close
only over links that reach exactly one Reading: an exact Reading target, or a
Lemma target whose Lemma has exactly one Reading. ADR-0012 owns storage
orientation and ADR-0016 adds exact-Reading target mode.

Amended on 2026-09-27 (#641): all Readings of a target Lemma no longer take
part in projections. On a homonymous Lemma, a Lemma target stays a direct edge
with no inverse, synonym component or substitution, so `Burg` 🏰 synonym
`Schloss` does not give `Burg` the hypernym of `Schloss` 🔒. The count covers
every Reading of the Lemma, not only those one projection loads. Resolving
Lemma targets to Readings (issue 176) will widen closure without a schema
change.
