---
status: accepted
source: "texteater#202"
---

# Freeze public lightweight parser interfaces across dum packages

Every public lightweight parser is a synchronous named export from its package
root. It accepts the value to parse as its first `unknown` parameter, followed
only by coordinates that narrow the success type, and returns that exact
success type or the shared `common-utils` `ParsingError<Success>`. Package
roots re-export the same `ParsingError` constructor; they do not define
package-specific validation errors. No `/parser` or `/validation` subpath is
introduced, and explicit `/schema` entrypoints remain the separate Zod
composition surface.

The machine-readable names, parameters, and success types live in
`tooling/dum-parser-interface-contract.ts`. The rules below are part of the
same public interface.

## Dumling route parsers

Dumling owns four and only four new parser names:

```ts
parseAsLemma(input, language, family, kind)
parseAsSurface(input, language, surfaceKind, family, kind)
parseAsAttestation(input, language, surfaceKind, family, kind)
parseAsReading(input, language, family, kind)
```

Literal coordinates infer the corresponding `Lemma<L, F, K>`,
`Surface<L, SK, F, K>`, `Attestation<L, SK, F, K>`, or `Reading<L, F, K>`.
They are authoritative: the parsed value must contain the same route, and a
mismatch is a `ParsingError` at the mismatching field. The parser never infers
a route merely from an `unknown` input and never promises a broad union when
the caller supplied exact coordinates.

`Lemma` remains the grammatical entity. There is no `Unit` alias, `UnitFor`
type, `parseAsUnit`, or other route-specific Unit promise. The canonical term
`Unit Shadow` in Dumrel is unaffected.

The existing `dumling.<language>.parse` and `getLanguageApi(language).parse`
facades remain compatibility adapters with their existing `ApiResult` shape.
They delegate to the lightweight parsers and do not retain Zod reachability.
New callers use the four top-level functions, including `parseAsReading`, for
the error-returning interface.

## Other package parsers

Dumrel exposes parsers for its composite public Knowledge, Unit Shadow,
structure, and relation DTOs. Dumdict exposes its language-scoped record,
change, plan, request, and result parsers; its language coordinate narrows every
language-owned value. Dumgen exposes parsers for the DTOs crossing its
segmentation, grammatical-resolution, and Knowledge-generation seams; language
coordinates narrow `SegmentedSentence`, grammatical, and Knowledge inputs or
results where their public types are generic.

Primitive helpers, vocabulary enums, and composition-only leaf schemas do not
receive public parser names. In particular, Dumrel does not duplicate
Dumling's Lemma or Reading parsers for its `LemmaReference` and
`ReadingReference` aliases. Callers that need standalone validation of those
values use Dumling. Variant-only Dumgen schemas are exercised through their
public union parser. These omissions keep each module's interface smaller
without weakening validation at a public DTO seam.

## Success, failure, and throwing

On success, a parser returns the complete canonical Zod output, including
normalization, unknown-key policy, transforms, readonly/frozen behavior, and
cross-field semantics. It does not return a `{ success, data }` wrapper.

Ordinary validation failure never throws. Wrong primitive types, missing or
unknown keys, invalid values, route-coordinate mismatches, failed refinements,
and malformed nested DTOs all return `ParsingError<Success>`. Its ordered
issues match the canonical schema under ADR 0013 and the contract resolved by
texteater issue 199. Callers may discriminate with the shared constructor; all
package-root re-exports refer to that same runtime value.

A parser may throw only for a broken implementation invariant that cannot be
caused by ordinary caller data, such as an unsupported generated-artifact
version, a missing generated reference, or a failed package-internal semantic
operation registration. Generation and package tests must make those states
unreachable in a correctly published package. Parsers perform no I/O, model
call, or asynchronous import.

## Compatibility and verification

The parser functions are the operational validation interface. Schema values
remain available only from the explicit schema-authoring entrypoints frozen by
the adjacent Zod-surface decision; a package root must not value-re-export a
Zod schema or load Zod to implement a compatibility facade.

Each migration must prove its published declarations against the type contract,
prove representative literal-route inference, and differentially compare
success output and `ParsingError.issues` with the canonical Zod schema. It must
also keep every root and operational subpath below the independent import-only
and import-plus-operation RSS budgets. Adding a parser, coordinate, wrapper, or
success widening changes this public interface and requires an explicit follow-
up decision rather than an incidental migration edit.

## Presented entity facade

Dumling additionally exposes two object-shaped package-root interfaces for
presentation seams:

```ts
toPresented.surface(surface)
toPresented.lemma(lemma)
toPresented.attestation(attestation)

parseAs.surface(input, language, surfaceKind, family, kind)
parseAs.lemma(input, language, family, kind)
parseAs.attestation(input, language, surfaceKind, family, kind)
```

`toPresented` projects a trusted canonical entity into its totalized
presentation DTO. Every presentation branch exists, every catalogued feature
leaf exists, and absent or inapplicable values are represented by `null`.
`parseAs` accepts either that totalized representation or the canonical one,
collapses only recognized null-valued presentation fields, and then delegates
to canonical route validation. A non-null inapplicable feature and an arbitrary
unknown field remain validation failures.

The four frozen named parsers above remain unchanged and continue to match the
canonical Zod schemas differentially. The object-shaped `parseAs` facade is an
additive adapter rather than a widening of those functions. The presentation
implementation remains synchronous and Zod-free at runtime; it does not load
schema trees or codec-builder machinery.
