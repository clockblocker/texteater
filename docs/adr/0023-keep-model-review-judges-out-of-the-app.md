---
status: accepted
---

# Keep model review judges out of the app

The app uses the original model decision. It must not ask another model to
approve, score, reconsider, or regenerate a completed answer. This includes
re-asking the same semantic question after an Unresolved answer without new
input. Model review judges belong in test runs and benchmarks, where their
results inform prompt and model changes rather than the current app request.
Moving a review judge to a background job does not make it an app feature.

Parallel Knowledge generation exposed the cost of a review loop: a judge took
about 0.8 seconds to reject a definition, then regeneration took another second
and returned the same text. Extra calls add latency and cost without providing
an authoritative correction. We accept the original answer's semantic error
risk and measure quality outside the serving path.

Calls that make the first decision for a field remain part of production.
TypeSafe's `judge` executor name does not make every use a review judge.
Classifying an assembled target, selecting an existing Reading, and assigning
the first Kind and relation label to an unlabeled candidate are primary
decisions. A second call that repeats an already answered question is review.
This preserves the relation classification policy in [ADR 0020](0020-keep-semantic-relations-inside-one-family.md).

Code still enforces schemas, source identity, request applicability, domain
invariants and publication ownership. Knowledge generated alongside the Emoji
Description is attached to the completed Reading after these local checks;
there is no model approval step. Missing or failed work can be generated, and
transport failures can be retried. A judge's disagreement is never a reason
for the app to replace a completed answer.
