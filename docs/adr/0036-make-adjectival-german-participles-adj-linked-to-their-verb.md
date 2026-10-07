---
status: accepted
---

# Make adjectival German participles ADJ linked to their verb

Every adjectival use of a German Partizip I or II is an ADJ Lemma. Its
Canonical Form is the uninflected participle, and its Reading names the VERB
Lemma it comes from as its Participle Source:

- attributive: *die gekochten Kartoffeln* is `gekocht` from `kochen`, *das
  lachende Kind* is `lachend` from `lachen`, *der von allen bewunderte
  Lehrer* is `bewundert` from `bewundern`
- adverbial, for a sense the adjective has, one that can stand inflected
  before a noun: *Er kam lachend herein* is `lachend` from `lachen`. A degree
  sense (*ganz* 'quite'), *früh* 'in the morning' and a sentence adverb
  (*offenbar* 'apparently') are ADV (Rule `de/adjective-stays-adj`).
- predicative after `sein`, the state passive included: *Die Tür ist
  geschlossen* is the copula VERB `sein` plus ADJ `geschlossen` from
  `schließen`, and *Er ist verliebt* is ADJ `verliebt` from `sich verlieben`
- predicative after a stative `haben`: *Der Laden hat bis 20 Uhr geöffnet* is
  VERB `haben` plus ADJ `geöffnet` from `öffnen`, and *Er hat die ganze Zeit
  die Augen geschlossen* is VERB `haben` plus ADJ `geschlossen`

A participle is verbal only in the perfect with `haben` or `sein` (*hat
gekocht*, *ist gekommen*, *Er hat sich in sie verliebt*) and in the passive
with `werden`, `bekommen`, `kriegen` or `erhalten` (*wurde gekocht*, *bekam
geschenkt*). There it joins its auxiliary in one VERB target. `haben` or
`sein` plus a participle is a perfect only when the clause reports the verb's
own event: *Er ist gekommen*, *Der Laden hat heute erst um 8 geöffnet*, *Er
hat plötzlich die Augen geschlossen*. When it reports a state, `haben` or
`sein` is a VERB of its own and the participle an ADJ, as listed above. The
context decides. A simple past that says the same is supporting evidence, not
a mechanical test: *Er ist gekommen* is *Er kam*, while *Die Tür ist
geschlossen* is not *Die Tür schloss*, and *\*Der Laden öffnete bis 20 Uhr*
is no sentence, so the stative reading has no simple past.

