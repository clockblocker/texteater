# Promptsmith

Schema-independent prompt authoring, corpus selection, assembly and evaluation.
Linguistic schemas and evaluators belong to the consumer.

A corpus stores cases without assigning a role. Select demonstrations explicitly;
use `union`, `intersection` and `difference` to compose demonstration and test
selections. `defineExperiment` rejects overlap and shared contamination keys
before execution. Assembly includes only the selected demonstrations.

`promptsmith/evaluation` runs an experiment with an injected executor and records
its effective configuration, fingerprints, outputs, evaluator results, timing
and failures. Execution status is separate from the evaluator's score.
`promptsmith/storage` saves, validates, reopens and compares these records.
`promptsmith/openai` supplies an optional Responses transport.
