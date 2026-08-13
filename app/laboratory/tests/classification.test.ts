import { describe, expect, test } from "bun:test";
import {
	type AiSdk,
	buildDumgen,
	type Dumgen,
	type DumgenModelExchange,
} from "dumgen";

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
	return {
		id: id as SegmentedSentence["id"],
		language: "de",
		segments: parts,
	};
}

const multiMemberSentence = sentence("sentence-1", [
	{ kind: "ResolvableText", text: "Bnak" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Bank" },
]);

const targetOutput = {
	decision: "Resolved",
	target: { family: "Lexeme", kind: "NOUN" },
	additionalMemberIndices: [1],
} as const;

const grammarOutput = {
	memberOrthographies: ["Typo", "Standard"],
	normalizedMembers: ["Bank", "Bank"],
	surface: {
		spelling: "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Sing" },
	},
	lemma: {
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
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
			model: "gpt-5.6-luna",
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
		expect(result.entity.attestation).toMatchObject({
			members: [
				{ attested: "Bnak", orthography: "Typo" },
				{ attested: "Bank", orthography: "Standard" },
			],
			realizationCoverage: "Full",
		});
		expect(result.interaction).toEqual({
			segmentedSentenceId: "sentence-1",
			clickedSegmentIndex: 0,
			memberSegmentIndices: [0, 2],
		});
		expect(result.entity.attestation.surface.lemma).toMatchObject({
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
		});
		expect(result.entity.reading).toMatchObject({
			emojiDescription: "🏦",
			lemma: { canonicalForm: "Bank" },
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
			members: ["Bnak", "Bank"],
		});
		expect(result.stages.grammatical?.result).toMatchObject({
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

	test("indexes one click-independent Attestation by every member without model calls", async () => {
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
		expect(second.interaction).toEqual({
			segmentedSentenceId: "sentence-1",
			clickedSegmentIndex: 2,
			memberSegmentIndices: [0, 2],
		});
		expect(second.entity.attestation).toEqual(first.entity.attestation);
	});

	test("rejects fresh Dumgen results correlated to a different click", async () => {
		const testHarness = harness([targetOutput, grammarOutput]);
		const resolver = new GermanClassificationResolver(() => {
			const dumgen = testHarness.createDumgen();
			return {
				...dumgen,
				resolve: {
					...dumgen.resolve,
					async grammatical(language, input) {
						const result = await dumgen.resolve.grammatical(
							language,
							input,
						);
						return result.decision === "Resolved"
							? {
									...result,
									interaction: {
										...result.interaction,
										clickedSegmentIndex: 2,
									},
								}
							: result;
					},
				},
			} as Dumgen;
		});

		await expect(
			resolver.resolve(
				multiMemberSentence,
				0,
				testHarness.modelExchanges,
			),
		).rejects.toThrow("different clicked member");
	});

	test("surfaces Target Unresolved and rejects legacy Grammatical Unresolved", async () => {
		const targetHarness = harness([
			{
				decision: "Unresolved",
				target: null,
				additionalMemberIndices: null,
			},
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
		await expect(
			grammarHarness.resolver.resolve(
				multiMemberSentence,
				0,
				grammarHarness.modelExchanges,
			),
		).rejects.toThrow("does not match its prompt schema");
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
				id: "sentence-2" as SegmentedSentence["id"],
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
