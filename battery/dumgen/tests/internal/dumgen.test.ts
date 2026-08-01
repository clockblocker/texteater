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

const readingDraft = {
	lemma,
	emojiDescription: "🏦💶",
};

describe("buildDumgen", () => {
	test("turns the prompt catalog into inferred executable generators", async () => {
		const calls: Array<{
			readonly input: string;
			readonly params: unknown;
			readonly schema: unknown;
		}> = [];
		const sdk: AiSdk = {
			async structuredGeneration(input, schema, params) {
				calls.push({ input, params, schema });
				return readingDraft as never;
			},
			async unstructuredGeneration() {
				throw new Error("not used");
			},
		};

		const generate = buildDumgen({ sdk });
		const result = await generate.production.reading.de.noun.draft(lemma);

		expect(result).toEqual(readingDraft);
		expect(generate.laboratory.segmentation.de.segment).toBeFunction();
		expect(generate.laboratory.clickResolution.de.resolve).toBeFunction();
		expect(generate.production.classification).toEqual({});
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			input: '{"canonicalForm":"Bank","coreFeatures":{"gender":"Fem","hyph":null},"family":"Lexeme","kind":"NOUN","language":"de"}',
			params: {
				maxOutputTokens: 256,
				model: "gpt-5-nano",
				systemPrompt: expect.any(String),
			},
		});

		type ReadingInput = Parameters<
			typeof generate.production.reading.de.noun.draft
		>[0];
		type ReadingOutput = Awaited<
			ReturnType<typeof generate.production.reading.de.noun.draft>
		>;

		const inferredInput: ReadingInput = lemma;
		const inferredOutput: ReadingOutput = readingDraft;
		expect(inferredInput).toEqual(lemma);
		expect(inferredOutput).toEqual(readingDraft);
	});

	test("rejects invalid input before calling the model", async () => {
		let callCount = 0;
		const sdk: AiSdk = {
			async structuredGeneration() {
				callCount += 1;
				return readingDraft as never;
			},
			async unstructuredGeneration() {
				callCount += 1;
				return "";
			},
		};
		const generate = buildDumgen({ sdk });

		await expect(
			generate.production.reading.de.noun.draft({
				...lemma,
				canonicalForm: "",
			}),
		).rejects.toMatchObject({
			code: "invalid-input",
			name: "DumgenError",
		});
		expect(callCount).toBe(0);
	});

	test("rejects provider failures and malformed structured output from a closed error set", async () => {
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
			providerFailure.production.reading.de.noun.draft(lemma),
		).rejects.toMatchObject({
			code: "generation-failed",
			name: "DumgenError",
		});

		const invalidOutput = buildDumgen({
			sdk: {
				async structuredGeneration() {
					return { nope: true } as never;
				},
				async unstructuredGeneration() {
					return "";
				},
			},
		});

		const error = await invalidOutput.production.reading.de.noun
			.draft(lemma)
			.catch((cause: unknown) => cause);
		expect(error).toBeInstanceOf(DumgenError);
		expect(error).toMatchObject({
			code: "invalid-output",
			name: "DumgenError",
		});

		const wrongLemma = buildDumgen({
			sdk: {
				async structuredGeneration() {
					return {
						...readingDraft,
						lemma: {
							...lemma,
							canonicalForm: "Sparkasse",
						},
					} as never;
				},
				async unstructuredGeneration() {
					throw new Error("not used");
				},
			},
		});

		await expect(
			wrongLemma.production.reading.de.noun.draft(lemma),
		).rejects.toMatchObject({
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

		// @ts-expect-error The production key and injected SDK are exclusive.
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
