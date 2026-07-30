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

const grammaticalIdentity = {
	canonicalLemma: "bank",
	descriptor: {
		language: "de",
		lemmaKind: "Lexeme",
		lemmaSubKind: "NOUN",
	},
} as const;

const semanticIdentity = {
	entity: grammaticalIdentity,
	features: {
		coreDescription: "a financial institution",
		meaningInEmojis: "🏦💶",
	},
	engTranslation: "bank",
} as const;

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
				return semanticIdentity as never;
			},
			async unstructuredGeneration() {
				throw new Error("not used");
			},
		};

		const generate = buildDumgen({ sdk });
		const result =
			await generate.production.noteBlock.de.noun.features(
				grammaticalIdentity,
			);

		expect(result).toEqual(semanticIdentity);
		expect(generate.laboratory).toEqual({});
		expect(generate.production.classification).toEqual({});
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			input: '{"canonicalLemma":"bank","descriptor":{"language":"de","lemmaKind":"Lexeme","lemmaSubKind":"NOUN"}}',
			params: {
				maxOutputTokens: 256,
				model: "gpt-5-nano",
				systemPrompt: expect.any(String),
			},
		});

		type FeatureInput = Parameters<
			typeof generate.production.noteBlock.de.noun.features
		>[0];
		type FeatureOutput = Awaited<
			ReturnType<typeof generate.production.noteBlock.de.noun.features>
		>;

		const inferredInput: FeatureInput = grammaticalIdentity;
		const inferredOutput: FeatureOutput = semanticIdentity;
		expect(inferredInput).toEqual(grammaticalIdentity);
		expect(inferredOutput).toEqual(semanticIdentity);
	});

	test("rejects invalid input before calling the model", async () => {
		let callCount = 0;
		const sdk: AiSdk = {
			async structuredGeneration() {
				callCount += 1;
				return semanticIdentity as never;
			},
			async unstructuredGeneration() {
				callCount += 1;
				return "";
			},
		};
		const generate = buildDumgen({ sdk });

		await expect(
			generate.production.noteBlock.de.noun.features({
				...grammaticalIdentity,
				canonicalLemma: "",
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
			providerFailure.production.noteBlock.de.noun.features(
				grammaticalIdentity,
			),
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

		const error = await invalidOutput.production.noteBlock.de.noun
			.features(grammaticalIdentity)
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
