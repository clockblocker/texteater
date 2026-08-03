import { describe, expect, test } from "bun:test";
import { type AiSdk, buildDumgen, type DumgenModelExchange } from "dumgen";
import { dumling } from "dumling";

import {
	GermanClassificationResolver,
	readingResolutionPrompt,
	targetClassificationPrompt,
} from "../src/classification";
import type { SegmentedSentence } from "../src/shared/contract";

function sentence(
	id: string,
	parts: Array<{
		kind: "ResolvableText" | "OpaqueText" | "Whitespace" | "Punctuation";
		text: string;
	}>,
): SegmentedSentence {
	let offset = 0;
	return {
		id: dumling.de.create.segmentedSentenceId(id),
		language: "de",
		sourceText: parts.map(({ text }) => text).join(""),
		segments: parts.map((part, index) => {
			const start = offset;
			offset += part.text.length;
			return { ...part, index, start, end: offset };
		}),
	};
}

const multiMemberSentence = sentence("sentence-1", [
	{ kind: "ResolvableText", text: "Bnak" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Bank" },
]);

const targetOutput = {
	decision: "Resolved",
	target: {
		additionalMemberSegmentIndices: [2],
		family: "Lexeme",
		kind: "NOUN",
	},
} as const;

const grammarOutput = {
	decision: "Resolved",
	resolution: {
		memberOrthographies: ["Typo", "Standard"],
		surface: {
			normalizedSurface: "Bank Bank",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", number: "Sing" },
		},
		lemma: {
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		},
	},
} as const;

function harness(outputs: Array<unknown | Error>) {
	const calls: string[] = [];
	const modelExchanges: DumgenModelExchange[] = [];
	const sdk: AiSdk = {
		async structuredGeneration(input) {
			calls.push(input);
			const output = outputs.shift();
			if (output instanceof Error) throw output;
			return output as never;
		},
		async unstructuredGeneration() {
			throw new Error("not used");
		},
	};
	const createDumgen = () =>
		buildDumgen({
			sdk,
			onModelExchange(exchange) {
				modelExchanges.push(exchange);
			},
		});
	return {
		calls,
		createDumgen,
		modelExchanges,
		resolver: new GermanClassificationResolver(createDumgen),
	};
}

describe("German classification through the Dumgen module", () => {
	test("composes grammatical and reading operations while deriving rich traces from instrumentation", async () => {
		const testHarness = harness([
			targetOutput,
			grammarOutput,
			{ decision: "New", emojiDescription: "🏦" },
		]);

		const result = await testHarness.resolver.resolve(
			multiMemberSentence,
			0,
			testHarness.modelExchanges,
		);

		expect(result.decision).toBe("Resolved");
		if (result.decision !== "Resolved") return;
		expect(result.generation).toEqual({
			model: "gpt-5-nano",
			prompts: [
				targetClassificationPrompt,
				"laboratory.grammaticalResolution.de.Lexeme.NOUN",
				readingResolutionPrompt,
			],
			cache: "miss",
			modelCalls: 3,
		});
		expect(result.target).toEqual({
			memberSegmentIndices: [0, 2],
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(result.entity.selection).toMatchObject({
			clickedSegmentIndex: 0,
			surfaceSegmentIndices: [0, 2],
			attestedSurface: "Bnak Bank",
			selectedOrthography: "Typo",
		});
		expect(result.entity.surface.lemma).toMatchObject({
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
		});
		expect(result.entity.reading).toMatchObject({
			emojiDescription: "🏦",
			lemma: { canonicalForm: "Bank" },
		});
		expect(result.memberOrthographies).toEqual({
			0: "Typo",
			2: "Standard",
		});
		expect(result.stages.target).toMatchObject({
			prompt: targetClassificationPrompt,
			traceOrigin: "generated",
			result: {
				memberSegmentIndices: [0, 2],
				family: "Lexeme",
				kind: "NOUN",
			},
		});
		expect(result.stages.grammatical?.input).toEqual({
			markedContext: "<TARGET>Bnak</TARGET> <TARGET>Bank</TARGET>",
		});
		expect(result.stages.grammatical?.result).toMatchObject({
			decision: "Resolved",
			memberOrthographies: ["Typo", "Standard"],
		});
		expect(result.stages.grammatical?.result).not.toHaveProperty(
			"selection",
		);
		expect(result.stages.reading?.input).toEqual({
			markedContext: "<TARGET>Bnak</TARGET> <TARGET>Bank</TARGET>",
			lemma: "Bank",
			existingEmojiDescriptions: [],
		});
		expect(testHarness.modelExchanges).toHaveLength(9);
	});

	test("indexes a full resolution by every member and rebuilds click-local Selection without model calls", async () => {
		const testHarness = harness([
			targetOutput,
			grammarOutput,
			{ decision: "New", emojiDescription: "🏦" },
		]);
		const first = await testHarness.resolver.resolve(
			multiMemberSentence,
			0,
			testHarness.modelExchanges,
		);
		testHarness.modelExchanges.length = 0;
		const second = await testHarness.resolver.resolve(
			multiMemberSentence,
			2,
			testHarness.modelExchanges,
		);

		expect(testHarness.calls).toHaveLength(3);
		expect(first.decision).toBe("Resolved");
		expect(second.decision).toBe("Resolved");
		if (first.decision !== "Resolved" || second.decision !== "Resolved") {
			return;
		}
		expect(second.generation).toMatchObject({
			cache: "member-hit",
			modelCalls: 0,
			prompts: [],
		});
		expect(testHarness.modelExchanges).toEqual([]);
		expect(second.stages.target?.traceOrigin).toBe("cached");
		expect(second.entity.selection).toMatchObject({
			clickedSegmentIndex: 2,
			selectedOrthography: "Standard",
			surfaceSegmentIndices: [0, 2],
		});
		expect(second.entity.surface).toEqual(first.entity.surface);
	});

	test("surfaces Target and Grammatical Unresolved as prompt diagnostics", async () => {
		const targetHarness = harness([
			{ decision: "Unresolved", target: null },
		]);
		const targetResult = await targetHarness.resolver.resolve(
			multiMemberSentence,
			0,
			targetHarness.modelExchanges,
		);
		expect(targetResult).toMatchObject({
			decision: "Unresolved",
			diagnostics: [{ stage: "target", kind: "Unresolved" }],
			generation: { modelCalls: 1 },
		});

		const grammarHarness = harness([
			targetOutput,
			{ decision: "Unresolved", resolution: null },
		]);
		const grammarResult = await grammarHarness.resolver.resolve(
			multiMemberSentence,
			0,
			grammarHarness.modelExchanges,
		);
		expect(grammarResult).toMatchObject({
			decision: "Unresolved",
			target: { memberSegmentIndices: [0, 2] },
			diagnostics: [{ stage: "grammatical", kind: "Unresolved" }],
			generation: { modelCalls: 2 },
		});
	});

	test("stops a disabled route before Grammatical Resolution", async () => {
		const testHarness = harness([
			{
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [2],
					family: "Phraseme",
					kind: "DiscourseFormula",
				},
			},
		]);

		const result = await testHarness.resolver.resolve(
			multiMemberSentence,
			0,
			testHarness.modelExchanges,
		);

		expect(testHarness.calls).toHaveLength(1);
		expect(result).toMatchObject({
			decision: "NotImplemented",
			stage: "GrammaticalResolution",
			language: "de",
			family: "Phraseme",
			kind: "DiscourseFormula",
			target: { memberSegmentIndices: [0, 2] },
			diagnostics: [
				{
					stage: "grammatical",
					kind: "ResolutionRouteNotImplemented",
				},
			],
			generation: {
				prompts: [targetClassificationPrompt],
				modelCalls: 1,
			},
		});
	});

	test("retains observed attempted routes when the grammatical provider fails", async () => {
		const testHarness = harness([
			targetOutput,
			new Error("provider unavailable"),
		]);
		const attemptedPrompts: string[] = [];

		await expect(
			testHarness.resolver.resolve(
				multiMemberSentence,
				0,
				testHarness.modelExchanges,
				attemptedPrompts,
			),
		).rejects.toThrow("language-model provider");
		expect(attemptedPrompts).toEqual([
			targetClassificationPrompt,
			"laboratory.grammaticalResolution.de.Lexeme.NOUN",
		]);
		expect(testHarness.modelExchanges).toHaveLength(4);
	});

	test("retains every observed attempted route when the reading provider fails", async () => {
		const testHarness = harness([
			targetOutput,
			grammarOutput,
			new Error("reading provider unavailable"),
		]);
		const attemptedPrompts: string[] = [];

		await expect(
			testHarness.resolver.resolve(
				multiMemberSentence,
				0,
				testHarness.modelExchanges,
				attemptedPrompts,
			),
		).rejects.toThrow("language-model provider");
		expect(attemptedPrompts).toEqual([
			targetClassificationPrompt,
			"laboratory.grammaticalResolution.de.Lexeme.NOUN",
			readingResolutionPrompt,
		]);
		expect(testHarness.modelExchanges).toHaveLength(7);
	});

	test("uses exact Emoji Description membership and reports model disagreement", async () => {
		const testHarness = harness([
			targetOutput,
			grammarOutput,
			{ decision: "New", emojiDescription: "🏦" },
			targetOutput,
			grammarOutput,
			{ decision: "New", emojiDescription: "🏦" },
		]);
		await testHarness.resolver.resolve(
			multiMemberSentence,
			0,
			testHarness.modelExchanges,
		);
		testHarness.modelExchanges.length = 0;
		const second = await testHarness.resolver.resolve(
			{
				...multiMemberSentence,
				id: dumling.de.create.segmentedSentenceId("sentence-2"),
			},
			0,
			testHarness.modelExchanges,
		);

		expect(second.decision).toBe("Resolved");
		if (second.decision !== "Resolved") return;
		expect(second.stages.reading?.input).toMatchObject({
			existingEmojiDescriptions: ["🏦"],
		});
		expect(second.diagnostics).toEqual([
			{
				stage: "reading",
				kind: "DecisionMismatch",
				message:
					"Model advised New, but exact Emoji Description membership requires Reuse.",
			},
		]);
	});

	test("keeps resolved-unit caches isolated between views", async () => {
		const testHarness = harness([
			targetOutput,
			grammarOutput,
			{ decision: "New", emojiDescription: "🏦" },
			targetOutput,
			grammarOutput,
			{ decision: "New", emojiDescription: "🏦" },
		]);
		const otherView = new GermanClassificationResolver(
			testHarness.createDumgen,
		);

		const first = await testHarness.resolver.resolve(
			multiMemberSentence,
			0,
			testHarness.modelExchanges,
		);
		const second = await otherView.resolve(
			multiMemberSentence,
			0,
			testHarness.modelExchanges,
		);

		expect(first).toMatchObject({
			decision: "Resolved",
			generation: { cache: "miss", modelCalls: 3 },
		});
		expect(second).toMatchObject({
			decision: "Resolved",
			generation: { cache: "miss", modelCalls: 3 },
		});
		expect(testHarness.calls).toHaveLength(6);
	});
});
