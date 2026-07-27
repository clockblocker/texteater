# Prompt Infra V0

## Goal

`dumgen` will eventually expose:

- a public `buildDumgen()` entrypoint
- an internal prompt-authoring, prompt-generation, and prompt-evaluation module

This document specifies **part 2 only**.

V0 focuses on:

- one language: `de`
- one task: `classify`
- prompt source authoring
- system prompt generation
- prompt evaluation

V0 does **not** specify the public runtime API in detail beyond leaving room for a later `buildDumgen()` scaffold.

## Scope

This module is internal.

Its job is to support:

- authoring prompt parts
- generating a system prompt from those parts
- evaluating the generated prompt against ordered gold examples

Its job is not to:

- define end-user API behavior
- define dumdict storage mutations
- define lemma/sense/domain workflows outside the prompt authoring pipeline

## Core Model

The canonical model is split into three layers:

1. `PromptSource`
2. `PromptBuild`
3. `EvaluationRun`

This split is intentional:

- `PromptSource` is authored by humans
- `PromptBuild` is derived deterministically from source
- `EvaluationRun` is produced by executing a built prompt against a model

## PromptSource

`PromptSource` is the authoring-time source of truth for one `language + task` pair.

### Required fields

- `taskDescription: string`
- `examples: PromptExample[]`
- `numOfFirstExamplesToUse: number`

### Optional fields

- `agentRole: string`
- `inputSchema`
- `outputSchema`

### Notes

- `taskDescription` is the only required prompt part.
- `agentRole` is optional. If absent, no agent-role section is generated.
- `inputSchema` is supported but not necessary in v0.
- `outputSchema` is supported and has runtime and evaluation consequences.

## PromptExample

Each example has one shared shape:

```ts
type PromptExample = {
	id: string;
	input: unknown;
	idealOutput: unknown;
};
```

### Rules

- `id` must be stable and unique within a `PromptSource`.
- `examples` are ordered.
- Example order is semantic, not cosmetic.
- Reordering examples is a behavior change.
- Every example must have both `input` and `idealOutput`.

## Example Split

V0 does not use separate `toUse` / `toTest` collections.

Instead:

- `examples` is one ordered gold corpus
- the first `numOfFirstExamplesToUse` examples are injected into the generated prompt
- all later examples are evaluation-only

### Rules

- the split is positional
- the split is deterministic
- changing `numOfFirstExamplesToUse` is a behavior change
- injected examples are excluded from evaluation
- eval history must be comparable by stable `example.id`, not only by array index

V0 keeps the positional split, but the build artifact must record the exact example ids used for prompt injection and evaluation.

## PromptBuild

`PromptBuild` is the deterministic result of building a `PromptSource`.

### Required fields

- `systemPrompt: string`
- `sourceVersion: string`
- `buildVersion: string`
- `numOfExamplesUsed: number`
- `usedExampleIds: string[]`
- `evalExampleIds: string[]`
- `rendererVersion: string`

### Determinism rules

- `sourceVersion` must be a hash of a canonical serialization of the full `PromptSource`
- canonical serialization must preserve example order
- canonical serialization must preserve object key ordering by an explicit stable rule
- `buildVersion` must be a hash of:
  - `sourceVersion`
  - `rendererVersion`
  - the exact schema-format rendering mode
- `numOfExamplesUsed` must equal `numOfFirstExamplesToUse` after validation and normalization
- `usedExampleIds` must match the first `numOfFirstExamplesToUse` examples in order
- `evalExampleIds` must match the remaining examples in order
- `PromptBuild` must not contain model-run evaluation results

### Notes

- two implementations that use the same canonical serialization, renderer version, and schema-format rendering mode must produce the same `buildVersion`
- V0 does not allow renderer-specific “equivalent” builds; the byte output of `systemPrompt` is the source of truth

## EvaluationRun

`EvaluationRun` is a run artifact produced by executing a `PromptBuild` against a model.

### Required fields

- `sourceVersion: string`
- `buildVersion: string`
- `provider: string`
- `modelId: string`
- `temperature: number`
- `topP?: number`
- `seed?: number`
- `maxOutputTokens?: number`
- `structuredOutputMode: string`
- `retryPolicy: {
	maxAttempts: number;
	backoffMs: number;
	jitter: boolean;
}`
- `executedAt: string`
- `results: EvaluationResult[]`

### Notes

