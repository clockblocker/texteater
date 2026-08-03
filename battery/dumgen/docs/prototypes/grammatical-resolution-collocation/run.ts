// PROTOTYPE ONLY — bounded live evaluation of the German Phraseme/Collocation route.

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
	DUMGEN_REASONING_EFFORT as REASONING_EFFORT,
	DUMGEN_GENERATION_MODEL as RUN_MODEL,
} from "../../../src/ai-sdk/model-policy";
import { stableJson } from "../../../src/lib/stable-json";
import { assembleSystemPrompt } from "../../../src/promptsmith/assembly";
import { collocationGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const RUNNER_VERSION = "grammatical-resolution-collocation-v3";
const RUN_ROUTE = "grammatical-resolution/de/phraseme/collocation";
const RUN_MAX_OUTPUT_TOKENS = 32768;
const MINIMUM_EVALUATION_CASES = 15;
const MAXIMUM_EVALUATION_CASES = 20;
const MINIMUM_SCORE_RATIO = 0.8;
const TEXT_VERBOSITY = "low";
export const DIRECT_EVIDENCE_TRANSPORT = "openai-responses-direct-v1";
export const BATCH_EVIDENCE_TRANSPORT = "openai-batch-v1";
export type EvidenceTransport =
	| typeof DIRECT_EVIDENCE_TRANSPORT
	| typeof BATCH_EVIDENCE_TRANSPORT;
const MISS_CLASSIFICATIONS = [
	"prompt-defect",
	"corpus-or-evaluator-defect",
	"accepted-model-limitation",
] as const;

type Evaluation = ReturnType<
	typeof collocationGrammaticalResolutionExperiment.evaluator
>;
const promptSource = collocationGrammaticalResolutionExperiment.promptSource;
const currentSystemPrompt = assembleSystemPrompt(promptSource);

const isoTimestampSchema = z.iso.datetime({ offset: true });
const nonEmptyIdSchema = z.string().trim().min(1);
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
const batchProvenanceSchema = z
	.strictObject({
		batchId: nonEmptyIdSchema,
		inputFileId: nonEmptyIdSchema,
		outputFileId: nonEmptyIdSchema.nullable(),
		errorFileId: nonEmptyIdSchema.nullable(),
		submissionManifestSha256: sha256Schema,
		inputJsonlSha256: sha256Schema,
		outputJsonlSha256: sha256Schema.nullable(),
		errorJsonlSha256: sha256Schema.nullable(),
		endpoint: z.literal("/v1/responses"),
		completionWindow: z.literal("24h"),
		createdAt: isoTimestampSchema,
		completedAt: isoTimestampSchema,
		requestCounts: z.strictObject({
			total: z.number().int().finite().nonnegative(),
			completed: z.number().int().finite().nonnegative(),
			failed: z.number().int().finite().nonnegative(),
		}),
	})
	.superRefine((provenance, context) => {
		if (
			Date.parse(provenance.completedAt) <
			Date.parse(provenance.createdAt)
		) {
			context.addIssue({
				code: "custom",
				path: ["completedAt"],
				message: "Batch completion cannot precede batch creation.",
			});
		}
		for (const [idField, hashField] of [
			["outputFileId", "outputJsonlSha256"],
			["errorFileId", "errorJsonlSha256"],
		] as const) {
			if (
				(provenance[idField] === null) !==
				(provenance[hashField] === null)
			) {
				context.addIssue({
					code: "custom",
					path: [hashField],
					message: `${idField} and ${hashField} must both be present or both be null.`,
				});
			}
		}
		if (
			provenance.outputFileId === null &&
			provenance.errorFileId === null
		) {
			context.addIssue({
				code: "custom",
				path: ["outputFileId"],
				message:
					"Completed Batch provenance must retain an output or error file.",
			});
		}
		if (
			provenance.requestCounts.completed +
				provenance.requestCounts.failed !==
			provenance.requestCounts.total
		) {
			context.addIssue({
				code: "custom",
				path: ["requestCounts"],
				message: "Batch request counts must add up to the total.",
			});
		}
	});
const missClassificationSchema = z.enum(MISS_CLASSIFICATIONS);
const retainedErrorSchema = z.strictObject({
	name: z.string().min(1),
	message: z.string(),
	status: z.number().int().finite().optional(),
	code: z.string().min(1).optional(),
});
const diagnosticShape = {
	contractPass: z.boolean(),
	decisionPass: z.boolean(),
	decisionResolutionCoherencePass: z.boolean(),
	memberCountPass: z.boolean(),
	memberOrthographiesPass: z.boolean(),
	surfaceKindPass: z.boolean(),
	normalizedSurfacePass: z.boolean(),
	spellingPass: z.boolean(),
	realizationCoveragePass: z.boolean(),
	surfaceFeaturesPass: z.boolean(),
	inflectionalFeaturesPass: z.boolean(),
	canonicalFormPass: z.boolean(),
	coreFeaturesPass: z.boolean(),
} satisfies { readonly [Key in keyof Evaluation]: z.ZodBoolean };

const retainedAttemptSchema = z
	.strictObject({
		caseId: nonEmptyIdSchema,
		input: promptSource.inputSchema,
		idealOutput: promptSource.outputSchema,
		output: promptSource.outputSchema.optional(),
		...diagnosticShape,
		latencyMs: z.number().int().finite().nonnegative().nullable(),
		rawOutputText: z.string().optional(),
		resolvedModel: z.string().min(1).optional(),
		responseId: z.string().min(1).optional(),
		usage: z.unknown().optional(),
		error: retainedErrorSchema.optional(),
		missClassification: missClassificationSchema.nullable(),
		missClassificationExplanation: z.string().trim().min(1).nullable(),
	})
	.superRefine((attempt, context) => {
		const hasError = attempt.error !== undefined;
		const responseMetadataFieldCount = [
			attempt.rawOutputText,
			attempt.resolvedModel,
			attempt.responseId,
			attempt.usage,
		].filter((value) => value !== undefined).length;
		const hasCompleteResponseMetadata = responseMetadataFieldCount === 4;
		if (responseMetadataFieldCount !== 0 && !hasCompleteResponseMetadata) {
			context.addIssue({
				code: "custom",
				message:
					"Provider response metadata must be retained completely or omitted completely.",
			});
		}
		const hasSuccessfulResponse =
			attempt.output !== undefined &&
			hasCompleteResponseMetadata &&
			attempt.resolvedModel !== undefined &&
			attempt.responseId !== undefined &&
			attempt.usage !== undefined;
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
	});

const retainedRunSchema = z
	.strictObject({
		runnerVersion: z.literal(RUNNER_VERSION),
		route: z.literal(RUN_ROUTE),
		transport: z.enum([
			DIRECT_EVIDENCE_TRANSPORT,
			BATCH_EVIDENCE_TRANSPORT,
		]),
		batchProvenance: batchProvenanceSchema.nullable(),
		startedAt: isoTimestampSchema,
		completedAt: isoTimestampSchema,
		finalizedAt: isoTimestampSchema.nullable(),
		model: z.literal(RUN_MODEL),
		maxOutputTokens: z.literal(RUN_MAX_OUTPUT_TOKENS),
		reasoningEffort: z.literal(REASONING_EFFORT),
		textVerbosity: z.literal(TEXT_VERBOSITY),
		promptSha256: sha256Schema,
		inputSchemaSha256: sha256Schema,
		outputSchemaSha256: sha256Schema,
		evaluationCaseIds: z
			.array(nonEmptyIdSchema)
			.min(1)
			.refine((ids) => new Set(ids).size === ids.length, {
				message: "Evaluation case IDs must be unique.",
			}),
		boundedCalls: z.number().int().finite().nonnegative(),
		maximumEvaluationCases: z.literal(MAXIMUM_EVALUATION_CASES),
		retries: z.literal(0),
		store: z.literal(false),
		contractScore: z.number().int().finite().nonnegative(),
		scoreRatio: z.number().finite().min(0).max(1),
		minimumEvaluationCases: z.literal(MINIMUM_EVALUATION_CASES),
		minimumScoreRatio: z.literal(MINIMUM_SCORE_RATIO),
		meetsMinimumEvaluationCases: z.boolean(),
		meetsMinimumScoreRatio: z.boolean(),
		executionErrorCount: z.number().int().finite().nonnegative(),
		unclassifiedMissCount: z.number().int().finite().nonnegative(),
		evidenceThresholdMet: z.boolean(),
		attempts: z.array(retainedAttemptSchema),
	})
	.superRefine((result, context) => {
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
		const isBatch = result.transport === BATCH_EVIDENCE_TRANSPORT;
		if (isBatch !== (result.batchProvenance !== null)) {
			context.addIssue({
				code: "custom",
				path: ["batchProvenance"],
				message:
					"Batch transport requires Batch provenance; direct transport requires null provenance.",
			});
		}
		if (
			result.attempts.some(({ latencyMs }) =>
				isBatch ? latencyMs !== null : latencyMs === null,
			)
		) {
			context.addIssue({
				code: "custom",
				path: ["attempts"],
				message:
					"Direct attempts require measured latency; Batch attempts require null latency.",
			});
		}
		if (
			result.batchProvenance !== null &&
			(result.startedAt !== result.batchProvenance.createdAt ||
				result.completedAt !== result.batchProvenance.completedAt)
		) {
			context.addIssue({
				code: "custom",
				path: ["batchProvenance"],
				message:
					"Batch result timestamps must equal the retained Batch timestamps.",
			});
		}
		const attemptedCaseIds = result.attempts.map(({ caseId }) => caseId);
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
	});

const missClassificationsSchema = z.record(
	nonEmptyIdSchema,
	z.strictObject({
		classification: missClassificationSchema,
		explanation: z.string().trim().min(1),
	}),
);

export type RetainedAttempt = z.output<typeof retainedAttemptSchema>;
export type RetainedRun = z.output<typeof retainedRunSchema>;
export type BatchProvenance = z.output<typeof batchProvenanceSchema>;

type PreparedTestCase = {
	readonly id: string;
	readonly input: z.output<typeof promptSource.inputSchema>;
	readonly idealOutput: z.output<typeof promptSource.outputSchema>;
};

if (import.meta.main) {
	const mode = process.argv[2];
	if (mode === undefined) {
		await runLiveEvaluation();
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
			`Unknown COLLOCATION Grammatical Resolution runner mode "${mode}".`,
		);
	}
}

