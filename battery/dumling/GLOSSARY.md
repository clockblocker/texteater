# Dumling

Dumling names the language-specific grammatical entities and foundational
semantic values that learner text resolves to. Each entry links the ADRs that
hold the term's precise definition, edge cases and examples. Its terms are
language-neutral, and each language's classifications live in the
[Dumcorpus glossary](../dumcorpus/GLOSSARY.md).

## Language

### Grammatical identity

**Lemma**:
A grammatical entity whose identity is its language, Family, Kind, Core
Features and Canonical Form. Its Readings carry meaning, its Surfaces carry
inflection, and its Lemma Paradigm (Dumrel) names the alternatives its
Readings license. See [ADR 0002] and [ADR 0048].
_Avoid_: Linguistic Entry, Lemma Form, dictionary entry

**Lexeme**:
A Lemma with exactly one Head; its other members are satellites. Lexeme is
one Family, not a synonym for Lemma. See [ADR 0039].
_Avoid_: multiword Lexeme, for a unit with several Heads

**Locution**:
A Lemma with two or more Heads. Its Kind is the part of speech the whole acts
as. See [ADR 0039].
_Avoid_: Phraseme, multiword expression, fixed expression

**Collocation**:
A Locution whose verb only supports its noun or adjective predicate. See
[ADR 0039].
_Avoid_: Idiom, Phraseme, weak collocation as a unit

**Idiom**:
A Locution whose meaning is not the sum of its words. Idiom and Collocation
are values of a Reading's Locution Type (Dumrel), not Kinds. See [ADR 0039].
_Avoid_: Phraseme

**Saying**:
A Family with the one Kind `Saying`: a complete saying, either a Proverb or a
Winged Word. See [ADR 0039].
_Avoid_: Phraseme, Aphorism, Quotation

**Winged Word**:
A Saying that comes from a known source and is used apart from it. See
[ADR 0039].
_Avoid_: Aphorism, Quotation, Cultural Quotation

**Foreign**:
A Family with the one Kind `Foreign`, for material in another language than
the text's. See [ADR 0045].
_Avoid_: X, loanword, code-switch

**Head**:
A member of a unit that is a word of its own there, as opposed to a
satellite. See [ADR 0039].

**Member Role**:
What a member is inside its unit: its Head or a satellite. The Attestation
does not record it. See [ADR 0039] and [ADR 0041].

