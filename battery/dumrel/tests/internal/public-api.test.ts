import { describe, expect, test } from "bun:test";

import * as root from "../../src";
import * as fixed from "../../src/fixed";
import * as grammaticalRelations from "../../src/grammatical-relations";
import * as relations from "../../src/relations";
import * as schema from "../../src/schema";
import * as settings from "../../src/settings";
import * as types from "../../src/types";

const schemaExports = [
	"bindLexicalUnitShadow",
	"bindSupportedUnitShadow",
	"directSemanticRelationSchema",
	"directSemanticRelationGraphEdgeSchema",
	"directSemanticRelationValues",
	"grammaticalRelationClaimSchema",
	"grammaticalRelationSchema",
	"grammaticalRelationValues",
	"grammaticalSeriesAxisSchema",
	"grammaticalSeriesAxisValues",
	"grammaticalSeriesSchema",
	"knowledgeChangeSchema",
	"knowledgeRequestMaskSchema",
	"knowledgeSettingsSchema",
	"lemmaReferenceSchema",
	"lexemeUnitShadowSchema",
	"lexicalBreakdownSchema",
	"lexicalUnitShadowSchema",
	"morphemeReadingReferenceSchema",
	"morphologicalTreeNodeSchema",
	"morphologicalTreeSchema",
	"morphologicalTreeStructureSchema",
	"nonEmptyStringsSchema",
	"pendingSemanticRelationSchema",
	"readingKnowledgeSchema",
	"readingReferenceSchema",
	"semanticRelationGraphReadingSchema",
	"semanticRelationGraphSchema",
	"semanticRelationRetractKnowledgeChangeSchema",
	"semanticRelationsSchema",
	"semanticRelationSchema",
	"semanticRelationSetKnowledgeChangeSchema",
	"semanticRelationValues",
	"unitShadowSchema",
].sort();

describe("public API allowlists", () => {
	test("the root exposes operations and constants without schema values", () => {
		expect(Object.keys(root).sort()).toEqual(
			[
				"DEFAULT_KNOWLEDGE_SETTINGS",
				"ParsingError",
				"applyKnowledgeChange",
				"compileGrammaticalSeries",
				"defaultKnowledgeRequestMask",
				"directSemanticRelationValues",
				"grammaticalRelationAlgebra",
				"grammaticalRelationValues",
				"grammaticalSeriesAxisValues",
				"intersectKnowledgeRequestMask",
				"inverseRelationFor",
				"parseAsDirectSemanticRelationGraphEdge",
				"parseAsGrammaticalRelationClaim",
				"parseAsGrammaticalSeries",
				"parseAsKnowledgeChange",
				"parseAsKnowledgeRequestMask",
				"parseAsKnowledgeSettings",
				"parseAsLexemeUnitShadow",
				"parseAsLexicalBreakdown",
				"parseAsLexicalUnitShadow",
				"parseAsMorphemeReadingReference",
				"parseAsMorphologicalTree",
				"parseAsMorphologicalTreeNode",
				"parseAsMorphologicalTreeStructure",
				"parseAsPendingSemanticRelation",
				"parseAsReadingKnowledge",
				"parseAsSemanticRelationGraph",
				"parseAsSemanticRelationGraphReading",
				"parseAsSemanticRelations",
				"parseAsUnitShadow",
				"projectRelations",
				"projectGrammaticalRelations",
				"propagateRelations",
				"semanticRelationValues",
			].sort(),
		);
		expect(
			Object.values(root).filter((value) => typeof value === "function"),
		).toHaveLength(28);
	});

	test("dedicated subpaths expose only their owned contracts", () => {
		expect(Object.keys(relations).sort()).toEqual(
			[
				"directSemanticRelationValues",
				"inverseRelationFor",
				"projectRelations",
				"propagateRelations",
				"semanticRelationValues",
			].sort(),
		);
		expect(Object.keys(grammaticalRelations).sort()).toEqual(
			[
				"compileGrammaticalSeries",
				"grammaticalRelationAlgebra",
				"grammaticalRelationValues",
				"grammaticalSeriesAxisValues",
				"projectGrammaticalRelations",
			].sort(),
		);
		expect(Object.keys(schema).sort()).toEqual(schemaExports);
		expect(Object.keys(settings)).toEqual(["DEFAULT_KNOWLEDGE_SETTINGS"]);
		expect(Object.keys(fixed).sort()).toEqual(
			[
				"DE_LEXEME_AUX_V1_FIXED_KNOWLEDGE_COVERAGE",
				"DE_LEXEME_DET_V1_FIXED_KNOWLEDGE_COVERAGE",
				"DE_LEXEME_PRON_PERSONAL_V1_FIXED_KNOWLEDGE_COVERAGE",
				"allFixedGrammaticalRelationClaims",
				"allFixedGrammaticalSeries",
				"fixedKnowledgeFor",
			].sort(),
		);
		expect(Object.keys(types)).toEqual([]);
	});
});
