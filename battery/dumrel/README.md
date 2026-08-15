# `dumrel`

Typed Lemma and Reading Knowledge plus semantic relation vocabulary for
Textfresser modules.

`dumrel` owns identityless Knowledge values, runtime validation, additive
Knowledge Contribution merging, and semantic relation algebra. It deliberately
does not own generation, dictionary storage, pending-target lifecycle, or
cleanup workflows.

```ts
import {
	inverseRelationFor,
	semanticRelationSchema,
	type SemanticRelations,
} from "dumrel";

semanticRelationSchema.parse("nearSynonym");
inverseRelationFor("lexical", "hypernym"); // "hyponym"

declare const relations: SemanticRelations<"en">;
void relations;
```

Schema builders accept endpoint schemas from their owning modules, so Dumrel
can validate relation structure without taking ownership of Lemmas, Readings,
or persistence identities. Reading Knowledge includes Definition,
Translations, Morphological Tree, Lexical Breakdown, and direct Semantic
Relations. Use the owner-aware schema returned by
`readingKnowledgeSchemasFor(...).ownedValueSchemaFor(ownerSchema)` when
accepting a final value so Lexical Breakdown eligibility is enforced.

Morphological Tree and Lexical Breakdown are pointer-only values. A
Morphological Tree contains ordered hierarchy with resolved Morpheme Readings
and lexical Unit Shadows. A Lexical Breakdown is an ordered list of Lexeme Unit
Shadows. Dumling DTOs carry the grammatical distinctions; Dumrel adds no
operation, role, source-alignment, realization, or alternative-analysis model.