async function runLiveEvaluation(): Promise<void> {
	const testCases = prepareCurrentTestCases();
	if (!process.env.OPENAI_API_KEY) {
		throw new Error(
			"OPENAI_API_KEY is unavailable. Run this prototype explicitly from battery/dumgen.",
		);
	}
	const startedAt = new Date().toISOString();
	const runId = startedAt.replaceAll(/[:.]/gu, "-");
	const client = new OpenAI();
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
			const response = await client.responses.create({
				model: RUN_MODEL,
				input: [
					{ role: "system", content: currentSystemPrompt },
					{ role: "user", content: stableJson(testCase.input) },
				],
				max_output_tokens: RUN_MAX_OUTPUT_TOKENS,
				reasoning: { effort: REASONING_EFFORT },
				store: false,
				text: {
					format: zodTextFormat(
						promptSource.outputSchema,
						"grammatical_resolution_collocation",
					),
					verbosity: TEXT_VERBOSITY,
				},
			});
			responseMetadata = {
				rawOutputText: response.output_text,
				resolvedModel: response.model,
				responseId: response.id,
				usage: response.usage ?? null,
			};
			if (!response.output_text) {
				throw new Error(
					`Provider returned no structured output text (status: ${response.status}; incomplete reason: ${response.incomplete_details?.reason ?? "none"}).`,
				);
			}
			const output = promptSource.outputSchema.parse(
				JSON.parse(response.output_text),
			);
			const evaluation =
				collocationGrammaticalResolutionExperiment.evaluator({
					caseId: testCase.id,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output,
				});
			attempts.push({
				caseId: testCase.id,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output,
				...evaluation,
				latencyMs: Math.round(performance.now() - started),
				...responseMetadata,
				missClassification: null,
				missClassificationExplanation: null,
			});
			console.log(
				`${evaluation.contractPass ? "PASS" : "FAIL"} ${index + 1}/${testCases.length} ${testCase.id}`,
			);
		} catch (cause) {
			attempts.push({
				caseId: testCase.id,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				...failedEvaluation(),
				latencyMs: Math.round(performance.now() - started),
				...responseMetadata,
				error: describeError(cause),
				missClassification: null,
				missClassificationExplanation: null,
			});
			console.log(
				`FAIL ${index + 1}/${testCases.length} ${testCase.id}: ${describeError(cause).message}`,
			);
		}
	}

	const result = retainedRunSchema.parse({
		...currentEvidenceBinding(),
		batchProvenance: null,
		startedAt,
		completedAt: new Date().toISOString(),
		finalizedAt: null,
		boundedCalls: testCases.length,
		...summarizeEvidence(attempts, false),
		attempts,
	});
	const destination = join(RUNS, runId, "results.json");
	await mkdir(dirname(destination), { recursive: true });
	await writeJsonAtomically(destination, result);
	console.log(
		`Contract score: ${result.contractScore}/${result.boundedCalls} (${formatRatio(result.scoreRatio)})`,
	);
	console.log("Evidence threshold: NOT MET (offline finalization required)");
	console.log(`Wrote ${relative(process.cwd(), destination)}`);
	process.exitCode = 1;
}

