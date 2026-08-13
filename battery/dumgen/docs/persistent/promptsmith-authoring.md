# Promptsmith Authoring

Rules for authoring and generating Dumgen laboratory prompts. All remain work
in progress.

## Stage-first routes

Prompt Sources use a stage-first filesystem hierarchy:

```text
src/promptsmith/
├── assembly/
└── laboratory/
    ├── prompt-source/
    │   ├── intake/
    │   ├── segmentation/de/
    │   ├── target-classification/de/high-level-whole-unit/
    │   ├── grammatical-resolution/de/lexeme/noun/
    │   └── reading-resolution/de/
    ├── experiments/
    └── generated-system-prompt/
```

Filesystem routes use lowercase kebab-case. The typed catalog preserves
Dumling discriminants and uses camelCase stage names.

## Prompt Source contract

Each leaf is the complete human-authored source for one catalog prompt:

```text
prompt-source.ts
schemas.ts
golden-corpus/       # omitted when the route has no canonical cases
├── corpus.ts
└── cases/
```

`prompt-source.ts` exports one `promptSource` value and is Prompt Assembly's
only route import. It owns the route, schemas, instruction body, and ordered
demonstration selection. The body remains private. A corpus-backed Prompt Source
may additionally export its `demonstrations` Case Selection so experiments can
exclude it through set algebra. `schemas.ts` exports `inputSchema` and
`outputSchema`; runtime catalog code imports model-facing schemas there.

Sources are self-contained: bodies and demonstration selections are never
inherited or shared between routes. Schemas may reuse Dumling and Prompt
Assembly helpers.

Demonstrations that teach DTO shape or prompt mechanics are declared with
`defineLocalDemonstrations` in `prompt-source.ts`. Prompt Assembly parses them
with the leaf's exact schema instances and preserves their order. Local
demonstrations are not canonical semantic evidence and do not require a Golden
Corpus.

## Golden Corpora

A Golden Case has `input`, `idealOutput`, optional `explanation`, and optional
`contaminationKeys`. Its stable ID is its corpus registry key, not a field in
the case. Inputs and ideal outputs derive from the route schemas and use the
minimal model exchange rather than public Dumgen shapes.

Corpus construction parses all cases, trims explanations, rejects invalid or
duplicate exact inputs, and validates every named group member. A route may add
a semantic stimulus fingerprint in addition to the mandatory exact parsed-input
fingerprint. Composition groups are named, ordered selections; positional
groups such as `rest`, `slice`, or array indices are not allowed.

Each semantic collection is available as a complete Case Selection under
`corpus.collections`. Named composition groups remain available separately
under `corpus.groups`.

`corpus.select(ids)` returns an immutable ordered Case Selection. Published
demonstration and evaluation selections pin explicit IDs. Adding a corpus case
must not silently add it to an evaluation suite.

Case modules are organized by semantic subject, never by consumer role.
`prompt-source.ts` and evaluation-suite modules are the only places that assign
demonstration and evaluation roles.

## Experiments and prototypes

Reusable evaluation selections and pure evaluators live under `src`. A Prompt
Experiment combines one Prompt Source, an independently selected evaluation
suite, and its evaluator. Construction requires the suite to come from the
Prompt Source's canonical corpus and rejects leakage by ID, exact fingerprint,
route fingerprint, or shared contamination key.

A collection-scoped experiment derives its candidate evaluation selection with
set algebra, for example
`corpus.collections.adp.difference(demonstrations)`. Experiment construction
still rejects non-identical cases related by fingerprints or contamination
keys.

Executable prototype runners live under `docs/prototypes`. They own provider
clients, call limits, retries, persistence, and reporting. Retained run evidence
stays beside the runner.

## Generated System Prompts

Prompt Assembly owns few-shot formatting. Codegen appends local demonstrations
or selected Golden Cases in order, writes inputs and ideal outputs as stable
JSON, and omits IDs.
Explanations appear after the ideal output under a guidance-only label.

Codegen writes committed deterministic modules under
`laboratory/generated-system-prompt`, mirroring route paths. Provenance is
derived from the Prompt Source and always includes `prompt-source.ts` and
`schemas.ts`. Corpus-backed demonstrations additionally include the corpus
module and only the semantic case modules that contribute selected cases.

Run `bun run check:system-prompts` to detect stale generated output.

## Production Prompt Parts

A reviewed route may be promoted under `production/prompt-part`, preserving the
stage-first route. The route owns its instruction body, canonical Golden Corpus,
ordered production demonstration selection, and prompt-facing demonstration
guidance. Production cases are organized by semantic subject, never by whether
they currently serve demonstration, development, diagnostic, or evaluation
roles.

Every role is an immutable Case Selection over that one corpus. Use
`select`, `union`, `intersection`, `difference`, and `isDisjointFrom` to make
membership explicit. Set algebra proves case-ID separation; retained experiments
must also run Prompt Assembly's semantic contamination check before provider
calls.

Promotion pins the exact reviewed instruction bytes, demonstrations, and
guidance to retained experiment evidence. The production module must not import
laboratory experiments, runners, provider clients, or retained results.
Laboratory experiments consume the production corpus and content through the
route's interface. Runtime projection and provider execution remain separate
seams.

## Runtime boundary

Promptsmith owns prompt bodies, model schemas, Golden Cases, selections, and
pure experiment scoring. It does not own public projection, runtime
postconditions, model selection, generation parameters, provider calls, or
Dumling entity construction.

Settled Dumling-backed model schemas omit route-owned fields such as `language`,
`family`, and `kind`. Dumgen's `codecBuilder4.buildFixedFieldsCodec` restores
them on decode and validates and removes them on encode. Runtime definitions
live under `src/catalog`; shared schemas and codecs live under `src/schema`.
