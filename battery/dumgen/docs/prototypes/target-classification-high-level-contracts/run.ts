// PROTOTYPE ONLY — issue #85 preflight, bounded direct runner, and finalizer.

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { z } from "zod";

import { stableJson } from "../../../src/lib/stable-json";
import {
	type ArmEvidenceSummary,
	ATTEMPTS_PER_ARM,
	BATCH_CACHE_POLICY,
	DIRECT_RESPONSES_POLICY,
	decidePrototypeWinner,
	EXACT_CALL_CAP,
	EXPECTED_RESOLVED_MODEL,
	MAX_OUTPUT_TOKENS,
	MAXIMUM_SPEND_USD,
	type PrototypePriceSchedule,
	preparePrototypePreflight,
	prepareRepresentationCases,
	REASONING_EFFORT,
	RUN_MODEL,
	RUNNER_VERSION,
	type RunnerParameterInput,
	type RunnerPoolId,
	runnerParametersSchema,
	sliceForCase,
	systemPromptForRepresentation,
	TEXT_VERBOSITY,
} from "../../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/contract-prototype";
import {
	DIAGNOSTIC_FOLLOW_UP_SYSTEM_INSTRUCTION,
	parseDiagnosticFollowUpResponse,
	prepareDiagnosticFollowUpRequest,
	retainedDiagnosticFollowUpSchema,
} from "../../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/diagnostic-follow-up";
import {
	evaluateGermanHighLevelClickInvariance,
	evaluateGermanHighLevelTargetClassification,
} from "../../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/evaluator";
import {
	outputSchemaForRepresentation,
	parseAndCanonicalizeRepresentation,
	REPRESENTATION_IDS,
	type RepresentationId,
} from "../../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/representations";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
export const BATCH_ENDPOINT = BATCH_CACHE_POLICY.endpoint;
export const BATCH_COMPLETION_WINDOW = BATCH_CACHE_POLICY.completionWindow;
const BATCH_MANIFEST_NAME = "batch-manifest.json";
const BATCH_INPUT_NAME = "batch-input.jsonl";
const BATCH_OUTPUT_NAME = "batch-output.jsonl";
const BATCH_ERROR_NAME = "batch-error.jsonl";
const DIRECT_CHECKPOINT_NAME = "direct-checkpoint.json";
const DIAGNOSTIC_FOLLOW_UP_ARTIFACT_NAME = "diagnostic-follow-up.json";
export const DIRECT_TRANSIENT_RETRY_LIMIT = 2;
export const DIAGNOSTIC_FOLLOW_UP_CALL_CAP = 40;
export const DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD = 0.1;
const scheduleCacheKeysByPool = new Map<
	RunnerPoolId,
	ReadonlyMap<string, string>
>();
const CLASSIFICATIONS = [
	"prompt-defect",
	"adapter-or-runner-defect",
	"corpus-or-evaluator-defect",
	"accepted-model-limitation",
] as const;

type Evaluation = ReturnType<
	typeof evaluateGermanHighLevelTargetClassification
>;

const evaluationSchema = z.strictObject({
	contractPass: z.boolean(),
	canonicalShapePass: z.boolean(),
	decisionPass: z.boolean(),
	routePass: z.boolean(),
	exactMembershipPass: z.boolean(),
	falseGroupingPass: z.boolean(),
	falseSplittingPass: z.boolean(),
	validMembershipPass: z.boolean(),
	nonResolvableMembershipPass: z.boolean(),
	orderPass: z.boolean(),
	uniquenessPass: z.boolean(),
	clickInclusionPass: z.boolean(),
	correctUnresolvedPass: z.boolean(),
}) satisfies z.ZodType<Evaluation>;

const errorSchema = z.strictObject({
	name: z.string().min(1),
	message: z.string(),
	status: z.number().int().optional(),
	code: z.string().min(1).optional(),
});

const usageSchema = z.strictObject({
	inputTokens: z.number().int().nonnegative(),
	cachedInputTokens: z.number().int().nonnegative(),
	cacheWriteInputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative(),
	totalTokens: z.number().int().nonnegative(),
	longContext: z.boolean(),
	billedCostUpperBoundUsd: z.number().nonnegative(),
});

const providerResponseSchema = z
	.object({
		id: z.string().min(1),
		model: z.string().min(1),
		output_text: z.string().optional(),
		output: z.array(z.unknown()).optional(),
		usage: z.unknown(),
	})
	.passthrough();

const attemptSchema = z
	.strictObject({
		key: z.string().min(1),
		armId: z.enum(REPRESENTATION_IDS),
		attemptNumber: z.number().int().min(1).max(ATTEMPTS_PER_ARM),
		caseId: z.string().min(1),
		privateInput: z.unknown(),
		privateIdealOutput: z.unknown(),
		canonicalInput: z.unknown(),
		canonicalIdealOutput: z.unknown(),
		privateOutputJson: z.unknown().optional(),
		canonicalOutput: z.unknown().optional(),
		evaluation: evaluationSchema,
		latencyMs: z.number().int().nonnegative(),
		rawOutputText: z.string().optional(),
		rawResponseJson: z.unknown().optional(),
		batchCustomId: z.string().min(1).optional(),
		rawBatchResponseJson: z.unknown().optional(),
		batchResponseUtf8Bytes: z.number().int().nonnegative().optional(),
		requestUtf8Bytes: z.number().int().nonnegative(),
		responseUtf8Bytes: z.number().int().nonnegative().optional(),
		responseId: z.string().min(1).optional(),
		resolvedModel: z.string().min(1).optional(),
		rawUsage: z.unknown().optional(),
		usage: usageSchema.optional(),
		providerError: errorSchema.optional(),
		modelOutputError: errorSchema.optional(),
		missClassification: z.enum(CLASSIFICATIONS).nullable(),
		missClassificationExplanation: z.string().trim().min(1).nullable(),
	})
	.superRefine((attempt, context) => {
		const batchEvidenceCount = [
			attempt.batchCustomId,
			attempt.rawBatchResponseJson,
			attempt.batchResponseUtf8Bytes,
		].filter((value) => value !== undefined).length;
		if (batchEvidenceCount !== 0 && batchEvidenceCount !== 3) {
			context.addIssue({
				code: "custom",
				message:
					"Raw Batch envelope evidence must be complete or absent.",
			});
		}
		const rawResponseEvidenceCount = [
			attempt.rawResponseJson,
			attempt.responseUtf8Bytes,
		].filter((value) => value !== undefined).length;
		if (rawResponseEvidenceCount !== 0 && rawResponseEvidenceCount !== 2) {
			context.addIssue({
				code: "custom",
				message: "Raw response JSON and byte count must be paired.",
			});
		}
		const parsedResponseEvidenceCount = [
			attempt.rawOutputText,
			attempt.responseId,
			attempt.resolvedModel,
			attempt.rawUsage,
		].filter((value) => value !== undefined).length;
		if (
			parsedResponseEvidenceCount !== 0 &&
			parsedResponseEvidenceCount !== 4
		) {
			context.addIssue({
				code: "custom",
				message: "Parsed response metadata must be complete or absent.",
			});
		}
		if (parsedResponseEvidenceCount > 0 && rawResponseEvidenceCount !== 2) {
			context.addIssue({
				code: "custom",
				message:
					"Parsed response metadata requires raw response evidence.",
			});
		}
		if (attempt.usage !== undefined && parsedResponseEvidenceCount !== 4) {
			context.addIssue({
				code: "custom",
				message: "Normalized usage requires parsed response metadata.",
			});
		}
		if (
			attempt.evaluation.contractPass &&
			(attempt.canonicalOutput === undefined ||
				attempt.providerError !== undefined ||
				attempt.modelOutputError !== undefined)
		) {
			context.addIssue({
				code: "custom",
				message: "Passing attempts require one clean canonical output.",
			});
		}
		if (
			(attempt.missClassification === null) !==
			(attempt.missClassificationExplanation === null)
		) {
			context.addIssue({
				code: "custom",
				message: "Miss classification and explanation must be paired.",
			});
		}
		if (
			(attempt.evaluation.contractPass ||
				attempt.providerError !== undefined) &&
			attempt.missClassification !== null
		) {
			context.addIssue({
				code: "custom",
				message:
					"Passing and provider-error attempts cannot be classified.",
			});
		}
	});

const armSummarySchema = z.strictObject({
	id: z.enum(REPRESENTATION_IDS),
	attemptCount: z.number().int().nonnegative(),
	contractScore: z.number().int().nonnegative(),
	attemptContractScores: z
		.array(z.number().int().nonnegative())
		.length(ATTEMPTS_PER_ARM),
	executionErrorCount: z.number().int().nonnegative(),
	unclassifiedMissCount: z.number().int().nonnegative(),
	safetyGatePass: z.boolean(),
	clickGatePass: z.boolean(),
	sliceRatios: z.strictObject({
		routes: z.number().min(0).max(1),
		boundaries: z.number().min(0).max(1),
		robustness: z.number().min(0).max(1),
	}),
}) satisfies z.ZodType<ArmEvidenceSummary>;

const retainedRunSchema = z.strictObject({
	startedAt: z.iso.datetime({ offset: true }),
	completedAt: z.iso.datetime({ offset: true }),
	finalizedAt: z.iso.datetime({ offset: true }).nullable(),
	bindingSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	preflight: z.unknown(),
	resolvedModel: z.string().min(1).nullable(),
	actualCallCount: z.number().int().nonnegative().max(EXACT_CALL_CAP),
	totalBilledCostUpperBoundUsd: z.number().nonnegative(),
	arms: z.array(armSummarySchema).length(REPRESENTATION_IDS.length),
	verdict: z.unknown().nullable(),
	attempts: z.array(attemptSchema).max(EXACT_CALL_CAP),
});

export type RetainedAttempt = z.output<typeof attemptSchema>;
export type RetainedRun = z.output<typeof retainedRunSchema>;

const diagnosticMechanismClusterSchema = z.enum([
	"copula",
	"fusion",
	"idiom-membership",
	"optional-reflexive",
	"paired-frame",
	"separable-position",
	"unclustered",
]);
type DiagnosticMechanismCluster = z.output<
	typeof diagnosticMechanismClusterSchema
>;
const MATCHED_PASS_CONTROL_CLUSTERS = [
	"copula",
	"fusion",
	"idiom-membership",
	"optional-reflexive",
	"paired-frame",
	"separable-position",
] as const satisfies readonly DiagnosticMechanismCluster[];
const diagnosticFollowUpSelectionReasonSchema = z.enum([
	"first-turn-miss",
	"matched-pass-control",
]);
const diagnosticFollowUpSelectionSchema = z.strictObject({
	key: z.string().min(1),
	sourceAttemptSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	selectionReason: diagnosticFollowUpSelectionReasonSchema,
	cluster: diagnosticMechanismClusterSchema,
});
const diagnosticFollowUpResultSchema = z
	.strictObject({
		key: z.string().min(1),
		sourceAttemptSha256: z.string().regex(/^[0-9a-f]{64}$/u),
		selectionReason: diagnosticFollowUpSelectionReasonSchema,
		cluster: diagnosticMechanismClusterSchema,
		requestSha256: z.string().regex(/^[0-9a-f]{64}$/u),
		requestUtf8Bytes: z.number().int().nonnegative(),
		maximumCostUpperBoundUsd: z.number().nonnegative(),
		latencyMs: z.number().int().nonnegative(),
		rawResponseJson: z.unknown().optional(),
		responseUtf8Bytes: z.number().int().nonnegative().optional(),
		responseId: z.string().min(1).optional(),
		resolvedModel: z.string().min(1).optional(),
		rawUsage: z.unknown().optional(),
		usage: usageSchema.optional(),
		providerError: errorSchema.optional(),
		modelOutputError: errorSchema.optional(),
		followUp: retainedDiagnosticFollowUpSchema.optional(),
	})
	.superRefine((result, context) => {
		const terminalCount = [
			result.providerError,
			result.modelOutputError,
			result.followUp,
		].filter((value) => value !== undefined).length;
		if (terminalCount !== 1) {
			context.addIssue({
				code: "custom",
				message:
					"A diagnostic follow-up requires exactly one terminal outcome.",
			});
		}
		const rawEvidenceCount = [
			result.rawResponseJson,
			result.responseUtf8Bytes,
		].filter((value) => value !== undefined).length;
		if (rawEvidenceCount !== 0 && rawEvidenceCount !== 2) {
			context.addIssue({
				code: "custom",
				message:
					"Diagnostic raw response JSON and byte count must be paired.",
			});
		}
	});

