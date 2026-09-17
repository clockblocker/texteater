---
status: accepted
---

# Separate German Knowledge text from relation judgments by Family

The source Reading fixes the Family and request applicability. Lexeme and
Phraseme routes may request Semantic Relations; Morpheme and Construction
remain base-only where their aspects apply. Authored lookup uses the exact
Reading, including reviewed empty relation coverage.

Luna supplies missing base text and flat candidate Canonical Forms. TypeSafe
then judges each candidate's Kind and requested relation, with explicit
no-relation, other-Family and uncertainty outcomes. Code supplies Language and
Family and validates each contribution. Candidate discovery does not establish
exhaustive absence.

Independent validated contributions survive a sibling failure. Dumgen returns
changes, pending relations and attributable failures; callers own persistence
and completion accounting. An unparseable response contributes nothing from
that response. Cancellation stops work and preserves evidence without publishing
new contributions.

This supersedes the model-emitted Kind and whole-response failure policy.
The same-Family domain rule in system ADR 0020 remains. A combined Family route
was rejected because it obscures applicability; model-selected Family was
rejected because the source Reading already fixes it. Lexical Breakdown and
Morphological Tree generation remain deferred.
