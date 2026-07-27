# Dumgen Context

## Glossary

### Prompt Source
A prompt authoring unit for one `language + task` pair.

It contains the human-authored inputs used to build and evaluate a prompt:
- `taskDescription`
- optional `agentRole`
- optional `inputSchema`
- optional `outputSchema`
- ordered `examples`
- `numOfFirstExamplesToUse`

### Example
A gold example with:
- `id`
- `input`
- `idealOutput`

Examples are ordered. Their order is semantic, not cosmetic.

### Prompt Build
A deterministic build artifact derived from a Prompt Source.

It contains generated prompt text and build metadata, but no model-run results.

### Prompt Experiment
A validated, owned Prompt Source together with its deterministic Prompt Build
and fixed example split.

Callers create an experiment once, inspect its build, and evaluate through the
same experiment. Evaluation does not accept a separate source/build pair, so a
run cannot accidentally combine mismatched artifacts.

### Evaluation Run
An observation produced by running a built prompt against a model on the eval-only examples.

It contains per-example results and run metadata, and is separate from Prompt Build.
