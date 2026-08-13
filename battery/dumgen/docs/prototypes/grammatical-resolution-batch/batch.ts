import { createHash } from "node:crypto";

import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
	DUMGEN_GENERATION_MODEL,
	DUMGEN_REASONING_EFFORT,
} from "../../../src/ai-sdk/model-policy";
import { stableJson } from "../../../src/lib/stable-json";
import { BATCH_ROUTES, type BatchRoute } from "./routes";

export const BATCH_ENDPOINT = "/v1/responses" as const;
export const BATCH_COMPLETION_WINDOW = "24h" as const;
export const CASES_PER_ROUTE = 20;
export const BATCH_REQUEST_COUNT = BATCH_ROUTES.length * CASES_PER_ROUTE;
export const UNAVAILABLE_REQUEST_LATENCY_MS = null;

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
const batchStatusSchema = z.enum([
	"prepared",
	"validating",
	"failed",
	"in_progress",
	"finalizing",
	"completed",
	"expired",
	"cancelling",
	"cancelled",
]);
const nullableEpochSchema = z.number().int().nonnegative().nullable();
const requestCountsSchema = z.strictObject({
	total: z.number().int().nonnegative(),
	completed: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
});
const batchSnapshotSchema = z.strictObject({
	id: z.string().min(1).nullable(),
	status: batchStatusSchema,
	inputFileId: z.string().min(1).nullable(),
	outputFileId: z.string().min(1).nullable(),
	errorFileId: z.string().min(1).nullable(),
	requestCounts: requestCountsSchema,
	createdAtEpoch: nullableEpochSchema,
	expiresAtEpoch: nullableEpochSchema,
	inProgressAtEpoch: nullableEpochSchema,
	finalizingAtEpoch: nullableEpochSchema,
	completedAtEpoch: nullableEpochSchema,
	failedAtEpoch: nullableEpochSchema,
	expiredAtEpoch: nullableEpochSchema,
	cancellingAtEpoch: nullableEpochSchema,
	cancelledAtEpoch: nullableEpochSchema,
	errors: z.unknown().nullable(),
});

export type BatchSnapshot = z.output<typeof batchSnapshotSchema>;

const batchRequestSchema = z.strictObject({
	custom_id: z.string().min(1),
	method: z.literal("POST"),
	url: z.literal(BATCH_ENDPOINT),
	body: z.record(z.string(), z.unknown()),
});
const caseBindingSchema = z.strictObject({
	customId: z.string().min(1),
	caseId: z.string().min(1),
	input: z.unknown(),
	idealOutput: z.unknown(),
	request: batchRequestSchema,
	requestSha256: sha256Schema,
});
const routeBindingSchema = z.strictObject({
	slug: z.string().min(1),
	route: z.string().min(1),
	evidenceBinding: z.record(z.string(), z.unknown()),
	evaluationCaseIds: z.array(z.string().min(1)).length(CASES_PER_ROUTE),
	cases: z.array(caseBindingSchema).length(CASES_PER_ROUTE),
	resultPath: z.string().min(1),
});
const submissionSchema = z.strictObject({
	model: z.literal(DUMGEN_GENERATION_MODEL),
	reasoningEffort: z.literal(DUMGEN_REASONING_EFFORT),
	store: z.literal(false),
	endpoint: z.literal(BATCH_ENDPOINT),
	completionWindow: z.literal(BATCH_COMPLETION_WINDOW),
	input: z.strictObject({
		localPath: z.string().min(1),
		sha256: sha256Schema,
		requestCount: z.number().int().positive(),
	}),
	routes: z.array(routeBindingSchema).min(1).max(BATCH_ROUTES.length),
});
const rawArtifactSchema = z.strictObject({
	fileId: z.string().min(1),
	localPath: z.string().min(1),
	sha256: sha256Schema,
	lineCount: z.number().int().nonnegative(),
});
const collectedEnvelopeSchema = z.strictObject({
	source: z.enum(["output", "error"]),
	customId: z.string().min(1),
	envelopeId: z.string().min(1),
	requestId: z.string().min(1).nullable(),
	statusCode: z.number().int().nullable(),
	error: z.unknown().nullable(),
});

