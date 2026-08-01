# Prompt Chains

Persistent decisions about Dumgen prompt-chain topology. The prompts themselves
remain early work in progress under the laboratory namespace.

## German segmentation chain

The intended runtime chain has exactly two prompt stages:

```text
Source Sentence -> Intake -> Segmentation<Lang>
```

1. **Intake** decides whether the Source Sentence is `Accepted`,
   `UnsupportedLanguage`, or `Unintelligible`.
2. **Segmentation<Lang>** performs language-specific segmentation for an
   accepted Source Sentence. The current scope supports only
   `Segmentation<de>`.

A strict finalizer is evaluation and testing infrastructure, not a third stage
of the intended runtime chain. It exists to expose contract violations during
prompt development, not to compensate for them in runtime operation. The
working assumption is that the configured nano model must follow each stage's
contract consistently once its prompt is sufficiently precise.

