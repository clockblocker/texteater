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
A Lemma with exactly one Head. Its other members are satellites, which may be
part of its Canonical Form (`sich erinnern`, `take off`, `die Schweiz`). A
proper name is one Lexeme whatever its length (`Angela Merkel`, `Deutsche
Bank`): its words are parts of the name, not Heads. So is an interjection
written in pieces when one piece is no word of its own (`o wei`, `oy vey`).
Lexeme is one Family, not a synonym for Lemma.
_Avoid_: multiword Lexeme, for a unit with several Heads

**Locution**:
A Lemma with two or more Heads: `den Faden verlieren`, `weißer Rabe`, `zum
Teil`, `entweder … oder`, `von … an`, `herzlichen Dank`. Its Kind is the part of
speech the whole acts as, and it inflects like a Lexeme of that Kind, narrowed
to what the Locution varies. Changes grammar makes to the articles, number and
possessives of its other words keep the Lemma (`Die Entscheidung wurde
getroffen`); a change of word breaks it.
_Avoid_: Phraseme, multiword expression, fixed expression

**Saying**:
A complete saying, a Family with the one Kind `Saying`: a Proverb (`Morgenstund
hat Gold im Mund`) or a Winged Word (`Sein oder Nichtsein`). Its Canonical Form
is written as a sentence without final punctuation (`Wer rastet, der rostet`).
_Avoid_: Phraseme, Aphorism, Quotation

**Winged Word**:
A line from a known source that speakers use apart from it, verbatim, shortened
or varied: the *geflügeltes Wort*. A line nobody takes up is not a Saying.
_Avoid_: Aphorism, Quotation, Cultural Quotation

**Head**:
A member of a unit that is a word of its own there, as opposed to a
satellite. A Lexeme has one; a Locution has two or more.

**Member Role**:
What a member is inside its unit: Head, or a satellite such as an article,
auxiliary or governed preposition. It states the Rule that tells a Lexeme
from a Locution and is not recorded on the Attestation; where a consumer
needs one member, a targeted evidence field names it (`articleEvidence`,
`valencyEvidence`). An Article belongs to the Head of the phrase it opens:
the noun, or the word standing in for an elided noun (`[den, roten]`).

**Breakdown**:
The Lexemes a Locution or Saying is made of, each a real Reading, reached
from the multiword Lemma's Note (`den Faden verlieren`: `Faden`,
`verlieren`). It belongs to the Lemma, not to an occurrence.
_Avoid_: components, drill-down segmentation

**Canonical Form**:
The normalized form that names a Lemma and participates in its identity. It
takes the word's lexical casing, never its position: sentence-initial `Wegen`
is the Lemma `wegen`. An open slot in a discontinuous form is `…` (U+2026)
with a space on each side: `um … willen`. ASCII `...` is accepted on input and
stored as `…`.
_Avoid_: Citation Form, Lemma Form

**Family**:
The broad grammatical class of a Lemma: Lexeme, Locution, Saying, or Morpheme.
A route is language, Family and Kind, and that triple is unique; the same Kind
may appear in two Families (Lexeme VERB, Locution VERB).
_Avoid_: Entry Family

**Kind**:
The concrete subtype of a Lemma within its Family, such as NOUN, VERB, Prefix,
or Saying.
_Avoid_: Entry Subkind

**Core Features**:
The grammatical features that belong to a Lemma's identity; the rest
describe its Surfaces. Each language, Family and Kind decides which features
are Core by what serves the learner best, so the same feature can be Core on
one route and inflectional on another.
_Avoid_: Inherent Features

**Comparability**:
A Core Feature of German and English ADV and ADJ Lemmas. It says whether the
Lemma has comparison forms of its own. Inflected forms count (`schneller`,
`faster`), and so do suppletive ones (`lieber` for `gern`, `better` for `good`).
Periphrastic `more` does not count. Every Surface of a comparable Lemma marks
Degree, including `Pos` on a citation. No Surface of a non-comparable Lemma
(`hier`, `tot`) marks Degree.
_Avoid_: Gradability

**Paradigm Cell**:
One combination of case, number, gender or reflexivity in a closed, authored
paradigm. In a pillar, a paradigm whose forms cannot be derived from another
paradigm, each cell is its own Lemma with one Reading: German `mich` and
`mir`, accusative and dative `uns`, `dem` and `den`; English `me` and `my`. A
word made of a stem and another paradigm's endings, such as `dieser`, `mein`
or `jemand`, is one Lemma, and its cells are Surfaces. Open classes keep these
features on the Surface.
_Avoid_: Paradigm form, inflected closed-class Surface

**Spelling Crossroad**:
A projection with no identity that gathers every Reading whose Lemma's
Canonical Form has one spelling in one language, compared without case. `die`
gathers its DET and PRON cells; `essen` gathers the verb and the noun `Essen`.
Surface spellings, including Typo and Variant spellings, never form one.
_Avoid_: Headword, Vocable, Page, Homograph Set

