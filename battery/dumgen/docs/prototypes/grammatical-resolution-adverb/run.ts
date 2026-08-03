// PROTOTYPE ONLY — bounded live evaluation of the German Lexeme/ADV route.

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { PROMPT_CATALOG } from "../../../src/catalog/prompt-catalog";
import { stableJson } from "../../../src/lib/stable-json";
import { assembleSystemPrompt } from "../../../src/promptsmith/assembly";
import { adverbGrammaticalResolutionExperiment } from "../../../src/promptsmith/laboratory/experiments/grammatical-resolution-adverb/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const RUNNER_VERSION = "grammatical-resolution-adverb-v9";
const RUN_MODEL = "gpt-5-nano";
// ADV has three nullable Core Features plus a Citation/Inflection union. Keep a
// route-local budget large enough that provider truncation is not evidence.
const RUN_MAX_OUTPUT_TOKENS = 4096;
const MAX_TEST_CASES = 15;
const MINIMUM_EVALUATION_CASES = 15;
const MINIMUM_SCORE_RATIO = 0.8;
const REASONING_EFFORT = "low";
const TEXT_VERBOSITY = "low";
const MISS_CLASSIFICATIONS = [
	"prompt-defect",
	"corpus-or-evaluator-defect",
	"accepted-model-limitation",
] as const;

type Evaluation = ReturnType<
	typeof adverbGrammaticalResolutionExperiment.evaluator
>;
const catalogPrompt =
	PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.ADV.prompt;
const promptSource = adverbGrammaticalResolutionExperiment.promptSource;
const currentSystemPrompt = assembleSystemPrompt(promptSource);

const nonEmptyIdSchema = z.string().trim().min(1);
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
		latencyMs: z.number().int().finite().nonnegative(),
		resolvedModel: z.string().min(1).optional(),
		responseId: z.string().min(1).optional(),
		usage: z.unknown().optional(),
		error: retainedErrorSchema.optional(),
		missClassification: missClassificationSchema.nullable(),
		missClassificationExplanation: z.string().trim().min(1).nullable(),
	})
	.superRefine((attempt, context) => {
		const hasError = attempt.error !== undefined;
		const hasSuccessfulResponse =
			attempt.output !== undefined &&
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
		startedAt: z.iso.datetime({ offset: true }),
		completedAt: z.iso.datetime({ offset: true }),
		finalizedAt: z.iso.datetime({ offset: true }).nullable(),
		model: z.literal(RUN_MODEL),
		catalogMaxOutputTokens: z.number().int().finite().positive(),
		runMaxOutputTokens: z.number().int().finite().positive(),
		reasoningEffort: z.literal(REASONING_EFFORT),
		textVerbosity: z.literal(TEXT_VERBOSITY),
		promptSha256: z.string().regex(/^[0-9a-f]{64}$/u),
		inputSchemaSha256: z.string().regex(/^[0-9a-f]{64}$/u),
		outputSchemaSha256: z.string().regex(/^[0-9a-f]{64}$/u),
		evaluationCaseIds: z
			.array(nonEmptyIdSchema)
			.min(1)
			.refine((ids) => new Set(ids).size === ids.length, {
				message: "Evaluation case IDs must be unique.",
			}),
		boundedCalls: z.number().int().finite().nonnegative(),
		maximumEvaluationCases: z.number().int().finite().positive(),
		retries: z.literal(0),
		store: z.literal(false),
		contractScore: z.number().int().finite().nonnegative(),
		scoreRatio: z.number().finite().min(0).max(1),
		minimumEvaluationCases: z.number().int().finite().positive(),
		minimumScoreRatio: z.number().finite().min(0).max(1),
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
			`Unknown ADV Grammatical Resolution runner mode "${mode}".`,
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
						"grammatical_resolution_adverb",
					),
					verbosity: TEXT_VERBOSITY,
				},
			});
			if (!response.output_text) {
				throw new Error(
					`Provider returned no structured output text (status: ${response.status}; incomplete reason: ${response.incomplete_details?.reason ?? "none"}).`,
				);
			}
			const output = promptSource.outputSchema.parse(
				JSON.parse(response.output_text),
			);
			const evaluation = adverbGrammaticalResolutionExperiment.evaluator({
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
				resolvedModel: response.model,
				responseId: response.id,
				usage: response.usage,
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
	const selected = adverbGrammaticalResolutionExperiment.evaluation.ids.map(
		(id, index) => ({
			id,
			goldenCase:
				adverbGrammaticalResolutionExperiment.evaluation.cases[index],
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
			`The ADV suite requires at least ${MINIMUM_EVALUATION_CASES} evaluation cases; found ${caseCount}.`,
		);
	}
	if (caseCount > MAX_TEST_CASES) {
		throw new Error(
			`The ADV suite is capped at ${MAX_TEST_CASES} evaluation cases; found ${caseCount}.`,
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

export function currentEvidenceBinding() {
	return {
		runnerVersion: RUNNER_VERSION,
		model: RUN_MODEL,
		catalogMaxOutputTokens: catalogPrompt.generationParams.maxOutputTokens,
		runMaxOutputTokens: RUN_MAX_OUTPUT_TOKENS,
		reasoningEffort: REASONING_EFFORT,
		textVerbosity: TEXT_VERBOSITY,
		promptSha256: createHash("sha256")
			.update(currentSystemPrompt, "utf8")
			.digest("hex"),
		inputSchemaSha256: schemaSha256(promptSource.inputSchema),
		outputSchemaSha256: schemaSha256(promptSource.outputSchema),
		evaluationCaseIds: [
			...adverbGrammaticalResolutionExperiment.evaluation.ids,
		],
		maximumEvaluationCases: MAX_TEST_CASES,
		retries: 0 as const,
		store: false as const,
	};
}

export function assertCurrentEvidenceBinding(
	result: RetainedRun,
	currentCases: readonly PreparedTestCase[] = prepareCurrentTestCases(),
): void {
	const binding = currentEvidenceBinding();
	for (const field of [
		"runnerVersion",
		"model",
		"catalogMaxOutputTokens",
		"runMaxOutputTokens",
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
		...currentEvidenceBinding(),
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
	const evaluation = adverbGrammaticalResolutionExperiment.evaluator({
		caseId: attempt.caseId,
		input: promptSource.inputSchema.parse(attempt.input),
		idealOutput: promptSource.outputSchema.parse(attempt.idealOutput),
		output: promptSource.outputSchema.parse(attempt.output),
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
