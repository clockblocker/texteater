export { ParsingError } from "common-utils";
export { applyKnowledgeChange } from "./apply-knowledge-change.js";
export { parseReadingKnowledge } from "./parse-reading-knowledge.js";
export {
	KnowledgePolicyUnavailable,
	selectKnowledge,
} from "./select-knowledge.js";
export type {
	DirectSemanticRelation,
	KnowledgeChange,
	KnowledgeRequestMask,
	KnowledgeSelectionInput,
	KnowledgeSettings,
	LexicalBreakdown,
	MorphologicalTree,
	MorphologicalTreeNode,
	MorphologicalTreeStructure,
	NonEmptyStrings,
	PendingSemanticRelation,
	ReadingKnowledge,
	RelatedLemma,
	RelatedReading,
	SemanticRelations,
	TranslationLanguage,
	UnitShadow,
} from "./types.js";
export {
	directSemanticRelationValues,
	translationLanguageValues,
} from "./vocabulary.js";
