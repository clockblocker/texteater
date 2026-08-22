---
status: accepted
source: "texteater#200"
---

# Compile Zod-authored schemas into package-owned lightweight validators

Zod schemas remain the canonical authoring representation for Dumling, Dumrel,
Dumdict, and the operational parts of Dumgen. Each package compiles its own
canonical schemas at build time into committed lightweight validation artifacts.
Operational entrypoints load those artifacts and `common-utils`; they never load
Zod, a canonical schema module, or another package's generated artifact.

The external seam is the package's typed parser interface. Callers see an exact
success type or `ParsingError`, independent of whether the package implements a
validator with compact constraint data, generated code, or both. The build-time
compiler and the generated representation are internal seams. They must not leak
through package roots or become a second schema-authoring interface.

The existing `codegen` package owns the shared build-time compiler and its
fail-closed Zod traversal. Dum packages own only their recipes, schema-specific
operation registrations, generated artifacts, and parser wrappers. This keeps
Zod compiler knowledge local instead of duplicating it across four packages.

## Representation

Compact, versioned constraint data interpreted by `common-utils` is the default
generated representation. It shares issue construction and ordinary structural
validation across packages and was demonstrated within the memory budget by the
prototype retained at commit `8707975`.

Generated direct functions are permitted only when measurement shows that they
are smaller or cheaper, or when an explicitly supported semantic operation
cannot be represented honestly as portable data. A package may therefore use a
measured mixture, including data for the structural tree and direct code for a
named normalization or cross-field check. Both forms implement the same parser
seam and return the same shared `ParsingError` contract. No caller branches on
the representation.

The exact constraint opcodes, table layout, code-emission strategy, and cutoff
between data and direct code remain implementation choices. The artifact format
must carry a version so an interpreter cannot silently consume a newer encoding.

## Ownership and dependency direction

Each package owns all four parts of its validation chain:

1. canonical Zod schemas in its schema-authoring tree;
2. a package-local build recipe that imports those schemas and the compiler;
3. committed generated artifacts inside that package;
4. operational parser wrappers that import only the generated artifacts,
   lightweight domain modules, and `common-utils`.

Generated artifacts are publication inputs, not public composition primitives.
They are reachable only through the owning package's operational parser
interfaces. A clean checkout must typecheck without first regenerating them,
and generation in check mode must fail if committed artifacts are stale.

The allowed dependency direction is:

```text
package-local generator -> canonical Zod schemas + codegen compiler
package operational parser -> package-owned generated artifact + common-utils
codegen compiler -> Zod, but no dum* package
common-utils -> no codegen, no dum* package, and no Zod runtime
```

The `codegen` compiler may depend on Zod because it runs only during generation
and verification. A package-local recipe may supply explicit adapters for named
semantics, but `codegen` cannot import them back from the package. `common-utils`
must not depend on the compiler. A generated artifact must not value-import its
generator, Zod, or any schema-authoring module. Type-only imports are allowed
when they disappear from emitted JavaScript and do not create a package cycle.

## Fail-closed compilation

The compiler must walk the Zod graph itself. `z.toJSONSchema` may be useful as
an input or cross-check, but is not sufficient as the compiler seam because it
can omit transforms, refinements, custom error behavior, and other semantics.

Every schema kind, check, transform, refinement, preprocessing step,
normalization, error customization, unknown-key policy, and future Zod
construct encountered during traversal has exactly one of these outcomes:

- it is compiled by an explicitly supported structural rule;
- it is mapped to an explicitly named and versioned lightweight semantic
  operation whose runtime behavior and issue behavior are differentially
  verified; or
- generation fails with the schema name, path, Zod construct, and reason.

There is no fallback that drops behavior, accepts a JSON Schema approximation,
or calls Zod lazily at operational runtime. Arbitrary JavaScript closures are
unsupported until an implementation agent gives that behavior an explicit
lightweight representation. A registered operation is intentionally narrow;
registering a generic `custom` or `refine` escape hatch would defeat the
fail-closed rule.

The compiler also rejects non-deterministic or non-serializable output and
unknown artifact versions. Upgrading Zod requires regeneration and the full
differential suite before generated changes are accepted.

## Type connection

Runtime constraint data cannot carry TypeScript inference by itself. Every
package therefore keeps the connection in build-time type proofs:

- the canonical schema's `z.input` and `z.output` types are compared with the
  input and success types promised by the public parser;
- the generated validator is bound to that success type without `any` or an
  unchecked widening cast; and
- route-indexed parsers prove representative exact route inference, not merely
  a broad union.

These proofs live beside the owning package's generator or type tests and may
import Zod type-only. Published operational declarations expose domain types
and `ParsingError`, not Zod types. Changing either a schema or parser type must
therefore break generation or typechecking until both sides agree.

## Differential verification

Generation is complete only when the owning package runs the same values
through the canonical Zod schema and the generated validator. Verification
must cover representative fixtures and property-generated values, including
valid values, invalid primitive types, missing and unknown keys, each supported
check, unions, nested paths, normalization, and every registered semantic
operation.

For success, the accepted/rejected decision and the complete normalized output
must match. For failure, issue order and the agreed `ParsingError` projection
must match Zod: issue codes, paths, messages, and code-specific fields. The
comparison excludes Zod runtime identity and other behavior deliberately
omitted by the `ParsingError` contract. A mismatch fails the build; it is not
recorded as an expected generated divergence.

The permanent cross-package property suite and RSS enforcement belong to the
integration verification work. Package migrations still add focused
differential tests for every schema and named semantic operation they compile.

## Deliberately open implementation choices

Implementation agents may settle the following through measurement without a
new architectural decision:

- the compact data encoding and its internal TypeScript types;
- interpreter specialization, table deduplication, and code generation details;
- whether a particular supported node is smaller as data or direct code;
- the property-testing library, generators, sample counts, and fixture layout;
- generated directory names and file partitioning inside the owning package;
- convenience helpers that do not enlarge the public parser interface or
  weaken fail-closed generation.

They may not replace Zod as the authoring source of truth, publish generated
artifacts as a competing schema interface, add runtime Zod fallback, silently
discard behavior, or introduce cross-package generated-artifact ownership.