const diagnosticFollowUpArtifactSchema = z.strictObject({
	version: z.literal("target-classification-diagnostic-follow-up-v4"),
	startedAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	completedAt: z.iso.datetime({ offset: true }).nullable(),
	sourceResultsSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	sourceResultsUtf8Bytes: z.number().int().nonnegative(),
	sourceBindingSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	diagnosticInstructionSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	requestScheduleSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	model: z.literal(RUN_MODEL),
	winnerEligible: z.literal(false),
	callCap: z.literal(DIAGNOSTIC_FOLLOW_UP_CALL_CAP),
	spendCapUsd: z.literal(DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD),
	maximumScheduledCostUpperBoundUsd: z.number().nonnegative(),
	dispatchCounts: z.record(z.string(), z.number().int().nonnegative()),
	selections: z
		.array(diagnosticFollowUpSelectionSchema)
		.max(DIAGNOSTIC_FOLLOW_UP_CALL_CAP),
	followUps: z
		.array(diagnosticFollowUpResultSchema)
		.max(DIAGNOSTIC_FOLLOW_UP_CALL_CAP),
});
export type DiagnosticFollowUpArtifact = z.output<
	typeof diagnosticFollowUpArtifactSchema
>;

type ResponseRequest = ReturnType<typeof responseRequestFor>;
export type PrototypeResponsesClient = Readonly<{
	responses: Readonly<{
		create(request: ResponseCreateParamsNonStreaming): Promise<unknown>;
	}>;
}>;

export type PrototypeBatchClient = Readonly<{
	files: Readonly<{
		list(request: {
			readonly purpose: "batch";
			readonly limit: number;
			readonly after?: string;
		}): Promise<{
			readonly data: readonly {
				readonly id: string;
				readonly filename: string;
				readonly bytes: number;
				readonly purpose: string;
			}[];
			readonly has_more: boolean;
		}>;
		create(request: {
			readonly file: unknown;
			readonly purpose: "batch";
		}): Promise<{ readonly id: string }>;
		content(fileId: string): Promise<{ text(): Promise<string> }>;
	}>;
	batches: Readonly<{
		list(request: {
			readonly limit: number;
			readonly after?: string;
		}): Promise<{
			readonly data: readonly unknown[];
			readonly has_more: boolean;
		}>;
		create(request: {
			readonly input_file_id: string;
			readonly endpoint: typeof BATCH_ENDPOINT;
			readonly completion_window: typeof BATCH_COMPLETION_WINDOW;
			readonly metadata: Readonly<Record<string, string>>;
		}): Promise<unknown>;
		retrieve(batchId: string): Promise<unknown>;
	}>;
}>;

const batchScheduleBindingSchema = z.strictObject({
	key: z.string().min(1),
	customId: z.string().min(1).max(64),
	armId: z.enum(REPRESENTATION_IDS),
	attemptNumber: z.number().int().min(1).max(ATTEMPTS_PER_ARM),
	caseId: z.string().min(1),
	promptCacheKey: z.string().min(1),
	requestSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	requestUtf8Bytes: z.number().int().positive(),
	maximumCostUpperBoundUsd: z.number().positive(),
});

const rawBatchSnapshotSchema = z.strictObject({
	observedAt: z.iso.datetime({ offset: true }),
	raw: z.unknown(),
	utf8Bytes: z.number().int().nonnegative(),
});

const prototypeBatchManifestSchema = z.strictObject({
	version: z.literal("target-classification-high-level-batch-v1"),
	createdAt: z.iso.datetime({ offset: true }),
	endpoint: z.literal(BATCH_ENDPOINT),
	completionWindow: z.literal(BATCH_COMPLETION_WINDOW),
	bindingSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	preflight: z.unknown(),
	inputSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	inputUtf8Bytes: z.number().int().positive(),
	schedule: z.array(batchScheduleBindingSchema).length(EXACT_CALL_CAP),
	remote: z.strictObject({
		inputFileId: z.string().min(1).nullable(),
		uploadAttemptedAt: z.iso.datetime({ offset: true }).nullable(),
		batchId: z.string().min(1).nullable(),
		createAttemptedAt: z.iso.datetime({ offset: true }).nullable(),
		status: z.string().min(1).nullable(),
		outputFileId: z.string().min(1).nullable(),
		errorFileId: z.string().min(1).nullable(),
		snapshots: z.array(rawBatchSnapshotSchema),
	}),
});

export type PrototypeBatchManifest = z.output<
	typeof prototypeBatchManifestSchema
>;
export type PreparedPrototypeBatch = Readonly<{
	jsonl: string;
	manifest: PrototypeBatchManifest;
}>;

const prototypeDirectCheckpointSchema = z.strictObject({
	version: z.literal("target-classification-high-level-direct-v1"),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	bindingSha256: z.string().regex(/^[0-9a-f]{64}$/u),
	preflight: z.unknown(),
	schedule: z.array(batchScheduleBindingSchema).max(EXACT_CALL_CAP),
	dispatchCounts: z.record(z.string(), z.number().int().nonnegative()),
	transientRetryCounts: z
		.record(z.string(), z.number().int().nonnegative())
		.default({}),
	attempts: z.array(attemptSchema).max(EXACT_CALL_CAP),
});
type PrototypeDirectCheckpoint = z.output<
	typeof prototypeDirectCheckpointSchema
>;

const remoteBatchSchema = z
	.object({
		id: z.string().min(1),
		input_file_id: z.string().min(1),
		endpoint: z.literal(BATCH_ENDPOINT),
		completion_window: z.literal(BATCH_COMPLETION_WINDOW),
		status: z.string().min(1),
		output_file_id: z.string().min(1).nullable().optional(),
		error_file_id: z.string().min(1).nullable().optional(),
		request_counts: z
			.object({
				total: z.number().int().nonnegative(),
				completed: z.number().int().nonnegative(),
				failed: z.number().int().nonnegative(),
			})
			.optional(),
		metadata: z.record(z.string(), z.string()).nullable().optional(),
	})
	.passthrough();

const batchResultEnvelopeSchema = z
	.object({
		custom_id: z.string().min(1),
		response: z
			.object({
				status_code: z.number().int(),
				body: z.unknown(),
			})
			.passthrough()
			.nullable(),
		error: z
			.object({ code: z.string(), message: z.string() })
			.passthrough()
			.nullable(),
	})
	.passthrough();

type PrototypeScheduleEntry = Readonly<{
	binding: z.output<typeof batchScheduleBindingSchema>;
	request: ResponseRequest;
	systemPrompt: string;
	testCase: ReturnType<typeof prepareRepresentationCases>[number];
}>;

function maximumRequestCostUpperBoundUsd(
	requestUtf8Bytes: number,
	priceSchedule: PrototypePriceSchedule,
	maxOutputTokens = MAX_OUTPUT_TOKENS,
): number {
	const inputTokenUpperBound = requestUtf8Bytes + 64;
	const price =
		inputTokenUpperBound > priceSchedule.longContextThresholdTokens
			? priceSchedule.longContext
			: priceSchedule.shortContext;
	return (
		(inputTokenUpperBound / 1_000_000) *
			Math.max(price.inputUsdPerMillion, price.cacheWriteUsdPerMillion) +
		(maxOutputTokens / 1_000_000) * price.outputUsdPerMillion
	);
}

function preparePrototypeSchedule(
	parameters: RunnerParameterInput,
): readonly PrototypeScheduleEntry[] {
	const preflight = preparePrototypePreflight(parameters);
	const runnerParameters = preflight.runnerParameters;
	const schedule: PrototypeScheduleEntry[] = [];
	let scheduleIndex = 0;
	for (const armId of REPRESENTATION_IDS) {
		const systemPrompt = systemPromptForRepresentation(armId);
		for (
			let attemptNumber = 1;
			attemptNumber <= ATTEMPTS_PER_ARM;
			attemptNumber += 1
		) {
			for (const testCase of prepareRepresentationCases(
				armId,
				runnerParameters.pool,
			)) {
				const key = `${armId}/${attemptNumber}/${testCase.caseId}`;
				const promptCacheKey = promptCacheKeyForScheduleKey(
					key,
					runnerParameters.pool,
				);
				const request = responseRequestFor({
					armId,
					systemPrompt,
					privateInput: testCase.privateInput,
					promptCacheKey,
				});
				const requestUtf8Bytes = jsonUtf8Bytes(request);
				schedule.push({
					binding: batchScheduleBindingSchema.parse({
						key,
						customId: `tc85-${String(scheduleIndex).padStart(3, "0")}-${bindingSha256(key).slice(0, 12)}`,
						armId,
						attemptNumber,
						caseId: testCase.caseId,
						promptCacheKey,
						requestSha256: bindingSha256(request),
						requestUtf8Bytes,
						maximumCostUpperBoundUsd:
							maximumRequestCostUpperBoundUsd(
								requestUtf8Bytes,
								preflight.priceSchedule,
							),
					}),
					request,
					systemPrompt,
					testCase,
				});
				scheduleIndex += 1;
			}
		}
	}
	if (schedule.length !== preflight.exactCallCap) {
		throw new Error("Prepared schedule does not match the exact call cap.");
	}
	return Object.freeze(schedule);
}

export function preparePrototypeBatch(parameters: {
	readonly batching: true;
	readonly pool?: RunnerPoolId;
}): PreparedPrototypeBatch {
	const runnerParameters = runnerParametersSchema.parse({
		batching: parameters.batching,
		pool: parameters.pool,
	});
	if (!runnerParameters.batching) {
		throw new Error("Batch preparation requires batching: true.");
	}
	if (runnerParameters.pool !== "development") {
		throw new Error(
			"Batch preparation supports only the development pool.",
		);
	}
	const preflight = preparePrototypePreflight(runnerParameters);
	assertPreflightCallPolicy(preflight);
	const schedule = preparePrototypeSchedule(runnerParameters);
	const lines: string[] = [];
	for (const entry of schedule) {
		lines.push(
			stableJson({
				custom_id: entry.binding.customId,
				method: "POST",
				url: BATCH_ENDPOINT,
				body: entry.request,
			}),
		);
	}
	const jsonl = `${lines.join("\n")}\n`;
	return {
		jsonl,
		manifest: prototypeBatchManifestSchema.parse({
			version: "target-classification-high-level-batch-v1",
			createdAt: new Date().toISOString(),
			endpoint: BATCH_ENDPOINT,
			completionWindow: BATCH_COMPLETION_WINDOW,
			bindingSha256: bindingSha256(preflight),
			preflight,
			inputSha256: sha256Text(jsonl),
			inputUtf8Bytes: Buffer.byteLength(jsonl, "utf8"),
			schedule: schedule.map(({ binding }) => binding),
			remote: {
				inputFileId: null,
				uploadAttemptedAt: null,
				batchId: null,
				createAttemptedAt: null,
				status: null,
				outputFileId: null,
				errorFileId: null,
				snapshots: [],
			},
		}),
	};
}

export function parseBatchingFlag(value: string | undefined): boolean {
	if (value === "--batching=true") return true;
	if (value === "--batching=false") return false;
	throw new Error("Expected explicit --batching=true or --batching=false.");
}

export function parsePoolFlag(value: string | undefined): RunnerPoolId {
	if (value === "--pool=development") return "development";
	if (value === "--pool=diagnostic") return "diagnostic";
	throw new Error(
		"Expected explicit --pool=development or --pool=diagnostic.",
	);
}

export function assertBatchingForMode(
	mode: "run" | "batch-submit" | "batch-resume" | "diagnostic-follow-up",
	batching: boolean,
): void {
	const direct = mode === "run" || mode === "diagnostic-follow-up";
	if (direct ? batching : !batching) {
		throw new Error(
			`${mode} requires --batching=${direct ? "false" : "true"}.`,
		);
	}
}

export function printPreflight(parameters: RunnerParameterInput): void {
	const preflight = preparePrototypePreflight(parameters);
	console.log(JSON.stringify(preflight, null, 2));
}

