import { describe, expect, test } from "bun:test";

import * as root from "../../src";
import * as modelAuthoring from "../../src/model-authoring";
import * as projection from "../../src/projection";
import * as schema from "../../src/schema";
import * as types from "../../src/types";
import * as vocabulary from "../../src/vocabulary";

const schemaExports = [
	"enabledSegmentationLanguageSchema",
	"grammaticalInputSchema",
	"grammaticalInteractionSchema",
	"grammaticalResolutionLanguageSchema",
	"grammaticalResultSchema",
	"grammaticalRouteSchema",
	"knowledgeGenerationInputSchema",
	"knowledgeGenerationLanguageSchema",
	"knowledgeGenerationRequestSchema",
	"knowledgeGenerationResultSchema",
	"requestableRelationSchema",
	"notImplementedGrammaticalResultSchema",
	"resolvedGrammaticalResultSchema",
	"section1ErrorSchema",
	"segmentKindSchema",
	"segmentSchema",
	"segmentationDecisionSchema",
	"segmentationResultSchema",
	"segmentedSentenceIdSchema",
	"segmentedSentenceSchema",
	"unresolvedGrammaticalResultSchema",
].sort();

describe("public API allowlists", () => {
	test("the root exposes constructors and errors without schema values", () => {
		expect(Object.keys(root).sort()).toEqual(
			[
				"AiSdkGenerationError",
				"DumgenError",
				"ParsingError",
				"buildAiSdk",
				"buildDumgen",
				"parseAsGrammaticalInput",
				"parseAsGrammaticalInteraction",
				"parseAsGrammaticalResult",
				"parseAsGrammaticalRoute",
				"parseAsKnowledgeGenerationInput",
				"parseAsKnowledgeGenerationRequest",
				"parseAsKnowledgeGenerationResult",
				"parseAsSection1Error",
				"parseAsSegment",
				"parseAsSegmentationDecision",
				"parseAsSegmentationResult",
				"parseAsSegmentedSentence",
				"parseAsSegmentedSentenceId",
			].sort(),
		);
	});

	test("subpaths do not leak Knowledge model analysis or projection details", () => {
		expect(Object.keys(schema).sort()).toEqual(schemaExports);
		expect(Object.keys(types)).toEqual([]);
		expect(Object.keys(projection).sort()).toEqual([
			"NormalizedSurfaceProjectionError",
			"projectGrammaticalResolutionInput",
		]);
		expect(Object.keys(vocabulary).sort()).toEqual([
			"enabledSegmentationLanguageValues",
			"grammaticalResolutionLanguageValues",
			"requestableRelationValues",
			"segmentKindValues",
		]);
	});

	test("the explicit model-authoring subpath owns the canonical Zod catalogs", () => {
		expect(Object.keys(modelAuthoring).sort()).toEqual([
			"PROMPT_CATALOG",
			"combinedGermanKnowledgePrompt",
		]);
	});
});
