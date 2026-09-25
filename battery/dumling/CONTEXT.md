# Dumling

Dumling names the language-specific grammatical entities and foundational
semantic values that learner text resolves to.

## Language

### Grammatical identity

**Lemma**:
An identity-bearing grammatical entity defined by language, Canonical Form,
Family, Kind, and Core Features.
_Avoid_: Linguistic Entry, Lemma Form, dictionary entry

**Lexeme**:
A lexical Lemma whose fixed realization may have one or more members. Lexeme is
one Family, not a synonym for Lemma.

**Canonical Form**:
The normalized form that names a Lemma and participates in its identity.
_Avoid_: Citation Form, Lemma Form

**Family**:
The broad grammatical class of a Lemma: Lexeme, Phraseme, or Morpheme.
Every Kind belongs to exactly one Family, so a value that
carries the Kind carries the Family by inference.
_Avoid_: Entry Family

**Kind**:
The concrete subtype of a Lemma within its Family, such as NOUN, VERB, Prefix,
or Idiom.
_Avoid_: Entry Subkind

**Core Features**:
The grammatical features that belong to a Lemma's identity; the rest
describe its Surfaces. Each language, Family and Kind decides which features
are Core by what serves the learner best, so the same feature can be Core on
one route and inflectional on another.
_Avoid_: Inherent Features

**Paradigm Cell**:
One combination of case, number, gender or reflexivity in a closed, authored
paradigm. In a pillar, a paradigm whose forms a learner memorizes one by one,
each cell is its own Lemma with one Reading: German `mich` and `mir`,
accusative and dative `uns`, `dem` and `den`; English `me` and `my`. A word
made of a stem and article endings, such as `dieser` or `mein`, is one Lemma,
and its cells are Surfaces. Open classes keep these features on the Surface.
_Avoid_: Paradigm form, inflected closed-class Surface

**Spelling Crossroad**:
A projection with no identity that gathers every Reading whose Lemma's
Canonical Form has one spelling in one language, compared without case. `die`
gathers its DET and PRON cells; `essen` gathers the verb and the noun `Essen`.
Surface spellings, including Typo and Variant spellings, never form one.
_Avoid_: Headword, Vocable, Page, Homograph Set

**Surface**:
A reusable grammatical form that realizes exactly one Lemma under one analysis.
It carries its normalized form, spelling status, and applicable inflectional
features. German common-noun articles and verbal subject expletives are
composition expressed by grammatical features. Their component values are
derived separately. The Lemma remains the bare noun or ordinary verb.

**Grundform**:
A Surface's realization of its particular Lemma's canonical grammatical form.
An accepted spelling variant may realize Grundform. The applicable inflectional
features depend on the language, Family, Kind, and sometimes the particular
Lemma.
_Avoid_: Surface Kind, stored Citation/Inflection discriminator

**Attestation**:
A fleeting occurrence of one Surface, represented by ordered attested members
and Full or Partial Realization Coverage. It has value equality but no durable
identity. A member's orthography is Standard, Typo, or Fused. German noun Attestations
retain article source orthography separately from their members when an
article is included. A shared article gives Partial coverage without becoming
a second owned member; a fused article is an owned Fused member with Full
coverage, and a component with no letters of its own leaves the unit Partial
with evidence pointing at the Fusion. German verbal Attestations retain
subject-expletive source orthography as evidence for an owned member, and name
the owned member the verb lexically governs as governed-preposition evidence.
_Avoid_: Selection, click result, selected Surface

**Fusion**:
A coordinate-free occurrence value for one source spelling that realizes more
than one grammatical component: the spelling and its ordered components, each
a surface plus the Attestation member it realizes or a marker that it has no
letters of its own. `im` is `in` realized by `i` and `dem` realized by `m`.
It has value equality and no durable identity; Attestations in different
units may reference the same Fusion, and nothing targets it with Knowledge or
relations.
_Avoid_: Construction, contraction Lemma, fused route

### Semantic identity

**Reading**:
A foundational semantic value made from one Lemma and one Emoji Description.
Its equality applies within one dictionary scope.
_Avoid_: Meaning, Sense, Semantic Unit, dictionary entry

**Emoji Description**:
The stable dictionary-scoped semantic label that distinguishes Readings of the
same Lemma: one to four emoji that describe the meaning, compared without
variation selectors or skin-tone modifiers.
_Avoid_: Mnemonic, Gloss, Sense ID

### German classifications

**Verbal Participle**:
A productive participle, which resolves to its VERB or AUX Lexeme in every
use: attributive (`die gekochten Kartoffeln`), adverbial (`kam lachend
herein`) or in a state passive (`Die Tür ist geschlossen`). Its Canonical Form
is the infinitive. Its Surface records Partizip I or II and, when attributive,
the case, number and gender it agrees in.
_Avoid_: adjectival participle, for a productive use

**Modal Verb**:
One of `dürfen`, `können`, `mögen`, `müssen`, `sollen`, `wollen` as a VERB
Lexeme with `verbType: Mod`, one Lemma whether it governs an infinitive or an
object.
_Avoid_: Modal auxiliary, modal AUX

**Auxiliary**:
`sein`, `haben` or `werden` serving another verb's perfect, future, passive,
modal-passive, obligation or progressive composition, or `bekommen`, `kriegen`
and `erhalten` serving its recipient passive. An AUX Lexeme is one such
grammatical use with its own Reading; the same verb standing alone is a VERB
Lexeme.
_Avoid_: lone auxiliary, copula AUX, per-form AUX Lemma

**Participial Adjective**:
A lexicalized participle, which is its own ADJ Lexeme: its meaning comes from
no sense of the verb, or it takes `un-`, `sehr` or comparison (`spannend`,
`gebildet`, `ungelesen`). Its Canonical Form is the participial form. The same
spelling can be a Verbal Participle elsewhere: `ein gebildeter Mann` is
`gebildet`, `ein aus Ton gebildeter Krug` is `bilden`.

**Collocation**:
A conventional multiword Phraseme with restricted lexical choices and a
non-idiomatic overall meaning.
_Avoid_: Idiom, free phrase

**Free `sich`**:
The independently resolvable personal or reflexive pronoun `sich`, distinct
from a verb-owned reflexive member.
_Avoid_: Reciprocal `sich`, `pronType=Rcp` `sich`

**Standalone `einander`**:
The invariant German reciprocal pronoun `einander` treated as one Lemma and one
Reading.
_Avoid_: Case-specific `einander`

**Reciprocal Pronominal Adverb**:
A German ADV Lexeme whose whole form combines a prepositional element with
`einander`, such as `miteinander` or `voneinander`.
_Avoid_: `preposition + einander` PRON, reciprocal PRON compound
