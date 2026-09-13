---
status: accepted
---

# Assess Grundform with language-owned rules

Grundform means realization of the particular Lemma's canonical grammatical
form. Each language owns the accepted feature sets for its Family/Kind routes.
German infinitives and Hebrew past third-person masculine singular verbs use
different rules. The matcher is shared; the linguistic conventions are not.

Surface stores grammar and spelling evidence. Grundform is a synchronous
assessment of that evidence, with no stored discriminator or caller override.
Accepted Variant spelling remains eligible. The assessment trusts the
supplied spelling classification and does no spell checking.

A successful result contains a boolean. A known contradiction establishes
false even when another feature is unknown. Missing decisive features,
ambiguous analyses and unavailable Lemma conventions return typed errors
with paths. A null feature bag is not proof of
Grundform; a present bag may have null coordinates that its route explicitly
allows as unmarked. Routes without represented inflection use form evidence.

Hebrew noun schemas admit explicit Sing and Ind evidence for singular absolute
forms. Their earlier Dual/Plur and Cons/Def-only vocabulary could not express
this positive case. Null retains its meaning as unavailable evidence; this
change leaves other Hebrew routes' feature vocabularies intact.

This replaces the initial marked-feature heuristic in ADR 0001. That heuristic
classified an explicitly marked infinitive as Inflection and missing grammar
as Citation. No compatibility with its exports or future IDs is required.
