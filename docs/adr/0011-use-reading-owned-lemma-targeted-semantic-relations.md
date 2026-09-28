---
status: accepted
---

# Use Reading-owned, Lemma-targeted Semantic Relations

A Semantic Relation is a direct claim stored on one exact source Reading. This
keeps relation Knowledge Reading-owned. ADR 0012 owns storage orientation.

**Target modes.** One Reading Knowledge value targets either Lemmas or exact
Readings and never mixes them. Lemma Target Mode is the default, for open and
generated relations: generated Unit Shadows resolve to Lemmas or stay pending.
Reading Target Mode is explicit and reserved for reviewed closed inventories.
Projections and navigation keep the chosen endpoint kind, so an exact target
never expands by accident to every Reading of a Lemma.

**Projections close only over links that reach exactly one Reading**: an exact
Reading target, or a Lemma target whose Lemma has exactly one Reading. The
count covers every Reading of the Lemma, not only those one projection loads.
On a homonymous Lemma, a Lemma target stays a direct edge with no inverse,
synonym component or substitution, so `Burg` 🏰 synonym `Schloss` does not
give `Burg` the hypernym of `Schloss` 🔒. Resolving Lemma targets to Readings
(issue 176) will widen closure without a schema change. Until 2026-09-27
(#641), all Readings of a target Lemma took part in projections.

The target-mode rule was recorded apart as ADR 0016 and merged here on
2026-09-28.
