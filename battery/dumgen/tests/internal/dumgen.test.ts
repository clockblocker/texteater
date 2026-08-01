import { describe, expect, test } from "bun:test";
import {
	type AiSdk,
	buildDumgen,
	DumgenError,
	type DumgenOptions,
} from "dumgen";
import { z } from "zod";

import { buildGeneratorCatalog } from "../../src/generator/generator";
import type { PromptTree } from "../../src/promtsmith/prompt";

const segments: Array<{
	index: number;
	kind: "ResolvableText" | "OpaqueText" | "Whitespace" | "Punctuation";
	text: string;
}> = [
	{ index: 0, kind: "ResolvableText", text: "Die" },
	{ index: 1, kind: "Whitespace", text: " " },
	{ index: 2, kind: "ResolvableText", text: "Banken" },
];

const selectionInput = {
	language: "de",
	segmentedSentenceId: "sentence-1",
	clickedSegmentIndex: 2,
	segments,
} as const;

const selectionOutput: {
	surfaceSegmentIndices: number[];
	selectedOrthography: "Standard" | "Typo";
} = {
	surfaceSegmentIndices: [2],
	selectedOrthography: "Standard",
};

const surfaceOutput: {
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	realizationCoverage: "Full" | "Partial";
	surfaceKind: "Citation" | "Inflection";
	surfaceFeatures: { historicalStatus: "Archaic" | null } | null;
	inflectionalFeatures: Array<{
		name: string;
		value: string | number | boolean | null;
	}>;
	lemmaFamily: string;
	lemmaKind: string;
} = {
	normalizedSurface: "Banken",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Inflection",
	surfaceFeatures: null,
	inflectionalFeatures: [
		{ name: "case", value: "Nom" },
		{ name: "number", value: "Plur" },
	],
	lemmaFamily: "Lexeme",
	lemmaKind: "NOUN",
};

const lemma = {
	language: "de",
	canonicalForm: "Bank",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: {
		gender: "Fem",
		hyph: null,
	},
} as const;

const reading = {
	lemma,
	emojiDescription: "🏦 Bank",
} as const;

describe("buildDumgen", () => {
	test("exposes only the German laboratory classification chain", async () => {
		const outputs: unknown[] = [
			selectionOutput,
			surfaceOutput,
			lemma,
			reading,
		];
		const calls: Array<{
			readonly input: string;
			readonly params: unknown;
			readonly schema: unknown;
		}> = [];
		const sdk: AiSdk = {
			async structuredGeneration(input, schema, params) {
				calls.push({ input, params, schema });
				return outputs.shift() as never;
			},
			async unstructuredGeneration() {
				throw new Error("not used");
			},
		};

		const generate = buildDumgen({ sdk });
		expect("production" in generate).toBe(false);
		expect(generate.laboratory.segmentation.de.segment).toBeFunction();

		const selected =
			await generate.laboratory.classification.de.selection(
				selectionInput,
			);
		const surface = await generate.laboratory.classification.de.surface({
			language: "de",
			clickedSegmentIndex: 2,
			segments,
			selection: {
				...selected,
				attestedSurface: "Banken",
			},
		});
		const resolvedLemma = await generate.laboratory.classification.de.lemma(
			{
				language: "de",
				context: {
					sentenceText: "Die Banken",
					attestedSurface: "Banken",
				},
				surface,
			},
		);
		const resolvedReading =
			await generate.laboratory.classification.de.reading({
				language: "de",
				context: {
					sentenceText: "Die Banken",
					attestedSurface: "Banken",
					normalizedSurface: "Banken",
				},
				lemma: resolvedLemma,
				existingReadings: [],
			});

		expect(selected).toEqual(selectionOutput);
		expect(surface).toEqual(surfaceOutput);
		expect(resolvedLemma).toEqual(lemma);
		expect(resolvedReading).toEqual(reading);
		expect(calls).toHaveLength(4);
		expect(calls[0]).toMatchObject({
			input: expect.stringContaining('"language":"de"'),
			params: {
				model: "gpt-5-nano",
				systemPrompt: expect.any(String),
			},
		});

		type SelectionInput = Parameters<
			typeof generate.laboratory.classification.de.selection
		>[0];
		type ReadingOutput = Awaited<
			ReturnType<typeof generate.laboratory.classification.de.reading>
		>;
		const inferredInput: SelectionInput = selectionInput;
		const inferredOutput: ReadingOutput = reading;
		expect(inferredInput).toEqual(selectionInput);
		expect(inferredOutput).toEqual(reading);
	});

	test("rejects invalid German chain input before calling the model", async () => {
		let callCount = 0;
		const generate = buildDumgen({
			sdk: {
				async structuredGeneration() {
					callCount += 1;
					return selectionOutput as never;
				},
				async unstructuredGeneration() {
					callCount += 1;
					return "";
				},
			},
		});

		await expect(
			generate.laboratory.classification.de.selection({
				...selectionInput,
				segmentedSentenceId: "",
			}),
		).rejects.toMatchObject({
			code: "invalid-input",
			name: "DumgenError",
		});
		expect(callCount).toBe(0);
	});

	test("wraps provider failures and invariant violations in the closed error set", async () => {
		const providerFailure = buildDumgen({
			sdk: {
				async structuredGeneration() {
					throw new Error("offline");
				},
				async unstructuredGeneration() {
					throw new Error("offline");
				},
			},
		});

		await expect(
			providerFailure.laboratory.classification.de.selection(
				selectionInput,
			),
		).rejects.toMatchObject({
			code: "generation-failed",
			name: "DumgenError",
		});

		const invalidMembership = buildDumgen({
			sdk: {
				async structuredGeneration() {
					return {
						surfaceSegmentIndices: [0],
						selectedOrthography: "Standard",
					} as never;
				},
				async unstructuredGeneration() {
					return "";
				},
			},
		});

		const error = await invalidMembership.laboratory.classification.de
			.selection(selectionInput)
			.catch((cause: unknown) => cause);
		expect(error).toBeInstanceOf(DumgenError);
		expect(error).toMatchObject({
			code: "invalid-output",
			name: "DumgenError",
		});
	});

	test("accepts either an API key or an SDK, never both", () => {
		const sdk = {
			async structuredGeneration() {
				return {} as never;
			},
			async unstructuredGeneration() {
				return "";
			},
		} satisfies AiSdk;

		// @ts-expect-error The API key and injected SDK are exclusive.
		const invalidOptions: DumgenOptions = { apiKey: "secret", sdk };

		expect(invalidOptions).toBeDefined();
		expect(buildDumgen({ sdk })).toBeDefined();
		expect(buildDumgen({ apiKey: "secret" })).toBeDefined();
	});
});

test("null output schemas create unstructured string generators", async () => {
	const calls: string[] = [];
	const sdk: AiSdk = {
		async structuredGeneration() {
			throw new Error("not used");
		},
		async unstructuredGeneration(input) {
			calls.push(input);
			return "raw model text";
		},
	};
	const rawPrompt = {
		systemPrompt: "Return raw text.",
		inputSchema: z.string().trim(),
		outputSchema: null,
		generationParams: {
			model: "test-model",
			maxOutputTokens: 32,
		},
	} as const;
	const catalog = {
		laboratory: {
			raw: {
				meta: { kind: "prompt" },
				prompt: rawPrompt,
			},
		},
	} as const satisfies PromptTree;

	const generate = buildGeneratorCatalog(catalog, sdk);
	const result: string = await generate.laboratory.raw("  input  ");

	expect(result).toBe("raw model text");
	expect(calls).toEqual(['"input"']);
});