export async function submitPrototypeBatch(options: {
	readonly batching: true;
	readonly pool?: RunnerPoolId;
	readonly apiKey?: string;
	readonly client?: PrototypeBatchClient;
	readonly runDirectory?: string;
	readonly onPhasePersisted?: (
		phase: "upload" | "create",
	) => void | Promise<void>;
	readonly onRemoteMutationReturned?: (
		phase: "upload" | "create",
	) => void | Promise<void>;
	readonly reconciliationAttempts?: number;
	readonly reconciliationDelayMs?: number;
}): Promise<string> {
	if (
		!runnerParametersSchema.parse({
			batching: options.batching,
			pool: options.pool,
		}).batching
	) {
		throw new Error("Batch submission requires batching: true.");
	}
	const prepared = preparePrototypeBatch(options);
	const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
	if (apiKey === undefined && options.client === undefined) {
		throw new Error(
			"OPENAI_API_KEY is unavailable; Batch preflight completed without a provider call.",
		);
	}
	const client: PrototypeBatchClient =
		options.client ?? (new OpenAI({ apiKey, maxRetries: 0 }) as never);
	const runDirectory =
		options.runDirectory === undefined
			? join(RUNS, prepared.manifest.createdAt.replaceAll(/[:.]/gu, "-"))
			: resolve(options.runDirectory);
	await mkdir(runDirectory, { recursive: true });
	const inputPath = join(runDirectory, BATCH_INPUT_NAME);
	const manifestPath = join(runDirectory, BATCH_MANIFEST_NAME);
	let manifest = await readBatchManifestIfPresent(manifestPath);
	if (manifest === null) {
		await writeFile(inputPath, prepared.jsonl, {
			encoding: "utf8",
			flag: "wx",
		});
		manifest = prepared.manifest;
		await writeJsonAtomically(manifestPath, manifest);
	} else {
		assertBatchManifestCurrent(manifest);
		const retainedInput = await readFile(inputPath, "utf8");
		if (
			sha256Text(retainedInput) !== manifest.inputSha256 ||
			Buffer.byteLength(retainedInput, "utf8") !== manifest.inputUtf8Bytes
		) {
			throw new Error(
				"Retained Batch input file does not match its manifest.",
			);
		}
	}
	if (manifest.remote.inputFileId === null) {
		const remoteInputFilename = deterministicBatchInputFilename(manifest);
		let inputFileId = await reconcileUploadedInput({
			client,
			filename: remoteInputFilename,
			bytes: manifest.inputUtf8Bytes,
			poll: manifest.remote.uploadAttemptedAt !== null,
			attempts: options.reconciliationAttempts,
			delayMs: options.reconciliationDelayMs,
		});
		if (inputFileId === null) {
			manifest = prototypeBatchManifestSchema.parse({
				...manifest,
				remote: {
					...manifest.remote,
					uploadAttemptedAt: new Date().toISOString(),
				},
			});
			await writeJsonAtomically(manifestPath, manifest);
			const uploaded = await client.files.create({
				file: await toFile(
					new TextEncoder().encode(prepared.jsonl),
					remoteInputFilename,
					{ type: "application/jsonl" },
				),
				purpose: "batch",
			});
			inputFileId = uploaded.id;
			await options.onRemoteMutationReturned?.("upload");
		}
		manifest = prototypeBatchManifestSchema.parse({
			...manifest,
			remote: { ...manifest.remote, inputFileId },
		});
		await writeJsonAtomically(manifestPath, manifest);
		await options.onPhasePersisted?.("upload");
	}
	if (manifest.remote.batchId === null) {
		const inputFileId = manifest.remote.inputFileId;
		if (inputFileId === null) {
			throw new Error(
				"Uploaded input checkpoint is missing its file ID.",
			);
		}
		const metadata = deterministicBatchMetadata(manifest);
		let batchRaw = await reconcileCreatedBatch({
			client,
			inputFileId,
			metadata,
			poll: manifest.remote.createAttemptedAt !== null,
			attempts: options.reconciliationAttempts,
			delayMs: options.reconciliationDelayMs,
		});
		if (batchRaw === null) {
			manifest = prototypeBatchManifestSchema.parse({
				...manifest,
				remote: {
					...manifest.remote,
					createAttemptedAt: new Date().toISOString(),
				},
			});
			await writeJsonAtomically(manifestPath, manifest);
			batchRaw = await client.batches.create({
				input_file_id: inputFileId,
				endpoint: BATCH_ENDPOINT,
				completion_window: BATCH_COMPLETION_WINDOW,
				metadata,
			});
			await options.onRemoteMutationReturned?.("create");
		}
		const batch = remoteBatchSchema.parse(batchRaw);
		assertRemoteBatchBinding(batch, inputFileId, metadata);
		manifest = prototypeBatchManifestSchema.parse({
			...manifest,
			remote: {
				...manifest.remote,
				batchId: batch.id,
				status: batch.status,
				outputFileId: batch.output_file_id ?? null,
				errorFileId: batch.error_file_id ?? null,
				snapshots: [
					...manifest.remote.snapshots,
					rawBatchSnapshot(batchRaw),
				],
			},
		});
		await writeJsonAtomically(manifestPath, manifest);
		await options.onPhasePersisted?.("create");
	}
	return manifestPath;
}

async function readBatchManifestIfPresent(
	manifestPath: string,
): Promise<PrototypeBatchManifest | null> {
	try {
		return prototypeBatchManifestSchema.parse(
			JSON.parse(await readFile(manifestPath, "utf8")),
		);
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw cause;
	}
}

function deterministicBatchInputFilename(
	manifest: PrototypeBatchManifest,
): string {
	return `target-classification-high-level-${manifest.inputSha256}.jsonl`;
}

function deterministicBatchMetadata(
	manifest: PrototypeBatchManifest,
): Readonly<Record<string, string>> {
	return Object.freeze({
		prototype: "target-classification-high-level-contracts",
		binding_sha256: manifest.bindingSha256,
		input_sha256: manifest.inputSha256,
	});
}

function assertRemoteBatchBinding(
	batch: z.output<typeof remoteBatchSchema>,
	inputFileId: string,
	metadata: Readonly<Record<string, string>>,
): void {
	if (
		batch.input_file_id !== inputFileId ||
		stableJson(batch.metadata ?? {}) !== stableJson(metadata)
	) {
		throw new Error(
			"Remote Batch does not match the deterministic input and metadata binding.",
		);
	}
}

async function reconcileUploadedInput(args: {
	client: PrototypeBatchClient;
	filename: string;
	bytes: number;
	poll: boolean;
	attempts?: number;
	delayMs?: number;
}): Promise<string | null> {
	return pollForReconciliation({
		poll: args.poll,
		attempts: args.attempts,
		delayMs: args.delayMs,
		find: async () => {
			const files = await listAllBatchFiles(args.client);
			const sameName = files.filter(
				(file) => file.filename === args.filename,
			);
			if (sameName.some((file) => file.bytes !== args.bytes)) {
				throw new Error(
					"Remote Batch input filename exists with unexpected bytes.",
				);
			}
			const matches = sameName.filter(
				(file) => file.bytes === args.bytes,
			);
			if (matches.length > 1) {
				throw new Error(
					"Multiple remote Batch input files match the deterministic binding.",
				);
			}
			return matches[0]?.id ?? null;
		},
	});
}

async function reconcileCreatedBatch(args: {
	client: PrototypeBatchClient;
	inputFileId: string;
	metadata: Readonly<Record<string, string>>;
	poll: boolean;
	attempts?: number;
	delayMs?: number;
}): Promise<unknown | null> {
	return pollForReconciliation({
		poll: args.poll,
		attempts: args.attempts,
		delayMs: args.delayMs,
		find: async () => {
			const batches = await listAllBatches(args.client);
			const matches = batches.filter((raw) => {
				const candidate = z
					.object({
						input_file_id: z.string(),
						endpoint: z.string(),
						metadata: z
							.record(z.string(), z.string())
							.nullable()
							.optional(),
					})
					.passthrough()
					.safeParse(raw);
				return (
					candidate.success &&
					candidate.data.input_file_id === args.inputFileId &&
					candidate.data.endpoint === BATCH_ENDPOINT &&
					stableJson(candidate.data.metadata ?? {}) ===
						stableJson(args.metadata)
				);
			});
			if (matches.length > 1) {
				throw new Error(
					"Multiple remote Batches match the deterministic binding.",
				);
			}
			return matches[0] ?? null;
		},
	});
}

async function pollForReconciliation<T>(args: {
	poll: boolean;
	attempts?: number;
	delayMs?: number;
	find: () => Promise<T | null>;
}): Promise<T | null> {
	const attempts = args.poll ? (args.attempts ?? 4) : 1;
	const delayMs = args.delayMs ?? 500;
	if (!Number.isInteger(attempts) || attempts < 1) {
		throw new Error("Reconciliation attempts must be a positive integer.");
	}
	if (!Number.isInteger(delayMs) || delayMs < 0) {
		throw new Error("Reconciliation delay must be a nonnegative integer.");
	}
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		const match = await args.find();
		if (match !== null) return match;
		if (attempt < attempts) {
			await new Promise<void>((resolveDelay) =>
				setTimeout(resolveDelay, delayMs),
			);
		}
	}
	return null;
}

async function listAllBatchFiles(client: PrototypeBatchClient) {
	const files: Array<{
		id: string;
		filename: string;
		bytes: number;
		purpose: string;
	}> = [];
	let after: string | undefined;
	for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
		const page = await client.files.list({
			purpose: "batch",
			limit: 100,
			...(after === undefined ? {} : { after }),
		});
		files.push(...page.data);
		if (!page.has_more) return files;
		after = page.data.at(-1)?.id;
		if (after === undefined) {
			throw new Error("Remote Files page claims more data but is empty.");
		}
	}
	throw new Error("Remote Files reconciliation exceeded 100 pages.");
}

async function listAllBatches(
	client: PrototypeBatchClient,
): Promise<unknown[]> {
	const batches: unknown[] = [];
	let after: string | undefined;
	for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
		const page = await client.batches.list({
			limit: 100,
			...(after === undefined ? {} : { after }),
		});
		batches.push(...page.data);
		if (!page.has_more) return batches;
		const last = z
			.object({ id: z.string().min(1) })
			.safeParse(page.data.at(-1));
		if (!last.success) {
			throw new Error(
				"Remote Batches page claims more data but is empty.",
			);
		}
		after = last.data.id;
	}
	throw new Error("Remote Batch reconciliation exceeded 100 pages.");
}

export async function resumePrototypeBatch(options: {
	readonly batching: true;
	readonly manifestPath: string;
	readonly apiKey?: string;
	readonly client?: PrototypeBatchClient;
}): Promise<{ status: string; run: RetainedRun | null }> {
	if (
		!runnerParametersSchema.parse({ batching: options.batching }).batching
	) {
		throw new Error("Batch resume requires batching: true.");
	}
	const manifestPath = resolve(options.manifestPath);
	let manifest = prototypeBatchManifestSchema.parse(
		JSON.parse(await readFile(manifestPath, "utf8")),
	);
	assertBatchManifestCurrent(manifest);
	const batchId = manifest.remote.batchId;
	if (batchId === null)
		throw new Error("Batch manifest has no remote batch ID.");
	const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
	if (apiKey === undefined && options.client === undefined) {
		throw new Error(
			"OPENAI_API_KEY is required to resume a submitted Batch.",
		);
	}
	const client: PrototypeBatchClient =
		options.client ?? (new OpenAI({ apiKey, maxRetries: 0 }) as never);
	const batchRaw = await client.batches.retrieve(batchId);
	const batch = remoteBatchSchema.parse(batchRaw);
	if (
		batch.id !== batchId ||
		batch.input_file_id !== manifest.remote.inputFileId
	) {
		throw new Error(
			"Retrieved Batch does not match the retained manifest.",
		);
	}
	const inputFileId = manifest.remote.inputFileId;
	if (inputFileId === null) {
		throw new Error("Submitted Batch manifest has no input file ID.");
	}
	assertRemoteBatchBinding(
		batch,
		inputFileId,
		deterministicBatchMetadata(manifest),
	);
	manifest = prototypeBatchManifestSchema.parse({
		...manifest,
		remote: {
			...manifest.remote,
			status: batch.status,
			outputFileId: batch.output_file_id ?? null,
			errorFileId: batch.error_file_id ?? null,
			snapshots: [
				...manifest.remote.snapshots,
				rawBatchSnapshot(batchRaw),
			],
		},
	});
	await writeJsonAtomically(manifestPath, manifest);
	if (batch.status !== "completed")
		return { status: batch.status, run: null };
	if (
		batch.request_counts === undefined ||
		batch.request_counts.total !== EXACT_CALL_CAP
	) {
		throw new Error(
			"Completed Batch does not report the frozen request count.",
		);
	}
	const runDirectory = dirname(manifestPath);
	const output = await downloadBatchArtifact(
		client,
		batch.output_file_id ?? null,
		join(runDirectory, BATCH_OUTPUT_NAME),
	);
	const error = await downloadBatchArtifact(
		client,
		batch.error_file_id ?? null,
		join(runDirectory, BATCH_ERROR_NAME),
	);
	const run = await collectPrototypeBatch(manifest, output, error);
	await writeJsonAtomically(join(runDirectory, "results.json"), run);
	return { status: batch.status, run };
}

function assertBatchManifestCurrent(manifest: PrototypeBatchManifest): void {
	const preflight = preparePrototypePreflight({ batching: true });
	if (
		manifest.bindingSha256 !== bindingSha256(preflight) ||
		stableJson(manifest.preflight) !== stableJson(preflight)
	) {
		throw new Error(
			"Batch manifest is not bound to current source policy.",
		);
	}
	const prepared = preparePrototypeBatch({ batching: true });
	if (
		manifest.inputSha256 !== prepared.manifest.inputSha256 ||
		stableJson(manifest.schedule) !== stableJson(prepared.manifest.schedule)
	) {
		throw new Error(
			"Batch manifest schedule or request binding has drifted.",
		);
	}
}

async function downloadBatchArtifact(
	client: PrototypeBatchClient,
	fileId: string | null,
	path: string,
): Promise<string> {
	if (fileId === null) return "";
	const content = await client.files
		.content(fileId)
		.then((value) => value.text());
	await writeTextAtomically(path, content);
	return content;
}

function rawBatchSnapshot(raw: unknown) {
	const copy = JSON.parse(JSON.stringify(raw));
	return rawBatchSnapshotSchema.parse({
		observedAt: new Date().toISOString(),
		raw: copy,
		utf8Bytes: jsonUtf8Bytes(copy),
	});
}

async function readDirectCheckpointIfPresent(
	checkpointPath: string,
): Promise<PrototypeDirectCheckpoint | null> {
	try {
		return prototypeDirectCheckpointSchema.parse(
			JSON.parse(await readFile(checkpointPath, "utf8")),
		);
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw cause;
	}
}

