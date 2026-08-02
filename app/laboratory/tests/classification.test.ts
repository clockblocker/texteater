import { describe, expect, test } from "bun:test";
import type { AnalysisTarget, buildDumgen, DumgenModelExchange } from "dumgen";

import {
	constructMarkedContext,
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
		id,
		language: "de",
		sourceText: parts.map(({ text }) => text).join(""),
		segments: parts.map((part, index) => {
			const start = offset;
			offset += part.text.length;
			return { ...part, index, start, end: offset };
		}),
	};
}

const bankLemma = {
	language: "de",
	canonicalForm: "Bank",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;

const bankSurface = {
	language: "de",
	normalizedSurface: "Bank Bank",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Inflection",
	surfaceFeatures: null,
	inflectionalFeatures: { case: "Nom", number: "Sing" },
} as const;

const modelBankSurface = {
	normalizedSurface: "Bank Bank",
	spelling: "Canonical",
	realizationCoverage: "Full",
	surfaceKind: "Inflection",
	surfaceFeatures: null,
	inflectionalFeatures: { case: "Nom", number: "Sing" },
} as const;

const modelBankLemma = {
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;

function fakeGenerator(options?: {
	target?: AnalysisTarget | { decision: "Unresolved" };
	grammatical?: { decision: "Unresolved" };
	grammaticalFailure?: Error;
	readingDecisions?: Array<"Reuse" | "New">;
}) {
	const calls: string[] = [];
	const readingInputs: unknown[] = [];
	const modelExchanges: DumgenModelExchange[] = [];
	function accept(
		promptPath: string,
		modelInput: unknown,
		modelOutput: unknown,
	) {
		modelExchanges.push(
			{
				phase: "received",
				promptPath,
				modelInput,
				modelOutput,
			},
			{
				phase: "accepted",
				promptPath,
				modelInput,
				modelOutput,
				validatedModelOutput: modelOutput,
			},
		);
	}
	let readingIndex = 0;
	const generate = {
		laboratory: {
			targetClassification: {
				de: {
					async highLevelWholeUnit(input: unknown) {
						calls.push("Target");
						const result = options?.target ?? {
							memberSegmentIndices: [0, 2],
							family: "Lexeme" as const,
							kind: "NOUN" as const,
						};
						accept(
							"laboratory.targetClassification.de.highLevelWholeUnit",
							input,
							"decision" in result
								? { decision: "Unresolved", target: null }
								: { decision: "Resolved", target: result },
						);
						return result;
					},
				},
			},
			grammaticalResolution: {
				de: {
					Lexeme: {
						async NOUN(input: unknown) {
							calls.push("Grammatical");
							if (options?.grammaticalFailure) {
								throw options.grammaticalFailure;
							}
							const result = options?.grammatical ?? {
								decision: "Resolved" as const,
								memberOrthographies: [
									"Typo" as const,
									"Standard" as const,
								],
								surface: bankSurface,
								lemma: bankLemma,
							};
							accept(
								"laboratory.grammaticalResolution.de.Lexeme.NOUN",
								input,
								result.decision === "Unresolved"
									? {
											decision: "Unresolved",
											resolution: null,
										}
									: {
											decision: "Resolved",
											resolution: {
												memberOrthographies:
													result.memberOrthographies,
												surface: modelBankSurface,
												lemma: modelBankLemma,
											},
										},
							);
							return result;
						},
					},
				},
			},
			readingResolution: {
				async de(input: unknown) {
					calls.push("Reading");
					readingInputs.push(input);
					const result = {
						decision:
							options?.readingDecisions?.[readingIndex++] ??
							"New",
						emojiDescription: "🏦",
					};
					const { lemma: _lemma, ...modelInput } = input as {
						markedContext: string;
						lemma: typeof bankLemma;
						existingEmojiDescriptions: string[];
					};
					accept(
						readingResolutionPrompt,
						{ ...modelInput, lemma: modelBankLemma.canonicalForm },
						result,
					);
					return result;
				},
			},
		},
	} as unknown as ReturnType<typeof buildDumgen>;
	return {
		generate,
		calls,
		readingInputs,
		modelExchanges,
		resetModelExchanges() {
			modelExchanges.length = 0;
		},
	};
}

const multiMemberSentence = sentence("sentence-1", [
	{ kind: "ResolvableText", text: "Bnak" },
	{ kind: "Whitespace", text: " " },
	{ kind: "ResolvableText", text: "Bank" },
]);

describe("German classification orchestration", () => {
	test("marks every target member in authoritative joined context", () => {
		const discontinuous = sentence("sentence-discontinuous", [
			{ kind: "ResolvableText", text: "steh" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "sofort" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "auf" },
			{ kind: "Punctuation", text: "!" },
		]);

		expect(constructMarkedContext(discontinuous.segments, [0, 4])).toBe(
			"<TARGET>steh</TARGET> sofort <TARGET>auf</TARGET>!",
		);
	});

	test("escapes literal source markers before adding application markers", () => {
		const collision = sentence("sentence-marker-collision", [
			{ kind: "ResolvableText", text: "sage" },
			{ kind: "Whitespace", text: " " },
			{ kind: "OpaqueText", text: "<TARGET>" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "auf&" },
			{ kind: "OpaqueText", text: "</TARGET>" },
		]);

		const marked = constructMarkedContext(collision.segments, [0, 4]);

		expect(marked).toBe(
			"<TARGET>sage</TARGET> &lt;TARGET&gt; <TARGET>auf&amp;</TARGET>&lt;/TARGET&gt;",
		);
		expect(marked.match(/<TARGET>/gu)).toHaveLength(2);
		expect(marked.match(/<\/TARGET>/gu)).toHaveLength(2);
	});

	test("executes Target -> route-specific Grammatical -> route-specific Reading", async () => {
		const fake = fakeGenerator();
		const resolver = new GermanClassificationResolver(fake.generate);

		const result = await resolver.resolve(
			multiMemberSentence,
			0,
			fake.modelExchanges,
		);

		expect(fake.calls).toEqual(["Target", "Grammatical", "Reading"]);
		expect(result.decision).toBe("Resolved");
		if (result.decision !== "Resolved") return;
		expect(result.generation).toEqual({
			model: "gpt-5-nano",
			prompts: [
				"laboratory.targetClassification.de.highLevelWholeUnit",
				"laboratory.grammaticalResolution.de.Lexeme.NOUN",
				readingResolutionPrompt,
			],
			cache: "miss",
			modelCalls: 3,
		});
		expect(result.stages.target?.input).toEqual({
			clickedSegmentIndex: 0,
			segments: [
				{ kind: "ResolvableText", text: "Bnak" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "Bank" },
			],
		});
		expect(result.stages.grammatical?.input).toEqual({
			markedContext: "<TARGET>Bnak</TARGET> <TARGET>Bank</TARGET>",
		});
		expect(result.stages.reading?.input).toEqual({
			markedContext: "<TARGET>Bnak</TARGET> <TARGET>Bank</TARGET>",
			lemma: modelBankLemma.canonicalForm,
			existingEmojiDescriptions: [],
		});
		expect(fake.readingInputs[0]).toEqual({
			markedContext: "<TARGET>Bnak</TARGET> <TARGET>Bank</TARGET>",
			lemma: bankLemma,
			existingEmojiDescriptions: [],
		});
		expect(result.stages.target).toMatchObject({
			traceOrigin: "generated",
			output: {
				decision: "Resolved",
				target: {
					memberSegmentIndices: [0, 2],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
			result: {
				memberSegmentIndices: [0, 2],
				family: "Lexeme",
				kind: "NOUN",
			},
		});
		expect(fake.modelExchanges).toHaveLength(6);
		expect(result.entity.selection).toMatchObject({
			clickedSegmentIndex: 0,
			surfaceSegmentIndices: [0, 2],
			attestedSurface: "Bnak Bank",
			selectedOrthography: "Typo",
		});
		expect(result.entity.surface.lemma).toEqual(bankLemma);
		expect(result.entity.reading).toEqual({
			lemma: bankLemma,
			emojiDescription: "🏦",
		});
	});

	test("indexes the full resolution by every member and rebuilds click-local Selection without model calls", async () => {
		const fake = fakeGenerator();
		const resolver = new GermanClassificationResolver(fake.generate);
		const first = await resolver.resolve(
			multiMemberSentence,
			0,
			fake.modelExchanges,
		);
		fake.resetModelExchanges();
		const second = await resolver.resolve(
			multiMemberSentence,
			2,
			fake.modelExchanges,
		);

		expect(fake.calls).toEqual(["Target", "Grammatical", "Reading"]);
		expect(first.decision).toBe("Resolved");
		expect(second.decision).toBe("Resolved");
		if (first.decision !== "Resolved" || second.decision !== "Resolved")
			return;
		expect(second.generation).toMatchObject({
			cache: "member-hit",
			modelCalls: 0,
			prompts: [],
		});
		expect(fake.modelExchanges).toEqual([]);
		expect(second.stages.target?.traceOrigin).toBe("cached");
		expect(second.entity.selection).toMatchObject({
			clickedSegmentIndex: 2,
			selectedOrthography: "Standard",
			surfaceSegmentIndices: [0, 2],
		});
		expect(second.entity.surface).toEqual(first.entity.surface);
		expect(second.entity.reading).toEqual(first.entity.reading);
		expect(second.memberOrthographies).toEqual({
			0: "Typo",
			2: "Standard",
		});
	});

	test("surfaces Target and Grammatical Unresolved as prompt diagnostics", async () => {
		const targetFake = fakeGenerator({
			target: { decision: "Unresolved" },
		});
		const targetResult = await new GermanClassificationResolver(
			targetFake.generate,
		).resolve(multiMemberSentence, 0, targetFake.modelExchanges);
		expect(targetResult).toMatchObject({
			decision: "Unresolved",
			diagnostics: [{ stage: "target", kind: "Unresolved" }],
			generation: { modelCalls: 1 },
		});

		const grammaticalFake = fakeGenerator({
			grammatical: { decision: "Unresolved" },
		});
		const grammaticalResult = await new GermanClassificationResolver(
			grammaticalFake.generate,
		).resolve(multiMemberSentence, 0, grammaticalFake.modelExchanges);
		expect(grammaticalResult).toMatchObject({
			decision: "Unresolved",
			target: { memberSegmentIndices: [0, 2] },
			diagnostics: [{ stage: "grammatical", kind: "Unresolved" }],
			generation: { modelCalls: 2 },
		});
	});

	test("stops each named unimplemented-route probe before a resolver model call", async () => {
		const probes: Array<{
			name: string;
			sentence: SegmentedSentence;
			clickedSegmentIndex: number;
			target: AnalysisTarget;
		}> = [
			{
				name: "Guten Morgen discourse formula",
				sentence: sentence("guten-morgen", [
					{ kind: "ResolvableText", text: "Guten" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Morgen" },
					{ kind: "Punctuation", text: "!" },
				]),
				clickedSegmentIndex: 0,
				target: {
					memberSegmentIndices: [0, 2],
					family: "Phraseme",
					kind: "DiscourseFormula",
				},
			},
			{
				name: "separable verb",
				sentence: sentence("separable-verb", [
					{ kind: "ResolvableText", text: "Fritz" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "steht" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "sofort" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "auf" },
					{ kind: "Punctuation", text: "." },
				]),
				clickedSegmentIndex: 2,
				target: {
					memberSegmentIndices: [2, 6],
					family: "Lexeme",
					kind: "VERB",
				},
			},
			{
				name: "non-noun Lexeme",
				sentence: sentence("non-noun-lexeme", [
					{ kind: "ResolvableText", text: "der" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Kaffee" },
				]),
				clickedSegmentIndex: 0,
				target: {
					memberSegmentIndices: [0],
					family: "Lexeme",
					kind: "DET",
				},
			},
		];

		for (const probe of probes) {
			const fake = fakeGenerator({ target: probe.target });
			const result = await new GermanClassificationResolver(
				fake.generate,
			).resolve(
				probe.sentence,
				probe.clickedSegmentIndex,
				fake.modelExchanges,
			);

			expect(fake.calls, probe.name).toEqual(["Target"]);
			expect(result, probe.name).toMatchObject({
				decision: "NotImplemented",
				stage: "GrammaticalResolution",
				language: "de",
				family: probe.target.family,
				kind: probe.target.kind,
				target: probe.target,
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
		}
	});

	test("retains the attempted prompt path when the provider fails before an exchange", async () => {
		const fake = fakeGenerator({
			grammaticalFailure: new Error("provider unavailable"),
		});
		const attemptedPrompts: string[] = [];
		const resolver = new GermanClassificationResolver(fake.generate);

		await expect(
			resolver.resolve(
				multiMemberSentence,
				0,
				fake.modelExchanges,
				attemptedPrompts,
			),
		).rejects.toThrow("provider unavailable");
		expect(attemptedPrompts).toEqual([
			"laboratory.targetClassification.de.highLevelWholeUnit",
			"laboratory.grammaticalResolution.de.Lexeme.NOUN",
		]);
		expect(fake.modelExchanges).toHaveLength(2);
	});

	test("uses exact Emoji Description membership as authority and logs advisory disagreement", async () => {
		const fake = fakeGenerator({ readingDecisions: ["New", "New"] });
		const resolver = new GermanClassificationResolver(fake.generate);
		await resolver.resolve(multiMemberSentence, 0, fake.modelExchanges);
		fake.resetModelExchanges();
		const anotherSentence = {
			...multiMemberSentence,
			id: "sentence-2",
		};
		const second = await resolver.resolve(
			anotherSentence,
			0,
			fake.modelExchanges,
		);

		expect(fake.readingInputs[1]).toMatchObject({
			existingEmojiDescriptions: ["🏦"],
		});
		expect(second.decision).toBe("Resolved");
		if (second.decision !== "Resolved") return;
		expect(second.diagnostics).toEqual([
			{
				stage: "reading",
				kind: "DecisionMismatch",
				message:
					"Model advised New, but exact Emoji Description membership requires Reuse.",
			},
		]);
	});
});
