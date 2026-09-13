# `dumrel`

An ownerless typed Knowledge kernel for Textfresser modules.

`dumrel` defines a concrete DTO and Dumling-backed runtime schema for Reading
Knowledge, pointer-only morphological structures, and Pending Semantic
Relations. Semantic Relation ownership is always one exact Reading. Each
Reading Knowledge value chooses one homogeneous target mode: Lemma by default,
or exact Reading for reviewed hand-maintained closed inventories. It exposes one Reading
Knowledge contract and no owner union. It also owns the German linguistic
applicability tree and the global-settings/request-mask selection algebra.
Its behavioral functions are:

```ts
import {
	DEFAULT_KNOWLEDGE_SETTINGS,
	applyKnowledgeChange,
	defaultKnowledgeRequestMask,
	intersectKnowledgeRequestMask,
	inverseRelationFor,
	projectRelations,
	propagateRelations,
	type ReadingKnowledge,
	type ReadingReference,
} from "dumrel";

const knowledge: ReadingKnowledge<"en"> = applyKnowledgeChange(undefined, {
	kind: "Contribute",
	aspect: "translations",
	language: "en",
	value: ["house"],
});

inverseRelationFor("hypernym"); // "hyponym"

propagateRelations({
	readings: [
		{ reading: "reading-a", lemma: "lemma-a" },
		{ reading: "reading-b", lemma: "lemma-b" },
	],
	edges: [
		{
			sourceReading: "reading-a",
			relation: "synonym",
			targetLemma: "lemma-b",
		},
	],
}); // reading-b --synonym--> lemma-a

projectRelations({
	readings: [
		{ reading: "reading-a", lemma: "lemma-a" },
		{ reading: "reading-b", lemma: "lemma-b" },
	],
	edges: [
		{
			sourceReading: "reading-a",
			relation: "hypernym",
			targetLemma: "lemma-b",
		},
	],
}); // direct Hypernym plus inferred Hyponym, each with provenance

declare const reading: ReadingReference;
const applicable = defaultKnowledgeRequestMask(reading);
const selected =
	applicable === undefined
		? undefined
		: intersectKnowledgeRequestMask(
				applicable,
				DEFAULT_KNOWLEDGE_SETTINGS,
			);
```

Knowledge values contain no owner identity. Callers choose the exact Reading,
own persistence, supply the current Reading-to-Lemma inventory, perform
pending-relation resolution, and decide whether to store an empty Knowledge
value. Durable Knowledge accepts only the six direct relation kinds; Hyponym,
Meronym, inverses, closure, and substitution are projection-only.
`applyKnowledgeChange` never mutates its
inputs and returns ordinary mutable DTOs. Its return type tracks Target
Language bucket changes for Translations: Contribute and Correct add the
addressed key, while Retract removes it. Transcription is one optional
normalized string with no language bucket or list.

`defaultKnowledgeRequestMask` returns a fresh complete applicable mask for a
German Reading and `undefined` for explicitly unconfigured English or Hebrew.
Selected leaves are `null`; omission means not selected, and `{}` is a valid
configured empty request. `intersectKnowledgeRequestMask` applies one global
settings tree without mutating either input and removes empty nested branches.
The default settings enable every Knowledge and relation leaf.

Server generation uses the complete applicable German mask. Applications may
use settings intersection for fetching and presentation, but settings do not
silently narrow server generation.

Broad Knowledge, relation, and settings Zod composition schemas are available
only from `dumrel/schema`; the `dumrel` root does not re-export them and they
should not be used as application validators. Application validation belongs at
Dumrel's lightweight parser interfaces. DTO types are available from
`dumrel/types`; schema-free default settings are available from
`dumrel/settings`. All subpaths use explicit export allowlists.