function assertDirectCheckpointCurrent(
	checkpoint: PrototypeDirectCheckpoint,
	preflight: ReturnType<typeof preparePrototypePreflight>,
	schedule: readonly PrototypeScheduleEntry[],
): void {
	if (
		checkpoint.bindingSha256 !== bindingSha256(preflight) ||
		stableJson(checkpoint.preflight) !== stableJson(preflight) ||
		stableJson(checkpoint.schedule) !==
			stableJson(schedule.map(({ binding }) => binding))
	) {
		throw new Error(
			"Direct checkpoint is not bound to the current source policy and schedule.",
		);
	}
}

export async function runLivePrototype(options: {
	readonly batching: false;
	readonly pool?: RunnerPoolId;
	readonly apiKey?: string;
	readonly client?: PrototypeResponsesClient;
	readonly runDirectory?: string;
	readonly onAttemptPersisted?: (
		attempt: RetainedAttempt,
	) => void | Promise<void>;
}): Promise<RetainedRun> {
	const parameters = runnerParametersSchema.parse({
		batching: options.batching,
		pool: options.pool,
	});
	if (parameters.batching) {
		throw new Error("Direct runner requires batching: false.");
	}
	const preflight = preparePrototypePreflight(parameters);
	assertPreflightCallPolicy(preflight);
	const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
	if (apiKey === undefined && options.client === undefined) {
		throw new Error(
			"OPENAI_API_KEY is unavailable; preflight completed without a provider call.",
		);
	}
	const client: PrototypeResponsesClient =
		options.client ?? new OpenAI({ apiKey, maxRetries: 0 });
	const schedule = preparePrototypeSchedule(parameters);
	if (
		schedule.reduce(
			(sum, { binding }) => sum + binding.maximumCostUpperBoundUsd,
			0,
		) > MAXIMUM_SPEND_USD
	) {
		throw new Error(
			"Direct schedule exceeds the $2 conservative spend ceiling.",
		);
	}
	const createdAt = new Date().toISOString();
	const runDirectory =
		options.runDirectory === undefined
			? join(RUNS, createdAt.replaceAll(/[:.]/gu, "-"))
			: resolve(options.runDirectory);
	await mkdir(runDirectory, { recursive: true });
	const checkpointPath = join(runDirectory, DIRECT_CHECKPOINT_NAME);
	let checkpoint = await readDirectCheckpointIfPresent(checkpointPath);
	if (checkpoint === null) {
		checkpoint = prototypeDirectCheckpointSchema.parse({
			version: "target-classification-high-level-direct-v1",
			createdAt,
			updatedAt: createdAt,
			bindingSha256: bindingSha256(preflight),
			preflight,
			schedule: schedule.map(({ binding }) => binding),
			dispatchCounts: {},
			transientRetryCounts: {},
			attempts: [],
		});
		await writeJsonAtomically(checkpointPath, checkpoint);
	} else {
		assertDirectCheckpointCurrent(checkpoint, preflight, schedule);
	}
	if (checkpoint === null) {
		throw new Error("Direct checkpoint initialization failed.");
	}

	const completed = new Map(
		checkpoint.attempts.map((attempt) => [attempt.key, attempt]),
	);
	const knownKeys = new Set(schedule.map(({ binding }) => binding.key));
	if (
		completed.size !== checkpoint.attempts.length ||
		[...completed.keys()].some((key) => !knownKeys.has(key)) ||
		Object.keys(checkpoint.dispatchCounts).some(
			(key) => !knownKeys.has(key),
		) ||
		Object.entries(checkpoint.transientRetryCounts).some(
			([key, count]) =>
				!knownKeys.has(key) ||
				count > DIRECT_TRANSIENT_RETRY_LIMIT ||
				count >= (checkpoint?.dispatchCounts[key] ?? 0),
		) ||
		[...completed.keys()].some(
			(key) => (checkpoint?.dispatchCounts[key] ?? 0) < 1,
		)
	) {
		throw new Error(
			"Direct checkpoint has duplicate, unknown, or undispatched attempts.",
		);
	}
	const retainedProjectedCost = schedule.reduce(
		(sum, { binding }) =>
			sum +
			(checkpoint?.dispatchCounts[binding.key] ?? 0) *
				binding.maximumCostUpperBoundUsd,
		0,
	);
	if (retainedProjectedCost > MAXIMUM_SPEND_USD) {
		throw new Error(
			"Retained direct dispatches exceed the $2 conservative spend ceiling.",
		);
	}
	let nextScheduleIndex = 0;
	let fatalError: unknown;
	let mutation = Promise.resolve();
	const mutateCheckpoint = async <T>(
		operation: () => Promise<T> | T,
	): Promise<T> => {
		const result = mutation.then(operation);
		mutation = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	};
	const projectedDispatchCost = () =>
		schedule.reduce(
			(sum, { binding }) =>
				sum +
				(checkpoint?.dispatchCounts[binding.key] ?? 0) *
					binding.maximumCostUpperBoundUsd,
			0,
		);
	const reserveNext = () =>
		mutateCheckpoint(async (): Promise<PrototypeScheduleEntry | null> => {
			if (fatalError !== undefined) return null;
			while (
				nextScheduleIndex < schedule.length &&
				completed.has(schedule[nextScheduleIndex]?.binding.key ?? "")
			) {
				nextScheduleIndex += 1;
			}
			const entry = schedule[nextScheduleIndex];
			if (entry === undefined) return null;
			nextScheduleIndex += 1;
			const dispatchCounts = {
				...checkpoint?.dispatchCounts,
				[entry.binding.key]:
					(checkpoint?.dispatchCounts[entry.binding.key] ?? 0) + 1,
			};
			checkpoint = prototypeDirectCheckpointSchema.parse({
				...checkpoint,
				updatedAt: new Date().toISOString(),
				dispatchCounts,
			});
			if (projectedDispatchCost() > MAXIMUM_SPEND_USD) {
				throw new Error(
					"Direct dispatches would exceed the $2 conservative spend ceiling.",
				);
			}
			await writeJsonAtomically(checkpointPath, checkpoint);
			return entry;
		});
	const reserveTransientRetry = (
		entry: PrototypeScheduleEntry,
		providerError: NonNullable<RetainedAttempt["providerError"]>,
	) =>
		mutateCheckpoint(async () => {
			const retryCount =
				checkpoint?.transientRetryCounts[entry.binding.key] ?? 0;
			if (!shouldRetryDirectProviderError(providerError, retryCount)) {
				throw new Error(
					`Direct retry policy rejected ${entry.binding.key}.`,
				);
			}
			checkpoint = prototypeDirectCheckpointSchema.parse({
				...checkpoint,
				updatedAt: new Date().toISOString(),
				dispatchCounts: {
					...checkpoint?.dispatchCounts,
					[entry.binding.key]:
						(checkpoint?.dispatchCounts[entry.binding.key] ?? 0) +
						1,
				},
				transientRetryCounts: {
					...checkpoint?.transientRetryCounts,
					[entry.binding.key]: retryCount + 1,
				},
			});
			if (projectedDispatchCost() > MAXIMUM_SPEND_USD) {
				throw new Error(
					"Direct retry would exceed the $2 conservative spend ceiling.",
				);
			}
			await writeJsonAtomically(checkpointPath, checkpoint);
		});
	const persistAttempt = (attempt: RetainedAttempt) =>
		mutateCheckpoint(async () => {
			if (completed.has(attempt.key)) {
				throw new Error(`Duplicate direct attempt ${attempt.key}.`);
			}
			completed.set(attempt.key, attempt);
			checkpoint = prototypeDirectCheckpointSchema.parse({
				...checkpoint,
				updatedAt: new Date().toISOString(),
				attempts: [...completed.values()],
			});
			await writeJsonAtomically(checkpointPath, checkpoint);
		});
	const worker = async () => {
		while (fatalError === undefined) {
			try {
				const entry = await reserveNext();
				if (entry === null) return;
				let attempt: RetainedAttempt;
				while (true) {
					attempt = await callOne({
						client,
						armId: entry.binding.armId,
						attemptNumber: entry.binding.attemptNumber,
						systemPrompt: entry.systemPrompt,
						testCase: entry.testCase,
						promptCacheKey: entry.binding.promptCacheKey,
						priceSchedule: preflight.priceSchedule,
					});
					const providerError = attempt.providerError;
					const retryCount =
						checkpoint?.transientRetryCounts[entry.binding.key] ??
						0;
					if (
						providerError === undefined ||
						!shouldRetryDirectProviderError(
							providerError,
							retryCount,
						)
					) {
						break;
					}
					await reserveTransientRetry(entry, providerError);
				}
				await persistAttempt(attempt);
				await options.onAttemptPersisted?.(attempt);
			} catch (cause) {
				fatalError ??= cause;
			}
		}
	};
	await Promise.all(
		Array.from({ length: DIRECT_RESPONSES_POLICY.concurrency }, async () =>
			worker(),
		),
	);
	if (fatalError !== undefined) throw fatalError;
	const attempts = schedule.map(({ binding }) => completed.get(binding.key));
	if (attempts.some((attempt) => attempt === undefined)) {
		throw new Error("Direct run ended with an incomplete schedule.");
	}
	const retainedAttempts = attempts as RetainedAttempt[];
	if (retainedAttempts.length !== preflight.exactCallCap) {
		throw new Error(
			`Expected ${preflight.exactCallCap} calls; retained ${retainedAttempts.length}.`,
		);
	}
	assertAttemptSchedule(retainedAttempts, parameters.pool);
	const resolvedModel = resolvedModelForRun(retainedAttempts);
	const result = retainedRunSchema.parse({
		startedAt: checkpoint.createdAt,
		completedAt: new Date().toISOString(),
		finalizedAt: null,
		bindingSha256: bindingSha256(preflight),
		preflight,
		resolvedModel,
		actualCallCount: retainedAttempts.length,
		totalBilledCostUpperBoundUsd: totalCost(retainedAttempts),
		arms: summarizeArms(retainedAttempts),
		verdict: null,
		attempts: retainedAttempts,
	});
	const destination = join(runDirectory, "results.json");
	await writeJsonAtomically(destination, result);
	console.log(`Wrote ${relative(process.cwd(), destination)}`);
	console.log("Evidence remains ineligible until offline finalization.");
	return result;
}

function diagnosticMechanismClusterForCase(
	caseId: string,
): DiagnosticMechanismCluster {
	if (caseId.includes("optional-reflexive")) return "optional-reflexive";
	if (caseId.includes("copula")) return "copula";
	if (caseId.includes("fusion")) return "fusion";
	if (caseId.includes("paired")) return "paired-frame";
	if (caseId.includes("idiom") || caseId.includes("fixed-function")) {
		return "idiom-membership";
	}
	if (
		caseId.includes("separable") ||
		caseId.includes("repeated") ||
		caseId.includes("punctuation") ||
		caseId.includes("overlap")
	) {
		return "separable-position";
	}
	return "unclustered";
}

function selectDiagnosticFollowUpAttempts(retained: RetainedRun) {
	const sorted = [...retained.attempts].sort((left, right) =>
		left.key.localeCompare(right.key),
	);
	const misses = sorted
		.filter(({ evaluation }) => !evaluation.contractPass)
		.map((attempt) => ({
			attempt,
			selection: diagnosticFollowUpSelectionSchema.parse({
				key: attempt.key,
				sourceAttemptSha256: bindingSha256(attempt),
				selectionReason: "first-turn-miss",
				cluster: diagnosticMechanismClusterForCase(attempt.caseId),
			}),
		}));
	const controls = MATCHED_PASS_CONTROL_CLUSTERS.flatMap((cluster) => {
		const attempt = sorted.find(
			(candidate) =>
				candidate.evaluation.contractPass &&
				diagnosticMechanismClusterForCase(candidate.caseId) === cluster,
		);
		return attempt === undefined
			? []
			: [
					{
						attempt,
						selection: diagnosticFollowUpSelectionSchema.parse({
							key: attempt.key,
							sourceAttemptSha256: bindingSha256(attempt),
							selectionReason: "matched-pass-control",
							cluster,
						}),
					},
				];
	});
	const selected = [...misses, ...controls];
	if (selected.length > DIAGNOSTIC_FOLLOW_UP_CALL_CAP) {
		throw new Error(
			`Diagnostic follow-up requires ${selected.length} calls; cap is ${DIAGNOSTIC_FOLLOW_UP_CALL_CAP}.`,
		);
	}
	return selected;
}

