import { createHash, randomUUID } from "node:crypto";
import type { Dirent } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { z } from "zod";

import {
	DUMGEN_GENERATION_MODEL,
	DUMGEN_REASONING_EFFORT,
} from "../../../ai-sdk/model-policy";
import { stableJson } from "../../../lib/stable-json";
import { assembleSystemPrompt } from "../../assembly";
import type {
	Experiment,
	PromptInputSchema,
	PromptOutputSchema,
} from "../../assembly/contracts";

export const DIRECT_CACHED_PROMPT_POLICY = Object.freeze({
	mode: "explicit" as const,
	ttl: "30m" as const,
	breakpoint: "end-of-stable-system-prompt" as const,
});

const TRANSPORT = "openai-responses-direct-serial" as const;
const TEXT_VERBOSITY = "low" as const;
const MISS_CLASSIFICATIONS = [
	"prompt-defect",
	"corpus-or-evaluator-defect",
	"accepted-model-limitation",
] as const;
const DEVELOPMENT_ROUNDS = [1, 2, 3] as const;

export type EvaluationPhase =
	| { readonly kind: "development"; readonly round: 1 | 2 | 3 }
	| { readonly kind: "acceptance"; readonly claim: "untouched" };

type EvaluationResult = {
	readonly contractPass: boolean;
};

type DirectResponse = {
	readonly id: string;
	readonly model: string;
	readonly output_text: string;
	readonly usage?: unknown;
	readonly status?: string;
	readonly incomplete_details?: { readonly reason?: string | null } | null;
};

type DirectResponsesClient = {
	readonly responses: {
		create(
			request: ResponseCreateParamsNonStreaming,
		): Promise<DirectResponse>;
	};
};

export type RunnerDependencies = {
	readonly createClient?: () => DirectResponsesClient;
	readonly now?: () => Date;
};

export type DirectCachedEvaluationRunnerConfig<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Evaluation extends EvaluationResult,
> = {
	readonly runnerVersion: string;
	readonly route: string;
	readonly structuredOutputName: string;
	readonly modelOutputSchemaFor?: (input: z.output<InputSchema>) => z.ZodType;
	readonly experiments: {
		readonly development: RunnerExperiment<
			InputSchema,
			OutputSchema,
			Evaluation
		>;
		readonly acceptance:
			| RunnerExperiment<InputSchema, OutputSchema, Evaluation>
			| { readonly unavailableReason: string };
	};
	readonly diagnosticShape: z.ZodRawShape;
	readonly limits: {
		readonly maxOutputTokens: number;
		readonly minimumEvaluationCases: number;
		readonly maximumEvaluationCases: number;
		readonly minimumScoreRatio: number;
	};
	readonly evidence: {
		readonly runsDirectory: string;
		readonly acceptanceReservationPath: string;
	};
};

type PreparedTestCase<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
> = {
	readonly id: string;
	readonly input: z.output<InputSchema>;
	readonly idealOutput: z.output<OutputSchema>;
};

type AttemptSummaryInput = {
	readonly contractPass: boolean;
	readonly error?: unknown;
	readonly missClassification: (typeof MISS_CLASSIFICATIONS)[number] | null;
};

type RunnerExperiment<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Evaluation extends EvaluationResult,
> = Experiment<InputSchema, OutputSchema, Evaluation>;

