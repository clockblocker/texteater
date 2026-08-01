# Promptsmith Authoring

Persistent decisions for authoring and generating Dumgen laboratory prompts.
All prompts in this document remain work in progress; this structure makes
them inspectable and executable without claiming production readiness.

## Initial scope

The first structured Prompt Sources are:

1. Intake
2. Segmentation<de>
3. Target Classification<de, HighLevelWholeUnit>
4. Grammatical Resolution<de, Lexeme, NOUN>
5. Reading Resolution<de, Lexeme, NOUN>

Other existing laboratory routes remain unmigrated work in progress.

Only `<de, Lexeme, NOUN>` is initially enabled through the complete
Grammatical and Reading Resolution chain. Target Classification may return a
different valid route; application orchestration then returns Resolution Route
Not Implemented and stops before another model call. The presence of another
WIP catalog prompt does not enable that route. After noun prompts are adjusted
and verified by hand, routes are added one part of speech at a time.

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
│   │   └── reading-resolution/de/lexeme/noun/
│   └── generated-system-prompt/
└── production/
```

Filesystem routes use lowercase kebab-case. The typed catalog preserves Dumling
discriminants and uses camelCase stage names:

```ts
laboratory.intake;
laboratory.segmentation.de;
laboratory.targetClassification.de.highLevelWholeUnit;
laboratory.grammaticalResolution.de.Lexeme.NOUN;
laboratory.readingResolution.de.Lexeme.NOUN;
```

## Prompt Source contract

One leaf directory is the complete human-authored Prompt Source for exactly one
catalog prompt. It contains five TypeScript modules:

```text
input-schema.ts
output-schema.ts
body.ts
examples-to-use.ts
examples-for-test.ts
```

Each module exports exactly one value satisfying a generic contract owned by
`promptsmith/assembly`. Example types derive from the leaf's input and output
schemas.

Prompt Sources are self-contained. Bodies and examples cannot be inherited
from another Prompt Source or a shared prompt-content directory. Schemas may
reuse code-level Dumling and Prompt Assembly helpers.

## Examples

Both example modules export ordered arrays of the same gold-example type:

```ts
type Example<Input, Output> = {
	readonly id: string;
	readonly input: Input;
	readonly idealOutput: Output;
};
```

IDs are stable and unique within one Prompt Source. An example can move between
the test and use sets without changing shape. There is no numeric split and no
second example registry.

Example inputs and ideal outputs match the minimal model-facing schemas. They
do not include public-domain fields that Dumgen restores outside Promptsmith.
An ideal output is a typed reference answer. Route-specific evaluators decide
correctness; exact equality is used only where the route makes it authoritative.

## Generated System Prompt

The prompt body contains instructions only. Prompt Assembly is the sole owner
of few-shot formatting. Codegen appends examples to use in authored order,
serializes inputs and ideal outputs as stable JSON, and omits example IDs.
Examples for test are never read during generation.

Codegen writes a disposable TypeScript module under
`laboratory/generated-system-prompt`, mirroring the source route. The module
supplies only the `systemPrompt` property of the corresponding
`PROMPT_CATALOG` entry. Authored input and output schemas remain direct catalog
inputs.

Generated modules are committed so exact model text is reviewable and a fresh
checkout can typecheck without first mutating the workspace. Generation is
deterministic, and CI fails when committed output is stale. Generated modules
are never edited manually.

## Runtime boundary

Promptsmith does not own public-domain projection, postconditions, model
selection, generation parameters, or Dumling entity construction.

Minimal model schemas omit route-owned fields such as `language`, `family`, and
`kind`. Dumgen restores and removes those fields with chained
`codecBuilder4.buildReshapeCodec` codecs. The codec direction starts at the
minimal model schema and decodes toward the public domain schema by adding
literal route fields. Encoding validates and removes those fields for the model
boundary.

Runtime mapping has separate codec and end-to-end tests. Prompt examples remain
focused on the model exchange.

## Intake language routing

Intake resolves language. `Accepted` carries the supported language used to
dispatch `Segmentation<Lang>`; `UnsupportedLanguage` retains the resolved but
unsupported language; `Unintelligible` has no language.

For now, Intake resolves exactly one primary language and dispatches exactly
one segmentation route. Non-primary-language spans become `OpaqueText`.
Multilingual and code-switched routing is deferred to
[texteater#19](https://github.com/clockblocker/texteater/issues/19).