function assertRetainedDiagnosticSourceStructure(retained: RetainedRun): void {
	const bound = z
		.object({
			runnerVersion: z.literal(RUNNER_VERSION),
			runnerParameters: runnerParametersSchema,
			exactCallCap: z.number().int().positive(),
			attemptsPerArm: z.number().int().positive(),
			evaluationCaseIds: z.array(z.string().min(1)),
			arms: z.array(z.object({ id: z.enum(REPRESENTATION_IDS) })),
		})
		.parse(retained.preflight);
	if (bound.runnerParameters.pool !== "diagnostic") {
		throw new Error(
			"Diagnostic follow-up requires a retained diagnostic-pool results.json.",
		);
	}
	if (
		bindingSha256(retained.preflight) !== retained.bindingSha256 ||
		retained.attempts.length !== bound.exactCallCap ||
		retained.actualCallCount !== retained.attempts.length
	) {
		throw new Error(
			"Retained diagnostic source does not match its own evidence binding and call cap.",
		);
	}
	const expected = new Set<string>();
	for (const { id } of bound.arms) {
		for (
			let attemptNumber = 1;
			attemptNumber <= bound.attemptsPerArm;
			attemptNumber += 1
		) {
			for (const caseId of bound.evaluationCaseIds) {
				expected.add(`${id}/${attemptNumber}/${caseId}`);
			}
		}
	}
	for (const attempt of retained.attempts) {
		if (
			attempt.key !==
				`${attempt.armId}/${attempt.attemptNumber}/${attempt.caseId}` ||
			!expected.delete(attempt.key)
		) {
			throw new Error(
				`Unexpected retained diagnostic attempt ${attempt.key}.`,
			);
		}
	}
	if (expected.size !== 0) {
		throw new Error(
			"Retained diagnostic source has an incomplete structural schedule.",
		);
	}
}

type DiagnosticFollowUpScheduleEntry = ReturnType<
	typeof prepareDiagnosticFollowUpSchedule
>[number];

function prepareDiagnosticFollowUpSchedule(
	retained: RetainedRun,
	priceSchedule: PrototypePriceSchedule,
) {
	return selectDiagnosticFollowUpAttempts(retained).map(
		({ attempt, selection }) => {
			if (attempt.privateOutputJson === undefined) {
				throw new Error(
					`Diagnostic follow-up source ${attempt.key} has no parsed first-turn output.`,
				);
			}
			const sourceAttempt = {
				key: attempt.key,
				caseId: attempt.caseId,
				privateInput: attempt.privateInput,
				privateOutputJson: attempt.privateOutputJson,
				canonicalInput: attempt.canonicalInput,
				...(attempt.canonicalOutput === undefined
					? {}
					: { canonicalOutput: attempt.canonicalOutput }),
				evaluation: Object.fromEntries(
					Object.entries(attempt.evaluation),
				),
			};
			const request = prepareDiagnosticFollowUpRequest({
				attempt: sourceAttempt,
				model: RUN_MODEL,
			});
			const requestUtf8Bytes = jsonUtf8Bytes(request);
			const maxOutputTokens = request.max_output_tokens;
			if (maxOutputTokens === undefined) {
				throw new Error("Diagnostic request has no output-token cap.");
			}
			return Object.freeze({
				attempt: sourceAttempt,
				selection,
				request,
				requestSha256: bindingSha256(request),
				requestUtf8Bytes,
				maximumCostUpperBoundUsd: maximumRequestCostUpperBoundUsd(
					requestUtf8Bytes,
					priceSchedule,
					maxOutputTokens,
				),
			});
		},
	);
}

async function callOneDiagnosticFollowUp(args: {
	client: PrototypeResponsesClient;
	entry: DiagnosticFollowUpScheduleEntry;
	priceSchedule: PrototypePriceSchedule;
}) {
	const started = performance.now();
	const base = {
		key: args.entry.selection.key,
		sourceAttemptSha256: args.entry.selection.sourceAttemptSha256,
		selectionReason: args.entry.selection.selectionReason,
		cluster: args.entry.selection.cluster,
		requestSha256: args.entry.requestSha256,
		requestUtf8Bytes: args.entry.requestUtf8Bytes,
		maximumCostUpperBoundUsd: args.entry.maximumCostUpperBoundUsd,
	};
	let rawResponse: unknown;
	try {
		rawResponse = await args.client.responses.create(args.entry.request);
	} catch (cause) {
		return diagnosticFollowUpResultSchema.parse({
			...base,
			latencyMs: Math.round(performance.now() - started),
			providerError: describeError(cause),
		});
	}
	const responseUtf8Bytes = jsonUtf8Bytes(rawResponse);
	try {
		const response = providerResponseSchema.parse(rawResponse);
		if (response.model !== EXPECTED_RESOLVED_MODEL) {
			throw new Error(
				`Diagnostic response.model must equal ${EXPECTED_RESOLVED_MODEL}; received ${response.model}.`,
			);
		}
		const rawOutputText = extractResponseOutputText(response);
		return diagnosticFollowUpResultSchema.parse({
			...base,
			latencyMs: Math.round(performance.now() - started),
			rawResponseJson: rawResponse,
			responseUtf8Bytes,
			responseId: response.id,
			resolvedModel: response.model,
			rawUsage: response.usage,
			usage: normalizeUsage(response.usage, args.priceSchedule),
			followUp: parseDiagnosticFollowUpResponse({
				attempt: args.entry.attempt,
				cluster: args.entry.selection.cluster,
				rawOutputText,
				selectionReason: args.entry.selection.selectionReason,
			}),
		});
	} catch (cause) {
		return diagnosticFollowUpResultSchema.parse({
			...base,
			latencyMs: Math.round(performance.now() - started),
			rawResponseJson: rawResponse,
			responseUtf8Bytes,
			modelOutputError: describeError(cause),
		});
	}
}

export async function runDiagnosticFollowUp(options: {
	readonly batching: false;
	readonly resultsPath: string;
	readonly artifactDirectory?: string;
	readonly apiKey?: string;
	readonly client?: PrototypeResponsesClient;
	readonly onFollowUpPersisted?: (
		followUp: z.output<typeof diagnosticFollowUpResultSchema>,
	) => void | Promise<void>;
}): Promise<DiagnosticFollowUpArtifact> {
	if (options.batching) {
		throw new Error("Diagnostic follow-up requires batching: false.");
	}
	const sourceText = await readFile(resolve(options.resultsPath), "utf8");
	const source = retainedRunSchema.parse(JSON.parse(sourceText));
	assertRetainedDiagnosticSourceStructure(source);
	const sourceResultsSha256 = sha256Text(sourceText);
	const sourceResultsUtf8Bytes = Buffer.byteLength(sourceText, "utf8");
	const priceSchedule = preparePrototypePreflight({
		batching: false,
		pool: "diagnostic",
	}).priceSchedule;
	const schedule = prepareDiagnosticFollowUpSchedule(source, priceSchedule);
	const maximumScheduledCostUpperBoundUsd = schedule.reduce(
		(sum, entry) => sum + entry.maximumCostUpperBoundUsd,
		0,
	);
	const diagnosticInstructionSha256 = sha256Text(
		DIAGNOSTIC_FOLLOW_UP_SYSTEM_INSTRUCTION,
	);
	const requestScheduleSha256 = bindingSha256(
		schedule.map((entry) => ({
			selection: entry.selection,
			requestSha256: entry.requestSha256,
			requestUtf8Bytes: entry.requestUtf8Bytes,
			maximumCostUpperBoundUsd: entry.maximumCostUpperBoundUsd,
		})),
	);
	if (
		maximumScheduledCostUpperBoundUsd > DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD
	) {
		throw new Error(
			`Diagnostic follow-up ceiling $${maximumScheduledCostUpperBoundUsd.toFixed(2)} exceeds $${DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD.toFixed(2)}.`,
		);
	}
	const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
	if (apiKey === undefined && options.client === undefined) {
		throw new Error(
			"OPENAI_API_KEY is unavailable for diagnostic follow-up.",
		);
	}
	const client: PrototypeResponsesClient =
		options.client ?? new OpenAI({ apiKey, maxRetries: 0 });
	const artifactDirectory = resolve(
		options.artifactDirectory ?? dirname(resolve(options.resultsPath)),
	);
	await mkdir(artifactDirectory, { recursive: true });
	const artifactPath = join(
		artifactDirectory,
		DIAGNOSTIC_FOLLOW_UP_ARTIFACT_NAME,
	);
	let artifact: DiagnosticFollowUpArtifact;
	try {
		artifact = diagnosticFollowUpArtifactSchema.parse(
			JSON.parse(await readFile(artifactPath, "utf8")),
		);
		if (
			artifact.sourceResultsSha256 !== sourceResultsSha256 ||
			artifact.sourceResultsUtf8Bytes !== sourceResultsUtf8Bytes ||
			artifact.sourceBindingSha256 !== source.bindingSha256 ||
			artifact.diagnosticInstructionSha256 !==
				diagnosticInstructionSha256 ||
			artifact.requestScheduleSha256 !== requestScheduleSha256 ||
			stableJson(artifact.selections) !==
				stableJson(schedule.map(({ selection }) => selection)) ||
			artifact.maximumScheduledCostUpperBoundUsd !==
				maximumScheduledCostUpperBoundUsd
		) {
			throw new Error(
				"Diagnostic follow-up artifact is not bound to the current source and selection.",
			);
		}
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
		const now = new Date().toISOString();
		artifact = diagnosticFollowUpArtifactSchema.parse({
			version: "target-classification-diagnostic-follow-up-v4",
			startedAt: now,
			updatedAt: now,
			completedAt: null,
			sourceResultsSha256,
			sourceResultsUtf8Bytes,
			sourceBindingSha256: source.bindingSha256,
			diagnosticInstructionSha256,
			requestScheduleSha256,
			model: RUN_MODEL,
			winnerEligible: false,
			callCap: DIAGNOSTIC_FOLLOW_UP_CALL_CAP,
			spendCapUsd: DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD,
			maximumScheduledCostUpperBoundUsd,
			dispatchCounts: {},
			selections: schedule.map(({ selection }) => selection),
			followUps: [],
		});
		await writeJsonAtomically(artifactPath, artifact);
	}
	const completed = new Map(
		artifact.followUps.map((followUp) => [followUp.key, followUp]),
	);
	const scheduledByKey = new Map(
		schedule.map((entry) => [entry.selection.key, entry]),
	);
	if (
		Object.keys(artifact.dispatchCounts).some(
			(key) => !scheduledByKey.has(key),
		) ||
		[...completed.keys()].some(
			(key) =>
				!scheduledByKey.has(key) ||
				(artifact.dispatchCounts[key] ?? 0) < 1,
		)
	) {
		throw new Error(
			"Diagnostic follow-up artifact has unknown or undispatched results.",
		);
	}
	let nextScheduleIndex = 0;
	let fatalError: unknown;
	let mutation = Promise.resolve();
	const mutateArtifact = async <T>(
		operation: () => Promise<T> | T,
	): Promise<T> => {
		const result = mutation.then(operation);
		mutation = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	};
	const orderedFollowUps = () =>
		schedule.flatMap(({ selection }) => {
			const followUp = completed.get(selection.key);
			return followUp === undefined ? [] : [followUp];
		});
	const projectedDispatchCost = (
		dispatchCounts: Readonly<Record<string, number>>,
	) =>
		schedule.reduce(
			(sum, entry) =>
				sum +
				(dispatchCounts[entry.selection.key] ?? 0) *
					entry.maximumCostUpperBoundUsd,
			0,
		);
	const retainedDispatchCount = Object.values(artifact.dispatchCounts).reduce(
		(sum, count) => sum + count,
		0,
	);
	if (
		retainedDispatchCount > DIAGNOSTIC_FOLLOW_UP_CALL_CAP ||
		projectedDispatchCost(artifact.dispatchCounts) >
			DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD
	) {
		throw new Error(
			"Retained diagnostic follow-up dispatches exceed a safety cap.",
		);
	}
	const completedRetryCount = (key: string) =>
		Math.max(0, (artifact.dispatchCounts[key] ?? 0) - 1);
	const isRetryableCompletedResult = (key: string) => {
		const providerError = completed.get(key)?.providerError;
		return (
			providerError !== undefined &&
			shouldRetryDirectProviderError(
				providerError,
				completedRetryCount(key),
			)
		);
	};
	const reserveNext = () =>
		mutateArtifact(
			async (): Promise<{
				entry: DiagnosticFollowUpScheduleEntry;
				replacingProviderError: boolean;
			} | null> => {
				if (fatalError !== undefined) return null;
				while (
					nextScheduleIndex < schedule.length &&
					completed.has(
						schedule[nextScheduleIndex]?.selection.key ?? "",
					) &&
					!isRetryableCompletedResult(
						schedule[nextScheduleIndex]?.selection.key ?? "",
					)
				) {
					nextScheduleIndex += 1;
				}
				const entry = schedule[nextScheduleIndex];
				if (entry === undefined) return null;
				nextScheduleIndex += 1;
				const replacingProviderError = completed.has(
					entry.selection.key,
				);
				const dispatchCounts = {
					...artifact.dispatchCounts,
					[entry.selection.key]:
						(artifact.dispatchCounts[entry.selection.key] ?? 0) + 1,
				};
				const dispatchCount = Object.values(dispatchCounts).reduce(
					(sum, count) => sum + count,
					0,
				);
				if (dispatchCount > DIAGNOSTIC_FOLLOW_UP_CALL_CAP) {
					throw new Error(
						"Diagnostic follow-up dispatches exceed the call cap.",
					);
				}
				if (
					projectedDispatchCost(dispatchCounts) >
					DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD
				) {
					throw new Error(
						"Diagnostic follow-up dispatches exceed the spend cap.",
					);
				}
				artifact = diagnosticFollowUpArtifactSchema.parse({
					...artifact,
					updatedAt: new Date().toISOString(),
					completedAt: null,
					dispatchCounts,
				});
				await writeJsonAtomically(artifactPath, artifact);
				return { entry, replacingProviderError };
			},
		);
	const reserveTransientRetry = (
		entry: DiagnosticFollowUpScheduleEntry,
		providerError: NonNullable<
			z.output<typeof diagnosticFollowUpResultSchema>["providerError"]
		>,
	) =>
		mutateArtifact(async () => {
			const retryCount = completedRetryCount(entry.selection.key);
			if (!shouldRetryDirectProviderError(providerError, retryCount)) {
				throw new Error(
					`Diagnostic transient retry policy rejected ${entry.selection.key}.`,
				);
			}
			const dispatchCounts = {
				...artifact.dispatchCounts,
				[entry.selection.key]:
					(artifact.dispatchCounts[entry.selection.key] ?? 0) + 1,
			};
			const dispatchCount = Object.values(dispatchCounts).reduce(
				(sum, count) => sum + count,
				0,
			);
			if (dispatchCount > DIAGNOSTIC_FOLLOW_UP_CALL_CAP) {
				throw new Error(
					"Diagnostic follow-up retries exceed the call cap.",
				);
			}
			if (
				projectedDispatchCost(dispatchCounts) >
				DIAGNOSTIC_FOLLOW_UP_SPEND_CAP_USD
			) {
				throw new Error(
					"Diagnostic follow-up retries exceed the spend cap.",
				);
			}
			artifact = diagnosticFollowUpArtifactSchema.parse({
				...artifact,
				updatedAt: new Date().toISOString(),
				completedAt: null,
				dispatchCounts,
			});
			await writeJsonAtomically(artifactPath, artifact);
		});
	const persistFollowUp = (
		followUp: z.output<typeof diagnosticFollowUpResultSchema>,
		replacingProviderError: boolean,
	) =>
		mutateArtifact(async () => {
			const existing = completed.get(followUp.key);
			if (
				(existing !== undefined && !replacingProviderError) ||
				(existing === undefined && replacingProviderError) ||
				(replacingProviderError &&
					existing?.providerError === undefined)
			) {
				throw new Error(
					`Invalid diagnostic follow-up replacement ${followUp.key}.`,
				);
			}
			completed.set(followUp.key, followUp);
			artifact = diagnosticFollowUpArtifactSchema.parse({
				...artifact,
				updatedAt: new Date().toISOString(),
				followUps: orderedFollowUps(),
			});
			await writeJsonAtomically(artifactPath, artifact);
		});
	const worker = async () => {
		while (fatalError === undefined) {
			try {
				const reservation = await reserveNext();
				if (reservation === null) return;
				const { entry, replacingProviderError } = reservation;
				let followUp = await callOneDiagnosticFollowUp({
					client,
					entry,
					priceSchedule,
				});
				while (
					replacingProviderError &&
					followUp.providerError !== undefined &&
					shouldRetryDirectProviderError(
						followUp.providerError,
						completedRetryCount(entry.selection.key),
					)
				) {
					await reserveTransientRetry(entry, followUp.providerError);
					followUp = await callOneDiagnosticFollowUp({
						client,
						entry,
						priceSchedule,
					});
				}
				await persistFollowUp(followUp, replacingProviderError);
				await options.onFollowUpPersisted?.(followUp);
			} catch (cause) {
				fatalError ??= cause;
			}
		}
	};
	await Promise.all(
		Array.from({ length: DIRECT_RESPONSES_POLICY.concurrency }, worker),
	);
	if (fatalError !== undefined) throw fatalError;
	if (completed.size !== schedule.length) {
		throw new Error(
			"Diagnostic follow-up ended with an incomplete schedule.",
		);
	}
	artifact = diagnosticFollowUpArtifactSchema.parse({
		...artifact,
		updatedAt: new Date().toISOString(),
		completedAt: new Date().toISOString(),
		followUps: orderedFollowUps(),
	});
	await writeJsonAtomically(artifactPath, artifact);
	console.log(`Wrote ${relative(process.cwd(), artifactPath)}`);
	console.log("Diagnostic follow-ups are excluded from winner scoring.");
	return artifact;
}

