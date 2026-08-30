# Textfresser batteries

This Bun monorepo contains the Textfresser applications and the reusable
linguistic packages behind them. Apps are user-facing products; batteries are
reusable modules.

The main workspaces are:

- `app/dumling-docs`: public Dumling documentation
- `app/laboratory`: prompt-pipeline laboratory
- `app/tf-demo`: end-to-end product probe
- `battery/dumling`: grammatical values and operations
- `battery/dumrel`: Knowledge and relation algebra
- `battery/dumdict`: dictionary workflows
- `battery/dumgen`: prompt construction and generation

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

Cross-workspace imports use package exports. Do not reach into a sibling with a
relative import or an undeclared package subpath.

## Local reference clones

When implementation work needs library source, clone it under the ignored
`repos-for-refrence/` directory. Treat those clones as read-only; application
code still imports normal package dependencies.
