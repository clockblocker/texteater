// PROTOTYPE ONLY — bounded live evaluation of the current Reading Resolution prompt.
//
// Question: does the current German Reading Resolution prompt apply the
// no-splitting-semantic-pennies policy on the pinned evaluation suite?

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
	DUMGEN_GENERATION_MODEL as MODEL,
	DUMGEN_REASONING_EFFORT as REASONING_EFFORT,
} from "../../../src/ai-sdk/model-policy";
import { PROMPT_CATALOG } from "../../../src/catalog/prompt-catalog";
import type { Prompt } from "../../../src/catalog/prompt-definition";
import { stableJson } from "../../../src/lib/stable-json";
import { assembleSystemPrompt } from "../../../src/promptsmith/assembly";
import { readingResolutionGauntlet } from "../../../src/promptsmith/laboratory/experiments/reading-resolution-gauntlet/evaluation-suite";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const RUNNER_VERSION = "reading-resolution-gauntlet-v2";
const RUN_MAX_OUTPUT_TOKENS = 1024;
const MAX_TEST_CASES = 25;
const MINIMUM_EVALUATION_CASES = 15;
const MINIMUM_SCORE_RATIO = 0.8;
const TEXT_VERBOSITY = "low";
const MISS_CLASSIFICATIONS = [
	"prompt defect",
	"corpus/evaluator defect",
	"accepted model limitation",
] as const;

const prompt = PROMPT_CATALOG.laboratory.readingResolution.de.prompt;
const promptContract: Prompt<
	typeof prompt.inputSchema,
	typeof prompt.outputSchema
> = prompt;
const modelInputSchema =
	promptContract.modelInputSchema ?? promptContract.inputSchema;
const currentSystemPrompt = assembleSystemPrompt(
	readingResolutionGauntlet.promptSource,
);

