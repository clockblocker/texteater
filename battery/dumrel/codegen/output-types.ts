import { dumlingTypePreservingOperations } from "dumling/codegen";
import type { ExternalOutputTypes } from "dumval/compiler";
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
	GermanValencyComplement: "germanValencyComplement",
	HebrewValencyComplement: "hebrewValencyComplement",
	EnglishValencyComplement: "englishValencyComplement",
	ValencyComplement: "valencyComplement",
	ValencySlot: "valencySlot",
	GovernmentRelation: "governmentRelation",
	GovernmentProjection: "governmentProjection",
	ParticipleMeaning: "participleMeaning",
	ParticipleSource: "participleSource",
	ParticipleRelation: "participleRelation",
	ParticipleProjection: "participleProjection",
	PluralPattern: "pluralPattern",
	NounPlural: "nounPlural",
	ConjugationClass: "conjugationClass",
	ConjugationClasses: "conjugationClasses",
	LocutionType: "locutionType",
	SayingType: "sayingType",
	FormulaRole: "formulaRole",
};

export const dumrelTypePreservingOperations = dumlingTypePreservingOperations;

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
