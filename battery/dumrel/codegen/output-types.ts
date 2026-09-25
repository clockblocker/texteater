import type { ExternalOutputTypes } from "dumval/compiler";
import { dumlingTypePreservingOperations } from "../../dumling/codegen/output-types.js";
import { encodedValidation } from "../src/generated/validation.js";

/** Public Dumrel output types, keyed by the compiled root each one names. */
export const dumrelOutputTypeExports = {
	KnowledgeSettings: "knowledgeSettings",
	KnowledgeRequestMask: "knowledgeRequestMask",
	KnowledgeSelectionInput: "knowledgeSelectionInput",
	DirectSemanticRelation: "directSemanticRelation",
	TranslationLanguage: "translationLanguage",
	UnitShadow: "unitShadow",
	LexemeUnitShadow: "lexemeUnitShadow",
	LexicalBreakdown: "lexicalBreakdown",
	MorphologicalTree: "morphologicalTree",
	MorphologicalTreeNode: "morphologicalTreeNode",
	PendingSemanticRelation: "pendingSemanticRelation",
	SemanticRelations: "semanticRelations",
	ReadingKnowledge: "readingKnowledge",
	KnowledgeChange: "knowledgeChange",
	SemanticRelation: "semanticRelation",
	SemanticRelationProjection: "semanticRelationProjection",
	GovernedCase: "governedCase",
	ValencySlotStatus: "valencySlotStatus",
	ValencyReferent: "valencyReferent",
	ValencyComplement: "valencyComplement",
	ValencySlot: "valencySlot",
	GovernmentRelation: "governmentRelation",
	GovernmentProjection: "governmentProjection",
	ParticipleSource: "participleSource",
	ParticipleRelation: "participleRelation",
	ParticipleProjection: "participleProjection",
};

export const dumrelTypePreservingOperations = [
	...dumlingTypePreservingOperations,
	"dumrel.normalize-text",
];

/** Lets a dependent package's generated types name Dumrel values instead of copying them. */
export function dumrelOutputTypes(): ExternalOutputTypes {
	return {
		import: 'import type * as Dumrel from "dumrel/types";',
		artifact: JSON.parse(encodedValidation),
		types: Object.fromEntries(
			Object.entries(dumrelOutputTypeExports).map(([name, key]) => [
				key,
				`Dumrel.${name}`,
			]),
		),
		typePreservingOperations: dumrelTypePreservingOperations,
	};
}