export function prepareCurrentTestCases(): readonly PreparedTestCase[] {
	const selected =
		collocationGrammaticalResolutionExperiment.evaluation.ids.map(
			(id, index) => ({
				id,
				goldenCase:
					collocationGrammaticalResolutionExperiment.evaluation.cases[
						index
					],
			}),
		);
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

export function assertEvaluationSuiteBounds(caseCount: number): void {
	if (!Number.isSafeInteger(caseCount)) {
		throw new TypeError("Evaluation case count must be a safe integer.");
	}
	if (caseCount < MINIMUM_EVALUATION_CASES) {
		throw new Error(
			`The COLLOCATION suite requires at least ${MINIMUM_EVALUATION_CASES} evaluation cases; found ${caseCount}.`,
		);
	}
	if (caseCount > MAXIMUM_EVALUATION_CASES) {
		throw new Error(
			`The COLLOCATION suite is capped at ${MAXIMUM_EVALUATION_CASES} evaluation cases; found ${caseCount}.`,
		);
	}
}

export function parseRetainedRun(value: unknown): RetainedRun {
	return retainedRunSchema.parse(value);
}

export function summarizeEvidence(
	attempts: readonly RetainedAttempt[],
	finalized: boolean,
) {
	const contractScore = attempts.filter(
		({ contractPass }) => contractPass,
	).length;
	const scoreRatio =
		attempts.length === 0 ? 0 : contractScore / attempts.length;
	const meetsMinimumEvaluationCases =
		attempts.length >= MINIMUM_EVALUATION_CASES;
	const meetsMinimumScoreRatio = scoreRatio >= MINIMUM_SCORE_RATIO;
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
		minimumEvaluationCases: MINIMUM_EVALUATION_CASES,
		minimumScoreRatio: MINIMUM_SCORE_RATIO,
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

export function currentEvidenceBinding(
	transport: EvidenceTransport = DIRECT_EVIDENCE_TRANSPORT,
) {
	return {
		runnerVersion: RUNNER_VERSION,
		route: RUN_ROUTE,
		transport,
		model: RUN_MODEL,
		maxOutputTokens: RUN_MAX_OUTPUT_TOKENS,
		reasoningEffort: REASONING_EFFORT,
		textVerbosity: TEXT_VERBOSITY,
		promptSha256: createHash("sha256")
			.update(currentSystemPrompt, "utf8")
			.digest("hex"),
		inputSchemaSha256: schemaSha256(promptSource.inputSchema),
		outputSchemaSha256: schemaSha256(promptSource.outputSchema),
		evaluationCaseIds: [
			...collocationGrammaticalResolutionExperiment.evaluation.ids,
		],
		maximumEvaluationCases: MAXIMUM_EVALUATION_CASES,
		retries: 0 as const,
		store: false as const,
	};
}

export function assertCurrentEvidenceBinding(
	result: RetainedRun,
	currentCases: readonly PreparedTestCase[] = prepareCurrentTestCases(),
): void {
	const binding = currentEvidenceBinding(result.transport);
	for (const field of [
		"runnerVersion",
		"route",
		"transport",
		"model",
		"maxOutputTokens",
		"reasoningEffort",
		"textVerbosity",
		"promptSha256",
		"inputSchemaSha256",
		"outputSchemaSha256",
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
		stableJson(result.evaluationCaseIds) !==
		stableJson(binding.evaluationCaseIds)
	) {
		throw new Error(
			"Retained run does not use the current exact evaluation case selection.",
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

export async function finalizeEvidence(
	resultsPath: string,
	classificationsPath: string,
): Promise<RetainedRun> {
	const retained = parseRetainedRun(
		JSON.parse(await readFile(resultsPath, "utf8")),
	);
	if (retained.finalizedAt !== null) {
		throw new Error("Retained evidence has already been finalized.");
	}
	assertCurrentEvidenceBinding(retained);
	const recomputedAttempts = retained.attempts.map(
		recomputeAttemptEvaluation,
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
		return {
			...attempt,
			missClassification: classified?.classification ?? null,
			missClassificationExplanation: classified?.explanation ?? null,
		};
	});
	const finalized = retainedRunSchema.parse({
		...retained,
		...currentEvidenceBinding(retained.transport),
		finalizedAt: new Date().toISOString(),
		...summarizeEvidence(attempts, true),
		attempts,
	});
	await writeJsonAtomically(resultsPath, finalized);
	if (!finalized.evidenceThresholdMet) process.exitCode = 1;
	return finalized;
}

function recomputeAttemptEvaluation(attempt: RetainedAttempt): RetainedAttempt {
	if (attempt.error !== undefined) {
		return {
			...attempt,
			...failedEvaluation(),
			missClassification: null,
			missClassificationExplanation: null,
		};
	}
	if (attempt.output === undefined) {
		throw new Error(
			`Retained successful attempt "${attempt.caseId}" has no output.`,
		);
	}
	if (attempt.rawOutputText === undefined) {
		throw new Error(
			`Retained successful attempt "${attempt.caseId}" has no raw output text.`,
		);
	}
	let rawOutput: z.output<typeof promptSource.outputSchema>;
	try {
		rawOutput = promptSource.outputSchema.parse(
			JSON.parse(attempt.rawOutputText),
		);
	} catch {
		throw new Error(
			`Retained successful attempt "${attempt.caseId}" has raw output text that does not parse with the current output schema.`,
		);
	}
	const retainedOutput = promptSource.outputSchema.parse(attempt.output);
	if (stableJson(rawOutput) !== stableJson(retainedOutput)) {
		throw new Error(
			`Retained successful attempt "${attempt.caseId}" raw output does not exactly match its retained parsed output.`,
		);
	}
	const evaluation = collocationGrammaticalResolutionExperiment.evaluator({
		caseId: attempt.caseId,
		input: promptSource.inputSchema.parse(attempt.input),
		idealOutput: promptSource.outputSchema.parse(attempt.idealOutput),
		output: rawOutput,
	});
	return { ...attempt, ...evaluation };
}

function failedEvaluation(): Evaluation {
	return {
		contractPass: false,
		decisionPass: false,
		decisionResolutionCoherencePass: false,
		memberCountPass: false,
		memberOrthographiesPass: false,
		surfaceKindPass: false,
		normalizedSurfacePass: false,
		spellingPass: false,
		realizationCoveragePass: false,
		surfaceFeaturesPass: false,
		inflectionalFeaturesPass: false,
		canonicalFormPass: false,
		coreFeaturesPass: false,
	};
}

function schemaSha256(schema: z.ZodType): string {
	return createHash("sha256")
		.update(stableJson(z.toJSONSchema(schema)), "utf8")
		.digest("hex");
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

function formatRatio(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}
