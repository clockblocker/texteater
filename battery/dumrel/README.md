# `dumrel`

An ownerless typed Knowledge kernel for Textfresser modules.

`dumrel` defines separate concrete DTOs and Dumling-backed runtime schemas for
Lemma Knowledge and Reading Knowledge, pointer-only morphological structures,
Semantic Relations, and Pending Semantic Relations. It deliberately exposes no
combined `Knowledge` union or schema: callers choose the owner-specific
contract before validation. Its only behavioral functions are:

```ts
import {
	applyKnowledgeChange,
	inverseRelationFor,
	propagateRelations,
	type ReadingKnowledge,
} from "dumrel";

const knowledge: ReadingKnowledge<"en"> = applyKnowledgeChange(undefined, {
	kind: "Contribute",
	aspect: "translations",
	language: "en",
	value: ["house"],
});

inverseRelationFor("hypernym"); // "hyponym"

propagateRelations([
	{ source: "a", relation: "synonym", target: "b" },
]); // [{ source: "b", relation: "synonym", target: "a" }]
```

Knowledge values contain no owner identity. Callers choose the exact Lemma or
Reading, own persistence and pending-relation resolution, and decide whether
to store an empty Knowledge value. `applyKnowledgeChange` never mutates its
inputs and returns ordinary mutable DTOs. Its return type tracks Target
Language bucket changes: Contribute and Correct add the addressed key, while
Retract removes it.

Schemas are also available from `dumrel/schema`; DTO types are available from
`dumrel/types`. Both subpaths use explicit export allowlists.