export const batchManifestSchema = z
	.strictObject({
		manifestVersion: z.literal(1),
		createdAt: z.iso.datetime({ offset: true }),
		updatedAt: z.iso.datetime({ offset: true }),
		submission: submissionSchema,
		submissionSha256: sha256Schema,
		requestLatencyMs: z.null(),
		requestLatencyMeaning: z.literal("unavailable-for-batch-transport"),
		remote: z.strictObject({
			inputFileId: z.string().min(1).nullable(),
			batch: batchSnapshotSchema,
			output: rawArtifactSchema.nullable(),
			error: rawArtifactSchema.nullable(),
		}),
		collection: z.strictObject({
			collectedAt: z.iso.datetime({ offset: true }).nullable(),
			batchWallTimeMs: z.number().int().nonnegative().nullable(),
			envelopes: z.array(collectedEnvelopeSchema),
		}),
	})
	.superRefine((manifest, context) => {
		if (
			sha256(stableJson(manifest.submission)) !==
			manifest.submissionSha256
		) {
			context.addIssue({
				code: "custom",
				path: ["submissionSha256"],
				message:
					"Submission hash does not match its immutable payload.",
			});
		}
		const cases = manifest.submission.routes.flatMap(
			(route) => route.cases,
		);
		const routeSlugs = manifest.submission.routes.map(({ slug }) => slug);
		try {
			assertCanonicalRouteSlugs(routeSlugs);
		} catch (cause) {
			context.addIssue({
				code: "custom",
				path: ["submission", "routes"],
				message:
					cause instanceof Error
						? cause.message
						: "Submission routes are invalid.",
			});
		}
		const customIds = cases.map(({ customId }) => customId);
		if (
			cases.length !== manifest.submission.input.requestCount ||
			cases.length !== routeSlugs.length * CASES_PER_ROUTE ||
			new Set(customIds).size !== customIds.length
		) {
			context.addIssue({
				code: "custom",
				path: ["submission", "routes"],
				message:
					"Submission must contain the exact request count and unique custom IDs.",
			});
		}
		for (const route of manifest.submission.routes) {
			if (
				stableJson(route.evaluationCaseIds) !==
				stableJson(route.cases.map(({ caseId }) => caseId))
			) {
				context.addIssue({
					code: "custom",
					path: ["submission", "routes"],
					message: `Route "${route.slug}" case order is inconsistent.`,
				});
			}
			for (const binding of route.cases) {
				if (
					binding.request.custom_id !== binding.customId ||
					sha256(stableJson(binding.request)) !==
						binding.requestSha256
				) {
					context.addIssue({
						code: "custom",
						path: ["submission", "routes"],
						message: `Route "${route.slug}" request binding is inconsistent.`,
					});
				}
			}
		}
	});

export type BatchManifest = z.output<typeof batchManifestSchema>;
export type BatchInputRequest = z.output<typeof batchRequestSchema>;

export type PreparedBatch = {
	readonly jsonl: string;
	readonly manifest: BatchManifest;
	readonly requests: readonly BatchInputRequest[];
};

