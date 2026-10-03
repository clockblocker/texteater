# Dumspec

Dumspec connects the Dumling model to real language. It owns all the gold
Dumgen is scored against: annotated sentences with their Knowledge and Emoji
Description gold, raw texts for intake, and the classification Rules
([ADR 0037]). It also owns the Authored Inventories ([ADR 0021]). Dumling
holds only the model's types and schemas. Dumgen and the docs site read
Dumspec; neither owns it. Each entry links the ADRs that hold the term's
precise definition, edge cases and examples, and each language's
classification terms have a section of their own. The
[Emoji Description conventions] say how Reading gold is written.

## Language

**Authored Inventory**:
A language's closed-class units that are authored instead of generated, each
Reading with its reviewed Knowledge. They are the model's content, not gold:
no run is scored against them. A Note's drill-down reaches an article,
auxiliary or reflexive in them without generation. Each pronoun form whose
cells only the referent tells apart also has Syncretisms (Dumling),
generated from those cells and never authored. The inventories are in
[`src/inventories/`][inventories], one directory per language. See
[ADR 0021], [ADR 0041] and [ADR 0046].
_Avoid_: Fixed Catalog (Dumgen's term for the members that bound a Closed
Route), closed set, catalog member

**Grammatical Navigation**:
Selection of an Authored Inventory's reviewed members by preserving fixed
Core Features and varying explicitly named coordinates. See [ADR 0019].

**ADP Case Table**:
A language's closed, authored list of its adpositions with the cases each
takes. The cases are a fact about the language, so no ADP Lemma records them.
Dumspec checks each adposition occurrence's case and each Governor's
Preposition Slot (Dumrel) against the table. See [ADR 0034] and [ADR 0041].
_Avoid_: governed case, governedCase, case government feature

**Spec Record**:
One sentence of the golden corpus with its Segments and targets. Each target
names its member Segments and route and, as review deepens, its Dumling
Attestation and its Reading's Emoji Description; the Reading may carry its
Reading Knowledge (Dumrel). A record's path is its identity. See [ADR 0037].
_Avoid_: case, example, gold case, fixture

**Breakdown Record**:
One Locution's or Saying's Breakdown (Dumling), the gold for
`segment.inLexemes`: the Lemma's wording as a sentence, broken down into
Lexeme targets that each name their Reading. `segment.inLexemes` is deferred
for now, so no run is scored against this gold. See [ADR 0041] and
[Dumgen ADR 0007].
_Avoid_: inner layer, component record

**Coverage**:
How much of a Spec Record's sentence its Segmentation annotates: Full when
every ResolvableText Segment is in exactly one target or No Target entry,
Partial otherwise. It is not an Attestation's Realization Coverage (Dumling). See
[ADR 0037].
_Avoid_: completeness

