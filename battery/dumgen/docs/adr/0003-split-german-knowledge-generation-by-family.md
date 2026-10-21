---
status: accepted
---

# Separate German Knowledge text from relation judgments by Family

The source Reading fixes the Family and request applicability. Lexeme,
Locution and Saying routes may request Semantic Relations; Morpheme routes
remain base-only where their aspects apply. Authored lookup uses the exact
Reading, including reviewed empty relation coverage.

Luna supplies missing base text and flat candidate Canonical Forms. TypeSafe
then judges each candidate's Kind and requested relation, with explicit
no-relation, other-Family and uncertainty outcomes. Code supplies Language and
Family and validates each contribution. Candidate discovery does not establish
exhaustive absence.

**Production writes the Lemma Paradigm too.** Where a route's Paradigm
Policy names Variation Dimensions, Knowledge Production returns Paradigm
Changes beside its Knowledge changes
([ADR 0048](../../../../docs/adr/0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md)).
For a Lemma's first Reading, the forms Luna writes become variants under an
explicit Licence. For a later Reading, a jev licence judge first picks, per
dimension, the stored variants the sense takes, or answers NoMatch, and only
after NoMatch does Luna write that dimension's forms, without seeing the
stored ones. Code splits written forms into variants and validates them like
any other contribution.

Independent validated contributions survive a sibling failure. Dumgen returns
changes, pending relations and attributable failures; callers own persistence
and completion accounting. An unparseable response contributes nothing from
that response. Cancellation stops work and preserves evidence without publishing
new contributions.

This supersedes the model-emitted Kind and whole-response failure policy.
The relation-space rule in system ADR 0020 remains. A combined Family route
was rejected because it obscures applicability; model-selected Family was
rejected because the source Reading already fixes it. Morphological Tree
generation remains deferred. Lexical Breakdown generation is dropped: a
multiword Lemma's Breakdown comes from `segment.inLexemes` (Dumgen ADR 0007), and
[#720](https://github.com/clockblocker/texteater/issues/720) removes the
leftover prompts.

The route names follow system ADR 0039, which replaced the Phraseme Family
with Locution and Saying; the shipped code still names Phraseme routes until
the rewrite on [#701](https://github.com/clockblocker/texteater/issues/701).
