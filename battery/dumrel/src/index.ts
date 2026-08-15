export {
	admitsLexicalBreakdown,
	assertReadingKnowledgeForOwner,
	mergeReadingKnowledge,
} from "./knowledge.js";
export * from "./knowledge-schema.js";
export {
	inverseRelationFor,
	isKnownRelation,
	relationFamilyFor,
} from "./rules.js";
export {
	lexicalRelationSchema,
	lexicalRelationsSchemaFor,
	morphologicalRelationSchema,
	morphologicalRelationsSchemaFor,
	proposedRelationSchemaFor,
	relationFamilySchema,
	relationNotesSchemaFor,
	relationSchema,
	semanticRelationSchema,
	semanticRelationsSchemaFor,
} from "./schema.js";
export type * from "./types.js";
