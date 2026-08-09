// PROTOTYPE ONLY — issue #85 preflight, bounded direct runner, and finalizer.

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { z } from "zod";

import { stableJson } from "../../../src/lib/stable-json";
import {
	type ArmEvidenceSummary,
	ATTEMPTS_PER_ARM,
	decidePrototypeWinner,
	EXACT_CALL_CAP,
	EXPECTED_RESOLVED_MODEL,
	MAX_OUTPUT_TOKENS,
	MAXIMUM_SPEND_USD,
	PRICE_SCHEDULE,
	preparePrototypePreflight,
	prepareRepresentationCases,
	REASONING_EFFORT,
	RUN_MODEL,
	sliceForCase,
	systemPromptForRepresentation,
	TEXT_VERBOSITY,
} from "../../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/contract-prototype";
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
	outputTokens: z.number().int().nonnegative(),
	totalTokens: z.number().int().nonnegative(),
	longContext: z.boolean(),
	billedCostUpperBoundUsd: z.number().nonnegative(),
});

const providerResponseSchema = z
	.object({
		id: z.string().min(1),
		model: z.string().min(1),
		output_text: z.string(),
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

type ResponseRequest = ReturnType<typeof responseRequestFor>;
export type PrototypeResponsesClient = Readonly<{
	responses: Readonly<{
		create(request: ResponseRequest): Promise<unknown>;
	}>;
}>;

if (import.meta.main) {
	const mode = process.argv[2] ?? "preflight";
	if (mode === "preflight") {
		printPreflight();
	} else if (mode === "run") {
		await runLivePrototype();
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
		throw new Error(`Unknown prototype mode ${mode}.`);
	}
}

export function printPreflight(): void {
	const preflight = preparePrototypePreflight();
	console.log(JSON.stringify(preflight, null, 2));
}

export async function runLivePrototype(
	options: {
		readonly apiKey?: string;
		readonly client?: PrototypeResponsesClient;
		readonly runDirectory?: string;
	} = {},
): Promise<RetainedRun> {
	const preflight = preparePrototypePreflight();
	assertPreflightCallPolicy(preflight);
	const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
	if (apiKey === undefined && options.client === undefined) {
		throw new Error(
			"OPENAI_API_KEY is unavailable; preflight completed without a provider call.",
		);
	}
	const client: PrototypeResponsesClient =
		options.client ?? new OpenAI({ apiKey, maxRetries: 0 });
	const startedAt = new Date().toISOString();
	const attempts: RetainedAttempt[] = [];

	for (const armId of REPRESENTATION_IDS) {
		const systemPrompt = systemPromptForRepresentation(armId);
		const cases = prepareRepresentationCases(armId);
		for (
			let attemptNumber = 1;
			attemptNumber <= ATTEMPTS_PER_ARM;
			attemptNumber += 1
		) {
			for (const testCase of cases) {
				if (attempts.length >= EXACT_CALL_CAP) {
					throw new Error(
						"Exact call cap reached before schedule completion.",
					);
				}
				attempts.push(
					await callOne({
						client,
						armId,
						attemptNumber,
						systemPrompt,
						testCase,
					}),
				);
			}
		}
	}
	if (attempts.length !== EXACT_CALL_CAP) {
		throw new Error(
			`Expected ${EXACT_CALL_CAP} calls; made ${attempts.length}.`,
		);
	}
	const resolvedModel = resolvedModelForRun(attempts);
	const result = retainedRunSchema.parse({
		startedAt,
		completedAt: new Date().toISOString(),
		finalizedAt: null,
		bindingSha256: bindingSha256(preflight),
		preflight,
		resolvedModel,
		actualCallCount: attempts.length,
		totalBilledCostUpperBoundUsd: totalCost(attempts),
		arms: summarizeArms(attempts),
		verdict: null,
		attempts,
	});
	const destination =
		options.runDirectory === undefined
			? join(RUNS, startedAt.replaceAll(/[:.]/gu, "-"), "results.json")
			: join(options.runDirectory, "results.json");
	await mkdir(dirname(destination), { recursive: true });
	await writeJsonAtomically(destination, result);
	console.log(`Wrote ${relative(process.cwd(), destination)}`);
	console.log("Evidence remains ineligible until offline finalization.");
	return result;
}

async function callOne(args: {
	client: PrototypeResponsesClient;
	armId: RepresentationId;
	attemptNumber: number;
	systemPrompt: string;
	testCase: ReturnType<typeof prepareRepresentationCases>[number];
}): Promise<RetainedAttempt> {
	const key = `${args.armId}/${args.attemptNumber}/${args.testCase.caseId}`;
	const started = performance.now();
	const request = responseRequestFor({
		armId: args.armId,
		systemPrompt: args.systemPrompt,
		privateInput: args.testCase.privateInput,
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
	const parsedResponseEvidence = {
		rawOutputText: response.output_text,
		responseId: response.id,
		resolvedModel: response.model,
		rawUsage: response.usage ?? null,
	};
	let usage: z.output<typeof usageSchema>;
	try {
		usage = normalizeUsage(response.usage);
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
		if (response.output_text.length === 0) {
			throw new Error("Provider returned no output text.");
		}
		privateOutputJson = JSON.parse(response.output_text);
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

function responseRequestFor(args: {
	readonly armId: RepresentationId;
	readonly systemPrompt: string;
	readonly privateInput: unknown;
}): ResponseCreateParamsNonStreaming {
	return {
		model: RUN_MODEL,
		input: [
			{ role: "system" as const, content: args.systemPrompt },
			{
				role: "user" as const,
				content: stableJson(args.privateInput),
			},
		],
		max_output_tokens: MAX_OUTPUT_TOKENS,
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
		throw new Error("Only the exact 564-call schedule can be finalized.");
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
	const attempts = retained.attempts.map((attempt) => {
		const scheduledCase = scheduledCaseForAttempt(attempt);
		const recomputed = recomputeAttempt(attempt, scheduledCase);
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
		rawResponse.output_text !== attempt.rawOutputText ||
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
	const recomputedUsage = normalizeUsage(attempt.rawUsage);
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
): void {
	const expected = new Set<string>();
	for (const armId of REPRESENTATION_IDS) {
		for (
			let attemptNumber = 1;
			attemptNumber <= ATTEMPTS_PER_ARM;
			attemptNumber += 1
		) {
			for (const testCase of prepareRepresentationCases(armId)) {
				expected.add(`${armId}/${attemptNumber}/${testCase.caseId}`);
			}
		}
	}
	if (
		attempts.length !== EXACT_CALL_CAP ||
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

export function assertCurrentBinding(retained: RetainedRun): void {
	const current = preparePrototypePreflight();
	if (
		retained.bindingSha256 !== bindingSha256(current) ||
		stableJson(retained.preflight) !== stableJson(current)
	) {
		throw new Error(
			"Retained evidence is not bound to current source policy.",
		);
	}
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
		preflight.exactCallCap !== EXACT_CALL_CAP ||
		preflight.maximumEstimatedCostUsd > MAXIMUM_SPEND_USD ||
		preflight.evaluationCaseIds.length *
			preflight.attemptsPerArm *
			preflight.arms.length !==
			EXACT_CALL_CAP
	) {
		throw new Error(
			"Prototype preflight does not satisfy the exact safety cap.",
		);
	}
}

function normalizeUsage(usage: unknown): z.output<typeof usageSchema> {
	const value = z
		.object({
			input_tokens: z.number().int().nonnegative(),
			output_tokens: z.number().int().nonnegative(),
			total_tokens: z.number().int().nonnegative(),
			input_tokens_details: z
				.object({
					cached_tokens: z.number().int().nonnegative().optional(),
				})
				.optional(),
		})
		.parse(usage);
	const cachedInputTokens = value.input_tokens_details?.cached_tokens ?? 0;
	const longContext =
		value.input_tokens > PRICE_SCHEDULE.longContextThresholdTokens;
	const price = longContext
		? PRICE_SCHEDULE.longContext
		: PRICE_SCHEDULE.shortContext;
	const uncachedInputTokens = Math.max(
		0,
		value.input_tokens - cachedInputTokens,
	);
	return {
		inputTokens: value.input_tokens,
		cachedInputTokens,
		outputTokens: value.output_tokens,
		totalTokens: value.total_tokens,
		longContext,
		billedCostUpperBoundUsd:
			(uncachedInputTokens / 1_000_000) *
				Math.max(
					price.inputUsdPerMillion,
					price.cacheWriteUsdPerMillion,
				) +
			(cachedInputTokens / 1_000_000) * price.cachedInputUsdPerMillion +
			(value.output_tokens / 1_000_000) * price.outputUsdPerMillion,
	};
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

async function writeJsonAtomically(destination: string, value: unknown) {
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
