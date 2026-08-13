import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
	assertAttemptSchedule,
	assertBatchingForMode,
	BATCH_COMPLETION_WINDOW,
	BATCH_ENDPOINT,
	DIAGNOSTIC_FOLLOW_UP_CALL_CAP,
	DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD,
	DIRECT_TRANSIENT_RETRY_LIMIT,
	finalizeEvidence,
	parseBatchingFlag,
	parsePoolFlag,
	preparePrototypeBatch,
	promptCacheKeyForScheduleKey,
	resumePrototypeBatch,
	runDiagnosticFollowUp,
	runLivePrototype,
	shouldRetryDirectProviderError,
	submitPrototypeBatch,
} from "../../docs/prototypes/target-classification-high-level-contracts/run";
import { stableJson } from "../../src/lib/stable-json";
import { corpus } from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/corpus";
import {
	canonicalInputSchema,
	canonicalOutputSchema,
	GERMAN_HIGH_LEVEL_TARGET_CLASSIFICATION_ROUTES,
} from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/schemas";
import {
	demonstrationSelection,
	diagnosticSelection,
	evaluationSelection,
} from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/selections";
import {
	type ArmEvidenceSummary,
	ATTEMPTS_PER_ARM,
	decidePrototypeWinner,
	EXACT_CALL_CAP,
	EXPECTED_CALLS_PER_ARM,
	MAX_OUTPUT_TOKENS,
	MAXIMUM_SPEND_USD,
	preparePrototypePreflight,
	prepareRepresentationCases,
	REASONING_EFFORT,
	runnerParametersSchema,
} from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/contract-prototype";
import {
	additionalIndicesOutputSchema,
	classificationInputSchema,
	classificationTargetSchema,
	materializeRepresentation,
	parseAndCanonicalizeRepresentation,
	projectClassificationInput,
	REPRESENTATION_IDS,
} from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/representations";
import { GERMAN_REACHABLE_HIGH_LEVEL_ROUTES } from "../../src/schema/german-high-level-routes";