async function collectPrototypeBatch(
	manifest: PrototypeBatchManifest,
	outputJsonl: string,
	errorJsonl: string,
): Promise<RetainedRun> {
	const batchPriceSchedule = preparePrototypePreflight({
		batching: true,
	}).priceSchedule;
	const envelopes = [
		...parseBatchJsonl(outputJsonl),
		...parseBatchJsonl(errorJsonl),
	];
	const byCustomId = new Map<
		string,
		z.output<typeof batchResultEnvelopeSchema>
	>();
	for (const envelope of envelopes) {
		if (byCustomId.has(envelope.custom_id)) {
			throw new Error(`Duplicate Batch custom_id ${envelope.custom_id}.`);
		}
		byCustomId.set(envelope.custom_id, envelope);
	}
	if (byCustomId.size !== EXACT_CALL_CAP) {
		throw new Error(
			`Batch artifacts contain ${byCustomId.size} results; expected ${EXACT_CALL_CAP}.`,
		);
	}
	const attempts: RetainedAttempt[] = [];
	const casesByArm = new Map(
		REPRESENTATION_IDS.map((armId) => [
			armId,
			new Map(
				prepareRepresentationCases(armId).map((testCase) => [
					testCase.caseId,
					testCase,
				]),
			),
		]),
	);
	const promptsByArm = new Map(
		REPRESENTATION_IDS.map((armId) => [
			armId,
			systemPromptForRepresentation(armId),
		]),
	);
	for (const binding of manifest.schedule) {
		const envelope = byCustomId.get(binding.customId);
		if (envelope === undefined) {
			throw new Error(`Batch result is missing ${binding.customId}.`);
		}
		byCustomId.delete(binding.customId);
		const testCase = casesByArm.get(binding.armId)?.get(binding.caseId);
		if (testCase === undefined) {
			throw new Error(`Scheduled case ${binding.caseId} is unavailable.`);
		}
		const systemPrompt = promptsByArm.get(binding.armId);
		if (systemPrompt === undefined) throw new Error("Missing arm prompt.");
		const request = responseRequestFor({
			armId: binding.armId,
			systemPrompt,
			privateInput: testCase.privateInput,
			promptCacheKey: binding.promptCacheKey,
		});
		if (
			binding.requestSha256 !== bindingSha256(request) ||
			binding.requestUtf8Bytes !== jsonUtf8Bytes(request)
		) {
			throw new Error(
				`Batch request binding drifted for ${binding.key}.`,
			);
		}
		const rawBatchResponseJson = JSON.parse(JSON.stringify(envelope));
		const batchEvidence = {
			batchCustomId: binding.customId,
			rawBatchResponseJson,
			batchResponseUtf8Bytes: jsonUtf8Bytes(rawBatchResponseJson),
		};
		if (
			envelope.response === null ||
			envelope.error !== null ||
			envelope.response.status_code !== 200
		) {
			attempts.push(
				attemptSchema.parse({
					key: binding.key,
					armId: binding.armId,
					attemptNumber: binding.attemptNumber,
					caseId: binding.caseId,
					privateInput: testCase.privateInput,
					privateIdealOutput: testCase.privateIdealOutput,
					canonicalInput: testCase.canonicalInput,
					canonicalIdealOutput: testCase.canonicalIdealOutput,
					requestUtf8Bytes: binding.requestUtf8Bytes,
					...batchEvidence,
					evaluation: failedEvaluation(),
					latencyMs: 0,
					providerError: {
						name: "OpenAIBatchError",
						message:
							envelope.error?.message ??
							`Batch response status ${envelope.response?.status_code ?? "missing"}.`,
						...(envelope.error?.code
							? { code: envelope.error.code }
							: {}),
					},
					missClassification: null,
					missClassificationExplanation: null,
				}),
			);
			continue;
		}
		const retained = await callOne({
			client: {
				responses: {
					create: async (actualRequest) => {
						if (stableJson(actualRequest) !== stableJson(request)) {
							throw new Error(
								"Collected Batch request reconstruction drifted.",
							);
						}
						return envelope.response?.body;
					},
				},
			},
			armId: binding.armId,
			attemptNumber: binding.attemptNumber,
			systemPrompt,
			testCase,
			promptCacheKey: binding.promptCacheKey,
			priceSchedule: batchPriceSchedule,
		});
		attempts.push(attemptSchema.parse({ ...retained, ...batchEvidence }));
	}
	if (byCustomId.size !== 0) {
		throw new Error(`Batch artifacts contain unknown custom_id values.`);
	}
	assertAttemptSchedule(attempts);
	const resolvedModel = resolvedModelForRun(attempts);
	return retainedRunSchema.parse({
		startedAt: manifest.createdAt,
		completedAt: new Date().toISOString(),
		finalizedAt: null,
		bindingSha256: manifest.bindingSha256,
		preflight: manifest.preflight,
		resolvedModel,
		actualCallCount: attempts.length,
		totalBilledCostUpperBoundUsd: totalCost(attempts),
		arms: summarizeArms(attempts),
		verdict: null,
		attempts,
	});
}

function parseBatchJsonl(
	content: string,
): z.output<typeof batchResultEnvelopeSchema>[] {
	if (content.trim().length === 0) return [];
	return content
		.trim()
		.split("\n")
		.map((line) => batchResultEnvelopeSchema.parse(JSON.parse(line)));
}

async function callOne(args: {
	client: PrototypeResponsesClient;
	armId: RepresentationId;
	attemptNumber: number;
	systemPrompt: string;
	testCase: ReturnType<typeof prepareRepresentationCases>[number];
	promptCacheKey: string;
	priceSchedule: PrototypePriceSchedule;
}): Promise<RetainedAttempt> {
	const key = `${args.armId}/${args.attemptNumber}/${args.testCase.caseId}`;
	const started = performance.now();
	const request = responseRequestFor({
		armId: args.armId,
		systemPrompt: args.systemPrompt,
		privateInput: args.testCase.privateInput,
		promptCacheKey: args.promptCacheKey,
	});
	const requestUtf8Bytes = jsonUtf8Bytes(request);
	const baseAttempt = {
		key,
		armId: args.armId,
		attemptNumber: args.attemptNumber,
		caseId: args.testCase.caseId,
		privateInput: args.testCase.privateInput,
		privateIdealOutput: args.testCase.privateIdealOutput,
		canonicalInput: args.testCase.canonicalInput,
		canonicalIdealOutput: args.testCase.canonicalIdealOutput,
		requestUtf8Bytes,
	};
	let providerResponse: unknown;
	try {
		providerResponse = await args.client.responses.create(request);
	} catch (cause) {
		return attemptSchema.parse({
			...baseAttempt,
			evaluation: failedEvaluation(),
			latencyMs: Math.round(performance.now() - started),
			providerError: describeError(cause),
			missClassification: null,
			missClassificationExplanation: null,
		});
	}
	let rawResponseJson: unknown;
	try {
		rawResponseJson = JSON.parse(JSON.stringify(providerResponse));
	} catch (cause) {
		return attemptSchema.parse({
			...baseAttempt,
			evaluation: failedEvaluation(),
			latencyMs: Math.round(performance.now() - started),
			providerError: describeError(cause),
			missClassification: null,
			missClassificationExplanation: null,
		});
	}
	const rawResponseEvidence = {
		rawResponseJson,
		responseUtf8Bytes: jsonUtf8Bytes(rawResponseJson),
	};
	let response: z.output<typeof providerResponseSchema>;
	try {
		response = providerResponseSchema.parse(rawResponseJson);
	} catch (cause) {
		return attemptSchema.parse({
			...baseAttempt,
			...rawResponseEvidence,
			evaluation: failedEvaluation(),
			latencyMs: Math.round(performance.now() - started),
			providerError: describeError(cause),
			missClassification: null,
			missClassificationExplanation: null,
		});
	}
	let rawOutputText: string;
	try {
		rawOutputText = extractResponseOutputText(response);
	} catch (cause) {
		return attemptSchema.parse({
			...baseAttempt,
			...rawResponseEvidence,
			evaluation: failedEvaluation(),
			latencyMs: Math.round(performance.now() - started),
			providerError: describeError(cause),
			missClassification: null,
			missClassificationExplanation: null,
		});
	}
	const parsedResponseEvidence = {
		rawOutputText,
		responseId: response.id,
		resolvedModel: response.model,
		rawUsage: response.usage ?? null,
	};
	let usage: z.output<typeof usageSchema>;
	try {
		usage = normalizeUsage(response.usage, args.priceSchedule);
	} catch (cause) {
		return attemptSchema.parse({
			...baseAttempt,
			...rawResponseEvidence,
			...parsedResponseEvidence,
			evaluation: failedEvaluation(),
			latencyMs: Math.round(performance.now() - started),
			providerError: describeError(cause),
			missClassification: null,
			missClassificationExplanation: null,
		});
	}
	const metadata = {
		...rawResponseEvidence,
		...parsedResponseEvidence,
		usage,
	};
	let privateOutputJson: unknown;
	try {
		if (rawOutputText.length === 0) {
			throw new Error("Provider returned no output text.");
		}
		privateOutputJson = JSON.parse(rawOutputText);
		const canonicalOutput = parseAndCanonicalizeRepresentation({
			id: args.armId,
			canonicalInput: args.testCase.canonicalInput,
			privateInput: args.testCase.privateInput,
			output: privateOutputJson,
		});
		return attemptSchema.parse({
			...baseAttempt,
			privateOutputJson,
			canonicalOutput,
			evaluation: evaluateGermanHighLevelTargetClassification({
				caseId: args.testCase.caseId,
				input: args.testCase.canonicalInput,
				idealOutput: args.testCase.canonicalIdealOutput,
				output: canonicalOutput,
			}),
			latencyMs: Math.round(performance.now() - started),
			...metadata,
			missClassification: null,
			missClassificationExplanation: null,
		});
	} catch (cause) {
		return attemptSchema.parse({
			...baseAttempt,
			...(privateOutputJson === undefined ? {} : { privateOutputJson }),
			evaluation: failedEvaluation(),
			latencyMs: Math.round(performance.now() - started),
			...metadata,
			modelOutputError: describeError(cause),
			missClassification: null,
			missClassificationExplanation: null,
		});
	}
}

