import { describe, expect, test } from "bun:test";
import type { Dumgen, DumgenModelExchange, SegmentedSentence } from "dumgen";

import { segmentForLaboratory } from "../src/segmentation";

const sentence: SegmentedSentence<"de"> = {
	id: "segmentation-test" as SegmentedSentence<"de">["id"],
	language: "de",
	sourceText: "Die Bank",
	segments: [
		{ index: 0, kind: "ResolvableText", text: "Die", start: 0, end: 3 },
		{ index: 1, kind: "Whitespace", text: " ", start: 3, end: 4 },
		{
			index: 2,
			kind: "ResolvableText",
			text: "Bank",
			start: 4,
			end: 8,
		},
	],
};

function accepted(
	promptPath: string,
	modelInput: unknown,
	validatedModelOutput: unknown,
	result: unknown,
): DumgenModelExchange {
	return {
		phase: "accepted",
		promptPath,
		modelInput,
		modelOutput: validatedModelOutput,
		validatedModelOutput,
		result,
	};
}

describe("Laboratory segmentation adapter", () => {
	test("calls Dumgen.segment and derives prompt traces from instrumentation", async () => {
		const calls: string[] = [];
		const exchanges: DumgenModelExchange[] = [
			{
				phase: "attempted",
				promptPath: "laboratory.intake",
				modelInput: { text: "Die Bank" },
			},
			accepted(
				"laboratory.intake",
				{ text: "Die Bank" },
				{ decision: "Accepted", language: "de" },
				{ decision: "Accepted", language: "de" },
			),
			{
				phase: "attempted",
				promptPath: "laboratory.segmentation.de",
				modelInput: { text: "Die Bank" },
			},
			accepted(
				"laboratory.segmentation.de",
				{ text: "Die Bank" },
				{
					segments: sentence.segments.map(({ kind, text }) => ({
						kind,
						text,
					})),
				},
				{
					segments: sentence.segments.map(({ kind, text }) => ({
						kind,
						text,
					})),
				},
			),
		];
		const dumgen: Pick<Dumgen, "segment"> = {
			async segment(text) {
				calls.push(text);
				return { outcome: "Segmented", language: "de", sentence };
			},
		};

		const response = await segmentForLaboratory(
			dumgen,
			"Die Bank",
			exchanges,
		);

		expect(calls).toEqual(["Die Bank"]);
		expect(response).toMatchObject({
			decision: "Accepted",
			sentence,
			generation: {
				prompts: ["laboratory.intake", "laboratory.segmentation.de"],
			},
		});
		expect(response.stages.segmentation?.result).toEqual({
			segments: sentence.segments.map(({ kind, text }) => ({
				kind,
				text,
			})),
		});
		expect(response.stages.segmentation?.result).not.toEqual(sentence);
	});

	test("preserves an unavailable Intake result without a segmentation stage", async () => {
		const exchanges: DumgenModelExchange[] = [
			{
				phase: "attempted",
				promptPath: "laboratory.intake",
				modelInput: { text: "Bonjour" },
			},
			accepted(
				"laboratory.intake",
				{ text: "Bonjour" },
				{ decision: "UnsupportedLanguage", language: "fr" },
				{ decision: "UnsupportedLanguage", language: "fr" },
			),
		];
		const dumgen: Pick<Dumgen, "segment"> = {
			async segment() {
				return {
					outcome: "Unavailable",
					reason: "UnsupportedLanguage",
					language: "fr",
				};
			},
		};

		const response = await segmentForLaboratory(
			dumgen,
			"Bonjour",
			exchanges,
		);

		expect(response).toEqual({
			decision: "UnsupportedLanguage",
			sentence: null,
			stages: {
				intake: {
					prompt: "laboratory.intake",
					traceOrigin: "generated",
					input: { text: "Bonjour" },
					output: {
						decision: "UnsupportedLanguage",
						language: "fr",
					},
					result: {
						decision: "UnsupportedLanguage",
						language: "fr",
					},
				},
			},
			generation: {
				model: "gpt-5-nano",
				prompts: ["laboratory.intake"],
			},
		});
	});
});
