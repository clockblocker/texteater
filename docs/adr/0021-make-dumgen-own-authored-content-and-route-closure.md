---
status: accepted
---

# Make Dumgen own authored content and Route Closure

Dumgen owns authored Lemmas, Readings, Reading Knowledge, and semantic relation claims, together with Fixed Catalogs, Fixed Populations, and
Route Closure. Closing a route is a production decision based on reviewed
content and available resolution behavior; it does not change the validity or
identity of a linguistic value.

Dumling owns linguistic values and their validation. Dumrel owns Knowledge
types, validation, and relation algebra. Concrete authored content uses those
contracts but lives together in Dumgen, where lookup and generation produce
values for callers. This replaces the split ownership of inventories in
Dumling and their authored Knowledge and relation claims in Dumrel. It keeps
content changes local without making either foundational package depend on
Dumgen.

Dumdict applies dictionary changes and enforces dictionary invariants;
catalog-specific approval belongs to Dumgen. Applications start blank and request Units and Knowledge for encounters.
Dumgen consults authored content internally; callers neither preload an
inventory nor select a catalog.

The Closed Route and Catalog Miss behavior in ADR 0015 and the Fixed Population
behavior in ADR 0017 remain in force.

Every authored member of a Fixed Catalog or Fixed Population must store all
Knowledge required or advertised for its exact Reading. Completeness follows
the applicable Knowledge policy with every supported aspect and translation
language enabled, independent of a Visitor's settings. Semantic relation
coverage stores reviewed claims or an explicit ReviewedEmpty decision for each
applicable relation.

The catalog build rejects incomplete members and coverage claims that disagree
with their content. Adding an advertised aspect or translation language requires
completing affected members before release. Resolving an exact authored Reading
publishes its stored Knowledge without model generation. Missing content is a
Catalog Miss, including for a Fixed Population inside an Open Route; unlisted
members of that Open Route still follow normal production. This trades catalog
maintenance for deterministic content and removes encounter-time generation as
a way to conceal an incomplete authored member.