const isoTimestampSchema = z.iso.datetime({ offset: true });
const nonEmptyIdSchema = z.string().trim().min(1);
const missClassificationSchema = z.enum(MISS_CLASSIFICATIONS);
const retainedErrorSchema = z.strictObject({
	name: z.string().min(1),
	message: z.string(),
	status: z.number().int().finite().optional(),
	code: z.string().min(1).optional(),
});
const retainedAttemptSchema = z
	.strictObject({
		caseId: nonEmptyIdSchema,
		input: modelInputSchema,
		idealOutput: prompt.outputSchema,
		output: prompt.outputSchema.optional(),
		contractPass: z.boolean(),
		expectedDecisionPass: z.boolean(),
		membershipConsistent: z.boolean(),
		newEmojiAbsentFromExisting: z.boolean().nullable(),
		reusedExpectedDescription: z.boolean().nullable(),
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
		startedAt: isoTimestampSchema,
		completedAt: isoTimestampSchema,
		finalizedAt: isoTimestampSchema.nullable(),
		model: z.string().min(1),
		catalogMaxOutputTokens: z.number().int().finite().positive(),
		runMaxOutputTokens: z.number().int().finite().positive(),
		reasoningEffort: z.literal(REASONING_EFFORT),
		textVerbosity: z.literal(TEXT_VERBOSITY),
		promptSha256: z.string().regex(/^[0-9a-f]{64}$/u),
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
		const startedAt = Date.parse(result.startedAt);
		const completedAt = Date.parse(result.completedAt);
		if (completedAt < startedAt) {
			context.addIssue({
				code: "custom",
				path: ["completedAt"],
				message: "completedAt must not precede startedAt.",
			});
		}
		if (
			result.finalizedAt !== null &&
			Date.parse(result.finalizedAt) < completedAt
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
		for (const field of [
			"contractScore",
			"executionErrorCount",
			"unclassifiedMissCount",
		] as const) {
			if (result[field] > result.boundedCalls) {
				context.addIssue({
					code: "custom",
					path: [field],
					message: `${field} cannot exceed boundedCalls.`,
				});
			}
		}
		if (
			result.boundedCalls > result.maximumEvaluationCases ||
			result.minimumEvaluationCases > result.maximumEvaluationCases
		) {
			context.addIssue({
				code: "custom",
				path: ["boundedCalls"],
				message:
					"Bounded and minimum case counts cannot exceed maximumEvaluationCases.",
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
	readonly input: z.output<typeof modelInputSchema>;
	readonly idealOutput: z.output<typeof prompt.outputSchema>;
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
		throw new Error(`Unknown Reading Resolution gauntlet mode "${mode}".`);
	}
}

async function runLiveEvaluation(): Promise<void> {
	const testCases = prepareCurrentTestCases();
	if (!process.env.OPENAI_API_KEY) {
		throw new Error(
			"OPENAI_API_KEY is unavailable. Run through `bun run prototype:reading-resolution-gauntlet` from battery/dumgen.",
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
				model: MODEL,
				input: [
					{ role: "system", content: currentSystemPrompt },
					{ role: "user", content: stableJson(testCase.input) },
				],
				max_output_tokens: RUN_MAX_OUTPUT_TOKENS,
				reasoning: { effort: REASONING_EFFORT },
				store: false,
				text: {
					format: zodTextFormat(
						prompt.outputSchema,
						"reading_resolution_gauntlet",
					),
					verbosity: TEXT_VERBOSITY,
				},
			});
			if (!response.output_text) {
				throw new Error(
					`Provider returned no structured output text (status: ${response.status}; incomplete reason: ${response.incomplete_details?.reason ?? "none"}).`,
				);
			}
			const output = prompt.outputSchema.parse(
				JSON.parse(response.output_text),
			);
			const evaluation = readingResolutionGauntlet.evaluator({
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
				`${evaluation.contractPass ? "PASS" : "FAIL"} ${index + 1}/${testCases.length} ${testCase.id}: expected ${stableJson(testCase.idealOutput)}, received ${stableJson(output)}`,
			);
		} catch (cause) {
			const error = describeError(cause);
			attempts.push({
				caseId: testCase.id,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				contractPass: false,
				expectedDecisionPass: false,
				membershipConsistent: false,
				newEmojiAbsentFromExisting:
					testCase.idealOutput.decision === "New" ? false : null,
				reusedExpectedDescription:
					testCase.idealOutput.decision === "Reuse" ? false : null,
				latencyMs: Math.round(performance.now() - started),
				error,
				missClassification: null,
				missClassificationExplanation: null,
			});
			console.log(
				`FAIL ${index + 1}/${testCases.length} ${testCase.id}: ${error.name}: ${error.message}`,
			);
		}
	}

	const completedAt = new Date().toISOString();
	const result = retainedRunSchema.parse({
		...currentEvidenceBinding(),
		startedAt,
		completedAt,
		finalizedAt: null,
		boundedCalls: testCases.length,
		...summarizeEvidence(attempts, false),
		attempts,
	});
	const destination = join(RUNS, runId, "results.json");
	await mkdir(dirname(destination), { recursive: true });
	await writeJsonAtomically(destination, result);

	console.log(
		`\nContract score: ${result.contractScore}/${result.boundedCalls} (${formatRatio(result.scoreRatio)})`,
	);
	console.log("Evidence threshold: NOT MET (finalization required)");
	if (result.executionErrorCount > 0) {
		console.log(
			`A fresh run is required because ${result.executionErrorCount} attempt(s) ended with execution/provider errors.`,
		);
	} else if (result.unclassifiedMissCount > 0) {
		console.log(
			`Finalize ${result.unclassifiedMissCount} miss classification(s) before treating this run as evidence.`,
		);
	}
	console.log(`Wrote ${relative(process.cwd(), destination)}`);
	process.exitCode = 1;
}

export async function finalizeEvidence(
	resultsPath: string,
	classificationsPath: string,
): Promise<RetainedRun> {
	const retained = parseRetainedRun(
		JSON.parse(await readFile(resultsPath, "utf8")),
	);
	const currentCases = prepareCurrentTestCases();
	assertCurrentEvidenceBinding(retained, currentCases);
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
		(attempt) => !attempt.contractPass,
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
	const finalizedAt = new Date().toISOString();
	const finalized = retainedRunSchema.parse({
		...retained,
		...currentEvidenceBinding(),
		finalizedAt,
		...summarizeEvidence(attempts, true),
		attempts,
	});
	await writeJsonAtomically(resultsPath, finalized);

	console.log(
		`Contract score: ${finalized.contractScore}/${finalized.boundedCalls} (${formatRatio(finalized.scoreRatio)})`,
	);
	console.log(
		`Evidence threshold: ${finalized.evidenceThresholdMet ? "MET" : "NOT MET"}`,
	);
	console.log(`Finalized ${relative(process.cwd(), resultsPath)}`);
	if (!finalized.evidenceThresholdMet) process.exitCode = 1;
	return finalized;
}

export function prepareCurrentTestCases(): readonly PreparedTestCase[] {
	const selected = readingResolutionGauntlet.evaluation.ids.map(
		(id, index) => ({
			id,
			goldenCase: readingResolutionGauntlet.evaluation.cases[index],
		}),
	);
	assertEvaluationSuiteBounds(selected.length);
	return selected.map(({ id, goldenCase }) => {
		if (goldenCase === undefined) {
			throw new Error(`Evaluation case "${id}" is missing.`);
		}
		const parsedInput = prompt.inputSchema.parse(goldenCase.input);
		const projectedInput = promptContract.projectInput
			? promptContract.projectInput(parsedInput)
			: parsedInput;
		return Object.freeze({
			id,
			input: modelInputSchema.parse(projectedInput),
			idealOutput: prompt.outputSchema.parse(goldenCase.idealOutput),
		});
	});
}

export function assertEvaluationSuiteBounds(caseCount: number): void {
	if (!Number.isSafeInteger(caseCount)) {
		throw new TypeError("Evaluation case count must be a safe integer.");
	}
	if (caseCount < MINIMUM_EVALUATION_CASES) {
		throw new Error(
			`The Reading Resolution gauntlet requires at least ${MINIMUM_EVALUATION_CASES} evaluation cases; found ${caseCount}.`,
		);
	}
	if (caseCount > MAX_TEST_CASES) {
		throw new Error(
			`The Reading Resolution gauntlet is capped at ${MAX_TEST_CASES} evaluation cases; found ${caseCount}.`,
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
		model: MODEL,
		catalogMaxOutputTokens: prompt.generationParams.maxOutputTokens,
		runMaxOutputTokens: RUN_MAX_OUTPUT_TOKENS,
		reasoningEffort: REASONING_EFFORT,
		textVerbosity: TEXT_VERBOSITY,
		promptSha256: createHash("sha256")
			.update(currentSystemPrompt, "utf8")
			.digest("hex"),
		evaluationCaseIds: [...readingResolutionGauntlet.evaluation.ids],
		minimumEvaluationCases: MINIMUM_EVALUATION_CASES,
		minimumScoreRatio: MINIMUM_SCORE_RATIO,
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
		"minimumEvaluationCases",
		"minimumScoreRatio",
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

function recomputeAttemptEvaluation(attempt: RetainedAttempt): RetainedAttempt {
	if (attempt.error !== undefined) {
		return {
			...attempt,
			contractPass: false,
			expectedDecisionPass: false,
			membershipConsistent: false,
			newEmojiAbsentFromExisting:
				attempt.idealOutput.decision === "New" ? false : null,
			reusedExpectedDescription:
				attempt.idealOutput.decision === "Reuse" ? false : null,
			missClassification: null,
			missClassificationExplanation: null,
		};
	}
	if (attempt.output === undefined) {
		throw new Error(
			`Retained successful attempt "${attempt.caseId}" has no output.`,
		);
	}
	const evaluation = readingResolutionGauntlet.evaluator({
		caseId: attempt.caseId,
		input: readingResolutionGauntlet.promptSource.inputSchema.parse(
			attempt.input,
		),
		idealOutput: prompt.outputSchema.parse(attempt.idealOutput),
		output: prompt.outputSchema.parse(attempt.output),
	});
	return { ...attempt, ...evaluation };
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

function formatRatio(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
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