**Breakdown**:
A Reading's parts, stored as the Reading Knowledge aspect `breakdown: {
constituents, morphemes }`: its Constituents and its Morphemic Breakdown. It
belongs to the Reading, never to the Lemma or an occurrence. Its letters
spell the Canonical Form. See [ADR 0050] and [ADR 0051].
_Avoid_: components, drill-down segmentation, Morphological Tree, Lexical
Breakdown

**Constituents**:
A Reading's immediate parts, one level down, in `breakdown.constituents`: the
parts of a Compound, an affixal derivation, a particle verb or a phraseme.
Each part shows letters of the wording and links to a Unit Shadow (Dumrel)
or a Lemma, never a Reading. A part is a word, a Morpheme, or inside a
phraseme the biggest unit strictly inside its wording, which may be a
Locution. See [ADR 0050].
_Avoid_: morpho-lexemic breakdown, Lexical Breakdown, Wortzerlegung, parts
list

**Compound**:
A word built from two or more words, sometimes joined by an Interfix:
`Kohle + Kraftwerk`, `Gast + -e- + Haus`. Its Constituents show its immediate
parts. It is a Lexeme, not a Family or Kind of its own. See [ADR 0050].
_Avoid_: compound Kind, Kompositum, for a Lemma class

**Morphemic Breakdown**:
Every Morpheme of a single-word Lexeme's Reading, flat, in
`breakdown.morphemes`, labelled as school morphemic analysis labels them:
Prefix, Root, Suffix, Interfix, Ending. Each label is the linked Morpheme's
Kind. `segment.inMorphemes` (Dumgen) splits bottom words; every other word's
is propagated from its Constituents or Source (Dumrel). See [ADR 0051].
_Avoid_: Morphological Tree, morpheme tree, morphological breakdown

**Morpheme**:
A Lemma of the Morpheme Family. Like a Lexeme it has Surfaces and Readings:
its allomorphs are its Surfaces (`-keit` and `-igkeit` of `-heit`), and a
Root has a generated Reading of its own. See [ADR 0051].
_Avoid_: allomorph Lemma; Variant, for an allomorph

**Ending**:
The Morpheme Kind of a word's inflectional ending in its Canonical Form, a
zero ending (∅) included. Only the Morphemic Breakdown shows it; an
indeclinable word has none. See [ADR 0051].
_Avoid_: inflectional suffix, Flexionsendung as a Suffix

**Canonical Form**:
The normalized form that names a Lemma. It never holds valency: no
placeholder, no governed preposition and no lexical reflexive (`erinnern`,
not `sich erinnern`). See [ADR 0002] and [ADR 0052].
_Avoid_: Citation Form, Lemma Form

**Family**:
The broad grammatical class of a Lemma: Lexeme, Locution, Saying, Foreign or
Morpheme. Language, Family and Kind together name a route. See [ADR 0039].
_Avoid_: Entry Family

**Kind**:
The concrete subtype of a Lemma within its Family. See [ADR 0039].
_Avoid_: Entry Subkind

**Feature Pool**:
The one catalog of grammatical features that Core Features and a Surface's
inflectional features draw from. See [ADR 0032].
_Avoid_: feature, for an Attestation, Reading or Knowledge field

**Core Features**:
The Feature Pool features that belong to a Lemma's identity; the rest of its
route's features describe its Surfaces. See [ADR 0032].
_Avoid_: Inherent Features

**Comparability**:
A Core Feature of ADV and ADJ Lemmas: whether the Lemma has comparison forms
of its own. See [ADR 0042].
_Avoid_: Gradability

**Paradigm Cell**:
One combination of case, number and gender in a closed, authored paradigm.
It is identity, unlike a Table Cell. See [ADR 0032] and [ADR 0044].
_Avoid_: Paradigm form, inflected closed-class Surface

**Syncretism**:
A generated unit for one spelling that realizes two or more units of one
route that only the referent tells apart. See [ADR 0046].
_Avoid_: clash, clashed members, merged cell, gender-null cell

**Spelling Crossroad**:
A projection with no identity that gathers every Lemma whose Canonical Form,
and every met Surface whose form, has one `canonicalFormKey` in one language.
That key folds letter case by the language's own rules (`foldCase`), so
variant spellings such as Kuss and Kuß have different keys and stay apart. A
Crossroad holds no data and has no stored record; hosts own whatever they show
for it.
_Avoid_: Headword, Vocable, Page, Homograph Set

**Surface**:
A reusable grammatical form that realizes exactly one Lemma under one
analysis. A Morpheme's Surfaces are its allomorphs, spelled Canonical. See
[ADR 0040] for nouns, [ADR 0022] for verbs and [ADR 0051] for Morphemes.

**Variant**:
A spelling of a Surface's Lemma that is neither its standard spelling nor a
mistake. It is not a Paradigm Variant (Dumrel). See [ADR 0041].
_Avoid_: licensed variant, for Variant in general; Variant type, for its tags

**Attestation**:
A fleeting occurrence of one Surface: its attested members and its
Realization Coverage. It has no durable identity. See [ADR 0003], [ADR 0034],
[ADR 0035], [ADR 0040] and [ADR 0041].
_Avoid_: Selection, click result, selected Surface

**Modification**:
A deliberate change to a Saying's or Locution's wording that still attests
it. See [ADR 0039].
_Avoid_: variant, for a changed word

**Fusion**:
An occurrence value for one written word that realizes several grammatical
components. It has no durable identity. See [ADR 0027] and [ADR 0035].
_Avoid_: Construction, contraction Lemma, fused route, Clitic

**Fused**:
The orthography of a member whose letters are one piece of a written word
holding several words. See [ADR 0035].

**Shorthand**:
The orthography of a member written as a standalone shortened spelling of
one word. See [ADR 0035].
_Avoid_: Variant, for a shortened article

### Semantic identity

**Reading**:
A foundational semantic value made from one Lemma and one Emoji Description,
compared within one dictionary scope. See [ADR 0002] and [ADR 0045].
_Avoid_: Meaning, Sense, Semantic Unit, dictionary entry

**Emoji Description**:
The stable, dictionary-scoped emoji label that tells the Readings of one
Lemma apart. See [ADR 0031].
_Avoid_: Mnemonic, Gloss, Sense ID

### Valency

**Valency Frame**:
The governed complements of one Reading, an ordered list of Slots in its
Knowledge, a lexical reflexive included. It never creates a Lemma or a
Reading; a Required Reflexive Slot (Dumrel) shows in the Emoji Description as
🪞. See [ADR 0034] and [ADR 0052].
_Avoid_: valency pattern, Satzbauplan, argument structure, governed
prepositions

**Slot**:
One position in a Valency Frame, Required or Optional, holding one complement
or alternatives that can replace each other. See [ADR 0034].
_Avoid_: argument, valent, complement slot, Ergänzung

### Inflection tables

**Table Schema**:
A route's label-free layout of its inflection tables: panels of rows and
columns over Feature Pool bundles, each panel core or not. A language's
Inflection Pack (Dumcorpus) supplies it. See [ADR 0049].
_Avoid_: paradigm schema, table template, labelled table

**Table Cell**:
One cell of a Table Schema, named by its Cell Key: its feature bundle reduced
to the schema's key features. It is never a Lemma, a Surface or a Paradigm
Cell. See [ADR 0049].
_Avoid_: Paradigm Cell, slot

[ADR 0002]: ../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
[ADR 0003]: ../../docs/adr/0003-attestation-supersedes-selection-and-owns-realization-coverage.md
[ADR 0022]: ../../docs/adr/0022-describe-whole-verbal-surfaces-compositionally.md
[ADR 0027]: ../../docs/adr/0027-retire-the-construction-family.md
[ADR 0031]: ../../docs/adr/0031-resolve-readings-through-the-emoji-description-alone.md
[ADR 0032]: ../../docs/adr/0032-choose-core-features-per-route-for-the-learner.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0035]: ../../docs/adr/0035-attest-articles-and-fused-words-segment-by-segment.md
[ADR 0039]: ../../docs/adr/0039-split-phrasemes-into-locutions-and-sayings.md
[ADR 0040]: ../../docs/adr/0040-make-the-article-a-satellite-of-its-phrase-head.md
[ADR 0041]: ../../docs/adr/0041-judge-dumling-fields-by-the-learner-and-by-classification.md
[ADR 0042]: ../../docs/adr/0042-record-comparability-on-adv-and-adj-lemmas.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0045]: ../../docs/adr/0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md
[ADR 0046]: ../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[ADR 0048]: ../../docs/adr/0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md
[ADR 0049]: ../../docs/adr/0049-tabulate-a-lemmas-forms-as-projections.md
[ADR 0050]: ../../docs/adr/0050-break-a-reading-down-into-its-constituents.md
[ADR 0051]: ../../docs/adr/0051-copy-school-morphemic-analysis-into-a-readings-morphemes.md
[ADR 0052]: ../../docs/adr/0052-record-a-lexical-reflexive-on-the-reading-never-in-the-canonical-form.md