export function createDirectCachedEvaluationRunner<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Evaluation extends EvaluationResult,
>(
	config: DirectCachedEvaluationRunnerConfig<
		InputSchema,
		OutputSchema,
		Evaluation
	>,
) {
	assertConfiguration(config);
	const developmentPromptSource = config.experiments.development.promptSource;
	const configuredAcceptance = config.experiments.acceptance;
	if (
		!("unavailableReason" in configuredAcceptance) &&
		developmentPromptSource !== configuredAcceptance.promptSource
	) {
		throw new Error(
			`Runner for route "${config.route}" must bind development and acceptance to the same Prompt Source instance.`,
		);
	}
	if (developmentPromptSource.route !== config.route) {
		throw new Error(
			`Runner route "${config.route}" does not match Prompt Source route "${developmentPromptSource.route}".`,
		);
	}

	const promptSource = developmentPromptSource;
	const currentSystemPrompt = assembleSystemPrompt(promptSource);
	const promptCacheKey = sha256(
		`${config.route}\u0000${DUMGEN_GENERATION_MODEL}\u0000${currentSystemPrompt}`,
	);
	const nonEmptyIdSchema = z.string().trim().min(1);
	const missClassificationSchema = z.enum(MISS_CLASSIFICATIONS);
	const phaseSchema = z.discriminatedUnion("kind", [
		z.strictObject({
			kind: z.literal("development"),
			round: z.union([z.literal(1), z.literal(2), z.literal(3)]),
		}),
		z.strictObject({
			kind: z.literal("acceptance"),
			claim: z.literal("untouched"),
		}),
	]);
	const retainedErrorSchema = z.strictObject({
		name: z.string().min(1),
		message: z.string(),
		status: z.number().int().finite().optional(),
		code: z.string().min(1).optional(),
	});
	type RetainedAttempt = {
		readonly caseId: string;
		readonly input: z.output<InputSchema>;
		readonly idealOutput: z.output<OutputSchema>;
		readonly output?: z.output<OutputSchema>;
		readonly latencyMs: number;
		readonly rawOutputText?: string;
		readonly resolvedModel?: string;
		readonly responseId?: string;
		readonly usage?: unknown;
		readonly error?: {
			readonly name: string;
			readonly message: string;
			readonly status?: number;
			readonly code?: string;
		};
		readonly missClassification:
			| (typeof MISS_CLASSIFICATIONS)[number]
			| null;
		readonly missClassificationExplanation: string | null;
	} & Evaluation;
	type RetainedRun = {
		readonly runnerVersion: string;
		readonly route: string;
		readonly transport: typeof TRANSPORT;
		readonly phase: EvaluationPhase;
		readonly startedAt: string;
		readonly completedAt: string;
		readonly finalizedAt: string | null;
		readonly model: typeof DUMGEN_GENERATION_MODEL;
		readonly maxOutputTokens: number;
		readonly reasoningEffort: typeof DUMGEN_REASONING_EFFORT;
		readonly textVerbosity: typeof TEXT_VERBOSITY;
		readonly promptCacheKey: string;
		readonly promptCacheMode: typeof DIRECT_CACHED_PROMPT_POLICY.mode;
		readonly promptCacheTtl: typeof DIRECT_CACHED_PROMPT_POLICY.ttl;
		readonly promptCacheBreakpoint: typeof DIRECT_CACHED_PROMPT_POLICY.breakpoint;
		readonly promptSha256: string;
		readonly inputSchemaSha256: string;
		readonly outputSchemaSha256: string;
		readonly suiteSha256: string;
		readonly evaluationCaseIds: string[];
		readonly boundedCalls: number;
		readonly maximumEvaluationCases: number;
		readonly retries: 0;
		readonly store: false;
		readonly contractScore: number;
		readonly scoreRatio: number;
		readonly minimumEvaluationCases: number;
		readonly minimumScoreRatio: number;
		readonly meetsMinimumEvaluationCases: boolean;
		readonly meetsMinimumScoreRatio: boolean;
		readonly executionErrorCount: number;
		readonly unclassifiedMissCount: number;
		readonly evidenceThresholdMet: boolean;
		readonly attempts: RetainedAttempt[];
	};
	const retainedAttemptSchema = z
		.strictObject({
			caseId: nonEmptyIdSchema,
			input: promptSource.inputSchema,
			idealOutput: promptSource.outputSchema,
			output: promptSource.outputSchema.optional(),
			...config.diagnosticShape,
			latencyMs: z.number().int().finite().nonnegative(),
			rawOutputText: z.string().optional(),
			resolvedModel: z.string().min(1).optional(),
			responseId: z.string().min(1).optional(),
			usage: z.unknown().optional(),
			error: retainedErrorSchema.optional(),
			missClassification: missClassificationSchema.nullable(),
			missClassificationExplanation: z.string().trim().min(1).nullable(),
		})
		.superRefine((value, context) => {
			const attempt = value as unknown as RetainedAttempt;
			const hasError = attempt.error !== undefined;
			const responseMetadataFieldCount = [
				attempt.rawOutputText,
				attempt.resolvedModel,
				attempt.responseId,
				attempt.usage,
			].filter((value) => value !== undefined).length;
			const hasCompleteResponseMetadata =
				responseMetadataFieldCount === 4;
			if (
				responseMetadataFieldCount !== 0 &&
				!hasCompleteResponseMetadata
			) {
				context.addIssue({
					code: "custom",
					message:
						"Provider response metadata must be retained completely or omitted completely.",
				});
			}
			const hasSuccessfulResponse =
				attempt.output !== undefined && hasCompleteResponseMetadata;
			if (hasError === hasSuccessfulResponse) {
				context.addIssue({
					code: "custom",
					message:
						"Attempt must contain either a complete successful response or an error.",
				});
			}
			if (hasError && attempt.output !== undefined) {
				context.addIssue({
					code: "custom",
					message: "Errored attempts cannot contain a parsed output.",
				});
			}
			if (hasError && attempt.contractPass) {
				context.addIssue({
					code: "custom",
					message: "Errored attempts cannot pass the contract.",
				});
			}
			if (
				(attempt.missClassification === null) !==
				(attempt.missClassificationExplanation === null)
			) {
				context.addIssue({
					code: "custom",
					message:
						"Miss classification and explanation must both be present or both be null.",
				});
			}
			if (
				(attempt.contractPass || hasError) &&
				attempt.missClassification !== null
			) {
				context.addIssue({
					code: "custom",
					message:
						"Passing and errored attempts cannot carry a scored-miss classification.",
				});
			}
		}) as unknown as z.ZodType<RetainedAttempt>;
	const retainedRunSchema = z
		.strictObject({
			runnerVersion: z.literal(config.runnerVersion),
			route: z.literal(config.route),
			transport: z.literal(TRANSPORT),
			phase: phaseSchema,
			startedAt: z.iso.datetime({ offset: true }),
			completedAt: z.iso.datetime({ offset: true }),
			finalizedAt: z.iso.datetime({ offset: true }).nullable(),
			model: z.literal(DUMGEN_GENERATION_MODEL),
			maxOutputTokens: z.literal(config.limits.maxOutputTokens),
			reasoningEffort: z.literal(DUMGEN_REASONING_EFFORT),
			textVerbosity: z.literal(TEXT_VERBOSITY),
			promptCacheKey: z.string().regex(/^[0-9a-f]{64}$/u),
			promptCacheMode: z.literal(DIRECT_CACHED_PROMPT_POLICY.mode),
			promptCacheTtl: z.literal(DIRECT_CACHED_PROMPT_POLICY.ttl),
			promptCacheBreakpoint: z.literal(
				DIRECT_CACHED_PROMPT_POLICY.breakpoint,
			),
			promptSha256: z.string().regex(/^[0-9a-f]{64}$/u),
			inputSchemaSha256: z.string().regex(/^[0-9a-f]{64}$/u),
			outputSchemaSha256: z.string().regex(/^[0-9a-f]{64}$/u),
			suiteSha256: z.string().regex(/^[0-9a-f]{64}$/u),
			evaluationCaseIds: z
				.array(nonEmptyIdSchema)
				.min(1)
				.refine((ids) => new Set(ids).size === ids.length, {
					message: "Evaluation case IDs must be unique.",
				}),
			boundedCalls: z.number().int().finite().nonnegative(),
			maximumEvaluationCases: z.literal(
				config.limits.maximumEvaluationCases,
			),
			retries: z.literal(0),
			store: z.literal(false),
			contractScore: z.number().int().finite().nonnegative(),
			scoreRatio: z.number().finite().min(0).max(1),
			minimumEvaluationCases: z.literal(
				config.limits.minimumEvaluationCases,
			),
			minimumScoreRatio: z.literal(config.limits.minimumScoreRatio),
			meetsMinimumEvaluationCases: z.boolean(),
			meetsMinimumScoreRatio: z.boolean(),
			executionErrorCount: z.number().int().finite().nonnegative(),
			unclassifiedMissCount: z.number().int().finite().nonnegative(),
			evidenceThresholdMet: z.boolean(),
			attempts: z.array(retainedAttemptSchema),
		})
		.superRefine((value, context) => {
			const result = value as unknown as RetainedRun;
			if (Date.parse(result.completedAt) < Date.parse(result.startedAt)) {
				context.addIssue({
					code: "custom",
					path: ["completedAt"],
					message: "completedAt must not precede startedAt.",
				});
			}
			if (
				result.finalizedAt !== null &&
				Date.parse(result.finalizedAt) < Date.parse(result.completedAt)
			) {
				context.addIssue({
					code: "custom",
					path: ["finalizedAt"],
					message: "finalizedAt must not precede completedAt.",
				});
			}
			const attemptedCaseIds = result.attempts.map(
				({ caseId }) => caseId,
			);
			if (
				result.boundedCalls !== result.attempts.length ||
				stableJson(result.evaluationCaseIds) !==
					stableJson(attemptedCaseIds)
			) {
				context.addIssue({
					code: "custom",
					path: ["evaluationCaseIds"],
					message:
						"Evaluation case IDs, bounded call count, and attempt order must agree.",
				});
			}
			const expectedSummary = summarizeEvidence(
				result.attempts,
				result.finalizedAt !== null,
			);
			for (const field of [
				"contractScore",
				"scoreRatio",
				"minimumEvaluationCases",
				"minimumScoreRatio",
				"meetsMinimumEvaluationCases",
				"meetsMinimumScoreRatio",
				"executionErrorCount",
				"unclassifiedMissCount",
				"evidenceThresholdMet",
			] as const) {
				if (result[field] !== expectedSummary[field]) {
					context.addIssue({
						code: "custom",
						path: [field],
						message: `Retained evidence summary field "${field}" does not match its attempts and finalization state.`,
					});
				}
			}
		}) as unknown as z.ZodType<RetainedRun>;
	const missClassificationsSchema = z.record(
		nonEmptyIdSchema,
		z.strictObject({
			classification: missClassificationSchema,
			explanation: z.string().trim().min(1),
		}),
	);

	function experimentFor(phase: EvaluationPhase) {
		if (phase.kind === "development") {
			return config.experiments.development;
		}
		const acceptance = config.experiments.acceptance;
		if ("unavailableReason" in acceptance) {
			throw new Error(
				`Untouched acceptance is unavailable for route "${config.route}": ${acceptance.unavailableReason}`,
			);
		}
		return acceptance;
	}

	function prepareTestCases(
		phase: EvaluationPhase,
	): readonly PreparedTestCase<InputSchema, OutputSchema>[] {
		const experiment = experimentFor(phase);
		const selected = experiment.evaluation.ids.map((id, index) => ({
			id,
			goldenCase: experiment.evaluation.cases[index],
		}));
		assertEvaluationSuiteBounds(selected.length);
		return selected.map(({ id, goldenCase }) => {
			if (goldenCase === undefined) {
				throw new Error(`Evaluation case "${id}" is missing.`);
			}
			return Object.freeze({
				id,
				input: promptSource.inputSchema.parse(goldenCase.input),
				idealOutput: promptSource.outputSchema.parse(
					goldenCase.idealOutput,
				),
			});
		});
	}

	function assertEvaluationSuiteBounds(caseCount: number): void {
		if (!Number.isSafeInteger(caseCount)) {
			throw new TypeError(
				"Evaluation case count must be a safe integer.",
			);
		}
		if (caseCount < config.limits.minimumEvaluationCases) {
			throw new Error(
				`The ${config.route} suite requires at least ${config.limits.minimumEvaluationCases} evaluation cases; found ${caseCount}.`,
			);
		}
		if (caseCount > config.limits.maximumEvaluationCases) {
			throw new Error(
				`The ${config.route} suite is capped at ${config.limits.maximumEvaluationCases} evaluation cases; found ${caseCount}.`,
			);
		}
	}

	function evidenceBinding(phase: EvaluationPhase) {
		const testCases = prepareTestCases(phase);
		return {
			runnerVersion: config.runnerVersion,
			route: config.route,
			transport: TRANSPORT,
			phase,
			model: DUMGEN_GENERATION_MODEL,
			maxOutputTokens: config.limits.maxOutputTokens,
			reasoningEffort: DUMGEN_REASONING_EFFORT,
			textVerbosity: TEXT_VERBOSITY,
			promptCacheKey,
			promptCacheMode: DIRECT_CACHED_PROMPT_POLICY.mode,
			promptCacheTtl: DIRECT_CACHED_PROMPT_POLICY.ttl,
			promptCacheBreakpoint: DIRECT_CACHED_PROMPT_POLICY.breakpoint,
			promptSha256: sha256(currentSystemPrompt),
			inputSchemaSha256: schemaSha256(promptSource.inputSchema),
			outputSchemaSha256: schemaSha256(promptSource.outputSchema),
			suiteSha256: sha256(
				stableJson(
					testCases.map(({ id, input, idealOutput }) => ({
						id,
						input,
						idealOutput,
					})),
				),
			),
			evaluationCaseIds: testCases.map(({ id }) => id),
			maximumEvaluationCases: config.limits.maximumEvaluationCases,
			retries: 0 as const,
			store: false as const,
		};
	}

	function responseRequestFor(
		input: z.output<InputSchema>,
	): ResponseCreateParamsNonStreaming {
		return {
			model: DUMGEN_GENERATION_MODEL,
			input: [
				{
					role: "system",
					content: [
						{
							type: "input_text",
							text: currentSystemPrompt,
							prompt_cache_breakpoint: { mode: "explicit" },
						},
					],
				},
				{ role: "user", content: stableJson(input) },
			],
			max_output_tokens: config.limits.maxOutputTokens,
			prompt_cache_key: promptCacheKey,
			prompt_cache_options: {
				mode: DIRECT_CACHED_PROMPT_POLICY.mode,
				ttl: DIRECT_CACHED_PROMPT_POLICY.ttl,
			},
			reasoning: { effort: DUMGEN_REASONING_EFFORT },
			store: false,
			text: {
				format: zodTextFormat(
					config.modelOutputSchemaFor?.(input) ??
						promptSource.outputSchema,
					config.structuredOutputName,
				),
				verbosity: TEXT_VERBOSITY,
			},
		};
	}

	async function preflight(
		phase: EvaluationPhase,
		_dependencies: RunnerDependencies = {},
	) {
		const testCases = prepareTestCases(phase);
		if (phase.kind === "acceptance") {
			await assertAcceptanceAvailable();
		}
		return Object.freeze({
			phase,
			boundedCalls: testCases.length,
			binding: evidenceBinding(phase),
		});
	}

	async function runLiveEvaluation(
		phase: EvaluationPhase,
		dependencies: RunnerDependencies = {},
	): Promise<RetainedRun> {
		await preflight(phase, dependencies);
		if (
			!process.env.OPENAI_API_KEY &&
			dependencies.createClient === undefined
		) {
			throw new Error(
				"OPENAI_API_KEY is unavailable. A live run must be explicitly authorized and invoked from battery/dumgen.",
			);
		}
		const now = dependencies.now ?? (() => new Date());
		if (phase.kind === "acceptance") {
			await reserveAcceptance(now().toISOString());
		}
		const testCases = prepareTestCases(phase);
		const startedAt = now().toISOString();
		const runId = startedAt.replaceAll(/[:.]/gu, "-");
		const client = (dependencies.createClient ?? createOpenAIClient)();
		const attempts: RetainedAttempt[] = [];

		for (const [index, testCase] of testCases.entries()) {
			const started = performance.now();
			let responseMetadata:
				| {
						rawOutputText: string;
						resolvedModel: string;
						responseId: string;
						usage: unknown;
				  }
				| undefined;
			try {
				const response = await client.responses.create(
					responseRequestFor(testCase.input),
				);
				responseMetadata = {
					rawOutputText: response.output_text,
					resolvedModel: response.model,
					responseId: response.id,
					usage: response.usage ?? null,
				};
				if (!response.output_text) {
					throw new Error(
						`Provider returned no structured output text (status: ${response.status ?? "unknown"}; incomplete reason: ${response.incomplete_details?.reason ?? "none"}).`,
					);
				}
				const output = promptSource.outputSchema.parse(
					JSON.parse(response.output_text),
				);
				const evaluation = experimentFor(phase).evaluator({
					caseId: testCase.id,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output,
				});
				attempts.push(
					retainedAttemptSchema.parse({
						caseId: testCase.id,
						input: testCase.input,
						idealOutput: testCase.idealOutput,
						output,
						...evaluation,
						latencyMs: Math.round(performance.now() - started),
						...responseMetadata,
						missClassification: null,
						missClassificationExplanation: null,
					}),
				);
				console.log(
					`${evaluation.contractPass ? "PASS" : "FAIL"} ${index + 1}/${testCases.length} ${testCase.id}`,
				);
			} catch (cause) {
				attempts.push(
					retainedAttemptSchema.parse({
						caseId: testCase.id,
						input: testCase.input,
						idealOutput: testCase.idealOutput,
						...failedEvaluation(),
						latencyMs: Math.round(performance.now() - started),
						...responseMetadata,
						error: describeError(cause),
						missClassification: null,
						missClassificationExplanation: null,
					}),
				);
				console.log(
					`FAIL ${index + 1}/${testCases.length} ${testCase.id}: ${describeError(cause).message}`,
				);
			}
		}

		const result = retainedRunSchema.parse({
			...evidenceBinding(phase),
			startedAt,
			completedAt: now().toISOString(),
			finalizedAt: null,
			boundedCalls: testCases.length,
			...summarizeEvidence(attempts, false),
			attempts,
		});
		const destination = join(
			config.evidence.runsDirectory,
			runId,
			"results.json",
		);
		await mkdir(dirname(destination), { recursive: true });
		await writeJsonAtomically(destination, result);
		console.log(
			`Contract score: ${result.contractScore}/${result.boundedCalls} (${formatRatio(result.scoreRatio)})`,
		);
		console.log(
			"Evidence threshold: NOT MET (offline finalization required)",
		);
		console.log(`Wrote ${relative(process.cwd(), destination)}`);
		process.exitCode = 1;
		return result;
	}

	function parseRetainedRun(value: unknown): RetainedRun {
		return retainedRunSchema.parse(value);
	}

	function summarizeEvidence(
		attempts: readonly AttemptSummaryInput[],
		finalized: boolean,
	) {
		const contractScore = attempts.filter(
			({ contractPass }) => contractPass,
		).length;
		const scoreRatio =
			attempts.length === 0 ? 0 : contractScore / attempts.length;
		const meetsMinimumEvaluationCases =
			attempts.length >= config.limits.minimumEvaluationCases;
		const meetsMinimumScoreRatio =
			scoreRatio >= config.limits.minimumScoreRatio;
		const executionErrorCount = attempts.filter(
			(attempt) => attempt.error !== undefined,
		).length;
		const unclassifiedMissCount = attempts.filter(
			(attempt) =>
				!attempt.contractPass &&
				attempt.error === undefined &&
				attempt.missClassification === null,
		).length;
		return {
			contractScore,
			scoreRatio,
			minimumEvaluationCases: config.limits.minimumEvaluationCases,
			minimumScoreRatio: config.limits.minimumScoreRatio,
			meetsMinimumEvaluationCases,
			meetsMinimumScoreRatio,
			executionErrorCount,
			unclassifiedMissCount,
			evidenceThresholdMet:
				finalized &&
				meetsMinimumEvaluationCases &&
				meetsMinimumScoreRatio &&
				executionErrorCount === 0 &&
				unclassifiedMissCount === 0,
		};
	}

	function assertCurrentEvidenceBinding(
		result: RetainedRun,
		currentCases: readonly PreparedTestCase<
			InputSchema,
			OutputSchema
		>[] = prepareTestCases(result.phase),
	): void {
		const binding = evidenceBinding(result.phase);
		for (const field of [
			"runnerVersion",
			"route",
			"transport",
			"model",
			"maxOutputTokens",
			"reasoningEffort",
			"textVerbosity",
			"promptCacheKey",
			"promptCacheMode",
			"promptCacheTtl",
			"promptCacheBreakpoint",
			"promptSha256",
			"inputSchemaSha256",
			"outputSchemaSha256",
			"suiteSha256",
			"maximumEvaluationCases",
			"retries",
			"store",
		] as const) {
			if (result[field] !== binding[field]) {
				throw new Error(
					`Retained run uses obsolete evidence policy field "${field}".`,
				);
			}
		}
		if (
			stableJson(result.phase) !== stableJson(binding.phase) ||
			stableJson(result.evaluationCaseIds) !==
				stableJson(binding.evaluationCaseIds)
		) {
			throw new Error(
				"Retained run does not use the current phase and exact evaluation case selection.",
			);
		}
		for (const [index, currentCase] of currentCases.entries()) {
			const attempt = result.attempts[index];
			if (
				attempt === undefined ||
				attempt.caseId !== currentCase.id ||
				stableJson(attempt.input) !== stableJson(currentCase.input) ||
				stableJson(attempt.idealOutput) !==
					stableJson(currentCase.idealOutput)
			) {
				throw new Error(
					`Retained attempt "${currentCase.id}" does not match the current Golden Case.`,
				);
			}
		}
	}

	async function finalizeEvidence(
		resultsPath: string,
		classificationsPath: string,
		dependencies: Pick<RunnerDependencies, "now"> = {},
	): Promise<RetainedRun> {
		const retained = parseRetainedRun(
			JSON.parse(await readFile(resultsPath, "utf8")),
		);
		if (retained.finalizedAt !== null) {
			throw new Error("Retained evidence has already been finalized.");
		}
		assertCurrentEvidenceBinding(retained);
		const recomputedAttempts = retained.attempts.map((attempt) =>
			recomputeAttemptEvaluation(attempt, retained.phase),
		);
		if (recomputedAttempts.some((attempt) => attempt.error !== undefined)) {
			throw new Error(
				"Runs with execution/provider errors cannot be finalized; make a fresh bounded run.",
			);
		}
		const classifications = missClassificationsSchema.parse(
			JSON.parse(await readFile(classificationsPath, "utf8")),
		);
		const misses = recomputedAttempts.filter(
			({ contractPass }) => !contractPass,
		);
		const missIds = new Set(misses.map(({ caseId }) => caseId));
		for (const caseId of Object.keys(classifications)) {
			if (!missIds.has(caseId)) {
				throw new Error(
					`Miss classifications name passing or unknown case "${caseId}".`,
				);
			}
		}
		for (const { caseId } of misses) {
			if (classifications[caseId] === undefined) {
				throw new Error(
					`Missing classification for failed case "${caseId}".`,
				);
			}
		}
		const attempts = recomputedAttempts.map((attempt) => {
			const classified = classifications[attempt.caseId];
			return retainedAttemptSchema.parse({
				...attempt,
				missClassification: classified?.classification ?? null,
				missClassificationExplanation: classified?.explanation ?? null,
			});
		});
		const now = dependencies.now ?? (() => new Date());
		const finalized = retainedRunSchema.parse({
			...retained,
			...evidenceBinding(retained.phase),
			finalizedAt: now().toISOString(),
			...summarizeEvidence(attempts, true),
			attempts,
		});
		await writeJsonAtomically(resultsPath, finalized);
		if (!finalized.evidenceThresholdMet) process.exitCode = 1;
		return finalized;
	}

	function recomputeAttemptEvaluation(
		attempt: RetainedAttempt,
		phase: EvaluationPhase,
	): RetainedAttempt {
		if (attempt.error !== undefined) {
			return retainedAttemptSchema.parse({
				...attempt,
				...failedEvaluation(),
				missClassification: null,
				missClassificationExplanation: null,
			});
		}
		if (attempt.output === undefined) {
			throw new Error(
				`Retained successful attempt "${attempt.caseId}" has no output.`,
			);
		}
		const evaluation = experimentFor(phase).evaluator({
			caseId: attempt.caseId,
			input: promptSource.inputSchema.parse(attempt.input),
			idealOutput: promptSource.outputSchema.parse(attempt.idealOutput),
			output: promptSource.outputSchema.parse(attempt.output),
		});
		return retainedAttemptSchema.parse({
			...attempt,
			...evaluation,
			missClassification: null,
			missClassificationExplanation: null,
		});
	}

	function failedEvaluation(): EvaluationResult {
		return Object.fromEntries(
			Object.keys(config.diagnosticShape).map((key) => [key, false]),
		) as EvaluationResult;
	}

	async function assertAcceptanceAvailable(): Promise<void> {
		const acceptanceRuns = await retainedAcceptanceRuns();
		const currentBinding = evidenceBinding({
			kind: "acceptance",
			claim: "untouched",
		});
		const reservationPath = acceptanceReservationPath(
			currentBinding.suiteSha256,
			acceptanceRuns.length > 0,
		);
		if (await pathExists(reservationPath)) {
			throw new Error(
				"The current untouched acceptance suite has already been reserved or run and cannot be claimed untouched again.",
			);
		}
		if (acceptanceRuns.length === 0) {
			if (await pathExists(config.evidence.acceptanceReservationPath)) {
				throw new Error(
					"The untouched acceptance suite has already been reserved or run and cannot be claimed untouched again.",
				);
			}
			await assertDevelopmentRoundsAvailable();
			return;
		}

		if (
			acceptanceRuns.some(
				(run) =>
					run.evidenceThresholdMet === true &&
					!hasReplaceableDefect(run),
			)
		) {
			throw new Error(
				"Successful untouched acceptance evidence without prompt defects already exists and cannot be replaced.",
			);
		}
		const latest = latestAcceptanceRun(acceptanceRuns);
		if (
			typeof latest.finalizedAt !== "string" ||
			latest.executionErrorCount !== 0 ||
			latest.unclassifiedMissCount !== 0
		) {
			throw new Error(
				"Failed acceptance must be finalized, error-free, and fully classified before replacement.",
			);
		}
		const hasClassifiedDefect = hasReplaceableDefect(latest);
		const isBelowThreshold = latest.evidenceThresholdMet !== true;
		if (!hasClassifiedDefect && !isBelowThreshold) {
			throw new Error(
				"Acceptance replacement requires a classified prompt/corpus defect or below-threshold evidence.",
			);
		}
		if (
			(hasPromptDefect(latest) ||
				(isBelowThreshold && !hasClassifiedDefect)) &&
			latest.promptSha256 === currentBinding.promptSha256
		) {
			throw new Error(
				"Prompt-defect and below-threshold limitation replacement requires an evidence-driven prompt change.",
			);
		}
		assertReplacementSuiteIsFresh(
			prepareTestCases({ kind: "acceptance", claim: "untouched" }),
			acceptanceRuns,
		);
		await assertDevelopmentRoundsAvailable(latest.finalizedAt, true);
	}

	async function assertDevelopmentRoundsAvailable(
		after: string | undefined = undefined,
		requireCurrentBinding = false,
	): Promise<void> {
		const rounds = await classifiedDevelopmentRounds(
			after,
			requireCurrentBinding,
		);
		const missing = DEVELOPMENT_ROUNDS.filter(
			(round) => !rounds.has(round),
		);
		if (missing.length > 0) {
			throw new Error(
				`Untouched acceptance requires finalized, fully classified development rounds 1, 2, and 3${after === undefined ? "" : " after the failed acceptance and bound to the current prompt/suite"}; missing ${missing.join(", ")}.`,
			);
		}
	}

	async function retainedAcceptanceRuns(): Promise<
		Readonly<Record<string, unknown>>[]
	> {
		const runs: Readonly<Record<string, unknown>>[] = [];
		for (const value of await retainedEvidenceValues()) {
			if (typeof value !== "object" || value === null) continue;
			const candidate = value as Readonly<Record<string, unknown>>;
			const phase = candidate.phase;
			if (
				candidate.route === config.route &&
				typeof phase === "object" &&
				phase !== null &&
				(phase as Readonly<Record<string, unknown>>).kind ===
					"acceptance"
			) {
				runs.push(candidate);
			}
		}
		return runs;
	}

	function latestAcceptanceRun(
		runs: readonly Readonly<Record<string, unknown>>[],
	): Readonly<Record<string, unknown>> {
		const latest = [...runs].sort((left, right) => {
			const leftTime =
				typeof left.finalizedAt === "string"
					? Date.parse(left.finalizedAt)
					: Number.POSITIVE_INFINITY;
			const rightTime =
				typeof right.finalizedAt === "string"
					? Date.parse(right.finalizedAt)
					: Number.POSITIVE_INFINITY;
			return rightTime - leftTime;
		})[0];
		if (latest === undefined) {
			throw new Error("Acceptance replacement requires prior evidence.");
		}
		return latest;
	}

	function hasPromptDefect(run: Readonly<Record<string, unknown>>): boolean {
		const attempts = Array.isArray(run.attempts) ? run.attempts : [];
		return attempts.some(
			(attempt) =>
				typeof attempt === "object" &&
				attempt !== null &&
				(attempt as Readonly<Record<string, unknown>>)
					.missClassification === "prompt-defect",
		);
	}

	function hasReplaceableDefect(
		run: Readonly<Record<string, unknown>>,
	): boolean {
		const attempts = Array.isArray(run.attempts) ? run.attempts : [];
		return attempts.some((attempt) => {
			if (typeof attempt !== "object" || attempt === null) return false;
			const classification = (
				attempt as Readonly<Record<string, unknown>>
			).missClassification;
			return (
				classification === "prompt-defect" ||
				classification === "corpus-or-evaluator-defect"
			);
		});
	}

	function assertReplacementSuiteIsFresh(
		currentCases: readonly PreparedTestCase<InputSchema, OutputSchema>[],
		priorRuns: readonly Readonly<Record<string, unknown>>[],
	): void {
		const priorIds = new Set<string>();
		const priorCaseFingerprints = new Set<string>();
		for (const run of priorRuns) {
			if (Array.isArray(run.evaluationCaseIds)) {
				for (const id of run.evaluationCaseIds) {
					if (typeof id === "string") priorIds.add(id);
				}
			}
			if (!Array.isArray(run.attempts)) continue;
			for (const attempt of run.attempts) {
				if (typeof attempt !== "object" || attempt === null) continue;
				const candidate = attempt as Readonly<Record<string, unknown>>;
				priorCaseFingerprints.add(
					sha256(
						stableJson({
							input: candidate.input,
							idealOutput: candidate.idealOutput,
						}),
					),
				);
			}
		}
		for (const testCase of currentCases) {
			if (priorIds.has(testCase.id)) {
				throw new Error(
					`Replacement acceptance case ID "${testCase.id}" was already observed.`,
				);
			}
			const fingerprint = sha256(
				stableJson({
					input: testCase.input,
					idealOutput: testCase.idealOutput,
				}),
			);
			if (priorCaseFingerprints.has(fingerprint)) {
				throw new Error(
					`Replacement acceptance case "${testCase.id}" duplicates an observed input/oracle.`,
				);
			}
		}
	}

	async function classifiedDevelopmentRounds(
		after: string | undefined = undefined,
		requireCurrentBinding = false,
	): Promise<Set<number>> {
		const rounds = new Set<number>();
		const binding = evidenceBinding({ kind: "development", round: 1 });
		for (const value of await retainedEvidenceValues()) {
			if (!isClassifiedDevelopmentEvidence(value, config.route)) continue;
			if (
				after !== undefined &&
				Date.parse(value.finalizedAt) <= Date.parse(after)
			) {
				continue;
			}
			if (
				requireCurrentBinding &&
				(value.promptSha256 !== binding.promptSha256 ||
					value.inputSchemaSha256 !== binding.inputSchemaSha256 ||
					value.outputSchemaSha256 !== binding.outputSchemaSha256 ||
					value.suiteSha256 !== binding.suiteSha256)
			) {
				continue;
			}
			rounds.add(value.phase.round);
		}
		return rounds;
	}

	async function retainedEvidenceValues(): Promise<unknown[]> {
		const values: unknown[] = [];
		let entries: Dirent<string>[];
		try {
			entries = await readdir(config.evidence.runsDirectory, {
				withFileTypes: true,
			});
		} catch (cause) {
			if (isNodeError(cause, "ENOENT")) return values;
			throw cause;
		}
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			try {
				const value: unknown = JSON.parse(
					await readFile(
						join(
							config.evidence.runsDirectory,
							entry.name,
							"results.json",
						),
						"utf8",
					),
				);
				values.push(value);
			} catch (cause) {
				if (!isNodeError(cause, "ENOENT")) throw cause;
			}
		}
		return values;
	}

	async function reserveAcceptance(reservedAt: string): Promise<void> {
		const acceptanceRuns = await retainedAcceptanceRuns();
		const binding = evidenceBinding({
			kind: "acceptance",
			claim: "untouched",
		});
		const reservationPath = acceptanceReservationPath(
			binding.suiteSha256,
			acceptanceRuns.length > 0,
		);
		await mkdir(dirname(reservationPath), {
			recursive: true,
		});
		try {
			await writeFile(
				reservationPath,
				`${JSON.stringify(
					{
						route: config.route,
						reservedAt,
						claim: "untouched",
						suiteSha256: binding.suiteSha256,
						replacesAcceptance: acceptanceRuns.length > 0,
					},
					null,
					2,
				)}\n`,
				{ encoding: "utf8", flag: "wx" },
			);
		} catch (cause) {
			if (isNodeError(cause, "EEXIST")) {
				throw new Error(
					"The untouched acceptance suite has already been reserved or run and cannot be claimed untouched again.",
					{ cause },
				);
			}
			throw cause;
		}
	}

	function acceptanceReservationPath(
		suiteSha256: string,
		isReplacement: boolean,
	): string {
		if (!isReplacement) return config.evidence.acceptanceReservationPath;
		const base = config.evidence.acceptanceReservationPath;
		const extension = ".json";
		const stem = base.endsWith(extension)
			? base.slice(0, -extension.length)
			: base;
		return `${stem}-${suiteSha256.slice(0, 16)}${extension}`;
	}

	async function runCli(args: readonly string[]): Promise<void> {
		const [command, phaseName, roundText] = args;
		if (command === "finalize") {
			if (phaseName === undefined || roundText === undefined) {
				throw new Error(
					"Usage: run.ts finalize <results.json> <miss-classifications.json>",
				);
			}
			await finalizeEvidence(phaseName, roundText);
			return;
		}
		if (command !== "preflight" && command !== "run") {
			throw new Error(
				"Usage: run.ts <preflight|run> <development 1|2|3|acceptance>, or run.ts finalize <results.json> <miss-classifications.json>",
			);
		}
		const phase = parsePhase(phaseName, roundText);
		if (command === "preflight") {
			const checked = await preflight(phase);
			console.log(
				`Preflight passed for ${formatPhase(phase)} (${checked.boundedCalls} bounded calls; zero provider calls).`,
			);
			return;
		}
		await runLiveEvaluation(phase);
	}

	return Object.freeze({
		assertCurrentEvidenceBinding,
		assertEvaluationSuiteBounds,
		evidenceBinding,
		finalizeEvidence,
		parseRetainedRun,
		preflight,
		prepareTestCases,
		responseRequestFor,
		runCli,
		runLiveEvaluation,
		summarizeEvidence,
	});
}

