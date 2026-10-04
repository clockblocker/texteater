export { ParsingError } from "dumval/runtime";
export { applyKnowledgeChange } from "./apply-knowledge-change.js";
export { germanConjugationClass } from "./german-conjugation-class.js";
export { parseReadingKnowledge } from "./parse-reading-knowledge.js";
export { projectParticipleSources } from "./project-participle-sources.js";
export { projectSemanticRelations } from "./project-semantic-relations.js";
export {
	KnowledgePolicyUnavailable,
	selectKnowledge,
} from "./select-knowledge.js";
export type {
	ConjugationClass,
	ConjugationClasses,
	DirectSemanticRelation,
	EnglishValencyComplement,
	FormulaRole,
	GermanValencyComplement,
	GovernedCase,
	GovernmentProjection,
	GovernmentRelation,
	HebrewValencyComplement,
	KnowledgeChange,
	KnowledgeRequestMask,
	KnowledgeSelectionInput,
	KnowledgeSettings,
	LocutionType,
	MorphologicalTree,
	MorphologicalTreeNode,
	NonEmptyStrings,
	NounPlural,
	ParticipleMeaning,
	ParticipleProjection,
	ParticipleRelation,
	ParticipleSource,
	PendingSemanticRelation,
	PluralPattern,
	ReadingKnowledge,
	ReadingWithKnowledge,
	RelatedLemma,
	RelatedReading,
	RelationFamily,
	SayingType,
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
	formulaRoleValues,
	governedCaseValues,
	locutionTypeValues,
	participleMeaningValues,
	sayingTypeValues,
	translationLanguageValues,
} from "./vocabulary.js";
