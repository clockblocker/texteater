import { describe, expect, test } from "bun:test";
import {
	evaluateReadingMeaningIsolation,
	meaningIsolationCaseIds,
} from "../../src/promptsmith/laboratory/experiments/reading-resolution/de/meaning-isolation/evaluator";
import { corpus } from "../../src/promptsmith/production/reading-resolution/de/golden-corpus/corpus";

describe("German Reading meaning isolation", () => {
	test("pins five cross-family and cross-kind production misses", () => {
		expect(meaningIsolationCaseIds).toHaveLength(5);
		expect(corpus.select(meaningIsolationCaseIds).ids).toEqual(
			meaningIsolationCaseIds,
		);
	});

	test("catches the reported house meaning leak", () => {
		const caseId =
			"reading-de-lexeme-det-der-neighbor-house-isolation" as const;
		const goldenCase = corpus.cases[caseId];
		if (!goldenCase) throw new Error("Expected the determiner reproducer.");

		expect(
			evaluateReadingMeaningIsolation({
				caseId,
				input: goldenCase.input,
				idealOutput: goldenCase.idealOutput,
				output: { decision: "New", emojiDescription: "🏠" },
			}),
		).toEqual({
			contractPass: false,
			decisionPass: true,
			noveltyPass: true,
			neighborMeaningPass: false,
		});
	});

	test("accepts a novel target-compatible emoji without exact matching", () => {
		const caseId =
			"reading-de-lexeme-det-der-neighbor-house-isolation" as const;
		const goldenCase = corpus.cases[caseId];
		if (!goldenCase) throw new Error("Expected the determiner reproducer.");

		expect(
			evaluateReadingMeaningIsolation({
				caseId,
				input: goldenCase.input,
				idealOutput: goldenCase.idealOutput,
				output: { decision: "New", emojiDescription: "🔎" },
			}),
		).toEqual({
			contractPass: true,
			decisionPass: true,
			noveltyPass: true,
			neighborMeaningPass: true,
		});
	});
});
