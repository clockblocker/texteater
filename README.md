# Textfresser batteries

The build-your-own-dictionary product is a Bun monorepo split by
responsibility:

- `app/dumling-docs`: user-facing documentation for `dumling`
- `battery/codec-builder`: composable Zod 3 and Zod 4 codec builders
- `battery/codegen`: deterministic, filesystem-safe code generation
- `battery/dumling`: linguistic schemas, DTOs, operations, and stable IDs
- `battery/dumrel`: lexical and morphological relation types, schemas, and rules
- `battery/dumgen`: deterministic prompt construction and evaluation
- `battery/dumtrain`: sentence-analysis corpus, training, evaluation, and local model release planning
- `battery/dumdict`: dictionary workflows and storage boundaries

An app is a self-contained, user-facing business unit. A battery is a generic,
reusable module. Each workspace owns its manifest, runtime dependencies,
build, tests, and package-specific configuration.

## Install

The repository is pinned to the Bun version in the root `packageManager`
field and to the Node.js version in `.nvmrc`. Install from the repository
root:

```sh
bun install
```

Turborepo and Prettier are intentionally not part of the toolchain. Bun runs
the workspace commands, TypeScript 7 provides compilation and type checking,
and Biome 2 provides formatting and linting.

## Reference repositories

Clone library source alongside the monorepo packages so coding agents can
inspect idiomatic implementations and usage patterns locally:

```sh
git clone https://github.com/Effect-TS/effect.git repos-for-refrence/effect
git clone https://github.com/colinhacks/zod.git repos-for-refrence/zod4
git clone https://github.com/TanStack/query.git repos-for-refrence/tanstack-query
```

`repos-for-refrence/` is ignored by Git. Treat its contents as read-only
reference material; application code must continue importing these libraries
from the normal package dependencies.

## Package autonomy

Every directory immediately below `app/` or `battery/` supports the same
local contract:

```sh
cd battery/dumdict
bun validate
bun test
bun run build
```

`bun validate` uses the current directory as its complete scope. It checks
that package's manifest, formatting, import organization, lint, types, tests,
unused or missing dependencies, and internal dependency architecture. It does
not validate unrelated siblings. Validation is read-only; use `bun fix` to
apply Biome formatting, safe fixes, and import organization. Local `build`
(and `run`, when a package defines it) gates only on package-mode manifest
policy.

The shared runner provides defaults for each validation stage. A package can
replace one stage by defining its conventional override script:

- `validate:format`
- `validate:lint`
- `validate:types`
- `validate:test`
- `validate:dependencies`
- `validate:architecture`

An override must run the stage itself and must not invoke `bun validate`.

Package TypeScript and Biome files are deliberately small. They extend the
layered defaults in `tooling/typescript/` and `tooling/biome/`, then retain
only package-specific paths, inputs, and exclusions. Build implementation
remains package-owned; TypeScript packages emit ordinary JavaScript and
declaration graphs from their package-local build configurations.

## Repository commands

From the root:

```sh
bun validate
bun test
bun run build
```

Root `bun validate` checks repository manifest policy, cross-workspace
dependency architecture, the tooling module, and then every discovered
`app/*` and `battery/*` workspace. All workspaces are attempted and failures
are summarized at the end. Root `build` first applies repository-mode
manifest policy, then dynamically dispatches to every workspace. Adding a
workspace does not require editing a root package list.

Manifest policy is explicit in `tooling/lib/manifest-policy.ts`. Dependency
versions remain declared by the packages that use them, while governed
versions are synchronized repository-wide. Cross-workspace imports use
package specifiers and declared exports:

```ts
import { dumling } from "dumling";
import { schemasFor } from "dumling/schema";
```

Relative imports into sibling workspaces and package-internal subpaths that
are absent from the target's `exports` are rejected.
