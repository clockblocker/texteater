# Prompting Philosophy

## Instruction language

DTOs use English. System prompts can too. `de` means the analyzed language, not
the instruction language.

## Code first

If deterministic code can do it, code does it. Each prompt gets one small
judgment, the minimum context, and no decisions already made elsewhere.

## Body is big picture

Prompt body is for eplaining the model and high-level policy

For clarification of the edge cases we rely on demonstrations

### "Explanation"s are high-signal

"explanation" field is optional. It it is reserved for a genuiene edge-cases
If case dererves an "explanation", it should be in caveman

## Logbooks

Look for hard cases while writing and testing a prompt. 

If a case raises a real policy question or deserves human thought, add it to the persistent
[Prompt Logbook](../prompt-logbook.md). 

Keep routine failures with their test
run; the logbook is only for things worth thinking about.
