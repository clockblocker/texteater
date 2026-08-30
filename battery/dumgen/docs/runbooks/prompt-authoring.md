# Author a Dumgen prompt

Use this runbook to change one Prompt Source or its Golden Corpus. The protected
[prompting philosophy](../reference/human-owned/prompting-philosophy.md) owns
human taste; the TypeScript interfaces under `src/promptsmith/assembly` own the
authoring contracts.

## Change the source

1. Locate the route-local `prompt-source.ts`, `schemas.ts`, and optional
   `golden-corpus/` directory. Keep the body and demonstration selection in that
   route; do not inherit them from another prompt.
2. Keep deterministic decisions in code. Give the model one small judgment and
   only the context it needs.
3. State the big picture in the body. Put boundary behavior in Golden Cases or
   Local Demonstrations.
4. Organize Golden Cases by semantic subject. Use stable registry keys as case
   IDs, pin demonstration and evaluation selections explicitly, and add a
   contamination key when distinct inputs exercise the same stimulus.
5. Add an explanation only when the edge cannot be understood from the input,
   output, and body. Make it caveman-short.

## Keep provider schemas simple

- Use `z.strictObject(...)` at the root and for nested objects.
- Put unions inside an object property; do not use a union as the root schema.
- Require every property. Represent absent values with `.nullable()`, not
  `.optional()`.
- Avoid open-ended dictionaries, tuples, transforms, and complex refinements in
  the generation schema. Apply business validation after parsing.
- Check the provider's current Structured Outputs documentation before relying
  on a schema feature.

## Verify the change

From `battery/dumgen`, run:

```sh
bun run generate:system-prompts
bun run check:system-prompts
bun run generate:runtime-prompts
bun run generate:runtime-prompts:check
bun run check
bun run test:internal
```

If the public examples changed, also run `bun run generate:readme`. If exported
types or package assets changed, run `bun run build` and `bun run validate`.

The change is ready when generated artifacts are current, the focused checks
pass, demonstration and evaluation selections remain uncontaminated, and the
diff contains no hand-edited generated prompt.

## Record unresolved policy questions

Routine prompt failures stay with the experiment run. Add a genuine unresolved
prompt-policy question to the [Dumgen questionable-case backlog](https://github.com/clockblocker/texteater/issues/339),
including the route, exact input, current output, expected alternatives, and the
decision a human needs to make.
