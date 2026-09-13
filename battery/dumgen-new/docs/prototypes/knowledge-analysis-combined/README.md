# Historical combined German Knowledge evaluation

These runs evaluated one combined prompt for transcription, definition,
translation and semantic-relation proposals. The provider schema exposed the
requested nullable leaves for one German Reading.

The retained v2 results were:

- [Development round 1](runs/2026-08-19T09-28-29-202Z/results.json): 8/9.
- [Development round 2](runs/2026-08-19T09-29-14-019Z/results.json): 8/9.
- [Development round 3](runs/2026-08-19T09-29-45-328Z/results.json): 9/9.
- [Untouched acceptance](runs/2026-08-19T09-30-11-432Z/results.json): 4/4.

All four runs completed without provider errors. The first two missed the
multi-member `aufgeben` case because exact English comparison rejected
context-inflected `gave up` against Reading-level `give up`. Those misses were
classified as corpus/evaluator defects. The [v1 pilot](runs/2026-08-19T09-26-36-395Z/results.json)
retains earlier evaluator defects separately.

These scores establish what the old combined prompt did. Current Dumgen uses
Family-specific prompts, tagged Reading inputs and caller-supplied Encounters.
It projects non-null base values to Knowledge Changes and relation proposals to
Pending Semantic Relations, validated against the source Reading. The current
family corpora and semantic evaluator live in
[Knowledge production](../../../src/concrete-lang/de/knowledge-production/).
Use the current `knowledge-analysis/de/*` experiments for new Evaluation Runs;
the archived acceptance result does not qualify a changed prompt or contract.
The original runner is preserved as `run.ts.txt`.
