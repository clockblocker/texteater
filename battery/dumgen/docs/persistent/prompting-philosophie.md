# Prompting Philosophy

## Body is big picture

Use explanations in examples for edge cases and policy details.

## Examples teach; the corpus verifies

Use few demos. Keep one only when the body cannot teach the point well: a policy
wrinkle, boundary, or basic happy path. Keep most Golden Corpus cases for
verification. A failed case does not automatically become a demo. That teaches
the answer, not the rule.

## Instruction language

DTOs use English. System prompts can too. `de` means the analyzed language, not
the instruction language.

## Code first

If deterministic code can do it, code does it. Each prompt gets one small
judgment, the minimum context, and no decisions already made elsewhere.