export function prepareBatch(args: {
	readonly inputPath: string;
	readonly resultPaths: Readonly<Record<string, string>>;
	readonly now?: Date;
	readonly routes?: readonly BatchRoute[];
}): PreparedBatch {
	const routes = args.routes ?? BATCH_ROUTES;
	assertSelectedRoutes(routes);
	const prepared = buildSubmission({
		inputPath: args.inputPath,
		resultPaths: args.resultPaths,
		routes,
	});
	const now = (args.now ?? new Date()).toISOString();
	const manifest = batchManifestSchema.parse({
		manifestVersion: 1,
		createdAt: now,
		updatedAt: now,
		submission: prepared.submission,
		submissionSha256: sha256(stableJson(prepared.submission)),
		requestLatencyMs: UNAVAILABLE_REQUEST_LATENCY_MS,
		requestLatencyMeaning: "unavailable-for-batch-transport",
		remote: {
			inputFileId: null,
			batch: emptyBatchSnapshot(),
			output: null,
			error: null,
		},
		collection: {
			collectedAt: null,
			batchWallTimeMs: null,
			envelopes: [],
		},
	});
	return Object.freeze({
		jsonl: prepared.jsonl,
		manifest,
		requests: prepared.requests,
	});
}

function buildSubmission(args: {
	readonly inputPath: string;
	readonly resultPaths: Readonly<Record<string, string>>;
	readonly routes: readonly BatchRoute[];
}) {
	const requests: BatchInputRequest[] = [];
	const routeBindings = args.routes.map((route) => {
		const testCases = route.prepareCases();
		if (testCases.length !== CASES_PER_ROUTE) {
			throw new Error(
				`Batch route "${route.slug}" must expose exactly ${CASES_PER_ROUTE} cases; found ${testCases.length}.`,
			);
		}
		const evidenceBinding = route.currentBinding();
		assertSharedPolicy(evidenceBinding, route.slug);
		const maxOutputTokens = readMaxOutputTokens(
			evidenceBinding,
			route.slug,
		);
		if (evidenceBinding.textVerbosity !== "low") {
			throw new Error(
				`Batch route "${route.slug}" must retain low text verbosity.`,
			);
		}
		const caseBindings = testCases.map((testCase) => {
			const customId = `${route.slug}--${testCase.id}`;
			const request = batchRequestSchema.parse(
				JSON.parse(
					stableJson({
						custom_id: customId,
						method: "POST",
						url: BATCH_ENDPOINT,
						body: {
							model: DUMGEN_GENERATION_MODEL,
							input: [
								{ role: "system", content: route.systemPrompt },
								{
									role: "user",
									content: stableJson(testCase.input),
								},
							],
							max_output_tokens: maxOutputTokens,
							reasoning: { effort: DUMGEN_REASONING_EFFORT },
							store: false,
							text: {
								format: zodTextFormat(
									route.outputSchema,
									route.schemaName,
								),
								verbosity: "low",
							},
						},
					}),
				),
			);
			requests.push(request);
			return {
				customId,
				caseId: testCase.id,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				request,
				requestSha256: sha256(stableJson(request)),
			};
		});
		const resultPath = args.resultPaths[route.slug];
		if (!resultPath) {
			throw new Error(
				`Result path is missing for route "${route.slug}".`,
			);
		}
		return {
			slug: route.slug,
			route: route.route,
			evidenceBinding,
			evaluationCaseIds: testCases.map(({ id }) => id),
			cases: caseBindings,
			resultPath,
		};
	});
	const requestCount = args.routes.length * CASES_PER_ROUTE;
	if (requests.length !== requestCount) {
		throw new Error(
			`The selected routes require exactly ${requestCount} requests; found ${requests.length}.`,
		);
	}
	const jsonl = `${requests.map((request) => stableJson(request)).join("\n")}\n`;
	const submission = submissionSchema.parse({
		model: DUMGEN_GENERATION_MODEL,
		reasoningEffort: DUMGEN_REASONING_EFFORT,
		store: false,
		endpoint: BATCH_ENDPOINT,
		completionWindow: BATCH_COMPLETION_WINDOW,
		input: {
			localPath: args.inputPath,
			sha256: sha256(jsonl),
			requestCount,
		},
		routes: routeBindings,
	});
	return { jsonl, requests, submission };
}

