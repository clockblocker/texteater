---
status: accepted
---

# Give each tier one role and one import direction

tf-demo's source is split into tiers, each with one role and a fixed set of
local code it may import:

| Tier | Role | May import (local code) |
| --- | --- | --- |
| `src/` | Browser UI | `shared/`, `convex/_generated/` (the `api` object and `Id`/`Doc` types); `tooling/`, `tests/` type-only |
| `convex/` | Convex adapter: schema, validators, function registrations, and `ctx` helpers (`convex/model/`, `convex/modules/`) | `server/`, `shared/` |
| `server/` | ctx-free domain logic: pure rules, projections, and Effect programs for `"use node"` actions | `shared/`; `convex/` type-only |
| `shared/` | The browser ↔ backend contract: pure types, constants and small pure functions that `src/` imports, alone or with the backend | `convex/_generated/` type-only |
| `tooling/`, `tests/` | Development and test only | anything |

At runtime, imports run one way: `src → shared`, and `convex → server →
shared`. `server/` may still name a stored shape with `import type` of a
validator's `Infer<>`, so each Convex validator stays the single definition of
its stored shape; the edge erases at build time. `shared/` may name `Id` the
same way. The UI never imports a Convex model or `server/` module: it takes a
backend type from the function it calls, through `api` and
`FunctionReturnType`, so the Convex API is its whole contract with the
backend. The UI may name a `tooling/` or `tests/` type, as the playground
does with `PlaygroundSnapshot`, but loads none of their code, so neither
reaches the browser bundle.

`shared/` exists for the UI. Pure code that only the backend uses lives in
`server/`, even when both `convex/` and `server/` need it, as
`server/germanEvidenceKinds.ts` does. A module stays in `shared/` once `src/`
imports it, as `shared/navigation.ts` does for `src/` and
`convex/modules/notes/sourceContext.ts`.

New ctx-free policy goes in `server/`. Existing ctx-free code in `convex/`
moves when it is next touched, not in a bulk move: most of `convex/` is
validators, registrations and `ctx` code, which belong there.

`tooling/lib/source-import-policy.ts` enforces the directions with the
`tf-demo-*` boundaries, and `bun run validate:imports` runs them.

## Considered Options

- Merging `server/` into `convex/model/` was rejected. It loses the ctx-free
  tier, where rules and projections are tested without a Convex context, and
  it loses the type-only rule that keeps Convex code out of the Effect
  programs that node actions run.
- Letting the UI import types from Convex model files was rejected. It ties
  the browser to backend module layout, and the Convex API already carries
  every type the UI reads.

## Consequences

- A `server/` module that isolate code imports stays Effect-free, because
  every Convex query and mutation pays for the modules it loads
  ([system ADR 0025](../../../../docs/adr/0025-publish-transaction-side-entry-points-for-dum-packages.md)).
  `tests/convex-module-weight.test.ts` fails when an isolate module reaches
  Effect or the generation runtime.
- Code that only the playground or tests need lives in `tooling/`, so
  `shared/` never imports `server/` to build fixtures.