function assertConfiguration(config: {
	readonly runnerVersion: string;
	readonly route: string;
	readonly structuredOutputName: string;
	readonly diagnosticShape: z.ZodRawShape;
	readonly limits: {
		readonly maxOutputTokens: number;
		readonly minimumEvaluationCases: number;
		readonly maximumEvaluationCases: number;
		readonly minimumScoreRatio: number;
	};
}): void {
	for (const [label, value] of [
		["runnerVersion", config.runnerVersion],
		["route", config.route],
		["structuredOutputName", config.structuredOutputName],
	] as const) {
		if (value.trim().length === 0)
			throw new Error(`${label} must be non-empty.`);
	}
	if (!("contractPass" in config.diagnosticShape)) {
		throw new Error("Evaluator diagnostics must include contractPass.");
	}
	for (const [key, schema] of Object.entries(config.diagnosticShape)) {
		if (!(schema instanceof z.ZodBoolean)) {
			throw new Error(`Evaluator diagnostic "${key}" must be boolean.`);
		}
	}
	for (const [label, value] of [
		["maxOutputTokens", config.limits.maxOutputTokens],
		["minimumEvaluationCases", config.limits.minimumEvaluationCases],
		["maximumEvaluationCases", config.limits.maximumEvaluationCases],
	] as const) {
		if (!Number.isSafeInteger(value) || value <= 0) {
			throw new Error(`${label} must be a positive safe integer.`);
		}
	}
	if (
		config.limits.minimumScoreRatio < 0 ||
		config.limits.minimumScoreRatio > 1
	) {
		throw new Error("minimumScoreRatio must be between 0 and 1.");
	}
	if (
		config.limits.minimumEvaluationCases >
		config.limits.maximumEvaluationCases
	) {
		throw new Error(
			"minimumEvaluationCases must not exceed maximumEvaluationCases.",
		);
	}
}

