import { describe, expect, test } from "bun:test";

import * as root from "../../src";
import * as schema from "../../src/schema";
import * as types from "../../src/types";

const schemaExports = [
	"knowledgeChangeSchema",
	"lemmaKnowledgeSchema",
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
	"semanticRelationsSchema",
	"semanticRelationSchema",
	"semanticRelationValues",
	"unitShadowSchema",
].sort();

describe("public API allowlists", () => {
	test("the root exposes exactly three functions plus frozen schemas/values", () => {
		expect(Object.keys(root).sort()).toEqual(
			[
				"applyKnowledgeChange",
				"inverseRelationFor",
				"propagateRelations",
				...schemaExports,
			].sort(),
		);
		expect(
			Object.values(root).filter((value) => typeof value === "function"),
		).toHaveLength(3);
	});

	test("schema and types subpaths cannot widen the public surface", () => {
		expect(Object.keys(schema).sort()).toEqual(schemaExports);
		expect(Object.keys(types)).toEqual([]);
	});
});
