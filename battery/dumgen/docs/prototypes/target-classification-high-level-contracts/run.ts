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
export const BATCH_ENDPOINT = BATCH_CACHE_POLICY.endpoint;
export const BATCH_COMPLETION_WINDOW = BATCH_CACHE_POLICY.completionWindow;
const BATCH_MANIFEST_NAME = "batch-manifest.json";
const BATCH_INPUT_NAME = "batch-input.jsonl";
const BATCH_OUTPUT_NAME = "batch-output.jsonl";
const BATCH_ERROR_NAME = "batch-error.jsonl";
let scheduleCacheKeys: ReadonlyMap<string, string> | undefined;
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

export function preparePrototypeBatch(): PreparedPrototypeBatch {
	const preflight = preparePrototypePreflight();
	assertPreflightCallPolicy(preflight);
	const schedule: z.input<typeof batchScheduleBindingSchema>[] = [];
	const lines: string[] = [];
	let scheduleIndex = 0;
	for (const armId of REPRESENTATION_IDS) {
		const systemPrompt = systemPromptForRepresentation(armId);
		for (
			let attemptNumber = 1;
			attemptNumber <= ATTEMPTS_PER_ARM;
			attemptNumber += 1
		) {
			for (const testCase of prepareRepresentationCases(armId)) {
				const key = `${armId}/${attemptNumber}/${testCase.caseId}`;
				const promptCacheKey = promptCacheKeyForScheduleKey(key);
				const request = responseRequestFor({
					armId,
					systemPrompt,
					privateInput: testCase.privateInput,
					promptCacheKey,
				});
				const customId = `tc85-${String(scheduleIndex).padStart(3, "0")}-${bindingSha256(key).slice(0, 12)}`;
				const envelope = {
					custom_id: customId,
					method: "POST",
					url: BATCH_ENDPOINT,
					body: request,
				};
				lines.push(stableJson(envelope));
				schedule.push({
					key,
					customId,
					armId,
					attemptNumber,
					caseId: testCase.caseId,
					promptCacheKey,
					requestSha256: bindingSha256(request),
					requestUtf8Bytes: jsonUtf8Bytes(request),
				});
				scheduleIndex += 1;
			}
		}
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
			schedule,
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

if (import.meta.main) {
	const mode = process.argv[2] ?? "preflight";
	if (mode === "preflight") {
		printPreflight();
	} else if (mode === "run") {
		await runLivePrototype();
	} else if (mode === "batch-submit") {
		const manifestPath = await submitPrototypeBatch({
			runDirectory: process.argv[3],
		});
		console.log(`Submitted Batch; manifest: ${manifestPath}`);
	} else if (mode === "batch-resume") {
		const manifestPath = process.argv[3];
		if (manifestPath === undefined) {
			throw new Error("Usage: run.ts batch-resume <batch-manifest.json>");
		}
		const resumed = await resumePrototypeBatch({ manifestPath });
		console.log(
			resumed.run === null
				? `Batch status: ${resumed.status}`
				: `Collected ${resumed.run.actualCallCount} Batch responses.`,
		);
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

export async function submitPrototypeBatch(options: {
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
	const prepared = preparePrototypeBatch();
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
	readonly manifestPath: string;
	readonly apiKey?: string;
	readonly client?: PrototypeBatchClient;
}): Promise<{ status: string; run: RetainedRun | null }> {
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
	const preflight = preparePrototypePreflight();
	if (
		manifest.bindingSha256 !== bindingSha256(preflight) ||
		stableJson(manifest.preflight) !== stableJson(preflight)
	) {
		throw new Error(
			"Batch manifest is not bound to current source policy.",
		);
	}
	const prepared = preparePrototypeBatch();
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

async function collectPrototypeBatch(
	manifest: PrototypeBatchManifest,
	outputJsonl: string,
	errorJsonl: string,
): Promise<RetainedRun> {
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
}): Promise<RetainedAttempt> {
	const key = `${args.armId}/${args.attemptNumber}/${args.testCase.caseId}`;
	const promptCacheKey = promptCacheKeyForScheduleKey(key);
	const started = performance.now();
	const request = responseRequestFor({
		armId: args.armId,
		systemPrompt: args.systemPrompt,
		privateInput: args.testCase.privateInput,
		promptCacheKey,
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

export function promptCacheKeyForScheduleKey(scheduleKey: string): string {
	if (scheduleCacheKeys === undefined) {
		const computed = new Map<string, string>();
		for (const armId of REPRESENTATION_IDS) {
			for (
				let attemptNumber = 1;
				attemptNumber <= ATTEMPTS_PER_ARM;
				attemptNumber += 1
			) {
				const cases = prepareRepresentationCases(armId);
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
		scheduleCacheKeys = computed;
	}
	const promptCacheKey = scheduleCacheKeys.get(scheduleKey);
	if (promptCacheKey !== undefined) return promptCacheKey;
	throw new Error(`Unknown prototype schedule key ${scheduleKey}.`);
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
		value.input_tokens > PRICE_SCHEDULE.longContextThresholdTokens;
	const price = longContext
		? PRICE_SCHEDULE.longContext
		: PRICE_SCHEDULE.shortContext;
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
