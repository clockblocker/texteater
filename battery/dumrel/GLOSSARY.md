# Dumrel

Dumrel defines identityless Knowledge and pure operations over it
([Dumrel ADR 0001]). Each entry links the ADRs that hold the term's precise
definition, edge cases and examples. A language's classification terms whose
values Knowledge stores, such as the German Plural Pattern and Conjugation
Class, live in the [Dumcorpus glossary].

## Language

**Reading Knowledge**:
Optional linguistic content owned by one exact Reading, never by a Lemma. See
[ADR 0002].

**Knowledge Change**:
A Contribute, Correct or Retract operation on one atomic aspect or bucket of
Reading Knowledge.

**Knowledge Policy**:
The mapping from a source route (language, Family, Kind) to the Knowledge
aspects that apply to it. See [Dumrel ADR 0001].
_Avoid_: applicability table, request schema

**Knowledge Settings**:
Preferences that enable or disable the aspects applicable to a source route.

**Knowledge Request Mask**:
The aspects requested for production: those the Knowledge Policy applies to a
route and the Knowledge Settings leave enabled.

**Unit Shadow**:
A target described by language, Family, Kind and Canonical Form, without
choosing a Lemma's Core Features or an exact Reading. See [ADR 0011].

**Pending Semantic Relation**:
A direct relation proposal whose target is a Unit Shadow awaiting downstream
matching. See [ADR 0012] and [ADR 0020].

**Endonym**:
A place's own local name, stored on the PROPN Reading that names the place
from outside. See [ADR 0012].
_Avoid_: native name, local-name field

**Exonym**:
The name speakers of a Reading's language use for a place outside their area.
It is projected from the Endonym, never stored. See [ADR 0012].
_Avoid_: foreign name, historical name

**Governed Preposition**:
A preposition a Reading lexically selects: a Preposition complement in a Slot
of its Valency Frame (Dumling). See [ADR 0034].
_Avoid_: govPrep, prepositional object, valency note

**Governor**:
The Reading whose Valency Frame holds a Governed Preposition. The
preposition's side of the link is projected, never stored. See [ADR 0034].
_Avoid_: governing verb

**Participle Source**:
The VERB Lemma whose participle an adjective is, stored in the adjective's
Reading Knowledge. It is a grammatical link, not a Semantic Relation. See
[ADR 0036].
_Avoid_: base verb, derivation relation, participle relation

**Participle Meaning**:
Whether a Reading with a Participle Source means a sense of its verb
(Verbal) or has drifted from all of them (Drifted). See [ADR 0036].
_Avoid_: lexicalized, etymology

**Locution Type**:
Whether a Locution's Reading is an Idiom or a Collocation (Dumling), if
either. It never splits a Lemma. See [ADR 0039].
_Avoid_: Phraseme Kind, idiomaticity

**Saying Type**:
Whether a Saying's Reading is a Proverb or a Winged Word (Dumling). It never
splits a Lemma. See [ADR 0039].
_Avoid_: Aphorism, provenance Kind

**Formula Role**:
What a routine formula does in conversation, stored in an INTJ Reading's
Knowledge. It never splits a Lemma. See [ADR 0039].
_Avoid_: discourseFormulaRole, DiscourseFormula

[ADR 0002]: ../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
[ADR 0011]: ../../docs/adr/0011-use-reading-owned-lemma-targeted-semantic-relations.md
[ADR 0012]: ../../docs/adr/0012-store-only-direct-semantic-relation-claims.md
[ADR 0020]: ../../docs/adr/0020-keep-semantic-relations-inside-one-family.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0036]: ../../docs/adr/0036-make-adjectival-german-participles-adj-linked-to-their-verb.md
[ADR 0039]: ../../docs/adr/0039-split-phrasemes-into-locutions-and-sayings.md
[Dumrel ADR 0001]: ./docs/adr/0001-keep-dumrel-ownerless-and-pure.md
[Dumcorpus glossary]: ../dumcorpus/GLOSSARY.md