export function withUploadedInput(
	manifest: BatchManifest,
	fileId: string,
	now = new Date(),
): BatchManifest {
	if (!fileId) throw new Error("Uploaded input file ID is required.");
	if (
		manifest.remote.inputFileId !== null &&
		manifest.remote.inputFileId !== fileId
	) {
		throw new Error("Uploaded input file ID does not match the manifest.");
	}
	return batchManifestSchema.parse({
		...manifest,
		updatedAt: now.toISOString(),
		remote: {
			...manifest.remote,
			inputFileId: fileId,
			batch: { ...manifest.remote.batch, inputFileId: fileId },
		},
	});
}

export function withBatchSnapshot(
	manifest: BatchManifest,
	snapshot: BatchSnapshot,
	now = new Date(),
): BatchManifest {
	const parsed = batchSnapshotSchema.parse(snapshot);
	if (
		manifest.remote.batch.id !== null &&
		parsed.id !== manifest.remote.batch.id
	) {
		throw new Error("Batch ID does not match the manifest.");
	}
	if (
		manifest.remote.inputFileId !== null &&
		parsed.inputFileId !== manifest.remote.inputFileId
	) {
		throw new Error("Batch input file ID does not match the manifest.");
	}
	for (const field of ["outputFileId", "errorFileId"] as const) {
		const retained = manifest.remote.batch[field];
		if (retained !== null && parsed[field] !== retained) {
			throw new Error(`Batch ${field} does not match the manifest.`);
		}
	}
	return batchManifestSchema.parse({
		...manifest,
		updatedAt: now.toISOString(),
		remote: {
			...manifest.remote,
			inputFileId: parsed.inputFileId ?? manifest.remote.inputFileId,
			batch: parsed,
		},
	});
}

export type RawBatchArtifact = {
	readonly fileId: string;
	readonly localPath: string;
	readonly content: string;
};

export type CollectedBatch = {
	readonly manifest: BatchManifest;
	readonly resultsBySlug: Readonly<Record<string, unknown>>;
};

