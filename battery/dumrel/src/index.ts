export { ParsingError } from "common-utils";
export { applyKnowledgeChange } from "./apply-knowledge-change.js";
export { parseReadingKnowledge } from "./parse-reading-knowledge.js";
export { projectParticipleSources } from "./project-participle-sources.js";
export { projectPrepositionalGovernment } from "./project-prepositional-government.js";
export { projectSemanticRelations } from "./project-semantic-relations.js";
export {
	KnowledgePolicyUnavailable,
	selectKnowledge,
} from "./select-knowledge.js";
export { normalizeText } from "./semantics.js";
export type {
	DirectSemanticRelation,
	GovernedCase,
	GovernmentProjection,
	GovernmentRelation,
	KnowledgeChange,
	KnowledgeRequestMask,
	KnowledgeSelectionInput,
	KnowledgeSettings,
	LexicalBreakdown,
	MorphologicalTree,
	MorphologicalTreeNode,
	MorphologicalTreeStructure,
	NonEmptyStrings,
	ParticipleProjection,
	ParticipleRelation,
	ParticipleSource,
	PendingSemanticRelation,
	ReadingKnowledge,
	ReadingWithKnowledge,
	RelatedLemma,
	RelatedReading,
	SemanticRelation,
	SemanticRelationProjection,
	SemanticRelations,
	TranslationLanguage,
	UnitShadow,
	ValencyComplement,
	ValencyFrame,
	ValencyReferent,
	ValencySlot,
	ValencySlotStatus,
} from "./types.js";
export { allowedComplementKinds } from "./valency-policy.js";
export {
	directSemanticRelationValues,
	governedCaseValues,
	translationLanguageValues,
} from "./vocabulary.js";
