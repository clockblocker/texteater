---
status: accepted
source: "texteater#237"
---

# Promote German Personal Case Forms to Lemmas

Each fixed German personal-pronoun case form is its own Lemma. Thus `ich`,
`mich`, `mir`, and `meiner` are separate grammatical identities, as are
homographic forms distinguished by person, politeness, reference number, and
reference gender. Case, grammatical gender and number, reflexivity, and
historical status remain Surface evidence.

Formal non-possessive `Sie`, `Ihnen`, and `Ihrer` each have separate
singular-addressee and plural-addressee Lemmas, as refined by `texteater#249`.
Their Surface number remains morphologically plural and must never be used as
addressee evidence. When discourse does not establish addressee count,
resolution keeps `referenceNumber=null`; that value is outside this Fixed
Population and continues through the Open route. Formal substantive possessive
`Ihr` is unaffected and keeps unknown possessor number.

Substantive possessive forms take the opposite boundary: declined forms such as
`meiner` resolve to possessor-base Lemmas such as `mein`. Archaic personal
genitives remain the exact personal form instead of being folded into a
possessive base.

This deliberately favors stable learner navigation and explicit fixed-form
relations over a smaller inflectional Lemma inventory. Legacy records may be
relinked only when their stored core and Surface form identify one fixed target;
homographs with more than one candidate are reported and left untouched.

Fixed identity does not imply occurrence-level reachability. When one of these
forms is an inherently reflexive member of a lexically reflexive VERB Analysis
Target, the current Click Resolution Chain resolves only the enclosing verb;
the member is outside the system as an independently resolved PRON occurrence
until Component Drilldown and #250 settle that topology. Ordinary contextual
reflexive arguments that receive their own PRON Analysis Target remain
reachable through the fixed population.

The verbal boundary includes middle-like `sich` in `Die Schrift liest sich
leicht`, represented by `lexicallyReflexive=Yes` on the VERB Lemma. Free-ish
uses such as `Sie begrüßen sich`, `Ich dusche mich`, `Ich wasche mir die Hände`,
and `Ich kaufe mir etwas` instead resolve to promoted exact-form PRON Lemmas.
Surface `reflex=Yes` records subject coreference without splitting `mich`,
`mir`, or the other personal case forms into additional reflexive Lemmas. The
reciprocal meaning in `Sie begrüßen sich` is instead a contextual expansion of
free `sich`; it neither changes the single fixed `pronType=Prs` Lemma and
Reading nor creates a `pronType=Rcp` identity.
The fixed Readings participate in the authored Case and Person grammatical
series so learners can navigate among the members of this closed population.