export function collectBatch(args: {
	readonly manifest: BatchManifest;
	readonly output: RawBatchArtifact | null;
	readonly error: RawBatchArtifact | null;
	readonly now?: Date;
	readonly routes?: readonly BatchRoute[];
}): CollectedBatch {
	const manifest = batchManifestSchema.parse(args.manifest);
	if (manifest.collection.collectedAt !== null) {
		throw new Error("This Batch manifest has already been collected.");
	}
	const routes = args.routes ?? routesForManifest(manifest);
	assertSelectedRoutes(routes);
	assertRouteSelectionMatchesManifest(manifest, routes);
	assertBatchSubmissionCurrent(manifest, routes);
	if (manifest.remote.batch.status !== "completed") {
		throw new Error(
			`Only a completed batch is collectable; received "${manifest.remote.batch.status}".`,
		);
	}
	assertArtifactFileId(
		args.output,
		manifest.remote.batch.outputFileId,
		"output",
	);
	assertArtifactFileId(
		args.error,
		manifest.remote.batch.errorFileId,
		"error",
	);

	const outputEnvelopes = parseEnvelopeJsonl(
		args.output?.content ?? "",
		"output",
	);
	const errorEnvelopes = parseEnvelopeJsonl(
		args.error?.content ?? "",
		"error",
	);
	const allEnvelopes = [...outputEnvelopes, ...errorEnvelopes];
	const byCustomId = indexEnvelopes(allEnvelopes);
	const expectedCustomIds = manifest.submission.routes.flatMap((route) =>
		route.cases.map(({ customId }) => customId),
	);
	assertExactCustomIds(expectedCustomIds, byCustomId);
	assertRequestCounts(
		manifest.remote.batch.requestCounts,
		outputEnvelopes.length,
		errorEnvelopes.length,
		manifest.submission.input.requestCount,
	);

	const startedAtEpoch = manifest.remote.batch.createdAtEpoch;
	const completedAtEpoch = manifest.remote.batch.completedAtEpoch;
	if (startedAtEpoch === null || completedAtEpoch === null) {
		throw new Error(
			"Completed batch timestamps must include start and completion times.",
		);
	}
	const startedAt = epochToIso(startedAtEpoch);
	const completedAt = epochToIso(completedAtEpoch);
	const batchWallTimeMs = Math.max(
		0,
		(completedAtEpoch - startedAtEpoch) * 1000,
	);
	const batchProvenance = {
		batchId: requireString(manifest.remote.batch.id, "batch ID"),
		inputFileId: requireString(
			manifest.remote.inputFileId,
			"input file ID",
		),
		outputFileId: manifest.remote.batch.outputFileId,
		errorFileId: manifest.remote.batch.errorFileId,
		submissionManifestSha256: manifest.submissionSha256,
		inputJsonlSha256: manifest.submission.input.sha256,
		outputJsonlSha256:
			args.output === null ? null : sha256(args.output.content),
		errorJsonlSha256:
			args.error === null ? null : sha256(args.error.content),
		endpoint: BATCH_ENDPOINT,
		completionWindow: BATCH_COMPLETION_WINDOW,
		createdAt: startedAt,
		completedAt,
		requestCounts: manifest.remote.batch.requestCounts,
	};
	const resultsBySlug: Record<string, unknown> = {};

	for (const route of routes) {
		const routeManifest = manifest.submission.routes.find(
			(candidate) => candidate.slug === route.slug,
		);
		if (!routeManifest) {
			throw new Error(`Manifest route "${route.slug}" is missing.`);
		}
		const attempts = routeManifest.cases.map((binding) => {
			const envelope = byCustomId.get(binding.customId);
			if (!envelope) {
				throw new Error(`Missing batch result "${binding.customId}".`);
			}
			return collectAttempt(route, binding, envelope);
		});
		const resultCandidate = {
			...route.currentBinding(),
			startedAt,
			completedAt,
			finalizedAt: null,
			batchProvenance,
			boundedCalls: attempts.length,
			...route.summarize(attempts, false),
			attempts,
		};
		resultsBySlug[route.slug] = route.parseRun(resultCandidate);
	}

	const now = args.now ?? new Date();
	const collectedManifest = batchManifestSchema.parse({
		...manifest,
		updatedAt: now.toISOString(),
		remote: {
			...manifest.remote,
			output: artifactRecord(args.output, outputEnvelopes.length),
			error: artifactRecord(args.error, errorEnvelopes.length),
		},
		collection: {
			collectedAt: now.toISOString(),
			batchWallTimeMs,
			envelopes: allEnvelopes.map((envelope) => ({
				source: envelope.source,
				customId: envelope.custom_id,
				envelopeId: envelope.id,
				requestId: envelope.response?.request_id ?? null,
				statusCode: envelope.response?.status_code ?? null,
				error: envelope.error,
			})),
		},
	});
	return { manifest: collectedManifest, resultsBySlug };
}

const batchErrorSchema = z.strictObject({
	code: z.string().min(1).optional(),
	message: z.string().optional(),
	param: z.unknown().optional(),
	type: z.string().min(1).optional(),
});
const batchResponseSchema = z.strictObject({
	status_code: z.number().int(),
	request_id: z.string().min(1),
	body: z.record(z.string(), z.unknown()),
});
const envelopeSchema = z
	.strictObject({
		id: z.string().min(1),
		custom_id: z.string().min(1),
		response: batchResponseSchema.nullable(),
		error: batchErrorSchema.nullable(),
	})
	.superRefine((envelope, context) => {
		if ((envelope.response === null) === (envelope.error === null)) {
			context.addIssue({
				code: "custom",
				message:
					"Batch envelope must contain exactly one response or error.",
			});
		}
	});

type ParsedEnvelope = z.output<typeof envelopeSchema> & {
	readonly source: "output" | "error";
};

