# `dumrel`

`dumrel` defines identityless Knowledge owned by an exact Dumling Reading.
Its runtime validates the source Reading, normalizes Knowledge, enforces
same-Language and same-Family Semantic Relation targets, and applies atomic
Knowledge changes without mutating caller input.

```ts
import { applyKnowledgeChange, parseReadingKnowledge } from "dumrel";

const parsed = parseReadingKnowledge({
	source: reading,
	knowledge: { definition: "  a building  " },
});

if (parsed.success) {
	const changed = applyKnowledgeChange({
		source: reading,
		knowledge: parsed.value,
		change: {
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["house"],
		},
	});
}
```

Both operations are synchronous and return an explicit success or
`ParsingError` result. `Contribute` adds absent singular aspects or
deduplicated bucket values, `Correct` replaces one atomic aspect or bucket,
and `Retract` removes it. A failed operation returns no partial value.
`applyKnowledgeChanges` applies a list of changes in order with the same
result as applying them one by one, parsing the Knowledge once going in and
once coming out.

`valency` records a Reading's Valency Frame: its Slots in order, each
Required or Optional and holding one complement or several alternatives.
German complements are a bare case, an ADP Lemma with the case it governs, an
Adverbial named by its stand-in, a Predicative, a Clause of one form, or a
lexical Reflexive with its case (`erinnern` 🪞🧠: Reflexive Acc), alone in
its Slot and at most one per frame.
`Contribute` adds a whole Slot or nothing, and a `Retract` that names a
complement removes it from its Slot. Dumrel derives the inverse `governedBy`
edges internally from every Preposition complement over a dictionary
inventory, so a preposition lists its Governors without storing them.

`breakdown` records a Reading's parts (system ADR 0050, ADR 0051): its
`constituents`, the immediate parts one level down (`Kohle + Kraftwerk`,
`[[Faden|den Faden]] + [[verlieren]]`), and its `morphemes`, every Morpheme
flat (`ent · spann · ung · ∅`). Each piece pairs the letters it shows with a
link to a Unit Shadow or a Lemma, or no link for filler, and the letters
spell the Reading's Canonical Form back. Each half changes on its own.

`source` records the immediate base of a formation whose letters can't be cut
into pieces: a conversion (`Lauf` ← `laufen`), an acronym, a clipping or a
participle. A participle's Source also records whether the Reading's meaning
is a sense of its verb (`gekocht` stores `kochen`, Verbal; `gelassen` 😌
stores `lassen`, Drifted). `projectSources` derives the inverse
`participialAdjective` edges from the verb's Lemma for Verbal Readings, so a
verb lists its participial adjectives without storing them.

A Lemma's inflectional alternatives are not Reading Knowledge. They are its
Lemma Paradigm (system ADR 0048): per Variation Dimension, its Paradigm
Variants, each one form or one marker, and the Licence of each Reading that
states one. A German NOUN has `plural` (`Pizzen`, `Pizzas`, or `NoPlural` or
`PluralOnly`); a German VERB has `preterite`, `present1`, `present2`,
`present3`, `pastParticiple` and `subjunctivePast`, each form cited as a
dictionary cites it (`stand auf`, `fährt ab`, `abgefahren`; system ADR 0038).
A Reading with no Licence in a dimension is Unstated and takes every
variant, so `Bank` 🪑 licenses `Bänke` and 🏦 `Banken`, while `melken` ✋ takes
`molk` and `melkte`.

```ts
import {
	applyParadigmChanges,
	licenceGroups,
	paradigmChangesFor,
} from "dumrel";
import { readingIdentityKey } from "dumling";

const changed = applyParadigmChanges({
	lemma: bank,
	readings: [bench, money],
	paradigm: { dimensions: {} },
	changes: [
		...paradigmChangesFor({
			reading: bench,
			dimension: "plural",
			values: ["Bänke"],
			provenance: "Produced",
		}),
		...paradigmChangesFor({
			reading: money,
			dimension: "plural",
			values: ["Banken"],
			provenance: "Produced",
		}),
	],
});

if (changed.success) {
	// Two Licence Groups, so two inflection tables.
	licenceGroups(changed.value, [bench, money].map(readingIdentityKey));
}
```

A variant's id is the content key of its value, so two writers that add
`Banken` add one variant. Paradigm Changes Contribute and Correct variants,
License and Unlicense them for a Reading, and Retract them; after each list
of changes, a variant no Reading licenses is removed. `licensed`, `isFree`
and `licenceGroups` derive what a Reading takes, whether a dimension is Free
or Conditioned, and the Readings that share one table; nothing derived is
stored. `paradigmDimensions` is the Paradigm Policy. Code derives each
plural form's Plural Pattern (`germanPluralPattern`) and each Präteritum
form's Conjugation Class (`germanConjugationClass`, `aufstehen`, `stand auf` →
`Strong`); patterns and classes are never stored.

Three atomic aspects type a multiword or formulaic Reading without splitting
its Lemma (ADR 0039). `locutionType` marks a Locution Reading as an `Idiom`
or, for a VERB Locution, a `Collocation`, or is absent when it is neither
(`zum Teil`). `sayingType`
marks a Saying Reading as a `Proverb` or a `WingedWord`, with an optional
`attribution`: the author, and the work where known (`Shakespeare, Hamlet`). `formulaRole` records what a Lexeme or Locution INTJ Reading
does as a routine formula, such as `Thanks` for `danke`.

A Semantic Relation stays in its source's language and relation space.
Lexeme and Locution share one space (`ins Gras beißen` ↔ `sterben`); a Saying
relates only to Sayings and a Morpheme only to Morphemes. Only a PROPN
Reading stores an `endonym`, the local name of the place it names, as a PROPN
Lemma (`Pressburg`: `Bratislava`). `projectSemanticRelations` derives the
inverse `exonym` on the local name, as it derives `hyponym` from `hypernym`
and `meronym` from `holonym`.

The `dumrel/schema` entrypoint exposes the canonical composable Zod schemas.
The package build compiles those schemas into lightweight runtime validation
and generated structural declarations. Normal imports and `dumrel/types` do
not load Zod.
