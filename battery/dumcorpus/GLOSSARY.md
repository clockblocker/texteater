# Dumcorpus

Dumcorpus connects the Dumling model to real language: it owns the gold
Dumgen is scored against, the classification Rules ([ADR 0037]) and the
Authored Inventories ([ADR 0021]). Each entry links the ADRs that hold the
term's precise definition, edge cases and examples, and each language's
classification terms have a section of their own. The
[Emoji Description conventions] say how Reading gold is written.

## Language

**Authored Inventory**:
A language's closed-class units, authored instead of generated, each Reading
with its reviewed Knowledge. They are model content, not gold. See
[ADR 0021], [ADR 0041] and [ADR 0046].
_Avoid_: Fixed Catalog (Dumgen's term), closed set, catalog member

**Grammatical Navigation**:
Selection of an Authored Inventory's reviewed members by preserving fixed
Core Features and varying explicitly named coordinates. See [ADR 0019].

**ADP Case Table**:
A language's closed, authored list of its adpositions with the cases each
takes. See [ADR 0034] and [ADR 0041].
_Avoid_: governed case, governedCase, case government feature

**Grundform**:
A Surface's realization of its Lemma's canonical grammatical form, assessed
by each language's citation conventions and never stored. See
[Dumcorpus ADR 0001].
_Avoid_: Surface Kind, stored Citation/Inflection discriminator

**Spec Record**:
One sentence of the golden corpus with its Segments and annotated targets.
See [ADR 0037].
_Avoid_: case, example, gold case, fixture

**Breakdown Record**:
One Locution's or Saying's Breakdown (Dumling) as gold for
`segment.inLexemes`. See [ADR 0041] and [Dumgen ADR 0007].
_Avoid_: inner layer, component record

**Coverage**:
How much of a Spec Record's sentence its targets and No Target entries
annotate: Full or Partial. It is not an Attestation's Realization Coverage
(Dumling). See [ADR 0037].
_Avoid_: completeness

**Knowledge Coverage**:
Which Reading Knowledge aspects of a target a person has reviewed, each
Authored or reviewed and empty; an aspect left out is unreviewed. See
[Dumcorpus ADR 0002].
_Avoid_: Coverage (a Segmentation's), completeness

**No Target**:
ResolvableText Segments with no defensible route, recorded with a reason.
It is annotation, not a gap. See [ADR 0037].
_Avoid_: Unresolved, skipped Segment

**Rule**:
A classification principle written for people in a few sentences, with the
ADRs it rests on, the routes it applies to and the Spec Records that show it.
See [ADR 0037].
_Avoid_: criterion, judgment, prompt paragraph

**Rule Citation**:
A record's or Dumgen prompt paragraph's reference to a Rule, pinned to the
statement it was last checked against. See [ADR 0037].

**Annotation Layer**:
One of the four parts of a record's annotation that a person reviews in turn:
Segmentation, Attestation, Reading and Knowledge. See [ADR 0037].
_Avoid_: level, tier

**Review Depth**:
The deepest Annotation Layer a person has checked, every layer before it
included. A record with none is a Draft. See [ADR 0037].
_Avoid_: verified, isVerified, Review Status

**Text Record**:
One raw text as a reader supplies it, with what intake should make of it.
See [ADR 0037].
_Avoid_: intake item, intake case

**Imported Case**:
A Dumgen case a Spec Record or Text Record keeps verbatim until it is
reshaped into the record's own fields. See [ADR 0037].
_Avoid_: migrated case, fixture

**Worklist**:
The records that need work before they can be reviewed. See [ADR 0037].
_Avoid_: backlog, review queue

**Provenance**:
Where a Spec Record's sentence comes from: Authored for the corpus, or Quoted
from a work. See [ADR 0037].
_Avoid_: source, which names the ADRs and Rules a record cites

### German classifications

**Modal Verb**:
A modal such as `können`: a VERB Lexeme, never AUX. See [ADR 0026].
_Avoid_: Modal auxiliary, modal AUX

**Auxiliary**:
A verb serving another verb's grammatical composition. An AUX Lexeme is one
such use with its own Reading, authored in an Authored Inventory. See
[ADR 0026] and [ADR 0021].
_Avoid_: lone auxiliary, copula AUX, per-form AUX Lemma

**Verbal Participle**:
A participle in a perfect or a passive, which joins its auxiliary in one VERB
target. See [ADR 0036].
_Avoid_: state passive, as a verbal construction

**Participial Adjective**:
A participle used as an adjective: an ADJ Lexeme whose Reading names its verb
as Participle Source (Dumrel). See [ADR 0036].
_Avoid_: productive participle and lexicalized participle, as a Kind contrast

**Free `sich`**:
The reflexive `sich` as a unit of its own rather than a member of its verb.
See [ADR 0044].
_Avoid_: Reciprocal `sich`, `pronType=Rcp` `sich`

**Standalone `einander`**:
The invariant reciprocal pronoun `einander`: one Lemma, with case unmarked.
See [ADR 0044].
_Avoid_: Case-specific `einander`

**Reciprocal Pronominal Adverb**:
An ADV Lexeme whose whole form joins a preposition to `einander`. See
[ADR 0029].
_Avoid_: `preposition + einander` PRON, reciprocal PRON compound

**Plural Pattern**:
How a German noun forms its plural from its singular. It is derived from the
plural forms a NOUN Reading's Knowledge stores and never splits a Lemma. See
[ADR 0038].
_Avoid_: plural class, declension class

**Conjugation Class**:
How a German verb forms its Präteritum: Strong, Weak or Mixed. A VERB
Reading's Knowledge stores it, and it never splits a Lemma. See [ADR 0038].
_Avoid_: verb type, irregular verb, Verbklasse

**Stand-in**:
The adverb that names a German Adverbial complement in a Valency Frame
(Dumling), as E-VALBU substitutes it. See [ADR 0034].
_Avoid_: meaning (that belongs to the Reading), Kadv subclass

**Predicative**:
A German complement that describes its subject or object. See [ADR 0034].
_Avoid_: prepositional object, for the `für` or `als` phrase

**Correlate**:
The `es` or `da(r)-` word that anticipates a German Clause complement in its
Slot. It is a unit of its own. See [ADR 0034].
_Avoid_: expletive `es` (an expletive fills no Slot), placeholder

[ADR 0019]: ../../docs/adr/0019-select-grammatical-alternatives-from-reviewed-members.md
[ADR 0021]: ../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md
[ADR 0026]: ../../docs/adr/0026-treat-modals-as-verbs-and-confine-aux-to-grammar-readings.md
[ADR 0029]: ../../docs/adr/0029-keep-preposition-government-out-of-lemma-identity.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0036]: ../../docs/adr/0036-make-adjectival-german-participles-adj-linked-to-their-verb.md
[ADR 0037]: ../../docs/adr/0037-make-dumcorpus-own-the-golden-corpus-and-classification-rules.md
[ADR 0038]: ../../docs/adr/0038-store-german-inflection-classes-as-reading-knowledge.md
[ADR 0041]: ../../docs/adr/0041-record-in-dumling-only-what-routing-and-drill-down-consume.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0045]: ../../docs/adr/0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md
[ADR 0046]: ../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[Dumcorpus ADR 0001]: ./docs/adr/0001-assess-grundform-with-language-owned-rules.md
[Dumcorpus ADR 0002]: ./docs/adr/0002-count-a-knowledge-aspect-left-out-of-coverage-as-unreviewed.md
[Dumgen ADR 0007]: ../dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[Emoji Description conventions]: ./docs/reference/emoji-description-conventions.md
