import { describe, expect, test } from "bun:test";
import {
	type AiSdk,
	type AnalysisTarget,
	buildDumgen,
	DumgenError,
	type DumgenOptions,
	type ReadingResolution,
	type Unresolved,
} from "dumgen";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	PROMPT_CATALOG,
	type PromptTree,
} from "../../src/catalog/prompt-catalog";
import { buildGeneratorCatalog } from "../../src/generator/generator";
import { GERMAN_HIGH_LEVEL_ROUTES } from "../../src/schema/german-high-level-routes";

const segments = [
	{ kind: "ResolvableText", text: "Die" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Banken" },
] as const;

const analysisTarget = {
	memberSegmentIndices: [2],
	family: "Lexeme",
	kind: "NOUN",
} as const satisfies AnalysisTarget;

const modelGrammar = {
	memberOrthographies: ["Standard"],
	surface: {
		normalizedSurface: "Banken",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
	},
	lemma: {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	},
} as const;

describe("settled German laboratory topology", () => {
	test("executes distinct intake, segmentation, target, grammatical, and reading leaves", async () => {
		const outputs: unknown[] = [
			{ decision: "Accepted", language: "de" },
			{ segments },
			{ decision: "Resolved", target: analysisTarget },
			{ decision: "Resolved", resolution: modelGrammar },
			{ decision: "New", emojiDescription: "🏦 Bank" },
		];
		const calls: Array<{
			input: string;
			params: unknown;
			schema: unknown;
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
		expect("classification" in generate.laboratory).toBe(false);

		expect(
			await generate.laboratory.intake({ text: "Die Banken" }),
		).toEqual({
			decision: "Accepted",
			language: "de",
		});
		expect(
			await generate.laboratory.segmentation.de({ text: "Die Banken" }),
		).toEqual({ segments: [...segments] });

		const target =
			await generate.laboratory.targetClassification.de.highLevelWholeUnit(
				{
					clickedSegmentIndex: 2,
					segments: [...segments],
				},
			);
		expect(target).toEqual(analysisTarget);
		expect("decision" in target).toBe(false);

		const grammar =
			await generate.laboratory.grammaticalResolution.de.Lexeme.NOUN({
				markedContext: "Die <TARGET>Banken</TARGET>",
			});
		expect(grammar).toEqual({
			decision: "Resolved",
			memberOrthographies: ["Standard"],
			surface: {
				language: "de",
				...modelGrammar.surface,
			},
			lemma: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				...modelGrammar.lemma,
			},
		});

		const reading: ReadingResolution =
			await generate.laboratory.readingResolution.de.Lexeme.NOUN({
				markedContext: "Die <TARGET>Banken</TARGET>",
				lemma: {
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					...modelGrammar.lemma,
				},
				existingEmojiDescriptions: [],
			});
		expect(reading).toEqual({
			decision: "New",
			emojiDescription: "🏦 Bank",
		});

		expect(calls).toHaveLength(5);
		expect(calls[2]?.input).toBe(
			'{"clickedSegmentIndex":2,"segments":[{"kind":"ResolvableText","text":"Die"},{"kind":"Whitespace","text":" "},{"kind":"ResolvableText","text":"Banken"}]}',
		);
		expect(calls[3]?.input).toBe(
			'{"markedContext":"Die <TARGET>Banken</TARGET>"}',
		);
		expect(calls[4]?.input).toContain(
			'"lemma":{"canonicalForm":"Bank","coreFeatures":{"gender":"Fem","hyph":null}}',
		);
		expect(calls[4]?.input).not.toContain('"family"');
	});

	test("registers physically distinct grammatical and reading leaves for every reachable route", () => {
		const expected = Object.fromEntries(
			Object.entries(schemasFor.de.entity.Lemma)
				.filter(([family]) => family !== "Morpheme")
				.map(([family, kinds]) => [family, Object.keys(kinds)]),
		);
		expect(GERMAN_HIGH_LEVEL_ROUTES).toEqual(expected as never);

		const grammatical = PROMPT_CATALOG.laboratory.grammaticalResolution.de;
		const reading = PROMPT_CATALOG.laboratory.readingResolution.de;
		const grammaticalPrompts = Object.values(grammatical).flatMap(
			(family) => Object.values(family).map((entry) => entry.prompt),
		);
		const readingPrompts = Object.values(reading).flatMap((family) =>
			Object.values(family).map((entry) => entry.prompt),
		);

		expect(grammaticalPrompts).toHaveLength(23);
		expect(readingPrompts).toHaveLength(23);
		expect(new Set(grammaticalPrompts).size).toBe(23);
		expect(new Set(readingPrompts).size).toBe(23);
		expect(grammatical.Lexeme.NOUN.prompt.systemPrompt).toContain(
			"Lexeme/NOUN",
		);
		expect(grammatical.Phraseme.Proverb.prompt.outputSchema).not.toBe(
			grammatical.Lexeme.VERB.prompt.outputSchema,
		);
	});

	test("keeps an unmigrated Reading route executable with a minimal model DTO", async () => {
		let serializedInput: string | undefined;
		const generate = buildDumgen({
			sdk: {
				async structuredGeneration(input) {
					serializedInput = input;
					return {
						decision: "New",
						emojiDescription: "🚶 gehen",
					} as never;
				},
				async unstructuredGeneration() {
					throw new Error("not used");
				},
			},
		});

		await expect(
			generate.laboratory.readingResolution.de.Lexeme.VERB({
				markedContext: "Wir <TARGET>gehen</TARGET> nach Hause.",
				lemma: {
					canonicalForm: "gehen",
					coreFeatures: {
						hasGovPrep: null,
						hasSepPrefix: null,
						lexicallyReflexive: null,
						verbType: null,
					},
					language: "de",
					family: "Lexeme",
					kind: "VERB",
				},
				existingEmojiDescriptions: [],
			}),
		).resolves.toEqual({
			decision: "New",
			emojiDescription: "🚶 gehen",
		});
		expect(serializedInput).toContain('"canonicalForm":"gehen"');
		expect(serializedInput).not.toContain('"language"');
		expect(serializedInput).not.toContain('"family"');
		expect(serializedInput).not.toContain('"kind"');
	});

	test("returns payload-free Unresolved without leaking a model DTO", async () => {
		const unresolved: Unresolved = { decision: "Unresolved" };
		const outputs = [
			{ decision: "Unresolved", target: null },
			{ decision: "Unresolved", resolution: null },
		];
		const generate = buildDumgen({
			sdk: {
				async structuredGeneration() {
					return outputs.shift() as never;
				},
				async unstructuredGeneration() {
					throw new Error("not used");
				},
			},
		});

		expect(
			await generate.laboratory.targetClassification.de.highLevelWholeUnit(
				{
					clickedSegmentIndex: 0,
					segments: [{ kind: "ResolvableText", text: "quux" }],
				},
			),
		).toEqual(unresolved);
		expect(
			await generate.laboratory.grammaticalResolution.de.Lexeme.X({
				markedContext: "<TARGET>quux</TARGET>",
			}),
		).toEqual(unresolved);
	});

	test("rejects invalid membership and marker alignment as invalid output", async () => {
		const targetGenerator = buildDumgen({
			sdk: {
				async structuredGeneration() {
					return {
						decision: "Resolved",
						target: {
							memberSegmentIndices: [0],
							family: "Morpheme",
							kind: "Prefix",
						},
					} as never;
				},
				async unstructuredGeneration() {
					return "";
				},
			},
		});

		await expect(
			targetGenerator.laboratory.targetClassification.de.highLevelWholeUnit(
				{
					clickedSegmentIndex: 0,
					segments: [{ kind: "ResolvableText", text: "un" }],
				},
			),
		).rejects.toMatchObject({ code: "invalid-output" });

		const grammarGenerator = buildDumgen({
			sdk: {
				async structuredGeneration() {
					return {
						decision: "Resolved",
						resolution: modelGrammar,
					} as never;
				},
				async unstructuredGeneration() {
					return "";
				},
			},
		});
		await expect(
			grammarGenerator.laboratory.grammaticalResolution.de.Lexeme.NOUN({
				markedContext: "<TARGET>Die</TARGET> <TARGET>Banken</TARGET>",
			}),
		).rejects.toMatchObject({ code: "invalid-output" });
	});

	test("rejects invalid input before calling the model and wraps provider failures", async () => {
		let callCount = 0;
		const generate = buildDumgen({
			sdk: {
				async structuredGeneration() {
					callCount += 1;
					throw new Error("offline");
				},
				async unstructuredGeneration() {
					throw new Error("offline");
				},
			},
		});

		await expect(
			generate.laboratory.targetClassification.de.highLevelWholeUnit({
				clickedSegmentIndex: 1,
				segments: [...segments],
			}),
		).rejects.toMatchObject({ code: "invalid-input" });
		expect(callCount).toBe(0);

		await expect(
			generate.laboratory.intake({ text: "Hallo" }),
		).rejects.toMatchObject({
			code: "generation-failed",
			name: "DumgenError",
		});
		expect(callCount).toBe(1);
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

test("null output schemas create unstructured string generators", async () => {
	const sdk: AiSdk = {
		async structuredGeneration() {
			throw new Error("not used");
		},
		async unstructuredGeneration() {
			return "raw model text";
		},
	};
	const rawPrompt = {
		systemPrompt: "Return raw text.",
		inputSchema: z.string().trim(),
		outputSchema: null,
		generationParams: { model: "test-model", maxOutputTokens: 32 },
	} as const;
	const catalog = {
		laboratory: { raw: { meta: { kind: "prompt" }, prompt: rawPrompt } },
	} as const satisfies PromptTree;

	const generate = buildGeneratorCatalog(catalog, sdk);
	const result: string = await generate.laboratory.raw("  input  ");
	expect(result).toBe("raw model text");
	expect(DumgenError).toBeFunction();
});