function parseEnvelopeJsonl(
	value: string,
	source: "output" | "error",
): readonly ParsedEnvelope[] {
	return value
		.split(/\r?\n/gu)
		.filter((line) => line.trim().length > 0)
		.map((line, index) => {
			let raw: unknown;
			try {
				raw = JSON.parse(line);
			} catch (cause) {
				throw new Error(
					`Invalid ${source} JSONL at line ${index + 1}.`,
					{
						cause,
					},
				);
			}
			const envelope = envelopeSchema.parse(raw);
			if (source === "output" && envelope.response === null) {
				throw new Error(
					`Output JSONL line ${index + 1} contains an error.`,
				);
			}
			if (source === "error" && envelope.error === null) {
				throw new Error(
					`Error JSONL line ${index + 1} contains a response.`,
				);
			}
			return { ...envelope, source };
		});
}

function collectAttempt(
	route: BatchRoute,
	binding: {
		readonly caseId: string;
		readonly input: unknown;
		readonly idealOutput: unknown;
	},
	envelope: ParsedEnvelope,
): Readonly<Record<string, unknown>> {
	if (envelope.error !== null) {
		return failedAttempt(
			route,
			binding,
			"BatchRequestError",
			envelope.error.message ?? "Batch request failed without a message.",
			envelope.error.code,
		);
	}
	if (envelope.response?.status_code !== 200) {
		return failedAttempt(
			route,
			binding,
			"BatchHttpError",
			`Batch request returned HTTP ${String(envelope.response?.status_code)}.`,
			undefined,
			envelope.response?.status_code,
		);
	}
	const body = envelope.response.body;
	let metadata: Readonly<Record<string, unknown>> | undefined;
	try {
		const rawOutputText = extractOutputText(body);
		metadata = {
			rawOutputText,
			resolvedModel: requireString(body.model, "response model"),
			responseId: requireString(body.id, "response ID"),
			usage: body.usage ?? null,
		};
		if (body.status !== "completed") {
			throw new Error(
				`Responses API body is not completed (status: ${String(body.status)}).`,
			);
		}
		const output = route.outputSchema.parse(JSON.parse(rawOutputText));
		const evaluation = route.evaluate({
			caseId: binding.caseId,
			input: binding.input,
			idealOutput: binding.idealOutput,
			output,
		});
		return {
			caseId: binding.caseId,
			input: binding.input,
			idealOutput: binding.idealOutput,
			output,
			...evaluation,
			latencyMs: UNAVAILABLE_REQUEST_LATENCY_MS,
			...metadata,
			missClassification: null,
			missClassificationExplanation: null,
		};
	} catch (cause) {
		return failedAttempt(
			route,
			binding,
			cause instanceof Error ? cause.name : "BatchResponseError",
			cause instanceof Error ? cause.message : String(cause),
			undefined,
			undefined,
			metadata,
		);
	}
}

function failedAttempt(
	route: BatchRoute,
	binding: {
		readonly caseId: string;
		readonly input: unknown;
		readonly idealOutput: unknown;
	},
	name: string,
	message: string,
	code?: string,
	status?: number,
	metadata?: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
	const passingShape = route.evaluate({
		caseId: binding.caseId,
		input: binding.input,
		idealOutput: binding.idealOutput,
		output: binding.idealOutput,
	});
	return {
		caseId: binding.caseId,
		input: binding.input,
		idealOutput: binding.idealOutput,
		...Object.fromEntries(
			Object.keys(passingShape).map((key) => [key, false]),
		),
		latencyMs: UNAVAILABLE_REQUEST_LATENCY_MS,
		...metadata,
		error: {
			name,
			message,
			...(status === undefined ? undefined : { status }),
			...(code === undefined ? undefined : { code }),
		},
		missClassification: null,
		missClassificationExplanation: null,
	};
}

