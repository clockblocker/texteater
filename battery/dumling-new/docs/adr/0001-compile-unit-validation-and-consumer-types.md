---
status: accepted
---

# Compile unit validation and consumer types

Dumling's rewrite authors its feature bags and complete Lemma, Surface,
Reading, and Attestation shapes in Zod. Generation compiles validation
artifacts and flat structural types from those schemas. Operational imports
and consumer declarations do not reach Zod or the schema-authoring graph.
Unsupported validation behavior or output-type effects fail generation.
Named pure functions are shared by schema refinements and runtime operations;
function-source inspection belongs only to the retained experiment.

The rewrite exposes one synchronous `parseUnit` accepting unknown input and
optional expected coordinates. Success contains a correlated `chain` with
Unit Kind, Language, Family, Kind, and the normalized value. Failure contains
the shared `ParsingError`. Units carry explicit `unitKind` tags; nested units
retain their own tags. Expected coordinates reject mismatches.

This replaces ADR 0014's parser inventory and ADR 0013's direct value-or-error
return convention for `battery/dumling-new` only. The existing Dum packages
keep their current interfaces until their migration. Zod remains the authoring
source and the compiled artifacts remain private, as required by ADR 0013.

Surface has no Citation/Inflection type branch. A route with Inflectional
Features exposes a nullable `inflectionalFeatures` field. Omitting the
`inflectional` bag from the route schema omits that Surface field entirely;
supplying it is rejected. Surface Kind is assessed separately: a marked feature
suggests Inflection, otherwise Citation. `assessSurfaceKind` accepts an explicit
override. The assessment is not a type parameter or a stored discriminator.
A route's feature schema determines which non-null bags are valid.

Compile-time cost is paid by the package. Consumers use generated declarations
rather than repeatedly evaluating Zod generic types. Differential tests compare
compiled acceptance and successful normalized output with the canonical
schemas; package tests enforce the runtime and declaration separation.
