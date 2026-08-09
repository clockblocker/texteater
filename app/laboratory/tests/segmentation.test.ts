import { describe, expect, test } from "bun:test";
import type {
	Dumgen,
	DumgenModelExchange,
	DumgenSection1Trace,
	SegmentedSentence,
} from "dumgen";

import {
	LaboratorySegmentationError,
	segmentForLaboratory,
} from "../src/segmentation";

const sentence: SegmentedSentence<"de"> = {
	id: "segmentation-test" as SegmentedSentence<"de">["id"],
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "Die" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Bank" },
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
				modelInput: {
					items: [{ id: "item-0", sourceText: "Die Bank" }],
				},
			},
			accepted(
				"laboratory.intake",
				{
					items: [{ id: "item-0", sourceText: "Die Bank" }],
				},
				{
					language: "de",
					items: [
						{
							id: "item-0",
							decision: "Accepted",
							language: "de",
							stitchedText: "Die Bank",
						},
					],
				},
				{
					language: "de",
					items: [
						{
							id: "item-0",
							decision: "Accepted",
							language: "de",
							stitchedText: "Die Bank",
						},
					],
				},
			),
		];
		const traces: DumgenSection1Trace[] = [
			{
				phase: "source-segmentation",
				itemIndex: 0,
				language: "de",
				stitchedText: "Die Bank",
				segments: sentence.segments,
				rules: [
					"german-surface-candidate",
					"space-separator",
					"german-surface-candidate",
				],
			},
		];
		const dumgen: Pick<Dumgen, "segment"> = {
			async segment(sourceSentences) {
				calls.push(...sourceSentences);
				return {
					ok: true,
					value: [{ decision: "Accepted", language: "de", sentence }],
				};
			},
		};

		const response = await segmentForLaboratory(
			dumgen,
			"Die Bank",
			exchanges,
			traces,
		);

		expect(calls).toEqual(["Die Bank"]);
		expect(response).toMatchObject({
			decision: "Accepted",
			sentence,
			generation: {
				prompts: ["laboratory.intake"],
			},
		});
		expect(response.stages.segmentation).toMatchObject({
			prompt: "source-segmentation.de",
			traceOrigin: "deterministic",
			output: { segments: sentence.segments },
			result: sentence,
		});
	});

	test("preserves an unavailable Intake result without a segmentation stage", async () => {
		const exchanges: DumgenModelExchange[] = [
			{
				phase: "attempted",
				promptPath: "laboratory.intake",
				modelInput: {
					items: [{ id: "item-0", sourceText: "Bonjour" }],
				},
			},
			accepted(
				"laboratory.intake",
				{ items: [{ id: "item-0", sourceText: "Bonjour" }] },
				{
					language: null,
					items: [
						{
							id: "item-0",
							decision: "UnsupportedLanguage",
							language: null,
							stitchedText: "Bonjour",
						},
					],
				},
				{
					language: null,
					items: [
						{
							id: "item-0",
							decision: "UnsupportedLanguage",
							language: null,
							stitchedText: "Bonjour",
						},
					],
				},
			),
		];
		const dumgen: Pick<Dumgen, "segment"> = {
			async segment() {
				return {
					ok: true,
					value: [{ decision: "UnsupportedLanguage" }],
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
					input: { items: [{ id: "item-0", sourceText: "Bonjour" }] },
					output: {
						language: null,
						items: [
							{
								id: "item-0",
								decision: "UnsupportedLanguage",
								language: null,
								stitchedText: "Bonjour",
							},
						],
					},
					result: {
						language: null,
						items: [
							{
								id: "item-0",
								decision: "UnsupportedLanguage",
								language: null,
								stitchedText: "Bonjour",
							},
						],
					},
				},
			},
			generation: {
				model: "gpt-5.6-luna",
				prompts: ["laboratory.intake"],
			},
		});
	});

	test("preserves typed preflight failures without requiring a model trace", async () => {
		const dumgen: Pick<Dumgen, "segment"> = {
			async segment() {
				return {
					ok: false,
					error: {
						code: "InvalidInput",
						message: "Input exceeds the production boundary.",
					},
				};
			},
		};

		await expect(
			segmentForLaboratory(dumgen, "too long", []),
		).rejects.toMatchObject({
			name: LaboratorySegmentationError.name,
			section1Error: { code: "InvalidInput" },
		});
	});
});