export function extractOutputText(
	body: Readonly<Record<string, unknown>>,
): string {
	if (!Array.isArray(body.output)) {
		throw new Error("Responses API body has no output array.");
	}
	const texts: string[] = [];
	for (const item of body.output) {
		if (
			typeof item !== "object" ||
			item === null ||
			!("type" in item) ||
			item.type !== "message" ||
			!("content" in item) ||
			!Array.isArray(item.content)
		) {
			continue;
		}
		for (const content of item.content) {
			if (
				typeof content === "object" &&
				content !== null &&
				"type" in content &&
				content.type === "output_text" &&
				"text" in content &&
				typeof content.text === "string"
			) {
				texts.push(content.text);
			}
			if (
				typeof content === "object" &&
				content !== null &&
				"type" in content &&
				content.type === "refusal" &&
				"refusal" in content &&
				typeof content.refusal === "string"
			) {
				throw new Error(
					`OpenAI refused the request: ${content.refusal}`,
				);
			}
		}
	}
	if (texts.length === 0) {
		throw new Error("Responses API body has no structured output text.");
	}
	const derived = texts.join("");
	if (body.output_text !== undefined && body.output_text !== derived) {
		throw new Error(
			"Responses API output_text helper disagrees with message output blocks.",
		);
	}
	return derived;
}

export function assertBatchSubmissionCurrent(
	manifest: BatchManifest,
	routes: readonly BatchRoute[] = routesForManifest(manifest),
): void {
	assertSelectedRoutes(routes);
	assertRouteSelectionMatchesManifest(manifest, routes);
	const resultPaths = Object.fromEntries(
		manifest.submission.routes.map(({ slug, resultPath }) => [
			slug,
			resultPath,
		]),
	);
	const current = buildSubmission({
		inputPath: manifest.submission.input.localPath,
		resultPaths,
		routes,
	});
	if (stableJson(current.submission) !== stableJson(manifest.submission)) {
		throw new Error(
			"Batch submission has drifted from current prompts, schemas, cases, ideals, requests, or runner bindings.",
		);
	}
	if (current.submission.input.sha256 !== manifest.submission.input.sha256) {
		throw new Error(
			"Batch input JSONL hash does not match current submission.",
		);
	}
}

function indexEnvelopes(
	envelopes: readonly ParsedEnvelope[],
): ReadonlyMap<string, ParsedEnvelope> {
	const indexed = new Map<string, ParsedEnvelope>();
	for (const envelope of envelopes) {
		if (indexed.has(envelope.custom_id)) {
			throw new Error(
				`Duplicate batch result custom_id "${envelope.custom_id}".`,
			);
		}
		indexed.set(envelope.custom_id, envelope);
	}
	return indexed;
}

function assertExactCustomIds(
	expected: readonly string[],
	actual: ReadonlyMap<string, ParsedEnvelope>,
): void {
	const expectedSet = new Set(expected);
	const missing = expected.filter((customId) => !actual.has(customId));
	const unknown = [...actual.keys()].filter(
		(customId) => !expectedSet.has(customId),
	);
	if (missing.length > 0 || unknown.length > 0) {
		throw new Error(
			`Batch custom_id set mismatch (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}).`,
		);
	}
}

function assertRequestCounts(
	counts: BatchSnapshot["requestCounts"],
	completed: number,
	failed: number,
	expected: number,
): void {
	if (
		counts.total !== expected ||
		counts.completed !== completed ||
		counts.failed !== failed ||
		completed + failed !== expected
	) {
		throw new Error(
			"Batch request_counts do not reconcile with output and error files.",
		);
	}
}

function assertArtifactFileId(
	artifact: RawBatchArtifact | null,
	expectedFileId: string | null,
	label: string,
): void {
	if (
		expectedFileId === null
			? artifact !== null
			: artifact?.fileId !== expectedFileId
	) {
		throw new Error(
			`Collected ${label} artifact does not match its file ID.`,
		);
	}
}

function artifactRecord(artifact: RawBatchArtifact | null, lineCount: number) {
	return artifact === null
		? null
		: {
				fileId: artifact.fileId,
				localPath: artifact.localPath,
				sha256: sha256(artifact.content),
				lineCount,
			};
}

