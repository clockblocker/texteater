# common-utils

`common-utils` holds the small TypeScript helpers several workspaces share:
compile-time assertions for type tests, type-display helpers and `required`.

```ts
import { type Equal, type Expect, required } from "common-utils";

type _SameShape = Expect<Equal<{ value: 1 }, { value: 1 }>>;

const first = required(["a"].at(0), "Expected a first item");
```

- `Equal`, `Expect` and `Assert` state compile-time facts in type tests and
  schema files.
- `Prettify` and `PrettifyDeep` flatten intersections, so hovers and emitted
  declarations show one object type.
- `required` returns a present value or throws with the caller's invariant
  message.

`ParsingError` and the validation runtime live in `dumval/runtime`.
