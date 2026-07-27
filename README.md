# Textfresser batteries

The independently publishable packages behind the build-your-own-dictionary
product live in one Bun workspace:

- `packages/dumling`: linguistic schemas, DTOs, operations, and stable IDs
- `packages/dumgen`: deterministic prompt construction and evaluation
- `packages/dumdict`: dictionary relations, workflows, and storage boundaries

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

Each package retains its own `package.json` and can be versioned and published
independently.
