# Dumling

Dumling names the language-specific grammatical entities and foundational
semantic values that learner text resolves to. Each entry links the ADRs that
hold the term's precise definition, edge cases and examples.

## Language

### Grammatical identity

**Lemma**:
A grammatical entity whose identity is its language, Family, Kind, Core
Features and Canonical Form. Its Readings carry meaning and its Surfaces carry
inflection. See [ADR 0002].
_Avoid_: Linguistic Entry, Lemma Form, dictionary entry

**Lexeme**:
A Lemma with exactly one Head; its other members are satellites
([ADR 0039]). Lexeme is one Family, not a synonym for Lemma.
_Avoid_: multiword Lexeme, for a unit with several Heads

**Locution**:
A Lemma with two or more Heads, such as `den Faden verlieren` or `zum Teil`.
Its Kind is the part of speech the whole acts as. See [ADR 0039].
_Avoid_: Phraseme, multiword expression, fixed expression

**Saying**:
A Family with the one Kind `Saying`: a complete saying, either a Proverb or a
Winged Word. See [ADR 0039].
_Avoid_: Phraseme, Aphorism, Quotation

**Foreign**:
A Family with the one Kind `Foreign`, for material in another language than
the text's: a word, or a phrase fixed in its source language. A loan the text
language has taken in is a Lexeme instead. See [ADR 0045].
_Avoid_: X, loanword, code-switch

**Winged Word**:
A Saying that comes from a known source and is used apart from it: the
*geflügeltes Wort*. See [ADR 0039].
_Avoid_: Aphorism, Quotation, Cultural Quotation

**Head**:
A member of a unit that is a word of its own there, as opposed to a
satellite. A Lexeme has one; a Locution has two or more. See [ADR 0039].

**Member Role**:
What a member is inside its unit: its Head, or a satellite such as an
article, auxiliary or governed preposition. Member Roles state the Rule that
tells a Lexeme from a Locution, and the Attestation does not record them. See
[ADR 0039], [ADR 0040] and [ADR 0041].

**Breakdown**:
The Lexemes a Locution or Saying is made of, each a real Reading, reached
from the multiword Lemma's Note. It belongs to the Lemma, not to an
occurrence. See [ADR 0041].
_Avoid_: components, drill-down segmentation

**Canonical Form**:
The normalized form that names a Lemma, in the casing a dictionary shows. It
takes part in the Lemma's identity without letter case ([ADR 0002]).
_Avoid_: Citation Form, Lemma Form

**Family**:
The broad grammatical class of a Lemma: Lexeme, Locution, Saying, Foreign or
Morpheme. Language, Family and Kind together name a route, and a Kind name
may repeat across Families. See [ADR 0039].
_Avoid_: Entry Family

**Kind**:
The concrete subtype of a Lemma within its Family, such as NOUN, VERB,
Prefix, Saying or Foreign. See [ADR 0039].
_Avoid_: Entry Subkind

**Feature Pool**:
The one catalog of grammatical features, after UD and narrowed per language,
that Core Features and a Surface's inflectional features draw from. The
Attestation, the Reading and Knowledge use vocabularies of their own. See
[ADR 0032].
_Avoid_: feature, for an Attestation, Reading or Knowledge field

**Core Features**:
The Feature Pool features that belong to a Lemma's identity; the rest of its
route's features describe its Surfaces. Each route chooses its Core Features
by what serves the learner. See [ADR 0032].
_Avoid_: Inherent Features

**Comparability**:
A Core Feature of German and English ADV and ADJ Lemmas: whether the Lemma
has comparison forms of its own. It decides whether the Lemma's Surfaces mark
Degree. See [ADR 0042].
_Avoid_: Gradability

**Paradigm Cell**:
One combination of case, number, gender or reflexivity in a closed, authored
paradigm. Depending on the paradigm, a cell is a Lemma of its own (`mir`,
`mich`) or a Surface of one Lemma such as `dieser`. See [ADR 0032] and
[ADR 0044].
_Avoid_: Paradigm form, inflected closed-class Surface

**Spelling Crossroad**:
A projection with no identity that gathers every Reading whose Lemma's
Canonical Form has one spelling in one language, compared without letter
case: `essen` gathers the verb and the noun `Essen`.
_Avoid_: Headword, Vocable, Page, Homograph Set

**Surface**:
A reusable grammatical form that realizes exactly one Lemma under one
analysis. It carries its normalized form, its spelling (Canonical or a
Variant) and the inflectional features its route allows. [ADR 0040] covers
noun Surfaces and [ADR 0022] verbal ones.

**Variant**:
A spelling of a Surface's Lemma that is neither its standard spelling nor a
mistake; a mistake is a Typo member. Its tags, such as Licensed or Regional,
say why it differs, and they combine. See [ADR 0041].
_Avoid_: licensed variant, for Variant in general; Variant type, for its tags

**Grundform**:
A Surface's realization of its particular Lemma's canonical grammatical form.
Each language's rules assess it from the Surface; it is never stored. See
[Dumling ADR 0002].
_Avoid_: Surface Kind, stored Citation/Inflection discriminator

**Attestation**:
A fleeting occurrence of one Surface: its ordered attested members, each with
an orthography, and Full or Partial Realization Coverage. It has value
equality but no durable identity. Members and coverage are in [ADR 0003],
orthography and Fusions in [ADR 0035], articles in [ADR 0040], evidence
fields in [ADR 0041], and valency evidence in [ADR 0034].
_Avoid_: Selection, click result, selected Surface

**Modification**:
A deliberate change to a Saying's or Locution's wording that still attests
it, with Partial coverage. The kept words are members, and the replacing
words resolve on their own. See [ADR 0039].
_Avoid_: variant, for a changed word

