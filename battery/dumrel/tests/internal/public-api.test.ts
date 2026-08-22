import { describe, expect, test } from "bun:test";

import * as root from "../../src";
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
	"semanticRelationsSchema",
	"semanticRelationSchema",
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
				"defaultKnowledgeRequestMask",
				"directSemanticRelationValues",
				"intersectKnowledgeRequestMask",
				"inverseRelationFor",
				"parseAsDirectSemanticRelationGraphEdge",
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
				"propagateRelations",
				"semanticRelationValues",
			].sort(),
		);
		expect(
			Object.values(root).filter((value) => typeof value === "function"),
		).toHaveLength(24);
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
		expect(Object.keys(schema).sort()).toEqual(schemaExports);
		expect(Object.keys(settings)).toEqual(["DEFAULT_KNOWLEDGE_SETTINGS"]);
		expect(Object.keys(types)).toEqual([]);
	});
});
