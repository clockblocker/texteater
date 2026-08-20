import { describe, expect, test } from "bun:test";

import * as root from "../../src";
import * as schema from "../../src/schema";
import * as settings from "../../src/settings";
import * as types from "../../src/types";

const schemaExports = [
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
	"semanticRelationGraphEdgeSchema",
	"semanticRelationGraphReadingSchema",
	"semanticRelationGraphSchema",
	"semanticRelationsSchema",
	"semanticRelationSchema",
	"semanticRelationValues",
	"unitShadowSchema",
].sort();

describe("public API allowlists", () => {
	test("the root exposes exactly five functions plus frozen schemas/values", () => {
		expect(Object.keys(root).sort()).toEqual(
			[
				"DEFAULT_KNOWLEDGE_SETTINGS",
				"applyKnowledgeChange",
				"defaultKnowledgeRequestMask",
				"intersectKnowledgeRequestMask",
				"inverseRelationFor",
				"propagateRelations",
				...schemaExports,
			].sort(),
		);
		expect(
			Object.values(root).filter((value) => typeof value === "function"),
		).toHaveLength(5);
	});

	test("dedicated subpaths expose only their owned contracts", () => {
		expect(Object.keys(schema).sort()).toEqual(schemaExports);
		expect(Object.keys(settings)).toEqual(["DEFAULT_KNOWLEDGE_SETTINGS"]);
		expect(Object.keys(types)).toEqual([]);
	});
});