**Surface**:
A reusable grammatical form that realizes exactly one Lemma under one analysis.
It carries its normalized form, its spelling (Canonical or a Variant), and
applicable inflectional features. A German or English noun Surface is the
noun's own letters and says nothing about its article; `books` is one Surface. A German noun whose Lemma
has no gender, such as an adjectival noun for a person (`Reisende`), marks on
a singular Surface the gender its form shows. Hebrew keeps `definite`. A
proper noun canonically cited with its article (`die Schweiz`) has
`article: Definite` as a Core Feature; one cited bare (`Berlin`) has none.
Verbal subject expletives are composition expressed by
grammatical features. Component values are derived separately. The Lemma
remains the bare noun or ordinary verb.

**Variant**:
A spelling of a Surface's Lemma that is neither its standard spelling nor a
mistake; a mistake is a Typo member. It is Licensed when a current standard
accepts it, national standards included (`zwo`, `auf Grund`, British
`colour`); Historical when only an earlier standard did (`daß`,
`Photographie`); Regional when it is a dialect or regional form outside the
standard (`nit`, `nedd`); and Expressive when letters are stretched for effect
(`ohhh`, `boahhh`). Every other Surface is spelled Canonical, an archaic
inflected form (`ward`) included: its age is historical status, not spelling.
_Avoid_: licensed variant, for Variant in general

**Grundform**:
A Surface's realization of its particular Lemma's canonical grammatical form.
A Variant spelling of any type may realize Grundform. The applicable
inflectional features depend on the language, Family, Kind, and sometimes the
particular Lemma.
_Avoid_: Surface Kind, stored Citation/Inflection discriminator

**Attestation**:
A fleeting occurrence of one Surface, represented by ordered attested members
and Full or Partial Realization Coverage. It has value equality but no durable
identity. A member's orthography is Standard, Typo, Fused or Shorthand. An
article is an Article member of its Head, fused or not: `im Wald` attests
`[m, Wald]` with Full coverage, and the article must agree with the Head's
case, number and gender. A shared article gives Partial coverage and stays
article evidence, not a member. A component with no letters of its own, such as the
hidden article in Hebrew `בבית`, leaves its owner Partial, pointing at the
Fusion component. German verbal Attestations retain
subject-expletive source orthography as evidence for an owned member. Every
German governor (verb, adjective, noun, Locution) records the
valency slots the occurrence realizes as valency evidence, each naming by
index the owned member that realizes it, such as the governed preposition. A
governed preposition is an owned member but not a Fixed one, so the
normalized Surface leaves it out: `wartet`, not `wartet auf`; `stolz`, not
`stolz auf`. A Hebrew or English governor (verb, adjective, noun, Locution) may
record valency evidence the same way, with no realized case. A German ADP
Attestation records the case its complement took
as its realized case: `auf dem Tisch` Dat, `auf den Tisch` Acc, `wegen dem
Regen` Dat. A Modification is attested with Partial coverage.
_Avoid_: Selection, click result, selected Surface

**Modification**:
A deliberate change to a Saying's or Locution's wording that still attests it:
the kept words are members and the replacing words resolve on their own. A
Saying accepts any (`Kaffee oder Tee, das ist hier die Frage`). A Locution
accepts only a fixed word expanded into a compound it heads: `Er biss ins
Kunstgras` attests `ins Gras beißen` over `[biss, in, s]`.
_Avoid_: variant, for a changed word

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
reflexive, a Locution's wording. A frame never creates a Lemma or a Reading:
`warten` with and without `auf` is one Reading whose `auf` Slot is Optional.
_Avoid_: valency pattern, Satzbauplan, argument structure, governed
prepositions

**Slot**:
One complement in a Valency Frame, Required or Optional. Each language
defines its complements, and each route chooses which it allows. German
marks them by case: a bare case (`jemandem`, Dat) or a governed preposition
with the case it assigns (`auf` + Acc), each with a referent of Someone,
Something or Either. Hebrew marks them by function and preposition, with no
case: Subject, DirectObject, or a governed preposition (`סמך על`). English
marks them by position and preposition, with no case: Hebrew's set plus
IndirectObject (`him` in `give him a book`), and `depend on` has a governed
`on`. The subject is a Slot too; in German it is a Nom Slot, and a
subjectless verb (`mir graut vor`) has none. Which cases a German preposition takes is
dumspec's ADP Case Table, not part of the model.
_Avoid_: argument, valent, complement slot, Ergänzung

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
A Locution whose verb only supports its noun or adjective predicate: `eine
Entscheidung treffen`, `Angst haben`, `geltend machen`. A combination whose
meaning is literal (`starker Raucher`, `Zähne putzen`) is ordinary Lexemes.
_Avoid_: Idiom, Phraseme, weak collocation as a unit

**Idiom**:
A Locution whose meaning is not the sum of its words: `ins Gras beißen`,
`weißer Rabe`, `unter vier Augen`. Idiom and Collocation are Reading Knowledge,
not Kinds.
_Avoid_: Phraseme

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
