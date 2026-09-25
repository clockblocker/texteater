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

The `dumrel/schema` entrypoint exposes the canonical composable Zod schemas.
The package build compiles those schemas into lightweight runtime validation
and generated structural declarations. Normal imports and `dumrel/types` do
not load Zod.
