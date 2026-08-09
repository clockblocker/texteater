import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	assertAttemptSchedule,
	finalizeEvidence,
	runLivePrototype,
} from "../../docs/prototypes/target-classification-high-level-contracts/run";
import { stableJson } from "../../src/lib/stable-json";
import { corpus } from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/corpus";
import {
	demonstrationSelection,
	evaluationSelection,
} from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/selections";
import {
	type ArmEvidenceSummary,
	ATTEMPTS_PER_ARM,
	decidePrototypeWinner,
	EXACT_CALL_CAP,
	EXPECTED_CALLS_PER_ARM,
	MAXIMUM_SPEND_USD,
	preparePrototypePreflight,
	prepareRepresentationCases,
} from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/contract-prototype";
import {
	additionalCompactIndicesOutputSchema,
	compactInputSchema,
	fixedLengthMaskOutputSchema,
	fullCompactIndicesOutputSchema,
	materializeRepresentation,
	parseAndCanonicalizeRepresentation,
	projectCompactInput,
	REPRESENTATION_IDS,
} from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/representations";

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

	test("compacts only whitespace while retaining opaque and punctuation positions", () => {
		const projection = projectCompactInput({
			clickedSegmentIndex: 2,
			segments: [
				{ kind: "OpaqueText", text: "[x]" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "steht" },
				{ kind: "Punctuation", text: "." },
			],
		});
		expect(projection.input).toEqual({
			clickedCompactIndex: 1,
			segments: [
				{ kind: "OpaqueText", text: "[x]" },
				{ kind: "ResolvableText", text: "steht" },
				{ kind: "Punctuation", text: "." },
			],
		});
		expect(projection.compactToOriginal).toEqual([0, 2, 3]);
		expect(projection.originalToCompact.get(2)).toBe(1);
	});

	test("preflights one frozen corpus through all arms with exact hashes and cost cap", () => {
		const preflight = preparePrototypePreflight();
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(demonstrationSelection.ids).toHaveLength(6);
		expect(preflight.attemptsPerArm).toBe(ATTEMPTS_PER_ARM);
		expect(preflight.expectedResolvedModel).toBe("gpt-5.6-luna");
		expect(EXPECTED_CALLS_PER_ARM).toBe(188);
		expect(preflight.exactCallCap).toBe(EXACT_CALL_CAP);
		expect(EXACT_CALL_CAP).toBe(564);
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
			minimumContractRatio: 0.8,
			minimumSliceRatio: 0.8,
			tieMargin: 0.01,
			tieRule: "inclusive-best-ratio-margin",
		});
		for (const hash of [
			preflight.modelConfigSha256,
			preflight.corpusSha256,
			preflight.decisionPolicySha256,
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

	test("round-trips all 100 selected ideals and shares each compact stimulus", () => {
		const selected = demonstrationSelection.union(evaluationSelection);
		for (const [index, caseId] of selected.ids.entries()) {
			const goldenCase = selected.cases[index];
			if (goldenCase === undefined) throw new Error(`Missing ${caseId}.`);
			const inputs = REPRESENTATION_IDS.map((id) => {
				const materialized = materializeRepresentation(id, goldenCase);
				expect(
					parseAndCanonicalizeRepresentation({
						id,
						canonicalInput: goldenCase.input,
						privateInput: compactInputSchema.parse(
							materialized.input,
						),
						output: materialized.idealOutput,
					}),
				).toEqual(goldenCase.idealOutput);
				return materialized.input;
			});
			expect(inputs[1]).toEqual(inputs[0]);
			expect(inputs[2]).toEqual(inputs[0]);
		}
	});

	test("enforces arm-specific click, mask-length, and resolvable-index gates", () => {
		const goldenCase =
			corpus.cases["target-de-boundary-separable-click-steht"];
		if (goldenCase === undefined)
			throw new Error("Missing separable fixture.");
		const privateInput = projectCompactInput(goldenCase.input).input;
		const full = materializeRepresentation(
			"full-compact-indices",
			goldenCase,
		);
		const additional = materializeRepresentation(
			"additional-compact-indices",
			goldenCase,
		);
		const mask = materializeRepresentation("fixed-length-mask", goldenCase);
		expect(() =>
			parseAndCanonicalizeRepresentation({
				id: "full-compact-indices",
				canonicalInput: goldenCase.input,
				privateInput,
				output: fullCompactIndicesOutputSchema.parse({
					...(full.idealOutput as object),
					target: {
						...(full.idealOutput as { target: object }).target,
						membership: { memberCompactIndices: [0] },
					},
				}),
			}),
		).toThrow(/clicked|ResolvableText/u);
		expect(() =>
			parseAndCanonicalizeRepresentation({
				id: "additional-compact-indices",
				canonicalInput: goldenCase.input,
				privateInput,
				output: additionalCompactIndicesOutputSchema.parse({
					...(additional.idealOutput as object),
					target: {
						...(additional.idealOutput as { target: object })
							.target,
						membership: {
							additionalMemberCompactIndices: [
								privateInput.clickedCompactIndex,
							],
						},
					},
				}),
			}),
		).toThrow(/exclude/u);
		for (const additionalMemberCompactIndices of [
			[3, 0],
			[0, 0],
		]) {
			expect(() =>
				parseAndCanonicalizeRepresentation({
					id: "additional-compact-indices",
					canonicalInput: goldenCase.input,
					privateInput,
					output: additionalCompactIndicesOutputSchema.parse({
						...(additional.idealOutput as object),
						target: {
							...(additional.idealOutput as { target: object })
								.target,
							membership: {
								additionalMemberCompactIndices,
							},
						},
					}),
				}),
			).toThrow(/ordered and unique/u);
		}
		expect(() =>
			parseAndCanonicalizeRepresentation({
				id: "fixed-length-mask",
				canonicalInput: goldenCase.input,
				privateInput,
				output: fixedLengthMaskOutputSchema.parse({
					...(mask.idealOutput as object),
					target: {
						...(mask.idealOutput as { target: object }).target,
						membership: { memberMask: [true] },
					},
				}),
			}),
		).toThrow(/length/u);
	});

	test("uses predetermined winner, tie, and no-winner outcomes", () => {
		const passing = (
			id: (typeof REPRESENTATION_IDS)[number],
			score: number,
		) =>
			({
				id,
				attemptCount: 188,
				contractScore: score,
				executionErrorCount: 0,
				unclassifiedMissCount: 0,
				safetyGatePass: true,
				clickGatePass: true,
				sliceRatios: { routes: 0.9, boundaries: 0.9, robustness: 0.9 },
			}) satisfies ArmEvidenceSummary;
		expect(
			decidePrototypeWinner([
				passing("full-compact-indices", 180),
				passing("additional-compact-indices", 175),
				passing("fixed-length-mask", 170),
			]),
		).toEqual({ decision: "Winner", winner: "full-compact-indices" });
		expect(
			decidePrototypeWinner([
				passing("full-compact-indices", 180),
				passing("additional-compact-indices", 179),
			]),
		).toEqual({
			decision: "Tie",
			arms: ["full-compact-indices", "additional-compact-indices"],
		});
		expect(
			decidePrototypeWinner([
				{ ...passing("fixed-length-mask", 180), safetyGatePass: false },
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
			await expect(runLivePrototype()).rejects.toThrow(/OPENAI_API_KEY/u);
		} finally {
			if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
		}
	});

	test("refuses incomplete retained call schedules", () => {
		expect(() => assertAttemptSchedule([])).toThrow(/exact unique/u);
	});

	test("retains raw Responses evidence and rejects resolved-model drift", async () => {
		const directory = await mkdtemp(join(tmpdir(), "target-contract-run-"));
		try {
			const run = await runLivePrototype({
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
					client: fakeResponsesClient(() => "gpt-5.6-luna-other"),
					runDirectory: join(directory, "wrong-snapshot"),
				}),
			).rejects.toThrow(/expected resolved model/u);
			await expect(
				runLivePrototype({
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
	});

	test("preserves raw response bytes when usage parsing fails", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "target-contract-raw-error-"),
		);
		try {
			const validClient = fakeResponsesClient();
			const run = await runLivePrototype({
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
