# Textfresser batteries

The build-your-own-dictionary product lives in one Bun workspace, split by
responsibility:

- `app/dumling-docs`: user-facing documentation for `dumling`
- `battery/dumling`: linguistic schemas, DTOs, operations, and stable IDs
- `battery/dumgen`: deterministic prompt construction and evaluation
- `battery/dumdict`: dictionary relations, workflows, and storage boundaries

Install dependencies once from the repository root:

```sh
bun install
```

Run the package checks from the root:

```sh
bun run check
bun test
bun run build
```

An app is a self-contained, user-facing business unit. A battery is a generic,
reusable module. Each workspace retains its own `package.json`.
