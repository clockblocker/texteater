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
- adverbial: *Er kam lachend herein* is `lachend` from `lachen`
- predicative after `sein`, the state passive included: *Die Tür ist
  geschlossen* is the copula VERB `sein` plus ADJ `geschlossen` from
  `schließen`, and *Er ist verliebt* is ADJ `verliebt` from `sich verlieben`

A participle is verbal only in the perfect with `haben` or `sein` (*hat
gekocht*, *ist gekommen*, *Er hat sich in sie verliebt*) and in the passive
with `werden`, `bekommen`, `kriegen` or `erhalten` (*wurde gekocht*, *bekam
geschenkt*). There it joins its auxiliary in one VERB target, as before. `sein`
plus a participle is a perfect only when the clause reports the verb's own
event, so the simple past says the same: *Er ist gekommen* is *Er kam*, while
*Die Tür ist geschlossen* is not *Die Tür schloss*.

Lexicalization no longer changes the Kind. *spannend* links to `spannen` and
*gebildet* to `bilden`. *ein gebildeter Mann* and *ein aus Ton gebildeter
Krug* are two Readings of one ADJ `gebildet`. *verheiratet*, *betrunken*,
*verliebt*, *aufgeregt* and *beleidigt* are ADJ with their verbs as sources.
*geschlossene Gesellschaft* is ADJ `geschlossen` and a NOUN, not a
Collocation. A plain adjective, an `un-` form (*ungelesen*) and a form the
verb does not build (*verlegen* 'embarrassed', whose verb forms *verlegt*)
have no Participle Source. Substantivized participles stay NOUN.

The Participle Source is stored in the ADJ Reading's Knowledge as
`participleSource` and targets a VERB Lemma in the same Language, the way a
Governed Preposition is stored on its Governor ([ADR
0034](./0034-store-valency-as-e-valbu-frames-on-the-reading.md)). The verb
stores nothing; its list of participial adjectives is a Dumrel projection. It
is a grammatical link, not a Semantic Relation ([ADR
0019](./0019-select-grammatical-alternatives-from-reviewed-members.md)), and
it stays inside the Lexeme Family. Knowledge Production names the source verb
from the adjective's form in its sentence. A host that lacks the source verb
stores it with a Reading generated through Dumgen before it stores the link,
so the link always has a target.

The AUX Reading `sein` as Zustandspassiv auxiliary is retired, and `passive`
loses the value `State`; `Process` and `Recipient` remain. A verbal participle
Surface carries no case, number, gender or degree again.

This supersedes [ADR 0033](./0033-resolve-productive-german-participles-to-their-verb.md),
which resolved productive participles to their verb in every use. Under 0033 a
learner who met *gekochten* got `kochen`, but agreement, comparison and
predicative use belong to the adjective, and the verb's Surfaces had to carry
adjectival agreement. The productive or lexicalized boundary also
left cases like *verliebt* that no test settled. An ADJ with a Participle Source keeps the
adjective's grammar on the adjective and gives the learner the verb one link
away. The cost is one ADJ Lemma per participle a learner meets as an
adjective, and a Knowledge aspect a host must honor.

The golden set is the `target-classification/de/high-level-whole-unit:participle-boundary`
slice of the Canonical Classification Corpus. Map:
[#595](https://github.com/clockblocker/texteater/issues/595).

Amended on 2026-09-27: three parts of the link change.

A host that lacks the source verb no longer stores a Reading for it. The
Reading was generated from the adjective's sentence, and an Emoji Description
cannot be merged, split or relabelled ([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).
So *Er blieb gelassen* gave `lassen` a permanent 😌 'calm' Reading, and every
later judge call saw it. The ADJ Reading's Knowledge still stores the full
VERB Lemma. Until a Lemma with that identity is stored, the link points at the
verb's Unit Shadow, like any other missing target. The link matches the Lemma,
never the Shadow, because a Shadow has no Core Features.

The inverse starts at the verb's Lemma, not at each of its Readings. The claim
names a Lemma, so the verb's Lemma Note lists its participial adjectives and no
Reading of the verb does. Otherwise every sense of `verwenden` would list
`verwandt`. No verb Reading is ever chosen from the adjective's sentence. ADR
0011's rule that an inverse needs a target reaching exactly one Reading governs
Semantic Relation inverses on Readings. This inverse never lands on a Reading,
so the rule does not apply.

`participleSource` is `{ verb, meaning }`. The verb comes from the adjective's
form alone, so *verschieden* always names `verscheiden`, and a form the verb
does not build still has none (*verlegen*). The Participle Meaning, `Verbal` or
`Drifted`, is judged per Reading: *gebildet* 'educated' is Verbal because
`bilden` means to educate, *verschieden* ⚰️ 'deceased' is Verbal, and
*verschieden* ↔️ 'different', *gelassen*, *bekannt*, *verwandt*, *besessen*
'obsessed' and *spannend* are Drifted. A Drifted Reading keeps its link, shown
as "historically the participle of", and gets no inverse.

Amended on 2026-09-30: the event test covers `haben` as well as `sein`
([#653](https://github.com/clockblocker/texteater/issues/653)). `haben` plus a
participle is a perfect, one VERB target, only when the clause reports the
verb's own event: *Der Laden hat heute erst um 8 geöffnet*, *Er hat plötzlich
die Augen geschlossen*. When it reports a state, `haben` is a VERB of its own
and the participle a Participial Adjective with its Participle Source: *Der
Laden hat bis 20 Uhr geöffnet* is VERB `haben` plus ADJ `geöffnet` from
`öffnen`, and *Er hat die ganze Zeit die Augen geschlossen* is VERB `haben`
plus ADJ `geschlossen`. For both verbs the context decides, and a simple past
that says the same is supporting evidence, not a mechanical test. *\*Der Laden
öffnete bis 20 Uhr* is no sentence, so the stative reading has no simple past.
A bare *Er hat die Augen geschlossen* can mean either; what segmentation
returns for a sentence that can't decide is
[#725](https://github.com/clockblocker/texteater/issues/725).

Amended on 2026-10-01: a participial adjective whose spelling has two Duden
headwords is two ADJ Lemmas, and they may differ in Core comparability
([ADR 0042](./0042-record-comparability-on-adv-and-adj-lemmas.md)).
Duden's Adjektiv *entschieden* 'resolute' has comparison forms (*entschiedener*,
*aufs Entschiedenste*) and is comparable; its Partizip *entschieden* 'decided,
settled' has none and is not. Both name `entscheiden` as Participle Source. A
word with one headword and senses that differ in comparing stays one Lemma,
comparable if any sense compares: *ergriffen* 'grasped' and 'moved' is one
non-comparable Lemma. The two Readings of one ADJ `gebildet` above follow the
same clause. A Reading never overrides its Lemma's comparability, because a
Surface realizes a Lemma, not a Reading, and Dumling could no longer check
Degree without it. Decided on
[#743](https://github.com/clockblocker/texteater/issues/743).