When the sentence can't decide between the perfect and the state, `haben`
plus a participle is the perfect: a bare *Er hat die Augen geschlossen* is one
VERB target, `[hat, geschlossen]` VERB `schließen`. This is a segmentation
default, not a claim about German. It decides membership: the perfect is one
unit and the state two, and hover shows a unit's members from the
segmentation, so the segmenter has to pick a grouping that no click can
repair. Grouping a sentence meant as a state costs little, since `haben` and
its predicative participle still belong together; splitting a real perfect
breaks hover on the commonest German past tense. The learner still reaches
ADJ `geschlossen` one link from the verb. A Syncretism
([ADR 0046](./0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md))
keeps membership fixed and route variants
([Dumgen ADR 0007](../../battery/dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md))
keep one grouping, so neither covers two analyses that differ in unit count.
The user ruled this default on
[#725](https://github.com/clockblocker/texteater/issues/725#issuecomment-5946127516).

Lexicalization does not change the Kind. *spannend* links to `spannen` and
*gebildet* to `bilden`. *ein gebildeter Mann* and *ein aus Ton gebildeter
Krug* are two Readings of one ADJ `gebildet`. *verheiratet*, *betrunken*,
*verliebt*, *aufgeregt* and *beleidigt* are ADJ with their verbs as sources.
*geschlossene Gesellschaft* is ADJ `geschlossen` and a NOUN, not a
Collocation. A plain adjective, an `un-` form (*ungelesen*) and a form the
verb does not build (*verlegen* 'embarrassed', whose verb forms *verlegt*)
have no Participle Source. Substantivized participles stay NOUN.

A participial adjective whose spelling has two Duden headwords is two ADJ
Lemmas, and they may differ in Core comparability
([ADR 0042](./0042-record-comparability-on-adv-and-adj-lemmas.md)). Duden's
Adjektiv *entschieden* 'resolute' has comparison forms (*entschiedener*,
*aufs Entschiedenste*) and is comparable; its Partizip *entschieden*
'decided, settled' has none and is not. Both name `entscheiden` as
Participle Source. A word with one headword and senses that differ in
comparing stays one Lemma, comparable if any sense compares: *ergriffen*
'grasped' and 'moved' is one non-comparable Lemma, and the two Readings of
`gebildet` share one Lemma the same way. A Reading never overrides its
Lemma's comparability, because a Surface realizes a Lemma, not a Reading, and
Dumling could no longer check Degree without it. The user ruled this on
[#743](https://github.com/clockblocker/texteater/issues/743).

The Participle Source is stored in the ADJ Reading's Knowledge as
`participleSource`, the way a Governed Preposition is stored on its Governor
([ADR 0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)). It is
`{ verb, meaning }`:

- `verb` is the full VERB Lemma in the same Language. It comes from the
  adjective's form alone, so *verschieden* always names `verscheiden`, and a
  form the verb does not build has none (*verlegen*). Knowledge Production
  names it.
- `meaning`, the Participle Meaning, is `Verbal` or `Drifted`, judged per
  Reading: *gebildet* 'educated' is Verbal because `bilden` means to educate,
  *verschieden* ⚰️ 'deceased' is Verbal, and *verschieden* ↔️ 'different',
  *gelassen*, *bekannt*, *verwandt*, *besessen* 'obsessed' and *spannend* are
  Drifted. A Drifted Reading keeps its link, shown as "historically the
  participle of", and gets no inverse.

It is a grammatical link, not a Semantic Relation
([ADR 0019](./0019-select-grammatical-alternatives-from-reviewed-members.md)),
and it stays inside the Lexeme Family. A host that lacks the source verb
stores no Reading for it: a Reading generated from the adjective's sentence
would be permanent, since an Emoji Description cannot be merged, split or
relabelled
([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)),
so *Er blieb gelassen* would give `lassen` a 😌 'calm' Reading that every
later judge call sees. Until a Lemma with that identity is stored, the link
points at the verb's Unit Shadow, like any other missing target. The link
matches the Lemma, never the Shadow, because a Shadow has no Core Features.

The verb stores nothing. Its list of participial adjectives is a Dumrel
projection that starts at the verb's Lemma, not at each of its Readings: the
claim names a Lemma, so the verb's Lemma Note lists its participial
adjectives and no Reading of the verb does. Otherwise every sense of
`verwenden` would list `verwandt`. No verb Reading is ever chosen from the
adjective's sentence. ADR 0011's rule that an inverse needs a target reaching
exactly one Reading governs Semantic Relation inverses on Readings; this
inverse never lands on a Reading, so the rule does not apply.

No AUX Reading covers `sein` as Zustandspassiv auxiliary, and `passive` has
the values `Process` and `Recipient` only. A verbal participle Surface
carries no case, number, gender or degree.

Resolving productive participles to their verb in every use would give a
learner who meets *gekochten* the verb `kochen`, but agreement, comparison
and predicative use belong to the adjective, and the verb's Surfaces would
have to carry adjectival agreement. A productive or lexicalized boundary
also leaves cases like *verliebt* that no test settles. An ADJ with a
Participle Source keeps the adjective's grammar on the adjective and gives
the learner the verb one link away. The cost is one ADJ Lemma per participle
a learner meets as an adjective, and a Knowledge aspect a host must honor.

The golden set is the `target-classification/de/high-level-whole-unit:participle-boundary`
slice of the Canonical Classification Corpus.
