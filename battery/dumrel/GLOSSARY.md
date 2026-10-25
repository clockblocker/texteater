# Dumrel

Dumrel defines identityless Knowledge, the Lemma Paradigm and pure
operations over them ([Dumrel ADR 0001]). Each entry links the ADRs that hold
the term's precise definition, edge cases and examples. A language's
classification terms whose values Knowledge or the Paradigm stores, such as
the German Plural Pattern and Conjugation Class, live in the
[Dumcorpus glossary].

## Language

**Reading Knowledge**:
Optional linguistic content owned by one exact Reading, never by a Lemma. A
Lemma's inflectional alternatives are its Lemma Paradigm, not Knowledge. See
[ADR 0002] and [ADR 0048].

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

**Lemma Paradigm**:
A Lemma's inflectional alternatives, per Variation Dimension, and the Licence
each of its Readings holds in each. It is grammatical, not Knowledge, and no
part of the Lemma's identity. See [ADR 0002] and [ADR 0048].
_Avoid_: Lemma Knowledge, inflection class, principal-part Knowledge

**Paradigm Policy**:
The mapping from a source route to the Variation Dimensions of its Lemmas'
Paradigms. See [ADR 0048] and [Dumrel ADR 0001].

**Variation Dimension**:
One part of a route's paradigm that may take alternatives, such as a German
noun's `plural` or a German verb's `preterite`. See [ADR 0048].
_Avoid_: principal part, for the dimension; axis

**Paradigm Variant**:
One alternative in one Variation Dimension: one form or one marker
(`Banken`, `NoPlural`). Its id is a content key of its value. See
[ADR 0048].
_Avoid_: Variant, which is a spelling (Dumling); whole-paradigm variant

**Licence**:
The Paradigm Variants of one Variation Dimension that one Reading's sense
takes. An Unstated Licence takes every variant. See [ADR 0048].
_Avoid_: Licensed, a Variant spelling's tag (Dumling); Reading plural

**Free Dimension**:
A Variation Dimension in which every Reading of the Lemma licenses every
variant (`melken`: `molk`, `melkte`). It is derived, never stored. See
[ADR 0048].
_Avoid_: optional form, free variant

**Conditioned Dimension**:
A Variation Dimension in which some Reading licenses only some of the
variants (`Bank`: 🪑 `Bänke`, 🏦 `Banken`). It is derived, never stored. See
[ADR 0048].
_Avoid_: homonym plural, sense-specific form

**Licence Group**:
The Readings of one Lemma whose Licences agree in every Variation Dimension.
They share one Inflection Table (Dumdict). See [ADR 0048] and [ADR 0049].
_Avoid_: Reading group, sense cluster

**Paradigm Change**:
A Contribute, Correct, License, Unlicense or Retract operation on one
Paradigm Variant or Licence. See [ADR 0048].

**Unit Shadow**:
A target described by language, Family, Kind and Canonical Form, without
choosing a Lemma's Core Features or an exact Reading. See [ADR 0011].

**Semantic Relation**:
A direct claim from one Reading to a related Lemma or Reading: Synonym, Near
Synonym, Antonym, Near Antonym, Hypernym, Holonym or Endonym. See [ADR 0011]
and [Dumrel ADR 0005].
_Avoid_: Lexical Relation

**Pending Semantic Relation**:
A direct relation proposal whose target is a Unit Shadow awaiting downstream
matching. See [ADR 0012] and [ADR 0020].

**Endonym**:
A place's own local name, stored on the PROPN Reading that names the place
from outside. See [Dumrel ADR 0005].
_Avoid_: native name, local-name field

**Exonym**:
The name speakers of a Reading's language use for a place outside their area.
It is projected from the Endonym, never stored. See [ADR 0012] and
[Dumrel ADR 0005].
_Avoid_: foreign name, historical name

**Governed Preposition**:
A preposition a Reading lexically selects: a Preposition complement in a Slot
of its Valency Frame (Dumling). See [ADR 0034].
_Avoid_: govPrep, prepositional object, valency note

**Governor**:
The Reading whose Valency Frame holds a Governed Preposition. The
preposition's side of the link is projected, never stored. See [ADR 0034].
_Avoid_: governing verb

**Reflexive Slot**:
A Slot of a Valency Frame (Dumling) holding a Reflexive complement: the
lexical reflexive its Reading needs, which no other noun phrase can replace,
with its case where the language has one (German Acc or Dat; English none).
A Required one puts 🪞 first in the Reading's Emoji Description (Dumling).
See [ADR 0034] and [ADR 0052].
_Avoid_: `lexicallyReflexive`, `isReflexive`, reflexive verb Lemma

**Source**:
The immediate base of a formation whose letters can't be cut into pieces: a
conversion (`Lauf` ← `laufen`), a participle, an acronym or a clipping. It is
the Reading Knowledge aspect `source`, outside the Breakdown (Dumling), and
links to a Unit Shadow or a Lemma. A single NOUN, VERB or ADJ asks for it
first: Dumgen's Knowledge stage produces every Source, and a Reading with
one runs neither segmenter. The word's Morphemic Breakdown (Dumling)
propagates through it. It is a grammatical link, not a Semantic Relation.
See [ADR 0036], [ADR 0050] and [ADR 0051].
_Avoid_: Participle Source, `participleSource`, base verb, derivation
relation, etymology

**Participle Meaning**:
Whether a participle's Reading means a sense of the verb its Source names
(Verbal) or has drifted from all of them (Drifted). See [ADR 0036].
_Avoid_: lexicalized, etymology

**Formations**:
The stored words whose Constituents (Dumling) link to a word, listed on its
Note and grouped by the Kind of the other piece: prefixed verbs, compounds,
derivations. It is computed from those links, never stored, and opaque
formations count. The name is provisional. See [ADR 0050].
_Avoid_: family, word family, derivatives

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
[ADR 0050]: ../../docs/adr/0050-break-a-reading-down-into-its-constituents.md
[ADR 0051]: ../../docs/adr/0051-copy-school-morphemic-analysis-into-a-readings-morphemes.md
[ADR 0052]: ../../docs/adr/0052-record-a-lexical-reflexive-on-the-reading-never-in-the-canonical-form.md
[ADR 0048]: ../../docs/adr/0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md
[ADR 0049]: ../../docs/adr/0049-tabulate-a-lemmas-forms-as-projections.md
[Dumrel ADR 0001]: ./docs/adr/0001-keep-dumrel-ownerless-and-pure.md
[Dumrel ADR 0005]: ./docs/adr/0005-claim-seven-direct-semantic-relations-only-from-a-dictionary-listing.md
[Dumcorpus glossary]: ../dumcorpus/GLOSSARY.md