**Fusion**:
An occurrence value for one written word that realizes several grammatical
components, such as `im` for `in` and `dem`. It has value equality and no
durable identity, and nothing targets it with Knowledge or relations. Each
component belongs to exactly one Attestation. See [ADR 0027] and [ADR 0035].
_Avoid_: Construction, contraction Lemma, fused route, Clitic

**Fused**:
The orthography of a member whose letters are one piece of a written word
holding several words, such as `m` in `im`. See [ADR 0035].

**Shorthand**:
The orthography of a member written as a standalone shortened spelling of
one word, such as `'ne` or `z.B.`. See [ADR 0035].
_Avoid_: Variant, for a shortened article

### Semantic identity

**Reading**:
A foundational semantic value made from one Lemma and one Emoji Description,
compared within one dictionary scope. See [ADR 0002], and [ADR 0045] for
Foreign Readings.
_Avoid_: Meaning, Sense, Semantic Unit, dictionary entry

**Emoji Description**:
The stable, dictionary-scoped emoji label that tells the Readings of one
Lemma apart. See [ADR 0031].
_Avoid_: Mnemonic, Gloss, Sense ID

### Valency

**Valency Frame**:
The governed complements of one Reading, stored as an ordered list of Slots
in its Knowledge: what a learner must memorize to use the word in that sense.
A frame never creates a Lemma or a Reading. See [ADR 0034].
_Avoid_: valency pattern, Satzbauplan, argument structure, governed
prepositions

**Slot**:
One position in a Valency Frame, Required or Optional. Each language defines
its complements, and each route chooses which it allows. See [ADR 0034].
_Avoid_: argument, valent, complement slot, Ergänzung

### German classifications

**Verbal Participle**:
A participle in a perfect or a passive, which joins its auxiliary in one VERB
target. A participle used as an adjective is a Participial Adjective instead.
See [ADR 0036].
_Avoid_: state passive, as a verbal construction

**Modal Verb**:
A German modal such as `können` or `müssen`: a VERB Lexeme, one Lemma whether
it governs an infinitive or an object. See [ADR 0026].
_Avoid_: Modal auxiliary, modal AUX

**Auxiliary**:
A verb serving another verb's grammatical composition, such as `haben` in a
perfect, `werden` in a passive or causative `lassen`. An AUX Lexeme is one
such grammatical use with its own Reading; the same verb standing alone is a
VERB Lexeme. See [ADR 0026]; dumspec authors the AUX Readings ([ADR 0021]).
_Avoid_: lone auxiliary, copula AUX, per-form AUX Lemma

**Participial Adjective**:
A participle used as an adjective: an ADJ Lexeme whether lexicalized or not,
whose Reading names its verb as Participle Source (Dumrel). See [ADR 0036].
_Avoid_: productive participle and lexicalized participle, as a Kind contrast

**Collocation**:
A Locution whose verb only supports its noun or adjective predicate, such as
`eine Entscheidung treffen`. See [ADR 0039].
_Avoid_: Idiom, Phraseme, weak collocation as a unit

**Idiom**:
A Locution whose meaning is not the sum of its words, such as `ins Gras
beißen`. Idiom and Collocation are Reading Knowledge, not Kinds. See
[ADR 0039].
_Avoid_: Phraseme

**Free `sich`**:
The German reflexive `sich` as a unit of its own rather than a member of its
verb: the reflexive's Acc or Dat cell, in reciprocal use too. See [ADR 0044].
_Avoid_: Reciprocal `sich`, `pronType=Rcp` `sich`

**Standalone `einander`**:
The invariant German reciprocal pronoun `einander`: one Lemma, with case
unmarked. See [ADR 0044].
_Avoid_: Case-specific `einander`

**Reciprocal Pronominal Adverb**:
A German ADV Lexeme whose whole form joins a preposition to `einander`, such
as `miteinander` or `voneinander`. See [ADR 0029].
_Avoid_: `preposition + einander` PRON, reciprocal PRON compound

[ADR 0002]: ../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
[ADR 0003]: ../../docs/adr/0003-attestation-supersedes-selection-and-owns-realization-coverage.md
[ADR 0021]: ../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumspec.md
[ADR 0022]: ../../docs/adr/0022-describe-whole-verbal-surfaces-compositionally.md
[ADR 0026]: ../../docs/adr/0026-treat-modals-as-verbs-and-confine-aux-to-grammar-readings.md
[ADR 0027]: ../../docs/adr/0027-retire-the-construction-family.md
[ADR 0029]: ../../docs/adr/0029-keep-preposition-government-out-of-lemma-identity.md
[ADR 0031]: ../../docs/adr/0031-resolve-readings-through-the-emoji-description-alone.md
[ADR 0032]: ../../docs/adr/0032-choose-core-features-per-route-for-the-learner.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0035]: ../../docs/adr/0035-attest-articles-and-fused-words-segment-by-segment.md
[ADR 0036]: ../../docs/adr/0036-make-adjectival-german-participles-adj-linked-to-their-verb.md
[ADR 0039]: ../../docs/adr/0039-split-phrasemes-into-locutions-and-sayings.md
[ADR 0040]: ../../docs/adr/0040-make-the-article-a-satellite-of-its-phrase-head.md
[ADR 0041]: ../../docs/adr/0041-record-in-dumling-only-what-routing-and-drill-down-consume.md
[ADR 0042]: ../../docs/adr/0042-record-comparability-on-adv-and-adj-lemmas.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0045]: ../../docs/adr/0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md
[Dumling ADR 0002]: ./docs/adr/0002-assess-grundform-with-language-owned-rules.md