- `EvaluationRun` is separate from `PromptBuild`
- multiple evaluation runs may exist for the same build
- evaluation is model-dependent and time-dependent
- `EvaluationRun` must capture enough execution config to explain run-to-run variance

## EvaluationResult

Each eval-only example produces one `EvaluationResult`.

### Required fields

- `exampleId: string`
- `exampleIndex: number`
- `contentMatched: boolean`
- `rawAgentResponse: string`

### Conditional fields

- `shapeMatched: boolean` only when `outputSchema` exists
- `parsedAgentResponse: unknown` only when parsing succeeds
- `parseError: string` only when parsing fails
- `comparisonError: string` only when content comparison fails unexpectedly

### Rules

- `exampleId` is the stable id of the example in the original `examples` array
- `exampleIndex` is the index in the original ordered `examples` array
- `rawAgentResponse` stores the raw response captured for that example
- if `outputSchema` is absent, `shapeMatched` is omitted
- if `outputSchema` exists, `shapeMatched` means schema parse/validation success
- if parsing succeeds, `parsedAgentResponse` should be stored
- if parsing fails, `parseError` should be stored

## Evaluation Semantics

V0 evaluation is per-example, not a single scalar score.

The primary artifact is the `results` array.

Any aggregate summary is derived from that array and is secondary.

### Shape match

- only relevant when `outputSchema` exists
- implemented as a normal zod parse/validation call
- `true` means the agent response matched the schema shape
- `false` means it did not

### Content match

`contentMatched` compares the agent response against the example's `idealOutput`.

V0 does not allow prompt-family-specific comparator rules.

Comparator behavior is fixed:

- with `outputSchema`: parse first, then compare parsed output to `idealOutput` by exact deep equality
- without `outputSchema`: compare raw response to `idealOutput` by strict equality
- no normalization pass is applied in v0
- no fuzzy comparison is applied in v0

When `outputSchema` exists:

- parse response using `outputSchema`
- if parse succeeds:
  - set `shapeMatched = true`
  - store `parsedAgentResponse`
  - compare parsed value against `idealOutput` by exact deep equality
- if parse fails:
  - set `shapeMatched = false`
  - set `contentMatched = false`
  - store `parseError`
  - do not run content comparison

When `outputSchema` does not exist:

- compare raw response against `idealOutput`

For exact deep equality, implementations must compare the fully parsed value structure, not a re-serialized string form.

## Prompt Generation

`systemPrompt` is generated from:

- optional `agentRole`
- required `taskDescription`
- the first `numOfFirstExamplesToUse` examples
- fixed format reminder / format contract instructions

### Generation rules

- if `agentRole` is absent, omit that section entirely
- example rendering must preserve example order
- evaluation metadata must not affect prompt generation
- `inputSchema` does not affect prompt generation in v0
- schema-derived format rendering must be deterministic for a given `rendererVersion`

### Output schema behavior

If `outputSchema` exists:

- it is used for runtime structured parsing
- it contributes a generated response-format contract section to the prompt
- raw schema source text is not embedded verbatim in v0

If `outputSchema` does not exist:

- prompt generation proceeds without schema-derived format instructions

## Validation Rules

At minimum, the internal module should validate:

- `taskDescription` is present and non-empty after trimming
- `examples` is a non-empty array
- `examples.length > numOfFirstExamplesToUse`
- `numOfFirstExamplesToUse >= 0`
- each example has a non-empty string `id`
- example ids are unique within a `PromptSource`
- each example explicitly contains an `input` field
- each example explicitly contains an `idealOutput` field
- at least one eval-only example exists

If `inputSchema` exists:

- it may validate `examples[].input`

If `outputSchema` exists:

- it may validate `examples[].idealOutput`
- it must be used for evaluation shape checking

## V0 File/Module Direction

The repo should grow toward two areas:

### Public scaffold

Leave a minimal scaffold for:

```ts
const dumgen = buildDumgen(llmCaller);
dumgen.de.classify(sentence, selection);
```

This is not the focus of the current v0 work.

### Internal prompt module

The main v0 work should live around:

- prompt source DTOs
- prompt builder
- evaluation runner
- prompt fixtures/examples for `de/classify`

## Non-Goals

V0 does not settle:

- the final public `buildDumgen()` API shape
- storage integration with dumdict
- attestation patch flows
- related-entry stub creation
- multi-language support
- multiple task families beyond `de/classify`

## Open Follow-Ups

The following are intentionally left for later refinement:

- exact canonical serialization implementation details
- exact `rendererVersion` naming convention
