import { describe, expect, test } from "bun:test";
import {
	type AiSdk,
	AiSdkGenerationError,
	buildDumgen,
	DumgenError,
	type DumgenModelExchange,
	type DumgenOptions,
	type SegmentedSentence,
} from "dumgen";
import { dumling } from "dumling";
import { z } from "zod";

import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import type { PromptTree } from "../../src/catalog/prompt-definition";
import { buildGeneratorCatalog } from "../../src/generator/generator";
import { GERMAN_HIGH_LEVEL_ROUTES } from "../../src/schema/german-high-level-routes";

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

function sentence(
	parts: Array<{
		kind: "ResolvableText" | "OpaqueText" | "Whitespace" | "Punctuation";
		text: string;
	}>,
): SegmentedSentence<"de"> {
	let offset = 0;
	return {
		id: dumling.de.create.segmentedSentenceId(crypto.randomUUID()),
		language: "de",
		sourceText: parts.map(({ text }) => text).join(""),
		segments: parts.map((part, index) => {
			const start = offset;
			offset += part.text.length;
			return { ...part, index, start, end: offset };
		}),
	};
}

function queueSdk(outputs: unknown[]) {
	const calls: Array<{ input: string; params: unknown; schema: unknown }> =
		[];
	const sdk: AiSdk = {
		async structuredGeneration(input, schema, params) {
			calls.push({ input, params, schema });
			return outputs.shift() as never;
		},
		async unstructuredGeneration() {
			throw new Error("not used");
		},
	};
	return { calls, sdk };
}

describe("Dumgen module interface", () => {
	test("exposes exactly the three high-level operations", () => {
		const { sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });

		expect(Object.keys(dumgen)).toEqual(["segment", "resolve"]);
		expect(Object.keys(dumgen.resolve)).toEqual(["grammatical", "reading"]);
		expect("laboratory" in dumgen).toBe(false);
		expect("promptCatalog" in dumgen).toBe(false);
		expect("de" in dumgen.resolve).toBe(false);
		expect(Object.isFrozen(dumgen)).toBe(true);
		expect(Object.isFrozen(dumgen.resolve)).toBe(true);
	});

	test("segments German through Intake and its language route", async () => {
		const { calls, sdk } = queueSdk([
			{ decision: "Accepted", language: "de" },
			{
				segments: [
					{ kind: "ResolvableText", text: "Die" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Banken" },
				],
			},
		]);
		const exchanges: DumgenModelExchange[] = [];
		const dumgen = buildDumgen({
			sdk,
			onModelExchange(exchange) {
				exchanges.push(exchange);
			},
		});

		const result = await dumgen.segment("Die Banken");

		expect(result.outcome).toBe("Segmented");
		if (result.outcome !== "Segmented") return;
		expect(result.language).toBe(result.sentence.language);
		expect(result.sentence).toMatchObject({
			language: "de",
			sourceText: "Die Banken",
			segments: [
				{
					index: 0,
					kind: "ResolvableText",
					text: "Die",
					start: 0,
					end: 3,
				},
				{
					index: 1,
					kind: "Whitespace",
					text: " ",
					start: 3,
					end: 4,
				},
				{
					index: 2,
					kind: "ResolvableText",
					text: "Banken",
					start: 4,
					end: 10,
				},
			],
		});
		expect(typeof result.sentence.id).toBe("string");
		expect(Object.isFrozen(result.sentence)).toBe(true);
		expect(Object.isFrozen(result.sentence.segments)).toBe(true);
		expect(calls).toHaveLength(2);
		expect(
			exchanges
				.filter(({ phase }) => phase === "accepted")
				.map(({ promptPath }) => promptPath),
		).toEqual(["laboratory.intake", "laboratory.segmentation.de"]);
	});

	test("stops after rejected Intake decisions", async () => {
		for (const [output, expected] of [
			[
				{ decision: "UnsupportedLanguage", language: "fr" },
				{
					outcome: "Unavailable",
					reason: "UnsupportedLanguage",
					language: "fr",
				},
			],
			[
				{ decision: "Unintelligible", language: null },
				{
					outcome: "Unavailable",
					reason: "Unintelligible",
					language: null,
				},
			],
		] as const) {
			const { calls, sdk } = queueSdk([output]);
			await expect(
				buildDumgen({ sdk }).segment("input"),
			).resolves.toEqual(expected);
			expect(calls).toHaveLength(1);
		}
	});

	test("rejects empty source text before a model call", async () => {
		const { calls, sdk } = queueSdk([]);
		await expect(buildDumgen({ sdk }).segment("")).rejects.toMatchObject({
			code: "invalid-input",
			name: "DumgenError",
		});
		expect(calls).toHaveLength(0);
	});

	test("observes every attempted segmentation prompt when its provider fails", async () => {
		const promptPaths: string[] = [];
		let callCount = 0;
		const sdk: AiSdk = {
			async structuredGeneration() {
				callCount += 1;
				if (callCount === 1) {
					return { decision: "Accepted", language: "de" } as never;
				}
				throw new Error("segmentation provider unavailable");
			},
			async unstructuredGeneration() {
				throw new Error("not used");
			},
		};
		const dumgen = buildDumgen({
			sdk,
			onModelExchange(exchange) {
				if (exchange.phase === "attempted") {
					promptPaths.push(exchange.promptPath);
				}
			},
		});

		await expect(dumgen.segment("Die Bank")).rejects.toMatchObject({
			code: "provider-error",
		});
		expect(promptPaths).toEqual([
			"laboratory.intake",
			"laboratory.segmentation.de",
		]);
	});
});

