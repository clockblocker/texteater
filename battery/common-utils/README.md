# common-utils

`common-utils` holds the small TypeScript helpers several workspaces share:
compile-time assertions for type tests, type-display helpers, `required` and
`canonicalJson`.

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
- `canonicalJson` writes one JSON text per value, for hashes, cache keys,
  fingerprints and equality. Object keys sort by UTF-16 code unit, as RFC 8785
  sorts them, so the text is the same in every runtime; members holding
  `undefined` are left out, as `JSON.stringify` leaves them out. Anything else
  JSON can't hold throws: `undefined` elsewhere, `NaN`, the infinities,
  bigints, functions, symbols, cycles, and objects other than arrays and plain
  objects. Every workspace that keys or hashes JSON uses it instead of its own
  sorted stringify.

`ParsingError` and the validation runtime live in `dumval/runtime`.