function createOpenAIClient(): DirectResponsesClient {
	const client = new OpenAI({ maxRetries: 0 });
	return {
		responses: {
			create: (request) => client.responses.create(request),
		},
	};
}

function parsePhase(
	phaseName: string | undefined,
	roundText: string | undefined,
): EvaluationPhase {
	if (phaseName === "acceptance" && roundText === undefined) {
		return { kind: "acceptance", claim: "untouched" };
	}
	if (phaseName === "development" && /^(1|2|3)$/u.test(roundText ?? "")) {
		return {
			kind: "development",
			round: Number(roundText) as 1 | 2 | 3,
		};
	}
	throw new Error("Phase must be development 1, 2, or 3; or acceptance.");
}

function isClassifiedDevelopmentEvidence(
	value: unknown,
	route: string,
): value is {
	readonly route: string;
	readonly phase: { readonly kind: "development"; readonly round: number };
	readonly finalizedAt: string;
	readonly executionErrorCount: 0;
	readonly unclassifiedMissCount: 0;
	readonly promptSha256?: unknown;
	readonly inputSchemaSha256?: unknown;
	readonly outputSchemaSha256?: unknown;
	readonly suiteSha256?: unknown;
} {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Readonly<Record<string, unknown>>;
	const phase = candidate.phase;
	return (
		candidate.route === route &&
		typeof phase === "object" &&
		phase !== null &&
		(phase as Readonly<Record<string, unknown>>).kind === "development" &&
		DEVELOPMENT_ROUNDS.includes(
			(phase as Readonly<Record<string, unknown>>).round as 1 | 2 | 3,
		) &&
		typeof candidate.finalizedAt === "string" &&
		candidate.executionErrorCount === 0 &&
		candidate.unclassifiedMissCount === 0
	);
}

