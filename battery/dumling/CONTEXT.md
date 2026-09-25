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
features. A noun's article is the inflectional feature `article` (Definite,
Indefinite or None) in German and English and `definite` in Hebrew; its
normalized form is the noun's own letters, and a host adds the article when it
displays the noun. Verbal subject expletives are composition expressed by
grammatical features. Component values are derived separately. The Lemma
remains the bare noun or ordinary verb.

**Grundform**:
A Surface's realization of its particular Lemma's canonical grammatical form.
An accepted spelling variant may realize Grundform. The applicable inflectional
features depend on the language, Family, Kind, and sometimes the particular
Lemma.
_Avoid_: Surface Kind, stored Citation/Inflection discriminator

**Attestation**:
A fleeting occurrence of one Surface, represented by ordered attested members
and Full or Partial Realization Coverage. It has value equality but no durable
identity. A member's orthography is Standard, Typo, Fused or Shorthand. A
noun's article is an owned member, fused or not: `im Wald` attests `[m, Wald]`
with Full coverage. A shared article gives Partial coverage and stays article
evidence, not a member. A component with no letters of its own, such as the
hidden article in Hebrew `בבית`, leaves its owner Partial, pointing at the
Fusion component. German verbal Attestations retain
subject-expletive source orthography as evidence for an owned member. Every
German governor (verb, adjective, noun, Idiom, Collocation) records the
valency slots the occurrence realizes as valency evidence, each naming by
index the owned member that realizes it, such as the governed preposition. A
governed preposition is an owned member but not a Fixed one, so the
normalized Surface leaves it out: `wartet`, not `wartet auf`; `stolz`, not
`stolz auf`. A German ADP Attestation records the case its complement took
as its realized case: `auf dem Tisch` Dat, `auf den Tisch` Acc, `wegen dem
Regen` Dat.
_Avoid_: Selection, click result, selected Surface

**Fusion**:
A coordinate-free occurrence value for one source spelling that realizes more
than one grammatical component: the spelling and its ordered components, each
a surface plus the Attestation member it realizes or a marker that it has no
letters of its own. `im` is `in` realized by `i` and `dem` realized by `m`.
It has value equality and no durable identity; Attestations in different
units may reference the same Fusion, and nothing targets it with Knowledge or
relations. A Fused member carries its Fusion and component index, so the
learner can open the Fusion from any piece. Every component belongs to exactly
one Attestation, and each is a syntactic word with a Lexeme Kind: `'ll` is
`will`, `n't` is `not`, Hebrew `ב` is an ADP.
_Avoid_: Construction, contraction Lemma, fused route, Clitic

**Fused**:
The orthography of a member whose letters are one piece of a written word
holding several words: `m` in `im`, `'s` in `geht's`, `'ll` in `I'll`.

**Shorthand**:
The orthography of a member written as a standalone shortened spelling of one
word: `'ne Frage`, `z.B.`, `e.g.`. A piece that is also attached is Fused.
_Avoid_: Variant, for a shortened article

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

### Valency

**Valency Frame**:
The governed complements of one Reading, stored as an ordered list of Slots
in its Knowledge: what a learner must memorize to use the word in that sense.
A Reading has at most one. Free adjuncts are not in it, and neither are fixed
parts, which come from Lemma identity: a separable prefix, a lexical
reflexive, a Phraseme's wording. A frame never creates a Lemma or a Reading:
`warten` with and without `auf` is one Reading whose `auf` Slot is Optional.
_Avoid_: valency pattern, Satzbauplan, argument structure, governed
prepositions

**Slot**:
One complement in a Valency Frame, Required or Optional. Each language
defines its complements, and each route chooses which it allows. German
marks them by case: a bare case (`jemandem`, Dat) or a governed preposition
with the case it assigns (`auf` + Acc), each with a referent of Someone,
Something or Either. The subject is a Slot too.
_Avoid_: argument, valent, complement slot, Ergänzung

**ADP Case Table**:
The closed, authored list of a language's adpositions with the cases each
takes: the allowed cases, a preferred case where the others are colloquial,
and whether it is two-way. German keys it by Canonical Form and, where
position changes the case, by `adpType`: `für` {Acc}, `auf` {Acc, Dat}
two-way, `wegen` {Gen, Dat} preferring Gen, `entlang` Post {Acc} and Prep
{Gen, Dat}. Case is not ADP Core, since no two German ADPs differ by case
alone. A governor's Preposition Slot and an ADP occurrence's realized case
must be cases the table allows.
_Avoid_: governed case, governedCase, case government feature

### German classifications

**Verbal Participle**:
A participle in a perfect (`hat gekocht`, `ist gekommen`) or a passive
(`wurde gekocht`, `bekam geschenkt`), which joins its auxiliary in one VERB
target. Its Canonical Form is the infinitive, and its Surface records Partizip
I or II with no agreement. `sein` with a participle outside the perfect is the
copula, not an auxiliary: `Die Tür ist geschlossen` holds a Participial
Adjective.
_Avoid_: state passive, as a verbal construction

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
Lexeme. `sein` before a Participial Adjective is the copula VERB.
_Avoid_: lone auxiliary, copula AUX, per-form AUX Lemma

**Participial Adjective**:
A participle used as an adjective, which is an ADJ Lexeme whether it is
lexicalized or not: attributive (`die gekochten Kartoffeln`), adverbial (`kam
lachend herein`) or predicative after `sein` (`Die Tür ist geschlossen`, `Er
ist verliebt`). Its Canonical Form is the uninflected participle (`gekocht`,
`lachend`), and its Reading names its verb as Participle Source (Dumrel).
_Avoid_: productive participle and lexicalized participle, as a Kind contrast

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