describe("target classification high-level contract prototype", () => {
	function fakeResponsesClient(
		resolvedModelForCall: (callIndex: number) => string = () =>
			"gpt-5.6-luna",
	) {
		const outputs = REPRESENTATION_IDS.flatMap((id) =>
			Array.from({ length: ATTEMPTS_PER_ARM }, () =>
				prepareRepresentationCases(id).map(
					(testCase) => testCase.privateIdealOutput,
				),
			).flat(),
		);
		let callIndex = 0;
		return {
			responses: {
				create: async (_request: unknown) => {
					const output = outputs[callIndex];
					if (output === undefined)
						throw new Error("Unexpected fake call.");
					const outputText = stableJson(output);
					const response = {
						id: `response-${callIndex}`,
						model: resolvedModelForCall(callIndex),
						output_text: outputText,
						output: [{ type: "message", content: [outputText] }],
						usage: {
							input_tokens: 10,
							output_tokens: 5,
							total_tokens: 15,
							input_tokens_details: { cached_tokens: 0 },
						},
					};
					callIndex += 1;
					return response;
				},
			},
		};
	}

	function fakeResponsesClientByInput(
		onCall?: () => Promise<void> | void,
		pool: "development" | "diagnostic" = "development",
	) {
		const ideals = new Map(
			REPRESENTATION_IDS.flatMap((id) =>
				prepareRepresentationCases(id, pool).map(
					(testCase) =>
						[
							stableJson(testCase.privateInput),
							testCase.privateIdealOutput,
						] as const,
				),
			),
		);
		let callCount = 0;
		return {
			get callCount() {
				return callCount;
			},
			responses: {
				create: async (request: unknown) => {
					callCount += 1;
					await onCall?.();
					const privateInput = (
						request as {
							input?: readonly { content?: unknown }[];
						}
					).input?.[1]?.content;
					if (typeof privateInput !== "string") {
						throw new Error("Missing fake private input.");
					}
					const output = ideals.get(privateInput);
					if (output === undefined) {
						throw new Error("Unknown fake private input.");
					}
					const outputText = stableJson(output);
					return {
						id: `response-by-input-${callCount}`,
						model: "gpt-5.6-luna",
						output_text: outputText,
						output: [{ type: "message", content: [outputText] }],
						usage: {
							input_tokens: 10,
							output_tokens: 5,
							total_tokens: 15,
							input_tokens_details: { cached_tokens: 0 },
						},
					};
				},
			},
		};
	}

	test("marks the exact clicked surface and indexes only resolvable candidates", () => {
		const projection = projectClassificationInput({
			clickedSegmentIndex: 2,
			segments: [
				{ kind: "OpaqueText", text: "[x]" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "steht" },
				{ kind: "Punctuation", text: "." },
			],
		});
		expect(projection.input).toEqual({
			markedSentence: "[x] <target>steht</target>.",
			segments: [{ s: "steht", i: 1 }],
			clickedIndex: 1,
		});
		expect(projection.compactToOriginal).toEqual([0, 2, 3]);
		expect(projection.originalToCompact.get(2)).toBe(1);
	});

	test("omits Collocation only from this prompt's reachable routes", () => {
		expect(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Phraseme).toContain(
			"Collocation",
		);
		expect(
			GERMAN_HIGH_LEVEL_TARGET_CLASSIFICATION_ROUTES.Phraseme,
		).not.toContain("Collocation" as never);
		expect(
			canonicalOutputSchema.safeParse({
				decision: "Resolved",
				target: {
					family: "Phraseme",
					kind: "Collocation",
					memberSegmentIndices: [0],
				},
			}).success,
		).toBe(false);
		expect(
			classificationTargetSchema.safeParse({
				family: "Phraseme",
				kind: "Collocation",
			}).success,
		).toBe(false);
		expect(
			additionalIndicesOutputSchema.safeParse({
				decision: "Resolved",
				target: {
					family: "Phraseme",
					kind: "Collocation",
				},
				additionalMemberIndices: [],
			}).success,
		).toBe(false);
		expect(
			stableJson(z.toJSONSchema(additionalIndicesOutputSchema)),
		).not.toContain("Collocation");
	});

	test("preserves source spacing and assigns stable candidate positions", () => {
		const canonicalInput = {
			clickedSegmentIndex: 2,
			segments: [
				{ kind: "ResolvableText" as const, text: "Guten" },
				{ kind: "Whitespace" as const, text: "\t" },
				{ kind: "ResolvableText" as const, text: "Morgen" },
				{ kind: "Punctuation" as const, text: "," },
				{ kind: "Whitespace" as const, text: "  " },
				{ kind: "OpaqueText" as const, text: "[???]" },
				{ kind: "ResolvableText" as const, text: "Mutter" },
				{ kind: "Punctuation" as const, text: "!" },
			],
		};
		const first = projectClassificationInput(canonicalInput);
		const second = projectClassificationInput(canonicalInput);
		expect(first.input).toEqual({
			markedSentence: "Guten\t<target>Morgen</target>,  [???]Mutter!",
			segments: [
				{ s: "Guten", i: 0 },
				{ s: "Morgen", i: 1 },
				{ s: "Mutter", i: 4 },
			],
			clickedIndex: 1,
		});
		expect(second.input).toEqual(first.input);
	});

	test("rejects clicks that the deterministic adapter cannot expose", () => {
		expect(() =>
			projectClassificationInput({
				clickedSegmentIndex: 0,
				segments: [{ kind: "Punctuation", text: "." }],
			}),
		).toThrow(/ResolvableText/u);
		expect(() =>
			classificationInputSchema.parse({
				markedSentence: "Sie <target>kommt</target>",
				clickedIndex: 4,
				segments: [
					{ s: "Sie", i: 0 },
					{ s: "kommt", i: 2 },
				],
			}),
		).toThrow(/clickedIndex/u);
		expect(() =>
			classificationInputSchema.parse({
				markedSentence: "Sie <target>kommt</target>",
				clickedIndex: 2,
				segments: [
					{ s: "Sie", i: 2 },
					{ s: "kommt", i: 2 },
				],
			}),
		).toThrow(/strictly increasing/u);
		const escaped = projectClassificationInput({
			clickedSegmentIndex: 0,
			segments: [
				{
					kind: "ResolvableText",
					text: "<target>A&B</target>",
				},
				{ kind: "Whitespace", text: " " },
				{ kind: "OpaqueText", text: "<&>" },
			],
		});
		expect(escaped.input.markedSentence).toBe(
			"<target>&lt;target&gt;A&amp;B&lt;/target&gt;</target> &lt;&amp;&gt;",
		);
		expect(escaped.input.markedSentence.match(/<target>/gu)).toHaveLength(
			1,
		);
		expect(escaped.input.markedSentence.match(/<\/target>/gu)).toHaveLength(
			1,
		);
	});

	test("preflights the frozen additional-indices contract with exact hashes and cost cap", () => {
		const preflight = preparePrototypePreflight({ batching: true });
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(demonstrationSelection.ids.length).toBeGreaterThan(0);
		expect(demonstrationSelection.ids.length).toBeLessThanOrEqual(35);
		expect(preflight.attemptsPerArm).toBe(ATTEMPTS_PER_ARM);
		expect(preflight.expectedResolvedModel).toBe("gpt-5.6-luna");
		expect(EXPECTED_CALLS_PER_ARM).toBe(188);
		expect(preflight.exactCallCap).toBe(EXACT_CALL_CAP);
		expect(EXACT_CALL_CAP).toBe(188);
		expect(preflight.arms.map(({ id }) => id)).toEqual([
			...REPRESENTATION_IDS,
		]);
		expect(preflight.maximumEstimatedCostUsd).toBeLessThan(
			MAXIMUM_SPEND_USD,
		);
		expect(preflight.inputTokenUpperBound).toBeGreaterThan(0);
		expect(preflight.evaluatorBinding.version).toBe(
			"german-high-level-target-evaluator-v1",
		);
		expect(preflight.evaluatorBinding.sourceSha256).toMatch(
			/^[0-9a-f]{64}$/u,
		);
		expect(preflight.evaluatorBinding.semanticFixtureMatrixVersion).toBe(
			"german-high-level-target-evaluator-semantics-v1",
		);
		expect(preflight.evaluatorBinding.semanticFixtureMatrixSha256).toMatch(
			/^[0-9a-f]{64}$/u,
		);
		expect(preflight.decisionPolicy).toEqual({
			expectedCallsPerArm: 188,
			expectedEvaluationCasesPerAttempt: 94,
			minimumAttemptContractScore: 90,
			minimumAttemptContractRatio: 90 / 94,
			tieMargin: 0.01,
			tieRule: "inclusive-best-ratio-margin",
		});
		expect(preflight.batchPolicy).toEqual({
			transport: "openai-batch",
			endpoint: "/v1/responses",
			completionWindow: "24h",
			promptCacheMode: "explicit",
			promptCacheTtl: "30m",
			promptCacheBreakpoint: "end-of-stable-system-prompt",
			maximumScheduledRequestsPerCacheKey: 12,
		});
		expect(preflight.priceSchedule.id).toContain("batch");
		expect(preflight.priceSchedule.shortContext).toEqual({
			inputUsdPerMillion: 0.1,
			cachedInputUsdPerMillion: 0.01,
			cacheWriteUsdPerMillion: 0.125,
			outputUsdPerMillion: 0.6,
		});
		expect(preflight.priceSchedule.longContext).toEqual({
			inputUsdPerMillion: 0.2,
			cachedInputUsdPerMillion: 0.02,
			cacheWriteUsdPerMillion: 0.25,
			outputUsdPerMillion: 0.9,
		});
		for (const hash of [
			preflight.modelConfigSha256,
			preflight.corpusSha256,
			preflight.decisionPolicySha256,
			preflight.batchPolicySha256,
			...preflight.arms.flatMap((arm) => [
				arm.promptSha256,
				arm.schemaSha256,
				arm.adapterSha256,
				arm.postconditionFixturesSha256,
			]),
		]) {
			expect(hash).toMatch(/^[0-9a-f]{64}$/u);
		}
	});

	test("round-trips all selected ideals", () => {
		const selected = demonstrationSelection.union(evaluationSelection);
		for (const [index, caseId] of selected.ids.entries()) {
			const goldenCase = selected.cases[index];
			if (goldenCase === undefined) throw new Error(`Missing ${caseId}.`);
			for (const id of REPRESENTATION_IDS) {
				const materialized = materializeRepresentation(id, goldenCase);
				expect(
					parseAndCanonicalizeRepresentation({
						id,
						canonicalInput: goldenCase.input,
						privateInput: classificationInputSchema.parse(
							materialized.input,
						),
						output: materialized.idealOutput,
					}),
				).toEqual(goldenCase.idealOutput);
			}
		}
	});

	test("emits top-level additional membership for every resolved target", () => {
		const singleton = corpus.cases["target-de-route-lexeme-adj"];
		if (singleton === undefined)
			throw new Error("Missing singleton fixture.");
		const materializedSingleton = materializeRepresentation(
			"additional-compact-indices",
			singleton,
		);
		expect(materializedSingleton.idealOutput).toMatchObject({
			decision: "Resolved",
			target: { family: "Lexeme", kind: "ADJ" },
			additionalMemberIndices: [],
		});
		expect(
			additionalIndicesOutputSchema.safeParse({
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "ADJ",
				},
				additionalMemberIndices: null,
			}).success,
		).toBe(false);

		const governedSeparable = {
			input: canonicalInputSchema.parse({
				clickedSegmentIndex: 2,
				segments: [
					{ kind: "ResolvableText", text: "Sie" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "hört" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "mit" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "dem" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Rauchen" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "auf" },
					{ kind: "Punctuation", text: "." },
				],
			}),
			idealOutput: canonicalOutputSchema.parse({
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2, 4, 10],
				},
			}),
		};
		const materializedMultiMember = materializeRepresentation(
			"additional-compact-indices",
			governedSeparable,
		);
		expect(materializedMultiMember.input).toEqual({
			markedSentence: "Sie <target>hört</target> mit dem Rauchen auf.",
			clickedIndex: 1,
			segments: [
				{ s: "Sie", i: 0 },
				{ s: "hört", i: 1 },
				{ s: "mit", i: 2 },
				{ s: "dem", i: 3 },
				{ s: "Rauchen", i: 4 },
				{ s: "auf", i: 5 },
			],
		});
		expect(materializedMultiMember.idealOutput).toMatchObject({
			decision: "Resolved",
			target: { family: "Lexeme", kind: "VERB" },
			additionalMemberIndices: [2, 5],
		});
	});

	test("enforces additional-index click and ordering gates", () => {
		const goldenCase =
			corpus.cases["target-de-boundary-separable-click-steht"];
		if (goldenCase === undefined)
			throw new Error("Missing separable fixture.");
		const privateInput = projectClassificationInput(goldenCase.input).input;
		const additional = materializeRepresentation(
			"additional-compact-indices",
			goldenCase,
		);
		expect(() =>
			parseAndCanonicalizeRepresentation({
				id: "additional-compact-indices",
				canonicalInput: goldenCase.input,
				privateInput,
				output: additionalIndicesOutputSchema.parse({
					...(additional.idealOutput as object),
					additionalMemberIndices: [privateInput.clickedIndex],
				}),
			}),
		).toThrow(/exclude/u);
		for (const additionalMemberIndices of [
			[3, 0],
			[0, 0],
		]) {
			expect(() =>
				parseAndCanonicalizeRepresentation({
					id: "additional-compact-indices",
					canonicalInput: goldenCase.input,
					privateInput,
					output: additionalIndicesOutputSchema.parse({
						...(additional.idealOutput as object),
						additionalMemberIndices,
					}),
				}),
			).toThrow(/ordered and unique/u);
		}

		const punctuationInput = {
			clickedSegmentIndex: 0,
			segments: [
				{ kind: "ResolvableText" as const, text: "Guten" },
				{ kind: "Whitespace" as const, text: " " },
				{ kind: "ResolvableText" as const, text: "Morgen" },
				{ kind: "Punctuation" as const, text: "!" },
			],
		};
		expect(() =>
			parseAndCanonicalizeRepresentation({
				id: "additional-compact-indices",
				canonicalInput: punctuationInput,
				privateInput:
					projectClassificationInput(punctuationInput).input,
				output: additionalIndicesOutputSchema.parse({
					decision: "Resolved",
					target: {
						family: "Phraseme",
						kind: "DiscourseFormula",
					},
					additionalMemberIndices: [2],
				}),
			}),
		).toThrow(/ResolvableText/u);
	});

	test("passes or rejects the retained contract with predetermined gates", () => {
		const passing = (
			id: (typeof REPRESENTATION_IDS)[number],
			score: number,
		) =>
			({
				id,
				attemptCount: 188,
				contractScore: score,
				executionErrorCount: 0,
				attemptContractScores: [90, 90],
				unclassifiedMissCount: 0,
				safetyGatePass: true,
				clickGatePass: true,
				sliceRatios: { routes: 0.9, boundaries: 0.9, robustness: 0.9 },
			}) satisfies ArmEvidenceSummary;
		expect(
			decidePrototypeWinner([passing("additional-compact-indices", 175)]),
		).toEqual({
			decision: "Winner",
			winner: "additional-compact-indices",
		});
		expect(
			decidePrototypeWinner([
				{
					...passing("additional-compact-indices", 183),
					attemptContractScores: [94, 89],
				},
			]),
		).toMatchObject({ decision: "NoWinner" });
		expect(
			decidePrototypeWinner([
				{
					...passing("additional-compact-indices", 180),
					sliceRatios: {
						routes: 0.5,
						boundaries: 0.5,
						robustness: 0.5,
					},
				},
			]),
		).toMatchObject({ decision: "Winner" });
		expect(
			decidePrototypeWinner([
				{
					...passing("additional-compact-indices", 180),
					safetyGatePass: false,
				},
			]),
		).toMatchObject({ decision: "NoWinner" });
	});

	test("preflight and missing-key live guard make no provider call", async () => {
		for (const id of REPRESENTATION_IDS) {
			expect(prepareRepresentationCases(id)).toHaveLength(94);
		}
		const previous = process.env.OPENAI_API_KEY;
		delete process.env.OPENAI_API_KEY;
		try {
			await expect(runLivePrototype({ batching: false })).rejects.toThrow(
				/OPENAI_API_KEY/u,
			);
		} finally {
			if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
		}
	});

	test("requires an explicit batching flag and binds transport pricing", () => {
		expect(parseBatchingFlag("--batching=true")).toBe(true);
		expect(parseBatchingFlag("--batching=false")).toBe(false);
		expect(() => parseBatchingFlag(undefined)).toThrow(/explicit/u);
		expect(() => parseBatchingFlag("false")).toThrow(/explicit/u);
		expect(parsePoolFlag("--pool=development")).toBe("development");
		expect(parsePoolFlag("--pool=diagnostic")).toBe("diagnostic");
		expect(() => parsePoolFlag(undefined)).toThrow(/explicit/u);
		expect(() => assertBatchingForMode("run", true)).toThrow(
			/--batching=false/u,
		);
		expect(() => assertBatchingForMode("batch-submit", false)).toThrow(
			/--batching=true/u,
		);
		expect(() => assertBatchingForMode("batch-resume", false)).toThrow(
			/--batching=true/u,
		);
		expect(() =>
			assertBatchingForMode("diagnostic-follow-up", true),
		).toThrow(/--batching=false/u);

		const batch = preparePrototypePreflight({ batching: true });
		const direct = preparePrototypePreflight({ batching: false });
		expect(batch.runnerParameters).toEqual({
			batching: true,
			pool: "development",
		});
		expect(direct.runnerParameters).toEqual({
			batching: false,
			pool: "development",
		});
		expect(batch.priceSchedule.shortContext).toMatchObject({
			inputUsdPerMillion: 0.1,
			outputUsdPerMillion: 0.6,
		});
		expect(direct.priceSchedule.shortContext).toMatchObject({
			inputUsdPerMillion: 0.2,
			cachedInputUsdPerMillion: 0.02,
			cacheWriteUsdPerMillion: 0.25,
			outputUsdPerMillion: 1.2,
		});
		expect(direct.maximumEstimatedCostUsd).toBeLessThanOrEqual(2);
		expect(direct.maximumEstimatedCostUsd).toBeGreaterThan(
			batch.maximumEstimatedCostUsd,
		);
		expect(MAX_OUTPUT_TOKENS).toBe(1024);
		expect(REASONING_EFFORT).toBe("none");
		expect(DIRECT_TRANSIENT_RETRY_LIMIT).toBe(2);
		expect(
			shouldRetryDirectProviderError(
				{ name: "Error", message: "socket reset", code: "ECONNRESET" },
				0,
			),
		).toBe(true);
		expect(
			shouldRetryDirectProviderError(
				{ name: "RateLimitError", message: "slow down", status: 429 },
				1,
			),
		).toBe(true);
		expect(
			shouldRetryDirectProviderError(
				{
					name: "InternalServerError",
					message: "unavailable",
					status: 503,
				},
				1,
			),
		).toBe(true);
		expect(
			shouldRetryDirectProviderError(
				{ name: "BadRequestError", message: "bad input", status: 400 },
				0,
			),
		).toBe(false);
		expect(
			shouldRetryDirectProviderError(
				{ name: "Error", message: "reset", code: "ECONNRESET" },
				2,
			),
		).toBe(false);
	});

	test("binds an explicit diagnostic pool to only the failing and analogue cases", () => {
		const parsed = runnerParametersSchema.safeParse({
			batching: false,
			pool: "diagnostic",
		});
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		const preflight = preparePrototypePreflight(parsed.data);
		expect(preflight.runnerParameters.pool).toBe("diagnostic");
		expect(preflight.evaluationCaseIds).toEqual(diagnosticSelection.ids);
		expect(preflight.exactCallCap).toBe(68);
		expect(
			promptCacheKeyForScheduleKey(
				"additional-compact-indices/1/target-de-diagnostic-fusion-am",
				"diagnostic",
			),
		).toMatch(/^tc85:additional-compact-indices:s\d{2}$/u);
	});

	test("runs diagnostic follow-ups without changing first-turn evidence", async () => {
		const sourceDirectory = await mkdtemp(
			join(tmpdir(), "target-contract-diagnostic-source-"),
		);
		const followUpDirectory = await mkdtemp(
			join(tmpdir(), "target-contract-diagnostic-follow-up-"),
		);
		try {
			const sourceRun = await runLivePrototype({
				batching: false,
				pool: "diagnostic",
				client: fakeResponsesClientByInput(undefined, "diagnostic"),
				runDirectory: sourceDirectory,
			});
			if (
				typeof sourceRun.preflight !== "object" ||
				sourceRun.preflight === null ||
				Array.isArray(sourceRun.preflight)
			) {
				throw new Error("Expected object preflight evidence.");
			}
			const legacyPreflight = {
				...sourceRun.preflight,
				runnerVersion: "target-classification-high-level-contracts-v10",
			};
			const legacyResultsPath = join(
				sourceDirectory,
				"legacy-results.json",
			);
			await writeFile(
				legacyResultsPath,
				`${JSON.stringify(
					{
						...sourceRun,
						preflight: legacyPreflight,
						bindingSha256: createHash("sha256")
							.update(stableJson(legacyPreflight))
							.digest("hex"),
					},
					null,
					2,
				)}\n`,
				"utf8",
			);
			await expect(
				runDiagnosticFollowUp({
					batching: false,
					resultsPath: legacyResultsPath,
					artifactDirectory: followUpDirectory,
					client: {
						responses: {
							create: async () => {
								throw new Error(
									"Legacy source must not dispatch.",
								);
							},
						},
					},
				}),
			).rejects.toThrow(/runnerVersion|v15/u);
			const missKeys = [
				"additional-compact-indices/1/target-de-diagnostic-fusion-am",
				"additional-compact-indices/2/target-de-diagnostic-idiom-oel-click-oel",
			];
			const sourceWithMisses = {
				...sourceRun,
				attempts: sourceRun.attempts.map((attempt) =>
					missKeys.includes(attempt.key)
						? {
								...attempt,
								evaluation: {
									...attempt.evaluation,
									contractPass: false,
								},
							}
						: attempt,
				),
			};
			const resultsPath = join(sourceDirectory, "results.json");
			await writeFile(
				resultsPath,
				`${JSON.stringify(sourceWithMisses, null, 2)}\n`,
				"utf8",
			);
			const sourceBytesBefore = await Bun.file(resultsPath).bytes();
			let providerCallCount = 0;
			const followUp = await runDiagnosticFollowUp({
				batching: false,
				resultsPath,
				artifactDirectory: followUpDirectory,
				client: {
					responses: {
						create: async () => {
							providerCallCount += 1;
							throw new Error("offline diagnostic boundary");
						},
					},
				},
			});
			expect(followUp.version).toBe(
				"target-classification-diagnostic-follow-up-v4",
			);
			expect(providerCallCount).toBe(8);
			expect(followUp.callCap).toBe(DIAGNOSTIC_FOLLOW_UP_CALL_CAP);
			expect(followUp.spendCapUsd).toBe(
				DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD,
			);
			expect(followUp.winnerEligible).toBe(false);
			expect(followUp.sourceResultsSha256).toMatch(/^[0-9a-f]{64}$/u);
			expect(followUp.selections).toHaveLength(8);
			expect(
				followUp.selections.filter(
					({ selectionReason }) =>
						selectionReason === "first-turn-miss",
				),
			).toHaveLength(2);
			expect(
				followUp.selections
					.filter(
						({ selectionReason }) =>
							selectionReason === "matched-pass-control",
					)
					.map(({ cluster }) => cluster),
			).toEqual([
				"copula",
				"fusion",
				"idiom-membership",
				"optional-reflexive",
				"paired-frame",
				"separable-position",
			]);
			expect(
				followUp.selections
					.filter(
						({ selectionReason }) =>
							selectionReason === "matched-pass-control",
					)
					.map(({ key }) => key),
			).toEqual([
				"additional-compact-indices/1/target-de-boundary-copula-click-ist",
				"additional-compact-indices/1/target-de-route-construction-fusion",
				"additional-compact-indices/1/target-de-boundary-fixed-function-click-heult",
				"additional-compact-indices/1/target-de-boundary-optional-reflexive-click-sich",
				"additional-compact-indices/1/target-de-diagnostic-paired-entweder-near-kaffee",
				"additional-compact-indices/1/target-de-diagnostic-overlap-click-aus",
			]);
			expect(followUp.followUps).toHaveLength(8);
			expect(
				followUp.followUps.every(
					({ providerError }) =>
						providerError?.message ===
						"offline diagnostic boundary",
				),
			).toBe(true);
			expect(await Bun.file(resultsPath).bytes()).toEqual(
				sourceBytesBefore,
			);
			expect(
				await Bun.file(
					join(followUpDirectory, "diagnostic-follow-up.json"),
				).exists(),
			).toBe(true);
			const resumed = await runDiagnosticFollowUp({
				batching: false,
				resultsPath,
				artifactDirectory: followUpDirectory,
				client: {
					responses: {
						create: async () => {
							throw new Error(
								"Completed follow-up must not dispatch again.",
							);
						},
					},
				},
			});
			expect(resumed.followUps).toHaveLength(8);
			expect(providerCallCount).toBe(8);

			const followUpPath = join(
				followUpDirectory,
				"diagnostic-follow-up.json",
			);
			const retryableKeys = missKeys;
			const modelOutputErrorKey =
				followUp.selections.find(
					({ selectionReason }) =>
						selectionReason === "matched-pass-control",
				)?.key ?? "";
			const retainedWithTransientErrors = JSON.parse(
				await Bun.file(followUpPath).text(),
			);
			retainedWithTransientErrors.followUps =
				retainedWithTransientErrors.followUps.map(
					(followUpResult: {
						key: string;
						providerError?: Record<string, unknown>;
					}) =>
						followUpResult.key === modelOutputErrorKey
							? {
									...Object.fromEntries(
										Object.entries(followUpResult).filter(
											([field]) =>
												field !== "providerError",
										),
									),
									modelOutputError: {
										name: "SyntaxError",
										message: "retained schema failure",
									},
								}
							: retryableKeys.includes(followUpResult.key)
								? {
										...followUpResult,
										providerError: {
											...followUpResult.providerError,
											status: 520,
										},
									}
								: followUpResult,
				);
			await writeFile(
				followUpPath,
				`${JSON.stringify(retainedWithTransientErrors, null, 2)}\n`,
				"utf8",
			);
			const sourceInputsByKey = new Map(
				sourceWithMisses.attempts.map((attempt) => [
					attempt.key,
					stableJson(attempt.privateInput),
				]),
			);
			const successfulRetryInput = sourceInputsByKey.get(
				retryableKeys[0] ?? "",
			);
			const exhaustedRetryInput = sourceInputsByKey.get(
				retryableKeys[1] ?? "",
			);
			if (
				successfulRetryInput === undefined ||
				exhaustedRetryInput === undefined
			) {
				throw new Error("Missing diagnostic retry fixture inputs.");
			}
			let retryCallCount = 0;
			const retried = await runDiagnosticFollowUp({
				batching: false,
				resultsPath,
				artifactDirectory: followUpDirectory,
				client: {
					responses: {
						create: async (request) => {
							retryCallCount += 1;
							const privateInput = (
								request.input as readonly {
									content?: unknown;
								}[]
							)[1]?.content;
							if (privateInput === exhaustedRetryInput) {
								throw Object.assign(
									new Error("provider edge failure"),
									{ status: 520 },
								);
							}
							if (privateInput !== successfulRetryInput) {
								throw new Error(
									"A terminal diagnostic result was replayed.",
								);
							}
							const outputText = stableJson({
								chosenUnit: null,
								clickRole: "NoChosenUnit",
								segmentJudgments: [
									{
										index: 0,
										judgment: "Free",
										reason: "The retained answer is reviewed neutrally.",
									},
								],
								ruleApplied:
									"Apply the click-containing target rule.",
								conciseCritique: "No correction is warranted.",
								wouldRevise: false,
								correctedClassification: null,
							});
							return {
								id: "diagnostic-retry-success",
								model: "gpt-5.6-luna",
								output_text: outputText,
								usage: {
									input_tokens: 10,
									output_tokens: 5,
									total_tokens: 15,
									input_tokens_details: { cached_tokens: 0 },
								},
							};
						},
					},
				},
			});
			expect(retryCallCount).toBe(3);
			expect(retried.dispatchCounts[retryableKeys[0] ?? ""]).toBe(2);
			expect(retried.dispatchCounts[retryableKeys[1] ?? ""]).toBe(3);
			expect(
				retried.followUps.find(({ key }) => key === retryableKeys[0])
					?.followUp?.winnerEligible,
			).toBe(false);
			expect(
				retried.followUps.find(({ key }) => key === retryableKeys[1])
					?.providerError?.status,
			).toBe(520);
			expect(retried.dispatchCounts[modelOutputErrorKey]).toBe(1);
			expect(
				retried.followUps.find(({ key }) => key === modelOutputErrorKey)
					?.modelOutputError?.message,
			).toBe("retained schema failure");
			let terminalReplayCount = 0;
			await runDiagnosticFollowUp({
				batching: false,
				resultsPath,
				artifactDirectory: followUpDirectory,
				client: {
					responses: {
						create: async () => {
							terminalReplayCount += 1;
							throw new Error("Terminal result replayed.");
						},
					},
				},
			});
			expect(terminalReplayCount).toBe(0);
		} finally {
			await rm(sourceDirectory, { recursive: true, force: true });
			await rm(followUpDirectory, { recursive: true, force: true });
		}
	}, 30_000);

	test("retries direct transient transport failures within the same logical slot", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "target-contract-direct-retry-"),
		);
		const stableClient = fakeResponsesClientByInput();
		const targetInput = stableJson(
			prepareRepresentationCases(REPRESENTATION_IDS[0])[0]?.privateInput,
		);
		const exhaustedInput = stableJson(
			prepareRepresentationCases(REPRESENTATION_IDS[0])[1]?.privateInput,
		);
		let targetFailures = 0;
		let exhaustedFailures = 0;
		let physicalCalls = 0;
		try {
			const run = await runLivePrototype({
				batching: false,
				client: {
					responses: {
						create: async (request) => {
							physicalCalls += 1;
							const privateInput = (
								request.input as
									| readonly { content?: unknown }[]
									| undefined
							)?.[1]?.content;
							if (
								privateInput === targetInput &&
								targetFailures < 2
							) {
								targetFailures += 1;
								throw Object.assign(
									new Error("connection reset"),
									{
										code: "ECONNRESET",
									},
								);
							}
							if (
								privateInput === exhaustedInput &&
								exhaustedFailures < 3
							) {
								exhaustedFailures += 1;
								throw Object.assign(
									new Error("connection reset"),
									{
										code: "ECONNRESET",
									},
								);
							}
							return stableClient.responses.create(request);
						},
					},
				},
				runDirectory: directory,
			});
			expect(physicalCalls).toBe(EXACT_CALL_CAP + 4);
			expect(run.attempts).toHaveLength(EXACT_CALL_CAP);
			const providerErrors = run.attempts.filter(
				({ providerError }) => providerError !== undefined,
			);
			expect(providerErrors).toHaveLength(1);
			expect(providerErrors[0]?.providerError?.code).toBe("ECONNRESET");
			const firstKey = run.attempts[0]?.key;
			const exhaustedKey = run.attempts[1]?.key;
			if (firstKey === undefined || exhaustedKey === undefined) {
				throw new Error("Missing retry keys.");
			}
			const checkpoint = JSON.parse(
				await Bun.file(
					join(directory, "direct-checkpoint.json"),
				).text(),
			);
			expect(checkpoint.dispatchCounts[firstKey]).toBe(3);
			expect(checkpoint.transientRetryCounts[firstKey]).toBe(2);
			expect(checkpoint.dispatchCounts[exhaustedKey]).toBe(3);
			expect(checkpoint.transientRetryCounts[exhaustedKey]).toBe(2);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}, 15_000);

	test("runs direct calls concurrently and resumes atomic checkpoints", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "target-contract-direct-"),
		);
		let inFlight = 0;
		let maximumInFlight = 0;
		const firstClient = fakeResponsesClientByInput(async () => {
			inFlight += 1;
			maximumInFlight = Math.max(maximumInFlight, inFlight);
			await new Promise<void>((resolveDelay) =>
				setTimeout(resolveDelay, 1),
			);
			inFlight -= 1;
		});
		let injected = false;
		try {
			await expect(
				runLivePrototype({
					batching: false,
					client: firstClient,
					runDirectory: directory,
					onAttemptPersisted: () => {
						if (!injected) {
							injected = true;
							throw new Error("Injected direct crash.");
						}
					},
				}),
			).rejects.toThrow("Injected direct crash.");
			expect(maximumInFlight).toBeGreaterThan(1);
			expect(maximumInFlight).toBeLessThanOrEqual(8);

			const checkpointPath = join(directory, "direct-checkpoint.json");
			const checkpoint = JSON.parse(
				await Bun.file(checkpointPath).text(),
			);
			const completedBeforeResume = checkpoint.attempts.length;
			expect(completedBeforeResume).toBeGreaterThan(0);
			expect(completedBeforeResume).toBeLessThan(EXACT_CALL_CAP);

			const resumedClient = fakeResponsesClientByInput();
			const run = await runLivePrototype({
				batching: false,
				client: resumedClient,
				runDirectory: directory,
			});
			expect(resumedClient.callCount).toBe(
				EXACT_CALL_CAP - completedBeforeResume,
			);
			expect(run.attempts).toHaveLength(EXACT_CALL_CAP);
			expect(run.attempts.map(({ key }) => key)).toEqual(
				preparePrototypeBatch({ batching: true }).manifest.schedule.map(
					({ key }) => key,
				),
			);

			const completedCheckpoint = JSON.parse(
				await Bun.file(checkpointPath).text(),
			);
			const lostAttempt = completedCheckpoint.attempts.pop();
			if (lostAttempt === undefined) {
				throw new Error("Missing simulated crash-gap attempt.");
			}
			await writeFile(
				checkpointPath,
				`${JSON.stringify(completedCheckpoint, null, 2)}\n`,
				"utf8",
			);
			const replayClient = fakeResponsesClientByInput();
			await runLivePrototype({
				batching: false,
				client: replayClient,
				runDirectory: directory,
			});
			expect(replayClient.callCount).toBe(1);
			const replayedCheckpoint = JSON.parse(
				await Bun.file(checkpointPath).text(),
			);
			expect(replayedCheckpoint.dispatchCounts[lostAttempt.key]).toBe(2);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}, 30_000);

	test("prepares one frozen Responses Batch with bounded explicit cache shards", () => {
		const prepared = preparePrototypeBatch({ batching: true });
		expect(prepared.manifest.schedule).toHaveLength(EXACT_CALL_CAP);
		expect(prepared.jsonl.trim().split("\n")).toHaveLength(EXACT_CALL_CAP);
		const envelopes = prepared.jsonl
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(new Set(envelopes.map(({ custom_id }) => custom_id)).size).toBe(
			EXACT_CALL_CAP,
		);
		const keyCounts = new Map<string, number>();
		for (const envelope of envelopes) {
			expect(envelope.method).toBe("POST");
			expect(envelope.url).toBe(BATCH_ENDPOINT);
			expect(envelope.body.max_output_tokens).toBe(MAX_OUTPUT_TOKENS);
			expect(envelope.body.reasoning).toEqual({
				effort: REASONING_EFFORT,
			});
			expect(envelope.body.prompt_cache_options).toEqual({
				mode: "explicit",
				ttl: "30m",
			});
			const system = envelope.body.input[0];
			expect(system.role).toBe("system");
			expect(system.content).toHaveLength(1);
			expect(system.content[0].prompt_cache_breakpoint).toEqual({
				mode: "explicit",
			});
			const key = envelope.body.prompt_cache_key;
			keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
		}
		expect(Math.max(...keyCounts.values())).toBeLessThanOrEqual(12);
		expect(prepared.manifest.completionWindow).toBe(
			BATCH_COMPLETION_WINDOW,
		);
		expect(prepared.manifest.endpoint).toBe(BATCH_ENDPOINT);
	});

	test("uploads with purpose batch and resumes unordered output into retained attempts", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "target-contract-batch-"),
		);
		try {
			let uploadedPurpose: unknown;
			let createRequest: unknown;
			const downloadedFileIds: string[] = [];
			const prepared = preparePrototypeBatch({ batching: true });
			const output = prepared.manifest.schedule
				.toReversed()
				.map((binding, index) => {
					const testCase = prepareRepresentationCases(
						binding.armId,
					).find(({ caseId }) => caseId === binding.caseId);
					if (testCase === undefined)
						throw new Error("Missing fake case.");
					const outputText = stableJson(testCase.privateIdealOutput);
					return stableJson({
						id: `batch-request-${index}`,
						custom_id: binding.customId,
						response: {
							status_code: 200,
							request_id: `request-${index}`,
							body: {
								id: `response-${index}`,
								model: "gpt-5.6-luna",
								output: [
									{
										type: "message",
										content: [
											{
												type: "output_text",
												text: outputText,
											},
										],
									},
								],
								usage: {
									input_tokens: 10,
									output_tokens: 5,
									total_tokens: 15,
									input_tokens_details: {
										cached_tokens: 8,
										cache_write_tokens: 2,
									},
								},
							},
						},
						error: null,
					});
				})
				.join("\n");
			const client = {
				files: {
					list: async () => ({ data: [], has_more: false }),
					create: async (request: { purpose: unknown }) => {
						uploadedPurpose = request.purpose;
						return { id: "file-input" };
					},
					content: async (fileId: string) => {
						downloadedFileIds.push(fileId);
						return {
							text: async () =>
								fileId === "file-output" ? output : "",
						};
					},
				},
				batches: {
					list: async () => ({ data: [], has_more: false }),
					create: async (request: Record<string, unknown>) => {
						createRequest = request;
						return {
							id: "batch-1",
							input_file_id: "file-input",
							endpoint: BATCH_ENDPOINT,
							completion_window: BATCH_COMPLETION_WINDOW,
							status: "validating",
							metadata: request.metadata,
						};
					},
					retrieve: async () => ({
						id: "batch-1",
						input_file_id: "file-input",
						endpoint: BATCH_ENDPOINT,
						completion_window: BATCH_COMPLETION_WINDOW,
						status: "completed",
						metadata: {
							prototype:
								"target-classification-high-level-contracts",
							binding_sha256: prepared.manifest.bindingSha256,
							input_sha256: prepared.manifest.inputSha256,
						},
						output_file_id: "file-output",
						error_file_id: "file-error",
						request_counts: {
							total: EXACT_CALL_CAP,
							completed: EXACT_CALL_CAP,
							failed: 0,
						},
					}),
				},
			};
			const manifestPath = await submitPrototypeBatch({
				batching: true,
				client,
				runDirectory: directory,
			});
			expect(uploadedPurpose).toBe("batch");
			expect(createRequest).toEqual({
				input_file_id: "file-input",
				endpoint: BATCH_ENDPOINT,
				completion_window: BATCH_COMPLETION_WINDOW,
				metadata: {
					prototype: "target-classification-high-level-contracts",
					binding_sha256: prepared.manifest.bindingSha256,
					input_sha256: prepared.manifest.inputSha256,
				},
			});
			const resumed = await resumePrototypeBatch({
				batching: true,
				client,
				manifestPath,
			});
			expect(resumed.status).toBe("completed");
			expect(resumed.run?.actualCallCount).toBe(EXACT_CALL_CAP);
			expect(downloadedFileIds).toEqual(["file-output", "file-error"]);
			expect(
				resumed.run?.attempts[0]?.rawBatchResponseJson,
			).toMatchObject({
				custom_id: prepared.manifest.schedule[0]?.customId,
			});
			expect(resumed.run?.attempts[0]?.usage?.cachedInputTokens).toBe(8);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}, 15_000);

	test("batch reconciliation blocks ambiguous remote file and Batch matches", async () => {
		const prepared = preparePrototypeBatch({ batching: true });
		const filename = `target-classification-high-level-${prepared.manifest.inputSha256}.jsonl`;
		const metadata = {
			prototype: "target-classification-high-level-contracts",
			binding_sha256: prepared.manifest.bindingSha256,
			input_sha256: prepared.manifest.inputSha256,
		};
		for (const duplicate of ["file", "batch"] as const) {
			const directory = await mkdtemp(
				join(tmpdir(), `target-contract-duplicate-${duplicate}-`),
			);
			let uploadCount = 0;
			let createCount = 0;
			const files = Array.from(
				{ length: duplicate === "file" ? 2 : 1 },
				(_, index) => ({
					id: `file-${index}`,
					filename,
					bytes: prepared.manifest.inputUtf8Bytes,
					purpose: "batch",
				}),
			);
			const batches =
				duplicate === "batch"
					? Array.from({ length: 2 }, (_, index) => ({
							id: `batch-${index}`,
							input_file_id: "file-0",
							endpoint: BATCH_ENDPOINT,
							completion_window: BATCH_COMPLETION_WINDOW,
							status: "validating",
							metadata,
						}))
					: [];
			const client = {
				files: {
					list: async () => ({ data: files, has_more: false }),
					create: async () => {
						uploadCount += 1;
						return { id: "unexpected-file" };
					},
					content: async () => ({ text: async () => "" }),
				},
				batches: {
					list: async () => ({ data: batches, has_more: false }),
					create: async () => {
						createCount += 1;
						throw new Error("Unexpected create.");
					},
					retrieve: async () => {
						throw new Error("Unexpected retrieve.");
					},
				},
			};
			try {
				await expect(
					submitPrototypeBatch({
						batching: true,
						client,
						runDirectory: directory,
					}),
				).rejects.toThrow(/Multiple remote/u);
				expect(uploadCount).toBe(0);
				expect(createCount).toBe(0);
			} finally {
				await rm(directory, { recursive: true, force: true });
			}
		}
	}, 15_000);

	test("batch submission reconciles remote success before local checkpoints without duplicate mutations", async () => {
		for (const crashAfter of ["upload", "create"] as const) {
			const directory = await mkdtemp(
				join(tmpdir(), `target-contract-batch-${crashAfter}-`),
			);
			let uploadCount = 0;
			let createCount = 0;
			const remoteFiles: Array<{
				id: string;
				filename: string;
				bytes: number;
				purpose: "batch";
			}> = [];
			const remoteBatches: Array<Record<string, unknown>> = [];
			const client = {
				files: {
					list: async () => ({ data: remoteFiles, has_more: false }),
					create: async (request: { file: unknown }) => {
						uploadCount += 1;
						const file = request.file as {
							name: string;
							size: number;
						};
						remoteFiles.push({
							id: "file-input",
							filename: file.name,
							bytes: file.size,
							purpose: "batch",
						});
						return { id: "file-input" };
					},
					content: async () => ({ text: async () => "" }),
				},
				batches: {
					list: async () => ({
						data: remoteBatches,
						has_more: false,
					}),
					create: async (request: Record<string, unknown>) => {
						createCount += 1;
						const batch = {
							id: "batch-1",
							input_file_id: "file-input",
							endpoint: BATCH_ENDPOINT,
							completion_window: BATCH_COMPLETION_WINDOW,
							status: "validating",
							metadata: request.metadata,
						};
						remoteBatches.push(batch);
						return batch;
					},
					retrieve: async () => {
						throw new Error("Submission retry must not retrieve.");
					},
				},
			};
			try {
				await expect(
					submitPrototypeBatch({
						batching: true,
						client,
						runDirectory: directory,
						onRemoteMutationReturned: (phase) => {
							if (phase === crashAfter) {
								throw new Error(`Injected ${phase} crash.`);
							}
						},
					}),
				).rejects.toThrow(`Injected ${crashAfter} crash.`);
				const manifestPath = await submitPrototypeBatch({
					batching: true,
					client,
					runDirectory: directory,
				});
				const manifest = JSON.parse(
					await Bun.file(manifestPath).text(),
				);
				expect(manifest.remote).toMatchObject({
					inputFileId: "file-input",
					batchId: "batch-1",
				});
				expect(uploadCount).toBe(1);
				expect(createCount).toBe(1);
				expect(remoteFiles[0]?.filename).toContain(
					preparePrototypeBatch({ batching: true }).manifest
						.inputSha256,
				);
			} finally {
				await rm(directory, { recursive: true, force: true });
			}
		}
	}, 15_000);

	test("refuses incomplete retained call schedules", () => {
		expect(() => assertAttemptSchedule([])).toThrow(/exact unique/u);
	});

	test("retains raw Responses evidence and rejects resolved-model drift", async () => {
		const directory = await mkdtemp(join(tmpdir(), "target-contract-run-"));
		try {
			const run = await runLivePrototype({
				batching: false,
				client: fakeResponsesClient(),
				runDirectory: directory,
			});
			expect(run.attempts[0]?.providerError).toBeUndefined();
			expect(run.resolvedModel).toBe("gpt-5.6-luna");
			const first = run.attempts[0];
			if (first === undefined) throw new Error("Missing first attempt.");
			expect(first.rawResponseJson).toMatchObject({
				id: "response-0",
				model: "gpt-5.6-luna",
			});
			expect(first.requestUtf8Bytes).toBeGreaterThan(0);
			expect(first.responseUtf8Bytes).toBe(
				Buffer.byteLength(stableJson(first.rawResponseJson), "utf8"),
			);
			await expect(
				runLivePrototype({
					batching: false,
					client: fakeResponsesClient(() => "gpt-5.6-luna-other"),
					runDirectory: join(directory, "wrong-snapshot"),
				}),
			).rejects.toThrow(/expected resolved model/u);
			await expect(
				runLivePrototype({
					batching: false,
					client: fakeResponsesClient((callIndex) =>
						callIndex === EXACT_CALL_CAP - 1
							? "gpt-5.6-luna-2026-08-02"
							: "gpt-5.6-luna",
					),
					runDirectory: join(directory, "drift"),
				}),
			).rejects.toThrow(/resolved-model drift/u);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	}, 15_000);

	test("preserves raw response bytes when usage parsing fails", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "target-contract-raw-error-"),
		);
		try {
			const validClient = fakeResponsesClient();
			const run = await runLivePrototype({
				batching: false,
				client: {
					responses: {
						create: async (request) => ({
							...(await validClient.responses.create(request)),
							usage: { malformed: true },
						}),
					},
				},
				runDirectory: directory,
			});
			const first = run.attempts[0];
			if (first === undefined) throw new Error("Missing first attempt.");
			expect(first.providerError?.message).toMatch(/input_tokens/u);
			expect(first.rawResponseJson).toMatchObject({
				id: "response-0",
				model: "gpt-5.6-luna",
				usage: { malformed: true },
			});
			expect(first.requestUtf8Bytes).toBeGreaterThan(0);
			expect(first.responseUtf8Bytes).toBe(
				Buffer.byteLength(stableJson(first.rawResponseJson), "utf8"),
			);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	test("preserves raw response bytes when envelope parsing fails", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "target-contract-envelope-error-"),
		);
		try {
			const rawResponse = { unexpected: "response-shape" };
			const run = await runLivePrototype({
				batching: false,
				client: { responses: { create: async () => rawResponse } },
				runDirectory: directory,
			});
			const first = run.attempts[0];
			if (first === undefined) throw new Error("Missing first attempt.");
			expect(first.providerError).toBeDefined();
			expect(first.rawResponseJson).toEqual(rawResponse);
			expect(first.responseUtf8Bytes).toBe(
				Buffer.byteLength(stableJson(rawResponse), "utf8"),
			);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	test("finalization rederives and byte-compares every scheduled case payload", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "target-contract-finalize-"),
		);
		const resultsPath = join(directory, "results.json");
		const classificationsPath = join(directory, "classifications.json");
		try {
			const run = await runLivePrototype({
				batching: false,
				client: fakeResponsesClient(),
				runDirectory: directory,
			});
			await writeFile(classificationsPath, "{}", "utf8");
			for (const field of [
				"canonicalInput",
				"canonicalIdealOutput",
				"privateInput",
				"privateIdealOutput",
			] as const) {
				const tampered = structuredClone(run);
				const first = tampered.attempts[0];
				if (first === undefined)
					throw new Error("Missing first attempt.");
				Object.assign(first, { [field]: { tampered: true } });
				await writeFile(resultsPath, JSON.stringify(tampered), "utf8");
				await expect(
					finalizeEvidence(resultsPath, classificationsPath),
				).rejects.toThrow(new RegExp(`${field}.*scheduled case`, "u"));
			}
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