export function selectBatchRoutes(
	slugs: readonly string[],
): readonly BatchRoute[] {
	assertCanonicalRouteSlugs(slugs);
	const bySlug = new Map(BATCH_ROUTES.map((route) => [route.slug, route]));
	return Object.freeze(
		slugs.map((slug) => {
			const route = bySlug.get(slug);
			if (!route) {
				throw new Error(`Unknown Batch route slug "${slug}".`);
			}
			return route;
		}),
	);
}

export function routesForManifest(
	manifest: BatchManifest,
): readonly BatchRoute[] {
	const parsed = batchManifestSchema.parse(manifest);
	return selectBatchRoutes(parsed.submission.routes.map(({ slug }) => slug));
}

function assertSelectedRoutes(routes: readonly BatchRoute[]): void {
	assertCanonicalRouteSlugs(routes.map(({ slug }) => slug));
}

function assertCanonicalRouteSlugs(slugs: readonly string[]): void {
	const canonical = BATCH_ROUTES.map(({ slug }) => slug);
	if (slugs.length === 0) {
		throw new Error("At least one Batch route must be selected.");
	}
	const unknown = slugs.filter((slug) => !canonical.includes(slug));
	if (unknown.length > 0) {
		throw new Error(
			`Unknown Batch route slug${unknown.length === 1 ? "" : "s"}: ${[...new Set(unknown)].join(", ")}.`,
		);
	}
	if (new Set(slugs).size !== slugs.length) {
		throw new Error("Batch route selection must not contain duplicates.");
	}
	const canonicalSelection = canonical.filter((slug) => slugs.includes(slug));
	if (stableJson(slugs) !== stableJson(canonicalSelection)) {
		throw new Error(
			`Batch routes must follow canonical order: ${canonical.join(", ")}.`,
		);
	}
}

function assertRouteSelectionMatchesManifest(
	manifest: BatchManifest,
	routes: readonly BatchRoute[],
): void {
	const retained = manifest.submission.routes.map(({ slug }) => slug);
	const actual = routes.map(({ slug }) => slug);
	if (stableJson(actual) !== stableJson(retained)) {
		throw new Error(
			`Batch route selection does not match manifest routes (${retained.join(", ")}).`,
		);
	}
}

function assertSharedPolicy(
	binding: Readonly<Record<string, unknown>>,
	slug: string,
): void {
	if (
		binding.model !== DUMGEN_GENERATION_MODEL ||
		binding.reasoningEffort !== DUMGEN_REASONING_EFFORT ||
		binding.store !== false
	) {
		throw new Error(
			`Batch route "${slug}" is not bound to Luna/none/store=false.`,
		);
	}
}

function readMaxOutputTokens(
	binding: Readonly<Record<string, unknown>>,
	slug: string,
): number {
	const value = binding.runMaxOutputTokens ?? binding.maxOutputTokens;
	if (!Number.isSafeInteger(value) || Number(value) < 1) {
		throw new Error(
			`Batch route "${slug}" has no valid output-token bound.`,
		);
	}
	return Number(value);
}

function emptyBatchSnapshot(): BatchSnapshot {
	return {
		id: null,
		status: "prepared",
		inputFileId: null,
		outputFileId: null,
		errorFileId: null,
		requestCounts: { total: 0, completed: 0, failed: 0 },
		createdAtEpoch: null,
		expiresAtEpoch: null,
		inProgressAtEpoch: null,
		finalizingAtEpoch: null,
		completedAtEpoch: null,
		failedAtEpoch: null,
		expiredAtEpoch: null,
		cancellingAtEpoch: null,
		cancelledAtEpoch: null,
		errors: null,
	};
}

function epochToIso(epoch: number): string {
	return new Date(epoch * 1000).toISOString();
}

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function requireString(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Missing ${label}.`);
	}
	return value;
}