export function responseRequestFor(args: {
	readonly armId: RepresentationId;
	readonly systemPrompt: string;
	readonly privateInput: unknown;
	readonly promptCacheKey: string;
}): ResponseCreateParamsNonStreaming {
	return {
		model: RUN_MODEL,
		input: [
			{
				role: "system" as const,
				content: [
					{
						type: "input_text" as const,
						text: args.systemPrompt,
						prompt_cache_breakpoint: { mode: "explicit" as const },
					},
				],
			},
			{
				role: "user" as const,
				content: stableJson(args.privateInput),
			},
		],
		max_output_tokens: MAX_OUTPUT_TOKENS,
		prompt_cache_key: args.promptCacheKey,
		prompt_cache_options: {
			mode: BATCH_CACHE_POLICY.promptCacheMode,
			ttl: BATCH_CACHE_POLICY.promptCacheTtl,
		},
		reasoning: { effort: REASONING_EFFORT },
		store: false,
		text: {
			format: zodTextFormat(
				outputSchemaForRepresentation(args.armId),
				`target_${args.armId.replaceAll("-", "_")}`,
			),
			verbosity: TEXT_VERBOSITY,
		},
	};
}

export function summarizeArms(
	attempts: readonly RetainedAttempt[],
): readonly ArmEvidenceSummary[] {
	return REPRESENTATION_IDS.map((id) => {
		const armAttempts = attempts.filter((attempt) => attempt.armId === id);
		const attemptContractScores = Array.from(
			{ length: ATTEMPTS_PER_ARM },
			(_, index) => index + 1,
		).map(
			(attemptNumber) =>
				armAttempts.filter(
					(attempt) =>
						attempt.attemptNumber === attemptNumber &&
						attempt.evaluation.contractPass,
				).length,
		);
		const sliceRatios = Object.fromEntries(
			(["routes", "boundaries", "robustness"] as const).map((slice) => {
				const sliced = armAttempts.filter(
					(attempt) => sliceForCase(attempt.caseId) === slice,
				);
				return [
					slice,
					sliced.length === 0
						? 0
						: sliced.filter(
								({ evaluation }) => evaluation.contractPass,
							).length / sliced.length,
				];
			}),
		) as Record<"routes" | "boundaries" | "robustness", number>;
		const clickGatePass = Array.from(
			{ length: ATTEMPTS_PER_ARM },
			(_, index) => index + 1,
		).every((attemptNumber) => {
			const repeated = armAttempts.filter(
				(attempt) => attempt.attemptNumber === attemptNumber,
			);
			return evaluateGermanHighLevelClickInvariance({
				expectations: repeated.map((attempt) => ({
					caseId: attempt.caseId,
					input: attempt.canonicalInput as never,
					idealOutput: attempt.canonicalIdealOutput as never,
				})),
				observations: repeated.map((attempt) => ({
					caseId: attempt.caseId,
					output: attempt.canonicalOutput,
				})),
			}).contractPass;
		});
		return {
			id,
			attemptCount: armAttempts.length,
			contractScore: armAttempts.filter(
				({ evaluation }) => evaluation.contractPass,
			).length,
			attemptContractScores,
			executionErrorCount: armAttempts.filter(
				({ providerError }) => providerError !== undefined,
			).length,
			unclassifiedMissCount: armAttempts.filter(
				(attempt) =>
					!attempt.evaluation.contractPass &&
					attempt.providerError === undefined &&
					attempt.missClassification === null,
			).length,
			safetyGatePass: armAttempts.every(
				({ evaluation }) =>
					evaluation.validMembershipPass &&
					evaluation.nonResolvableMembershipPass &&
					evaluation.orderPass &&
					evaluation.uniquenessPass &&
					evaluation.clickInclusionPass,
			),
			clickGatePass,
			sliceRatios,
		};
	});
}

export async function finalizeEvidence(
	resultsPath: string,
	classificationsPath: string,
): Promise<RetainedRun> {
	const retained = retainedRunSchema.parse(
		JSON.parse(await readFile(resultsPath, "utf8")),
	);
	assertCurrentBinding(retained);
	assertResolvedModelBinding(retained);
	if (retained.finalizedAt !== null) {
		throw new Error("Retained evidence is already finalized.");
	}
	if (retained.actualCallCount !== EXACT_CALL_CAP) {
		throw new Error(
			`Only the exact ${EXACT_CALL_CAP}-call schedule can be finalized.`,
		);
	}
	assertAttemptSchedule(retained.attempts);
	if (
		retained.attempts.some(
			({ providerError }) => providerError !== undefined,
		)
	) {
		throw new Error("Provider errors require a fresh bounded run.");
	}
	const classifications = z
		.record(
			z.string(),
			z.strictObject({
				classification: z.enum(CLASSIFICATIONS),
				explanation: z.string().trim().min(1),
			}),
		)
		.parse(JSON.parse(await readFile(classificationsPath, "utf8")));
	const priceSchedule = currentPreflightForRetained(retained).priceSchedule;
	const attempts = retained.attempts.map((attempt) => {
		const scheduledCase = scheduledCaseForAttempt(attempt);
		const recomputed = recomputeAttempt(
			attempt,
			scheduledCase,
			priceSchedule,
		);
		if (recomputed.evaluation.contractPass) {
			if (classifications[attempt.key] !== undefined) {
				throw new Error(
					`Passing attempt ${attempt.key} cannot be classified.`,
				);
			}
			return {
				...recomputed,
				missClassification: null,
				missClassificationExplanation: null,
			};
		}
		const classification = classifications[attempt.key];
		if (classification === undefined) {
			throw new Error(`Missing classification for ${attempt.key}.`);
		}
		return {
			...recomputed,
			missClassification: classification.classification,
			missClassificationExplanation: classification.explanation,
		};
	});
	const knownMisses = new Set(
		attempts
			.filter(({ evaluation }) => !evaluation.contractPass)
			.map(({ key }) => key),
	);
	for (const key of Object.keys(classifications)) {
		if (!knownMisses.has(key))
			throw new Error(`Unknown classification ${key}.`);
	}
	const arms = summarizeArms(attempts);
	const finalized = retainedRunSchema.parse({
		...retained,
		completedAt: retained.completedAt,
		finalizedAt: new Date().toISOString(),
		arms,
		totalBilledCostUpperBoundUsd: totalCost(attempts),
		verdict: decidePrototypeWinner(arms),
		attempts,
	});
	await writeJsonAtomically(resultsPath, finalized);
	return finalized;
}

function recomputeAttempt(
	attempt: RetainedAttempt,
	scheduledCase: ReturnType<typeof prepareRepresentationCases>[number],
	priceSchedule: PrototypePriceSchedule,
): RetainedAttempt {
	if (
		attempt.rawOutputText === undefined ||
		attempt.privateOutputJson === undefined ||
		attempt.rawResponseJson === undefined ||
		attempt.requestUtf8Bytes === undefined ||
		attempt.responseUtf8Bytes === undefined
	) {
		throw new Error(
			`Attempt ${attempt.key} lacks complete raw model evidence.`,
		);
	}
	const rawResponse = providerResponseSchema.parse(attempt.rawResponseJson);
	if (
		attempt.responseUtf8Bytes !== jsonUtf8Bytes(attempt.rawResponseJson) ||
		extractResponseOutputText(rawResponse) !== attempt.rawOutputText ||
		rawResponse.id !== attempt.responseId ||
		rawResponse.model !== attempt.resolvedModel ||
		stableJson(rawResponse.usage) !== stableJson(attempt.rawUsage)
	) {
		throw new Error(
			`Attempt ${attempt.key} raw Responses JSON or response byte count was tampered with.`,
		);
	}
	const expectedRequest = responseRequestFor({
		armId: attempt.armId,
		systemPrompt: systemPromptForRepresentation(attempt.armId),
		privateInput: scheduledCase.privateInput,
		promptCacheKey: promptCacheKeyForScheduleKey(attempt.key),
	});
	if (attempt.requestUtf8Bytes !== jsonUtf8Bytes(expectedRequest)) {
		throw new Error(
			`Attempt ${attempt.key} request byte count does not match the scheduled request.`,
		);
	}
	const reparsedPrivateOutput = JSON.parse(attempt.rawOutputText);
	if (
		stableJson(reparsedPrivateOutput) !==
		stableJson(attempt.privateOutputJson)
	) {
		throw new Error(
			`Attempt ${attempt.key} raw output does not match retained JSON.`,
		);
	}
	if (attempt.rawUsage === undefined || attempt.usage === undefined) {
		throw new Error(
			`Attempt ${attempt.key} lacks retained usage evidence.`,
		);
	}
	const recomputedUsage = normalizeUsage(attempt.rawUsage, priceSchedule);
	if (stableJson(recomputedUsage) !== stableJson(attempt.usage)) {
		throw new Error(
			`Attempt ${attempt.key} usage or cost was tampered with.`,
		);
	}
	let canonicalOutput: unknown;
	let modelOutputError: ReturnType<typeof describeError> | undefined;
	try {
		if (attempt.privateOutputJson === undefined) {
			throw new Error("Retained attempt has no private JSON output.");
		}
		canonicalOutput = parseAndCanonicalizeRepresentation({
			id: attempt.armId,
			canonicalInput: scheduledCase.canonicalInput,
			privateInput: scheduledCase.privateInput,
			output: reparsedPrivateOutput,
		});
	} catch (cause) {
		modelOutputError = describeError(cause);
	}
	return attemptSchema.parse({
		...attempt,
		canonicalInput: scheduledCase.canonicalInput,
		canonicalIdealOutput: scheduledCase.canonicalIdealOutput,
		privateInput: scheduledCase.privateInput,
		privateIdealOutput: scheduledCase.privateIdealOutput,
		canonicalOutput,
		modelOutputError,
		usage: recomputedUsage,
		evaluation:
			canonicalOutput === undefined
				? failedEvaluation()
				: evaluateGermanHighLevelTargetClassification({
						caseId: attempt.caseId,
						input: scheduledCase.canonicalInput,
						idealOutput: scheduledCase.canonicalIdealOutput,
						output: canonicalOutput,
					}),
	});
}

function scheduledCaseForAttempt(
	attempt: RetainedAttempt,
): ReturnType<typeof prepareRepresentationCases>[number] {
	const scheduledCase = prepareRepresentationCases(attempt.armId).find(
		(testCase) => testCase.caseId === attempt.caseId,
	);
	if (scheduledCase === undefined) {
		throw new Error(`Attempt ${attempt.key} has no scheduled case.`);
	}
	for (const [field, actual, expected] of [
		[
			"canonicalInput",
			attempt.canonicalInput,
			scheduledCase.canonicalInput,
		],
		[
			"canonicalIdealOutput",
			attempt.canonicalIdealOutput,
			scheduledCase.canonicalIdealOutput,
		],
		["privateInput", attempt.privateInput, scheduledCase.privateInput],
		[
			"privateIdealOutput",
			attempt.privateIdealOutput,
			scheduledCase.privateIdealOutput,
		],
	] as const) {
		const actualBytes = Buffer.from(stableJson(actual), "utf8");
		const expectedBytes = Buffer.from(stableJson(expected), "utf8");
		if (!actualBytes.equals(expectedBytes)) {
			throw new Error(
				`Attempt ${attempt.key} ${field} does not byte-match its scheduled case.`,
			);
		}
	}
	return scheduledCase;
}

