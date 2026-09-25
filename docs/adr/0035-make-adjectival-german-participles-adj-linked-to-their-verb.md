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
0030](./0030-store-preposition-government-as-reading-knowledge.md)). The verb
stores nothing; its list of participial adjectives is a Dumrel projection. It
is a grammatical link, not a Semantic Relation ([ADR
0019](./0019-separate-grammatical-relations-from-semantic-relations.md)), and
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