describe("grammatical resolution", () => {
	test("owns classification, route dispatch, linking, and marked context", async () => {
		const { calls, sdk } = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{ decision: "Resolved", resolution: modelGrammar },
		]);
		const exchanges: DumgenModelExchange[] = [];
		const dumgen = buildDumgen({
			sdk,
			onModelExchange: (exchange) => exchanges.push(exchange),
		});
		const bankSentence = sentence([
			{ kind: "ResolvableText", text: "Die" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Banken" },
		]);

		const result = await dumgen.resolve.grammatical("de", {
			sentence: bankSentence,
			clickedSegmentIndex: 2,
		});

		expect(result).toMatchObject({
			decision: "Resolved",
			language: "de",
			markedContext: "Die <TARGET>Banken</TARGET>",
			selection: {
				segmentedSentenceId: bankSentence.id,
				clickedSegmentIndex: 2,
				surfaceSegmentIndices: [2],
				attestedSurface: "Banken",
				selectedOrthography: "Standard",
				surface: {
					language: "de",
					lemma: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Bank",
					},
				},
			},
		});
		expect("target" in result).toBe(false);
		expect("memberOrthographies" in result).toBe(false);
		expect(calls).toHaveLength(2);
		expect(calls[0]?.input).toContain('"clickedSegmentIndex":2');
		expect(calls[1]?.input).toBe(
			'{"markedContext":"Die <TARGET>Banken</TARGET>"}',
		);
		expect(
			exchanges
				.filter(({ phase }) => phase === "accepted")
				.map(({ promptPath }) => promptPath),
		).toEqual([
			"laboratory.targetClassification.de.highLevelWholeUnit",
			"laboratory.grammaticalResolution.de.Lexeme.NOUN",
		]);
		const targetExchange = exchanges.find(
			(exchange) =>
				exchange.phase === "accepted" &&
				exchange.promptPath ===
					"laboratory.targetClassification.de.highLevelWholeUnit",
		);
		expect(targetExchange).toMatchObject({
			phase: "accepted",
			result: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [2],
			},
		});
	});

	test("keeps projected instrumentation diagnostic-only", async () => {
		const { sdk } = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{ decision: "Resolved", resolution: modelGrammar },
		]);
		const source = sentence([{ kind: "ResolvableText", text: "Banken" }]);
		const dumgen = buildDumgen({
			sdk,
			onModelExchange(exchange) {
				if (
					exchange.phase === "accepted" &&
					exchange.promptPath ===
						"laboratory.grammaticalResolution.de.Lexeme.NOUN"
				) {
					const diagnostic = exchange.result as {
						lemma?: { canonicalForm?: string };
					};
					if (diagnostic.lemma) {
						diagnostic.lemma.canonicalForm = "mutated trace";
					}
				}
			},
		});

		const result = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 0,
		});

		expect(result).toMatchObject({
			decision: "Resolved",
			selection: {
				surface: { lemma: { canonicalForm: "Bank" } },
			},
		});
	});

	test("escapes literal source markers and marks every target member", async () => {
		const { calls, sdk } = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [4],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{
				decision: "Unresolved",
				resolution: null,
			},
		]);
		const source = sentence([
			{ kind: "ResolvableText", text: "sage" },
			{ kind: "Whitespace", text: " " },
			{ kind: "OpaqueText", text: "<TARGET>" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "auf&" },
		]);

		await buildDumgen({ sdk }).resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 0,
		});

		expect(calls[1]?.input).toBe(
			'{"markedContext":"<TARGET>sage</TARGET> &lt;TARGET&gt; <TARGET>auf&amp;</TARGET>"}',
		);
	});

	test("returns expected Unresolved and NotImplemented outcomes", async () => {
		const source = sentence([{ kind: "ResolvableText", text: "Bank" }]);
		const targetUnresolved = queueSdk([
			{ decision: "Unresolved", target: null },
		]);
		await expect(
			buildDumgen({ sdk: targetUnresolved.sdk }).resolve.grammatical(
				"de",
				{ sentence: source, clickedSegmentIndex: 0 },
			),
		).resolves.toEqual({ decision: "Unresolved", language: "de" });
		expect(targetUnresolved.calls).toHaveLength(1);

		const disabled = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [],
					family: "Lexeme",
					kind: "PUNCT",
				},
			},
		]);
		await expect(
			buildDumgen({ sdk: disabled.sdk }).resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			}),
		).resolves.toEqual({
			decision: "NotImplemented",
			language: "de",
			route: { family: "Lexeme", kind: "PUNCT" },
		});
		expect(disabled.calls).toHaveLength(1);

		const grammarUnresolved = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{ decision: "Unresolved", resolution: null },
		]);
		await expect(
			buildDumgen({ sdk: grammarUnresolved.sdk }).resolve.grammatical(
				"de",
				{ sentence: source, clickedSegmentIndex: 0 },
			),
		).resolves.toEqual({ decision: "Unresolved", language: "de" });
		expect(grammarUnresolved.calls).toHaveLength(2);
	});

	test("validates sentence language, aggregate, and click before dispatch", async () => {
		const { calls, sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });
		const source = sentence([
			{ kind: "ResolvableText", text: "Bank" },
			{ kind: "Whitespace", text: " " },
		]);

		for (const invalid of [
			{ sentence: { ...source, language: "en" }, clickedSegmentIndex: 0 },
			{ sentence: source, clickedSegmentIndex: -1 },
			{ sentence: source, clickedSegmentIndex: 1 },
			{ sentence: source, clickedSegmentIndex: 9 },
		]) {
			await expect(
				dumgen.resolve.grammatical("de", invalid as never),
			).rejects.toMatchObject({ code: "invalid-input" });
		}
		expect(calls).toHaveLength(0);
	});

	test("rejects invalid target membership and orthography counts", async () => {
		const source = sentence([
			{ kind: "ResolvableText", text: "Die" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Banken" },
		]);
		const invalidTarget = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [1],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
		]);
		await expect(
			buildDumgen({ sdk: invalidTarget.sdk }).resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			}),
		).rejects.toMatchObject({ code: "invalid-output" });
		expect(invalidTarget.calls).toHaveLength(1);

		const invalidCount = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [2],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{ decision: "Resolved", resolution: modelGrammar },
		]);
		await expect(
			buildDumgen({ sdk: invalidCount.sdk }).resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			}),
		).rejects.toMatchObject({ code: "invalid-output" });
		expect(invalidCount.calls).toHaveLength(2);
	});

	test("reuses a resolved unit for another member within one instance", async () => {
		const source = sentence([
			{ kind: "ResolvableText", text: "Bnak" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Bank" },
		]);
		const { calls, sdk } = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [2],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{
				decision: "Resolved",
				resolution: {
					...modelGrammar,
					memberOrthographies: ["Typo", "Standard"],
					surface: {
						...modelGrammar.surface,
						normalizedSurface: "Bank Bank",
						inflectionalFeatures: {
							case: "Nom",
							number: "Sing",
						},
					},
				},
			},
		]);
		const dumgen = buildDumgen({ sdk });

		const first = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 0,
		});
		const second = await dumgen.resolve.grammatical("de", {
			sentence: source,
			clickedSegmentIndex: 2,
		});

		expect(calls).toHaveLength(2);
		expect(first).toMatchObject({
			decision: "Resolved",
			selection: {
				clickedSegmentIndex: 0,
				selectedOrthography: "Typo",
				surfaceSegmentIndices: [0, 2],
			},
		});
		expect(second).toMatchObject({
			decision: "Resolved",
			selection: {
				clickedSegmentIndex: 2,
				selectedOrthography: "Standard",
				surfaceSegmentIndices: [0, 2],
			},
		});
	});

	test("rejects generated grammatical route fields instead of accepting drift", async () => {
		const source = sentence([{ kind: "ResolvableText", text: "Bank" }]);
		const drifting = queueSdk([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			{
				decision: "Resolved",
				resolution: {
					...modelGrammar,
					lemma: {
						...modelGrammar.lemma,
						language: "en",
						family: "Phraseme",
						kind: "Idiom",
					},
				},
			},
		]);

		await expect(
			buildDumgen({ sdk: drifting.sdk }).resolve.grammatical("de", {
				sentence: source,
				clickedSegmentIndex: 0,
			}),
		).rejects.toMatchObject({ code: "invalid-output" });
		expect(drifting.calls).toHaveLength(2);
	});
});

