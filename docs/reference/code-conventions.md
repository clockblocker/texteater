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

## Repository scripts

Every repository command is a `bun run <name>` script, and a script keeps its
name at every level. Run at the repository root, it covers the whole
repository; run inside a workspace, it covers only that workspace. Bun runs a
package script in its package's directory, so a script reads its scope from
`process.cwd()`, as `tooling/knip.ts` does behind `bun run knip`. Scripts that
delegate to `turbo run` get the same scoping from Turbo.
