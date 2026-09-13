import { describe, expect, test } from "bun:test";
import { applyKnowledgeChange, parseReadingKnowledge } from "../src/index.js";
import { berlinLemma, houseReading, prefixLemma } from "./fixtures.js";

describe("parseReadingKnowledge", () => {
	test("accepts empty Knowledge and returns a fresh value", () => {
		const input = {};
		const result = parseReadingKnowledge({
			source: houseReading,
			knowledge: input,
		});
		expect(result).toEqual({ success: true, value: {} });
		if (result.success) expect(result.value).not.toBe(input);
	});

	test("normalizes strings and accepts same-Family targets across Kinds", () => {
		const result = parseReadingKnowledge({
			source: houseReading,
			knowledge: {
				definition: "  Geba\u0308ude  ",
				translations: { en: [" house ", "dwelling"] },
				semanticRelations: { nearSynonym: [berlinLemma] },
			},
		});
		expect(result).toEqual({
			success: true,
			value: {
				definition: "Gebäude",
				translations: { en: ["house", "dwelling"] },
				semanticRelations: { nearSynonym: [berlinLemma] },
			},
		});
	});

	test("rejects a cross-Family Semantic Relation target", () => {
		const result = parseReadingKnowledge({
			source: houseReading,
			knowledge: { semanticRelations: { synonym: [prefixLemma] } },
		});
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues[0]?.path).toEqual([
				"knowledge",
				"semanticRelations",
				"synonym",
				0,
				"family",
			]);
	});

	test.each([
		[
			"an empty object as a Morpheme Reading",
			{
				morphologicalTree: {
					root: {
						nodeKind: "structure",
						children: [
							{ nodeKind: "morphemeReading", reading: {} },
						],
					},
				},
			},
		],
		[
			"a Lexeme Reading as a Morpheme Reading",
			{
				morphologicalTree: {
					root: {
						nodeKind: "structure",
						children: [
							{
								nodeKind: "morphemeReading",
								reading: houseReading,
							},
						],
					},
				},
			},
		],
		[
			"nonexistent Lexical Breakdown routes",
			{
				lexicalBreakdown: [
					{
						language: "de",
						canonicalForm: "x",
						family: "Missing",
						kind: "Missing",
					},
					{
						language: "de",
						canonicalForm: "y",
						family: "Missing",
						kind: "Missing",
					},
				],
			},
		],
	] as const)(
		"rejects structured Knowledge containing %s",
		(_, knowledge) => {
			expect(
				parseReadingKnowledge({ source: houseReading, knowledge })
					.success,
			).toBe(false);
		},
	);
});

describe("applyKnowledgeChange", () => {
	test("contributes, corrects, and retracts without mutating input", () => {
		const original = { definition: "old" } as const;
		const conflict = applyKnowledgeChange({
			source: houseReading,
			knowledge: original,
			change: { kind: "Contribute", aspect: "definition", value: "new" },
		});
		expect(conflict.success).toBe(false);
		expect(original).toEqual({ definition: "old" });

		const corrected = applyKnowledgeChange({
			source: houseReading,
			knowledge: original,
			change: { kind: "Correct", aspect: "definition", value: " new " },
		});
		expect(corrected).toEqual({
			success: true,
			value: { definition: "new" },
		});
		if (!corrected.success) throw corrected.error;
		const retracted = applyKnowledgeChange({
			source: houseReading,
			knowledge: corrected.value,
			change: { kind: "Retract", aspect: "definition" },
		});
		expect(retracted).toEqual({ success: true, value: {} });
	});

	test("deduplicates normalized bucket contributions", () => {
		const result = applyKnowledgeChange({
			source: houseReading,
			knowledge: { translations: { en: ["café"] } },
			change: {
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: [" cafe\u0301 ", "coffeehouse", "coffeehouse"],
			},
		});
		expect(result).toEqual({
			success: true,
			value: { translations: { en: ["café", "coffeehouse"] } },
		});
	});

	test("rejects target-mode conflicts and leaves Knowledge untouched", () => {
		const knowledge = {
			semanticRelations: {
				targetKind: "reading" as const,
				synonym: [houseReading],
			},
		};
		const snapshot = structuredClone(knowledge);
		const result = applyKnowledgeChange({
			source: houseReading,
			knowledge,
			change: {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [berlinLemma],
			},
		});
		expect(result.success).toBe(false);
		expect(knowledge).toEqual(snapshot);
	});
});
