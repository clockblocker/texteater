# Code conventions

## Domain type imports

Outside the owning package, import Dumling and Dumrel types through their
package namespaces:

```ts
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
```

Qualify type references, such as `Dumling.Lemma` and `Dumling.Kind`, so their
owner stays visible where they are used. Inside each package, use direct type
imports for its own types. Keep runtime functions as named imports and retain
named type exports in the packages.

Apply this convention to new code and consumers being migrated or refactored.
Existing consumers can adopt it incrementally. This policy covers Dumling and
Dumrel only.
