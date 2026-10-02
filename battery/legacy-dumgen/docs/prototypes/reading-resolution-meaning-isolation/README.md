# Historical Reading meaning-isolation evidence

The retained run tested five first-encounter misses where salient neighboring
words contaminated the target's Emoji Description. Its cases cover German DET,
PRON and Morpheme/Suffix routes. It scored novel descriptions against forbidden
neighbor meanings rather than requiring one exact illustrative emoji.

[The recorded run](https://github.com/clockblocker/texteater/blob/e5060a0407252f25af801f59674f47a5aff71e55/battery/dumgen-new/docs/prototypes/reading-resolution-meaning-isolation/runs/2026-08-22T06-06-42-740Z/results.json) and `run.ts.txt`
preserve the original prompt, schema fingerprints, outputs and diagnostic scores.
They are evidence for prompt iteration, not a current acceptance gate.

The same case IDs are retained in the current `reading-resolution/de` corpus.
[The current evaluator](../../../src/concrete-lang/de/reading-emoji-description/evaluator.ts)
checks novelty and neighbor leakage through Dumgen's shared experiment runner.
Current callers supply an Encounter and tagged Lemma; Dumgen owns the private
model exchange and returns an Emoji Description. New executions belong to
Promptsmith Evaluation Runs and do not overwrite these historical results.
