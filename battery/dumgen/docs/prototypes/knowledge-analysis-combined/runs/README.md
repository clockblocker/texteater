# Retained evidence and recommendation

Recommend one combined German Knowledge call for the requested base aspects
and semantic relations. Keep its model analysis private, use the exact sparse
provider schema, and project only validated non-null candidates. The empty mask
must stop before the adapter and exchange observer.

The current v2 development evidence is:

- [round 1](2026-08-19T09-28-29-202Z/results.json): 8/9 (88.9%), finalized
- [round 2](2026-08-19T09-29-14-019Z/results.json): 8/9 (88.9%), finalized
- [round 3](2026-08-19T09-29-45-328Z/results.json): 9/9 (100%), finalized

Rounds 1 and 2 each missed only the multi-member `aufgeben` case. The model
returned the Reading-level English literal `give up`; the golden answer used
the context-inflected `gave up`. Both misses are retained and classified as a
corpus/evaluator defect. They still clear the 85% development gate.

After those three rounds, the runner unlocked and reserved the untouched
[acceptance run](2026-08-19T09-30-11-432Z/results.json). It scored 4/4 (100%)
with no execution errors or unclassified misses.

The earlier [v1 pilot](2026-08-19T09-26-36-395Z/results.json) is useful defect
evidence, but it is not part of the recommendation. Its byte-exact evaluator
treated alternate German definitions and defensible nullable relation targets
as failures, and one output used the invalid Dumling Kind token `ADVERB`. V2
keeps exact relation-target equality as a diagnostic instead of pretending the
golden target set is exhaustive. Its acceptance contract still requires the
exact request shape, exact requested relation keys, objective transcription
and translation checks, and the expected null/non-null definition behavior.
