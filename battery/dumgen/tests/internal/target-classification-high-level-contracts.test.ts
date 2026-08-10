import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	assertAttemptSchedule,
	BATCH_COMPLETION_WINDOW,
	BATCH_ENDPOINT,
	finalizeEvidence,
	preparePrototypeBatch,
	resumePrototypeBatch,
	runLivePrototype,
	submitPrototypeBatch,
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
				{
					compactIndex: 0,
					clicked: false,
					kind: "OpaqueText",
					text: "[x]",
				},
				{
					compactIndex: 1,
					clicked: true,
					kind: "ResolvableText",
					text: "steht",
				},
				{
					compactIndex: 2,
					clicked: false,
					kind: "Punctuation",
					text: ".",
				},
			],
		});
		expect(projection.compactToOriginal).toEqual([0, 2, 3]);
		expect(projection.originalToCompact.get(2)).toBe(1);
	});

	test("rejects contradictory compact click annotations", () => {
		expect(() =>
			compactInputSchema.parse({
				clickedCompactIndex: 0,
				segments: [
					{
						compactIndex: 0,
						clicked: false,
						kind: "ResolvableText",
						text: "Sie",
					},
					{
						compactIndex: 2,
						clicked: true,
						kind: "ResolvableText",
						text: "kommt",
					},
				],
			}),
		).toThrow();
	});

	test("preflights one frozen corpus through all arms with exact hashes and cost cap", () => {
		const preflight = preparePrototypePreflight();
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(demonstrationSelection.ids).toHaveLength(20);
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

	test("round-trips all 114 selected ideals and shares each compact stimulus", () => {
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

	test("prepares one frozen Responses Batch with bounded explicit cache shards", () => {
		const prepared = preparePrototypeBatch();
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
			const prepared = preparePrototypeBatch();
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
		const prepared = preparePrototypeBatch();
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
					submitPrototypeBatch({ client, runDirectory: directory }),
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
					preparePrototypeBatch().manifest.inputSha256,
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
