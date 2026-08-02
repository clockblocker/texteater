# Promptsmith Authoring

Rules for authoring and generating Dumgen laboratory prompts. All remain work
in progress.

## Stage-first routes

Prompt Sources use a stage-first filesystem hierarchy:

```text
src/promptsmith/
├── assembly/
├── laboratory/
│   ├── prompt-part/
│   │   ├── intake/
│   │   ├── segmentation/de/
│   │   ├── target-classification/de/high-level-whole-unit/
│   │   ├── grammatical-resolution/de/lexeme/noun/
│   │   └── reading-resolution/de/
│   └── generated-system-prompt/
└── production/
```

These are the migrated Prompt Sources. Other catalog routes remain unmigrated
work in progress.

Filesystem routes use lowercase kebab-case. The typed catalog preserves Dumling
discriminants and uses camelCase stage names:

```ts
laboratory.intake;
laboratory.segmentation.de;
laboratory.targetClassification.de.highLevelWholeUnit;
laboratory.grammaticalResolution.de.Lexeme.NOUN;
laboratory.readingResolution.de;
```

## Prompt Source contract

Each leaf directory is the complete human-authored source for one catalog
prompt. It contains five modules:

```text
input-schema.ts
output-schema.ts
body.ts
examples-to-use.ts
examples-for-test.ts
```

Each module exports exactly one value satisfying a generic contract from
`promptsmith/assembly`. Example types derive from the leaf schemas.

Sources are self-contained: bodies and examples are never inherited or shared.
Schemas may reuse Dumling and Prompt Assembly helpers.

## Examples

Both example modules export ordered arrays of the same gold-example type:

```ts
type Example<Input, Output> = {
	readonly id: string;
	readonly input: Input;
	readonly idealOutput: Output;
	readonly explanation?: string;
};
```

IDs are stable and unique within a source. An example can move between sets
without changing shape. There is no numeric split or second registry.

Examples match the minimal model schemas and omit fields restored outside
Promptsmith. An ideal output is a typed reference answer. Route-specific
evaluators decide correctness; exact equality applies only to authoritative
values. An optional explanation gives a concise, decision-relevant reason that
the ideal output follows from the input and prompt instructions. It should
highlight observable evidence or a rule that transfers to new inputs, rather
than restate the output or add fields absent from the output schema. Empty
explanations are invalid.

## Generated System Prompt

The body contains instructions only. Prompt Assembly owns few-shot formatting.
Codegen appends use examples in authored order, writes inputs and ideal outputs
as stable JSON, and omits IDs. When an explanation is present, Codegen places
it after the ideal output under an explicit guidance-only label so the model
does not treat it as part of the required output. It never reads test examples.

Codegen writes a TypeScript module under
`laboratory/generated-system-prompt`, mirroring the source route. The module
supplies only the matching `PROMPT_CATALOG` entry's `systemPrompt`. Authored
schemas remain direct catalog inputs.

Generated modules are committed, deterministic, and never edited by hand. This
keeps model text reviewable and lets fresh checkouts typecheck. Run
`bun run check:system-prompts` to detect stale output.

## Runtime boundary

For migrated Prompt Sources, Promptsmith owns prompt bodies, model schemas, and
examples. It does not own public projection, postconditions, model selection,
generation parameters, or Dumling entity construction.

Settled Dumling-backed model schemas omit route-owned fields such as `language`,
`family`, and `kind`. Dumgen's `codecBuilder4.buildFixedFieldsCodec` restores
them on decode and validates and removes them on encode.

Runtime definitions and catalog assembly live under `src/catalog`; shared
Dumling-backed schemas and codecs live under `src/schema`. Runtime mapping has
separate codec and end-to-end tests. Prompt examples cover only the model
exchange.