describe("reading resolution", () => {
	test("passes only the minimal input and makes membership authoritative", async () => {
		const { calls, sdk } = queueSdk([
			{ decision: "New", emojiDescription: "🏦" },
			{ decision: "Reuse", emojiDescription: "📚" },
		]);
		const dumgen = buildDumgen({ sdk });
		await expect(
			dumgen.resolve.reading("de", {
				markedContext: "Die <TARGET>Bank</TARGET>.",
				lemma: "Bank",
				existingEmojiDescriptions: ["🏦"],
			}),
		).resolves.toEqual({ decision: "Reuse", emojiDescription: "🏦" });
		await expect(
			dumgen.resolve.reading("de", {
				markedContext: "Die <TARGET>Bibliothek</TARGET>.",
				lemma: "Bibliothek",
				existingEmojiDescriptions: [],
			}),
		).resolves.toEqual({ decision: "New", emojiDescription: "📚" });

		expect(JSON.parse(calls[0]?.input ?? "{}")).toEqual({
			markedContext: "Die <TARGET>Bank</TARGET>.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🏦"],
		});
		expect(calls[0]?.input).not.toContain("canonicalForm");
		expect(calls[0]?.input).not.toContain("coreFeatures");
	});

	test("validates its language and minimal input before dispatch", async () => {
		const { calls, sdk } = queueSdk([]);
		const dumgen = buildDumgen({ sdk });
		for (const input of [
			{ markedContext: "", lemma: "Bank", existingEmojiDescriptions: [] },
			{
				markedContext: "<TARGET>Bank</TARGET>",
				lemma: "",
				existingEmojiDescriptions: [],
			},
		]) {
			await expect(
				dumgen.resolve.reading("de", input),
			).rejects.toMatchObject({ code: "invalid-input" });
		}
		expect(calls).toHaveLength(0);
	});
});