export function assertAttemptSchedule(
	attempts: readonly Pick<
		RetainedAttempt,
		"key" | "armId" | "attemptNumber" | "caseId"
	>[],
	pool: RunnerPoolId = "development",
): void {
	const expected = new Set<string>();
	for (const armId of REPRESENTATION_IDS) {
		for (
			let attemptNumber = 1;
			attemptNumber <= ATTEMPTS_PER_ARM;
			attemptNumber += 1
		) {
			for (const testCase of prepareRepresentationCases(armId, pool)) {
				expected.add(`${armId}/${attemptNumber}/${testCase.caseId}`);
			}
		}
	}
	if (
		attempts.length !==
			preparePrototypePreflight({ batching: false, pool }).exactCallCap ||
		new Set(attempts.map(({ key }) => key)).size !== attempts.length
	) {
		throw new Error(
			"Retained attempts do not satisfy the exact unique call schedule.",
		);
	}
	for (const attempt of attempts) {
		if (
			attempt.key !==
				`${attempt.armId}/${attempt.attemptNumber}/${attempt.caseId}` ||
			!expected.delete(attempt.key)
		) {
			throw new Error(`Unexpected retained attempt ${attempt.key}.`);
		}
	}
	if (expected.size !== 0)
		throw new Error("Retained attempt schedule is incomplete.");
}

export function promptCacheKeyForScheduleKey(
	scheduleKey: string,
	pool: RunnerPoolId = "development",
): string {
	if (!scheduleCacheKeysByPool.has(pool)) {
		const computed = new Map<string, string>();
		for (const armId of REPRESENTATION_IDS) {
			for (
				let attemptNumber = 1;
				attemptNumber <= ATTEMPTS_PER_ARM;
				attemptNumber += 1
			) {
				const cases = prepareRepresentationCases(armId, pool);
				for (const [caseIndex, testCase] of cases.entries()) {
					const armSequenceIndex =
						(attemptNumber - 1) * cases.length + caseIndex;
					const shard = Math.floor(
						armSequenceIndex /
							BATCH_CACHE_POLICY.maximumScheduledRequestsPerCacheKey,
					);
					computed.set(
						`${armId}/${attemptNumber}/${testCase.caseId}`,
						`tc85:${armId}:s${String(shard).padStart(2, "0")}`,
					);
				}
			}
		}
		scheduleCacheKeysByPool.set(pool, computed);
	}
	const promptCacheKey = scheduleCacheKeysByPool.get(pool)?.get(scheduleKey);
	if (promptCacheKey !== undefined) return promptCacheKey;
	throw new Error(`Unknown prototype schedule key ${scheduleKey}.`);
}

export function assertCurrentBinding(retained: RetainedRun): void {
	const current = currentPreflightForRetained(retained);
	if (
		retained.bindingSha256 !== bindingSha256(current) ||
		stableJson(retained.preflight) !== stableJson(current)
	) {
		throw new Error(
			"Retained evidence is not bound to current source policy.",
		);
	}
}

function currentPreflightForRetained(
	retained: RetainedRun,
): ReturnType<typeof preparePrototypePreflight> {
	const bound = z
		.object({ runnerParameters: runnerParametersSchema })
		.parse(retained.preflight);
	return preparePrototypePreflight(bound.runnerParameters);
}

function resolvedModelForRun(
	attempts: readonly RetainedAttempt[],
): string | null {
	const resolvedModels = new Set(
		attempts.flatMap(({ resolvedModel }) =>
			resolvedModel === undefined ? [] : [resolvedModel],
		),
	);
	for (const resolvedModel of resolvedModels) {
		if (resolvedModel !== EXPECTED_RESOLVED_MODEL) {
			throw new Error(
				`Every response.model must equal the expected resolved model ${EXPECTED_RESOLVED_MODEL}; resolved-model drift or mismatch produced ${resolvedModel}.`,
			);
		}
	}
	if (resolvedModels.size > 1) {
		throw new Error(
			`resolved-model drift detected: ${[...resolvedModels].join(", ")}.`,
		);
	}
	return resolvedModels.values().next().value ?? null;
}

function assertResolvedModelBinding(retained: RetainedRun): void {
	const observed = resolvedModelForRun(retained.attempts);
	if (observed !== retained.resolvedModel) {
		throw new Error(
			"Retained resolved-model binding does not match attempt evidence.",
		);
	}
}

function assertPreflightCallPolicy(
	preflight: ReturnType<typeof preparePrototypePreflight>,
): void {
	if (
		preflight.exactCallCap > EXACT_CALL_CAP ||
		preflight.maximumEstimatedCostUsd > MAXIMUM_SPEND_USD ||
		preflight.evaluationCaseIds.length *
			preflight.attemptsPerArm *
			preflight.arms.length !==
			preflight.exactCallCap
	) {
		throw new Error(
			"Prototype preflight does not satisfy the exact safety cap.",
		);
	}
}

function normalizeUsage(
	usage: unknown,
	priceSchedule: PrototypePriceSchedule,
): z.output<typeof usageSchema> {
	const value = z
		.object({
			input_tokens: z.number().int().nonnegative(),
			output_tokens: z.number().int().nonnegative(),
			total_tokens: z.number().int().nonnegative(),
			input_tokens_details: z
				.object({
					cached_tokens: z.number().int().nonnegative().optional(),
					cache_write_tokens: z
						.number()
						.int()
						.nonnegative()
						.optional(),
				})
				.optional(),
		})
		.parse(usage);
	const cachedInputTokens = value.input_tokens_details?.cached_tokens ?? 0;
	const cacheWriteInputTokens =
		value.input_tokens_details?.cache_write_tokens ??
		Math.max(0, value.input_tokens - cachedInputTokens);
	if (cachedInputTokens + cacheWriteInputTokens > value.input_tokens) {
		throw new Error(
			"Cached and cache-write input tokens exceed total input tokens.",
		);
	}
	const longContext =
		value.input_tokens > priceSchedule.longContextThresholdTokens;
	const price = longContext
		? priceSchedule.longContext
		: priceSchedule.shortContext;
	const uncachedInputTokens = Math.max(
		0,
		value.input_tokens - cachedInputTokens - cacheWriteInputTokens,
	);
	return {
		inputTokens: value.input_tokens,
		cachedInputTokens,
		cacheWriteInputTokens,
		outputTokens: value.output_tokens,
		totalTokens: value.total_tokens,
		longContext,
		billedCostUpperBoundUsd:
			(uncachedInputTokens / 1_000_000) * price.inputUsdPerMillion +
			(cachedInputTokens / 1_000_000) * price.cachedInputUsdPerMillion +
			(cacheWriteInputTokens / 1_000_000) *
				price.cacheWriteUsdPerMillion +
			(value.output_tokens / 1_000_000) * price.outputUsdPerMillion,
	};
}

function extractResponseOutputText(
	response: z.output<typeof providerResponseSchema>,
): string {
	if (response.output_text !== undefined) return response.output_text;
	const parts: string[] = [];
	for (const item of response.output ?? []) {
		const message = z
			.object({
				type: z.literal("message"),
				content: z.array(
					z
						.object({
							type: z.string(),
							text: z.string().optional(),
						})
						.passthrough(),
				),
			})
			.passthrough()
			.safeParse(item);
		if (!message.success) continue;
		for (const content of message.data.content) {
			if (content.type === "output_text" && content.text !== undefined) {
				parts.push(content.text);
			}
		}
	}
	if (parts.length === 0) {
		throw new Error("Provider returned no output text.");
	}
	return parts.join("");
}

function totalCost(attempts: readonly RetainedAttempt[]): number {
	return attempts.reduce(
		(total, attempt) =>
			total + (attempt.usage?.billedCostUpperBoundUsd ?? 0),
		0,
	);
}

function jsonUtf8Bytes(value: unknown): number {
	return Buffer.byteLength(stableJson(value), "utf8");
}

function failedEvaluation(): Evaluation {
	return {
		contractPass: false,
		canonicalShapePass: false,
		decisionPass: false,
		routePass: false,
		exactMembershipPass: false,
		falseGroupingPass: false,
		falseSplittingPass: false,
		validMembershipPass: false,
		nonResolvableMembershipPass: false,
		orderPass: false,
		uniquenessPass: false,
		clickInclusionPass: false,
		correctUnresolvedPass: false,
	};
}

const TRANSIENT_TRANSPORT_ERROR_CODES = new Set([
	"ECONNABORTED",
	"ECONNREFUSED",
	"ECONNRESET",
	"EHOSTUNREACH",
	"ENETDOWN",
	"ENETUNREACH",
	"ENOTFOUND",
	"EPIPE",
	"ETIMEDOUT",
	"EAI_AGAIN",
]);

export function shouldRetryDirectProviderError(
	error: Readonly<{
		name: string;
		message: string;
		status?: number;
		code?: string;
	}>,
	completedRetryCount: number,
): boolean {
	if (
		!Number.isInteger(completedRetryCount) ||
		completedRetryCount < 0 ||
		completedRetryCount >= DIRECT_TRANSIENT_RETRY_LIMIT
	) {
		return false;
	}
	if (
		error.status === 429 ||
		(error.status !== undefined &&
			error.status >= 500 &&
			error.status <= 599)
	) {
		return true;
	}
	if (
		error.code !== undefined &&
		(TRANSIENT_TRANSPORT_ERROR_CODES.has(error.code) ||
			error.code.startsWith("UND_ERR_"))
	) {
		return true;
	}
	if (
		error.name === "APIConnectionError" ||
		error.name === "APIConnectionTimeoutError"
	) {
		return true;
	}
	return /\b(?:ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network connection|socket hang up)\b/iu.test(
		error.message,
	);
}

function describeError(cause: unknown) {
	const candidate = cause as {
		name?: unknown;
		message?: unknown;
		status?: unknown;
		code?: unknown;
	};
	return {
		name: typeof candidate.name === "string" ? candidate.name : "Error",
		message:
			typeof candidate.message === "string"
				? candidate.message
				: String(cause),
		...(typeof candidate.status === "number"
			? { status: candidate.status }
			: {}),
		...(typeof candidate.code === "string" ? { code: candidate.code } : {}),
	};
}

function bindingSha256(value: unknown): string {
	return createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

function sha256Text(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

async function writeJsonAtomically(destination: string, value: unknown) {
	await writeTextAtomically(
		destination,
		`${JSON.stringify(value, null, 2)}\n`,
	);
}

async function writeTextAtomically(destination: string, value: string) {
	const temporary = join(
		dirname(destination),
		`.${basename(destination)}.${process.pid}.${randomUUID()}.tmp`,
	);
	try {
		await writeFile(temporary, value, "utf8");
		await rename(temporary, destination);
	} catch (cause) {
		await rm(temporary, { force: true });
		throw cause;
	}
}

async function runCli(): Promise<void> {
	const mode = process.argv[2];
	if (mode === "preflight") {
		printPreflight({
			batching: parseBatchingFlag(process.argv[3]),
			pool: parsePoolFlag(process.argv[4]),
		});
	} else if (mode === "run") {
		const batching = parseBatchingFlag(process.argv[3]);
		assertBatchingForMode(mode, batching);
		await runLivePrototype({
			batching: false,
			pool: parsePoolFlag(process.argv[4]),
			runDirectory: process.argv[5],
		});
	} else if (mode === "batch-submit") {
		const batching = parseBatchingFlag(process.argv[3]);
		assertBatchingForMode(mode, batching);
		const manifestPath = await submitPrototypeBatch({
			batching: true,
			pool: parsePoolFlag(process.argv[4]),
			runDirectory: process.argv[5],
		});
		console.log(`Submitted Batch; manifest: ${manifestPath}`);
	} else if (mode === "batch-resume") {
		const batching = parseBatchingFlag(process.argv[3]);
		assertBatchingForMode(mode, batching);
		const manifestPath = process.argv[4];
		if (manifestPath === undefined) {
			throw new Error(
				"Usage: run.ts batch-resume --batching=true <batch-manifest.json>",
			);
		}
		const resumed = await resumePrototypeBatch({
			batching: true,
			manifestPath,
		});
		console.log(
			resumed.run === null
				? `Batch status: ${resumed.status}`
				: `Collected ${resumed.run.actualCallCount} Batch responses.`,
		);
	} else if (mode === "diagnostic-follow-up") {
		const batching = parseBatchingFlag(process.argv[3]);
		assertBatchingForMode(mode, batching);
		const resultsPath = process.argv[4];
		if (resultsPath === undefined) {
			throw new Error(
				"Usage: run.ts diagnostic-follow-up --batching=false <diagnostic-results.json> [artifact-directory]",
			);
		}
		await runDiagnosticFollowUp({
			batching: false,
			resultsPath,
			artifactDirectory: process.argv[5],
		});
	} else if (mode === "finalize") {
		const resultsPath = process.argv[3];
		const classificationsPath = process.argv[4];
		if (resultsPath === undefined || classificationsPath === undefined) {
			throw new Error(
				"Usage: run.ts finalize <results.json> <miss-classifications.json>",
			);
		}
		await finalizeEvidence(resultsPath, classificationsPath);
	} else {
		throw new Error(
			"Usage: run.ts <preflight|run|batch-submit> --batching=<true|false> --pool=<development|diagnostic> [run-directory], diagnostic-follow-up --batching=false <diagnostic-results.json> [artifact-directory], or batch-resume/finalize with their artifact paths.",
		);
	}
}

if (import.meta.main) await runCli();