**Knowledge Coverage**:
Which Reading Knowledge aspects of a target a person has covered, each
Authored or reviewed and empty, as an Authored Inventory records them. An
aspect left out is unreviewed, so an aspect a Knowledge Policy (Dumrel) adds
later never reads as empty. A record's Knowledge layer is complete when every
target covers the structural aspects its route requests, and a Reading in
several records carries one value. Decided on
[#884](https://github.com/clockblocker/texteater/issues/884).
_Avoid_: Coverage (a Segmentation's), completeness

**No Target**:
ResolvableText Segments with no defensible route, recorded with the authored
reason: a nonce word or a word broken off, and a nonce noun together with the
article it owns, `[der, Blarg]` ([ADR 0040]). It is annotation, not a gap, so
it counts toward Full Coverage. Foreign-language material has a route,
Foreign ([ADR 0045]). See [ADR 0037].
_Avoid_: Unresolved, skipped Segment

**Rule**:
A classification principle written for people in a few sentences, with the
ADRs it rests on, the routes it applies to and the Spec Records that show it.
Those records hold its boundary cases. Dumgen's prompts implement and cite
Rules without sharing their wording. See [ADR 0037].
_Avoid_: criterion, judgment, prompt paragraph

**Rule Citation**:
A record's or Dumgen prompt paragraph's reference to a Rule, pinned to the
statement it was last checked against. Rewording the Rule makes the citation
stale until someone re-checks the citing text. See [ADR 0037].

**Annotation Layer**:
One of the four parts of a record's annotation that a person reviews in turn,
each resting on the ones before it: Segmentation, Attestation, Reading and
Knowledge. Segmentation is what `segment.inUnits` returns, not a morpheme
segmentation. See [ADR 0037].
_Avoid_: level, tier

**Review Depth**:
The deepest Annotation Layer a person has checked against the ADRs and Rules
the record cites, every layer before it included. A record with none is a
Draft; a Text Record is Draft or Reviewed as a whole. A reviewed layer must
pass the current Dumling model, and a model change that breaks one lowers the
depth. See [ADR 0037].
_Avoid_: verified, isVerified, Review Status

**Text Record**:
One raw text as a reader supplies it, before intake makes a Segmented
Sentence of it, and what intake should make of it. Its path is its identity.
See [ADR 0037].
_Avoid_: intake item, intake case

**Imported Case**:
A Dumgen case a Spec Record or Text Record keeps verbatim until it is
reshaped into the record's own fields. See [ADR 0037].
_Avoid_: migrated case, fixture

**Worklist**:
The records that need work: those whose Draft layers fail the current
Dumling model or lack a target's Attestation or Reading, and those holding
Imported Cases. See [ADR 0037].
_Avoid_: backlog, review queue

**Provenance**:
Where a Spec Record's sentence comes from: Authored for the corpus, or Quoted
from a work. See [ADR 0037].
_Avoid_: source, which names the ADRs and Rules a record cites

### German classifications

**Modal Verb**:
A modal such as `können` or `müssen`: a VERB Lexeme, one Lemma whether it
governs an infinitive or an object. See [ADR 0026].
_Avoid_: Modal auxiliary, modal AUX

**Auxiliary**:
A verb serving another verb's grammatical composition, such as `haben` in a
perfect, `werden` in a passive or causative `lassen`. An AUX Lexeme is one
such grammatical use with its own Reading; the same verb standing alone is a
VERB Lexeme. See [ADR 0026]. The AUX Readings are an Authored Inventory
([ADR 0021]).
_Avoid_: lone auxiliary, copula AUX, per-form AUX Lemma

**Verbal Participle**:
A participle in a perfect or a passive, which joins its auxiliary in one VERB
target. A participle used as an adjective is a Participial Adjective instead.
See [ADR 0036].
_Avoid_: state passive, as a verbal construction

**Participial Adjective**:
A participle used as an adjective: an ADJ Lexeme whether lexicalized or not,
whose Reading names its verb as Participle Source (Dumrel). See [ADR 0036].
_Avoid_: productive participle and lexicalized participle, as a Kind contrast

**Free `sich`**:
The reflexive `sich` as a unit of its own rather than a member of its verb:
the reflexive's Acc or Dat cell, in reciprocal use too. See [ADR 0044].
_Avoid_: Reciprocal `sich`, `pronType=Rcp` `sich`

**Standalone `einander`**:
The invariant reciprocal pronoun `einander`: one Lemma, with case unmarked.
See [ADR 0044].
_Avoid_: Case-specific `einander`

**Reciprocal Pronominal Adverb**:
An ADV Lexeme whose whole form joins a preposition to `einander`, such as
`miteinander` or `voneinander`. See [ADR 0029].
_Avoid_: `preposition + einander` PRON, reciprocal PRON compound

**Plural Pattern**:
How a German noun forms its plural from its singular, such as umlaut + `-er`
in `Haus`, `Häuser`. A NOUN Reading's Knowledge stores its plural forms
(Dumrel), and each form's pattern is derived from them, never stored. It
never splits a Lemma: `Mutter` 👩 `Mütter` and 🔩 `Muttern` are two Readings
of one Lemma. See [ADR 0038].
_Avoid_: plural class, declension class (declension covers the singular too)

**Conjugation Class**:
How a German verb forms its Präteritum, judged on the stem: Strong, Weak or
Mixed. A VERB Reading's Knowledge stores every class its Präteritum forms
attest (Dumrel). It never splits a Lemma: `wiegen` 'weigh' (`wog`) and 'rock'
(`wiegte`) are two Readings of one Lemma. See [ADR 0038].
_Avoid_: verb type, irregular verb, Verbklasse

**Stand-in**:
The adverb that names a German Adverbial complement in a Valency Frame
(Dumling), as E-VALBU substitutes it: `irgendwo` for `wohnen`, `irgendwohin`
for `legen`, `irgendwie lange` for `dauern`. A preposition inside the
complement it stands for is free. See [ADR 0034].
_Avoid_: meaning (that belongs to the Reading), Kadv subclass

**Predicative**:
A German complement that describes its subject or object, such
as `gut` in `gut aussehen` or `für dumm` in `jN für dumm halten`. Its `als` or
`für` is a free word, not a Governed Preposition (Dumrel). See [ADR 0034].
_Avoid_: prepositional object, for the `für` or `als` phrase

**Correlate**:
The `es` or `da(r)-` word that anticipates a German Clause complement in its
Slot, such as `darauf` in `Ich freue mich darauf, dass du kommst`. A Reading's
frame marks it Required or Optional. It is a unit of its own, never a member of
the governor. See [ADR 0034].
_Avoid_: expletive `es` (an expletive fills no Slot), placeholder

[ADR 0019]: ../../docs/adr/0019-select-grammatical-alternatives-from-reviewed-members.md
[ADR 0021]: ../../docs/adr/0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumspec.md
[ADR 0026]: ../../docs/adr/0026-treat-modals-as-verbs-and-confine-aux-to-grammar-readings.md
[ADR 0029]: ../../docs/adr/0029-keep-preposition-government-out-of-lemma-identity.md
[ADR 0034]: ../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md
[ADR 0036]: ../../docs/adr/0036-make-adjectival-german-participles-adj-linked-to-their-verb.md
[ADR 0037]: ../../docs/adr/0037-make-the-dumling-spec-own-the-golden-corpus-and-classification-rules.md
[ADR 0038]: ../../docs/adr/0038-store-german-inflection-classes-as-reading-knowledge.md
[ADR 0041]: ../../docs/adr/0041-record-in-dumling-only-what-routing-and-drill-down-consume.md
[ADR 0044]: ../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0045]: ../../docs/adr/0045-give-foreign-material-a-foreign-family-and-retire-lexeme-x.md
[ADR 0046]: ../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[Dumgen ADR 0007]: ../dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md
[Emoji Description conventions]: ./docs/reference/emoji-description-conventions.md
[inventories]: ./src/inventories/
