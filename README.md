# Textfresser batteries

This Bun monorepo contains the Textfresser applications and the reusable
linguistic packages behind them. Apps are user-facing products; batteries are
reusable modules.

The workspaces are:

- `app/dumling-docs`: public Dumling documentation
- `app/spec-review`: maintainer review of German Spec Records' Segmentation
- `app/tf-demo`: end-to-end product probe
- `battery/codegen`: deterministic, filesystem-safe code generation recipes
- `battery/common-utils`: shared TypeScript type helpers, `required()`,
  `canonicalJson()`, and the compiled-validation runtime and its Zod compiler
- `battery/compass`: the workspace's pure Pane model and its resizable layout
  components
- `battery/dumcorpus`: Spec Records, classification Rules and authored inventories
- `battery/dumdict`: dictionary workflows
- `battery/dumgen`: German `segment.inUnits`, rebuilt from scratch (#701)
- `battery/dumling`: grammatical values and operations
- `battery/dumrel`: Knowledge and relation algebra
- `battery/lego`: shared Tailwind design tokens, theme and React atoms and molecules
- `battery/promptsmith`: schema-bound prompt authoring and reproducible evaluation

## Install

Use the Bun version in `packageManager` and the Node version in `.nvmrc`:

```sh
bun install
```

## Work in one package

Each directory directly below `app/` or `battery/` owns its build, tests, and
configuration. From that directory, run:

```sh
bun validate
bun test
bun run build
```

`bun validate` checks formatting, imports, lint, types, tests, dependencies,
and package boundaries. It does not change files. Use `bun fix` for automatic
formatting and safe fixes.

## Check the repository

From the repository root, run:

```sh
bun validate
bun test
bun run build
bun run check:docs
```

GitHub Actions runs the CI gates on every push to `main`; `bun run ci`
runs the same gates locally.

Cross-workspace imports use package exports. Do not reach into a sibling with a
relative import or an undeclared package subpath.

Each export names its source under the `bun` and `convex` conditions, and
type-checks set `customConditions: ["convex"]`, so Bun, Convex and `tsc` read
sibling packages from source and nothing waits on a build. The built `dist` is
for Node, Vite, published consumers and the tests that measure the build.

## Local reference clones

When implementation work needs library source, clone it under the ignored
`repos-for-refrence/` directory. Treat those clones as read-only; application
code still imports normal package dependencies.