test("preserves typed provider failures and isolates instrumentation", async () => {
	for (const reason of [
		"refusal",
		"max-output-tokens",
		"content-filter",
	] as const) {
		const dumgen = buildDumgen({
			sdk: {
				async structuredGeneration() {
					throw new AiSdkGenerationError(reason, reason);
				},
				async unstructuredGeneration() {
					throw new AiSdkGenerationError(reason, reason);
				},
			},
			onModelExchange() {
				throw new Error("observer failure");
			},
		});
		await expect(dumgen.segment("Hallo")).rejects.toMatchObject({
			code: reason,
			name: "DumgenError",
		});
	}
});

test("accepts either an API key or an SDK, never both", () => {
	const { sdk } = queueSdk([]);
	// @ts-expect-error The API key and injected SDK are exclusive.
	const invalidOptions: DumgenOptions = { apiKey: "secret", sdk };
	expect(invalidOptions).toBeDefined();
	expect(buildDumgen({ sdk })).toBeDefined();
	expect(buildDumgen({ apiKey: "secret" })).toBeDefined();
});

test("keeps the complete prompt catalog internal for authoring tests", () => {
	const grammatical = PROMPT_CATALOG.laboratory.grammaticalResolution.de;
	const grammaticalPrompts = Object.values(grammatical).flatMap((family) =>
		Object.values(family).map((entry) => entry.prompt),
	);
	expect(grammaticalPrompts).toHaveLength(24);
	expect(new Set(grammaticalPrompts).size).toBe(24);
	expect(GERMAN_HIGH_LEVEL_ROUTES.Lexeme).toContain("NOUN");
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
