---
status: accepted
---

# Make Dumgen own authored content and Route Closure

Dumgen owns authored Lemmas, Readings, Reading Knowledge, and grammatical and
semantic relation claims, together with Fixed Catalogs, Fixed Populations, and
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
catalog-specific approval belongs to Dumgen. Application inventory
initialization obtains authored content through Dumgen. Their interfaces are
separate migration decisions.

The Closed Route and Catalog Miss behavior in ADR 0015 and the Fixed Population
behavior in ADR 0017 remain in force.
