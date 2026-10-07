# common-utils

`common-utils` holds the small TypeScript helpers several workspaces share:
compile-time assertions for type tests, type-display helpers, `required`,
`isRecord`, `messageOf` and `canonicalJson`. Two subpaths hold the
compiled-validation machinery the Dum packages share.

```ts
import { canonicalJson, type Equal, type Expect, required } from "common-utils";

type _SameShape = Expect<Equal<{ value: 1 }, { value: 1 }>>;

const first = required(["a"].at(0), "Expected a first item");

canonicalJson({ b: 1, a: undefined, C: [2] }); // '{"C":[2],"b":1}'
```

- `Equal`, `Expect` and `Assert` state compile-time facts in type tests and
  schema files.
- `Prettify` and `PrettifyDeep` flatten intersections, so hovers and emitted
  declarations show one object type.
- `required` returns a present value or throws with the caller's invariant
  message.
- `isRecord` narrows an unknown value to an object whose keys can be read: any
  non-null object except an array.
- `messageOf` reads a caught value's message: an `Error`'s own message, or
  anything else as a string.
- `canonicalJson` writes one JSON text per value, for hashes, cache keys,
  fingerprints and equality. Object keys sort by UTF-16 code unit, as RFC 8785
  sorts them, so the text is the same in every runtime; members holding
  `undefined` are left out, as `JSON.stringify` leaves them out. Anything else
  JSON can't hold throws: `undefined` elsewhere, `NaN`, the infinities,
  bigints, functions, symbols, cycles, and objects other than arrays and plain
  objects. Every workspace that keys or hashes JSON uses it instead of its own
  sorted stringify.

## Validation

Zod schemas are the authoring source for Dumling, Dumrel and Dumdict, and each
package compiles them into committed validation rules
([ADR 0013](../../docs/adr/0013-compile-zod-authored-schemas-into-package-owned-lightweight-validators.md)).
Domain schemas and their generated rules belong to those packages.

- `common-utils/validation` is the runtime: it interprets the rules, owns
  `ParsingError`, and binds generated providers by exact compatibility
  fingerprint. It loads neither Zod nor compiler code, so a short-lived isolate
  can import it (system ADR 0025).
- `common-utils/validation-compiler` runs at generation time. It compiles Zod
  schemas, emits structural output types and links identical rule definitions
  across package dependencies. It reads Zod's internals, so the repository
  pins Zod to one exact version.

A provider change requires regenerating and rebuilding its consumers.

The runtime accepts and rejects exactly what Zod does, and reports the same
issues with one known exception. When a node's children fail only continuable
checks (a field's `min`, not a type error), Zod still runs the node's own
checks, such as a `refine`, on the partial value. The runtime does that only
when the pipe's base is a string, number or array. A pipe over a reference
(`z.lazy(...)`), object, record or union stops at the base's issues, so a
schema like `z.object({ name: z.string().min(3) }).refine(...)` reports the
`too_small` without the refinement's issue. This stays because the runtime
can't tell such a pipe from a transform or readonly stage, which Zod skips
after any base issue, and it has no partial value for these bases.
`tests/validation/check-continuation-differential.test.ts` pins the shorter
issue lists.