function schemaSha256(schema: z.ZodType): string {
	return sha256(stableJson(z.toJSONSchema(schema)));
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

async function writeJsonAtomically(
	destination: string,
	value: unknown,
): Promise<void> {
	const temporary = join(
		dirname(destination),
		`.${basename(destination)}.${process.pid}.${randomUUID()}.tmp`,
	);
	try {
		await writeFile(
			temporary,
			`${JSON.stringify(value, null, 2)}\n`,
			"utf8",
		);
		await rename(temporary, destination);
	} catch (cause) {
		await rm(temporary, { force: true });
		throw cause;
	}
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await readFile(path);
		return true;
	} catch (cause) {
		if (isNodeError(cause, "ENOENT")) return false;
		throw cause;
	}
}

function isNodeError(cause: unknown, code: string): boolean {
	return (
		cause instanceof Error &&
		"code" in cause &&
		(cause as Error & { readonly code?: string }).code === code
	);
}

function describeError(cause: unknown): {
	readonly name: string;
	readonly message: string;
	readonly status?: number;
	readonly code?: string;
} {
	if (!(cause instanceof Error)) {
		return { name: "Error", message: String(cause) };
	}
	const providerError = cause as Error & {
		readonly status?: number;
		readonly code?: string;
	};
	return {
		name: cause.name,
		message: cause.message,
		...(providerError.status === undefined
			? undefined
			: { status: providerError.status }),
		...(providerError.code === undefined
			? undefined
			: { code: providerError.code }),
	};
}

function formatPhase(phase: EvaluationPhase): string {
	return phase.kind === "development"
		? `development round ${phase.round}`
		: "untouched acceptance";
}

function formatRatio(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}
