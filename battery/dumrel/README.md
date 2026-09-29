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

`valency` records a Reading's Valency Frame: its governed complements in
order, each Slot Required or Optional. German complements are a bare case
or an ADP Lemma with the case it assigns. `projectPrepositionalGovernment`
derives the inverse `governedBy` edges from Preposition Slots over a
dictionary inventory, so a preposition lists its Governors without storing
them.

`participleSource` records the VERB Lemma an adjectival participle Reading's
form comes from and whether the Reading's meaning is a sense of it
(`gekocht` stores `kochen`, Verbal; `gelassen` 😌 stores `lassen`, Drifted).
`projectParticipleSources` derives the inverse `participialAdjective` edges
from the verb's Lemma for Verbal Readings, so a verb lists its participial
adjectives without storing them.

`pluralPattern` records how a German NOUN Reading forms its plural: the Plural
Patterns its plurals attest, or `NoPlural` or `PluralOnly`. `Contribute` adds
the patterns it lacks, and a marker is atomic. `germanPluralPattern` derives a
pattern from a singular and a plural (`Mutter`, `Muttern` → `En`).

`conjugationClass` records how a German VERB Reading forms its Präteritum: the
Strong, Weak and Mixed classes its Präteritum forms attest. `Contribute` adds
the classes it lacks, so `senden` can hold Weak and Mixed.
`germanConjugationClass` derives a class from an infinitive and a Präteritum
form, ignoring `sich` and a separable particle (`aufstehen`, `stand auf` →
`Strong`; `bringen`, `brachte` → `Mixed`).

Three atomic aspects type a multiword or formulaic Reading without splitting
its Lemma (ADR 0039). `locutionType` marks a Locution Reading as an `Idiom`
or, for a VERB Locution, a `Collocation`, or is absent when it is neither
(`zum Teil`). `sayingType`
marks a Saying Reading as a `Proverb` or a `WingedWord`, with an optional
`attribution`. `formulaRole` records what a Lexeme or Locution INTJ Reading
does as a routine formula, so `tut mir leid` has an `Apology` Reading and a
`Sympathy` Reading.

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
