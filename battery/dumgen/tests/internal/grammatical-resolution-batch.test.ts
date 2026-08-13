import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	assertBatchSubmissionCurrent,
	BATCH_COMPLETION_WINDOW,
	BATCH_ENDPOINT,
	BATCH_REQUEST_COUNT,
	batchManifestSchema,
	collectBatch,
	type PreparedBatch,
	prepareBatch,
	selectBatchRoutes,
	withBatchSnapshot,
	withUploadedInput,
} from "../../docs/prototypes/grammatical-resolution-batch/batch";
import { BATCH_ROUTES } from "../../docs/prototypes/grammatical-resolution-batch/routes";
import {
	parseRouteList,
	snapshotFromBatch,
} from "../../docs/prototypes/grammatical-resolution-batch/run";
import { stableJson } from "../../src/lib/stable-json";

const createdAtEpoch = 1_786_000_000;
const completedAtEpoch = createdAtEpoch + 120;

function preparedBatch(): PreparedBatch {
	return prepareBatch({
		inputPath: "/retained/batch/input.jsonl",
		resultPaths: Object.fromEntries(
			BATCH_ROUTES.map(({ slug }) => [
				slug,
				`/retained/${slug}/results.json`,
			]),
		),
		now: new Date("2026-08-03T10:00:00.000Z"),
	});
}

function completedManifest(prepared: PreparedBatch, failed = 0) {
	const requestCount = prepared.manifest.submission.input.requestCount;
	const uploaded = withUploadedInput(
		prepared.manifest,
		"file-input",
		new Date("2026-08-03T10:01:00.000Z"),
	);
	return withBatchSnapshot(
		uploaded,
		{
			id: "batch-shared",
			status: "completed",
			inputFileId: "file-input",
			outputFileId: failed === requestCount ? null : "file-output",
			errorFileId: failed === 0 ? null : "file-error",
			requestCounts: {
				total: requestCount,
				completed: requestCount - failed,
				failed,
			},
			createdAtEpoch,
			expiresAtEpoch: createdAtEpoch + 86_400,
			inProgressAtEpoch: createdAtEpoch + 2,
			finalizingAtEpoch: completedAtEpoch - 2,
			completedAtEpoch,
			failedAtEpoch: null,
			expiredAtEpoch: null,
			cancellingAtEpoch: null,
			cancelledAtEpoch: null,
			errors: null,
		},
		new Date("2026-08-03T10:02:00.000Z"),
	);
}

function successEnvelope(
	binding: PreparedBatch["manifest"]["submission"]["routes"][number]["cases"][number],
	index: number,
	overrideBody?: Readonly<Record<string, unknown>>,
) {
	const raw = stableJson(binding.idealOutput);
	return {
		id: `batch-request-${index}`,
		custom_id: binding.customId,
		response: {
			status_code: 200,
			request_id: `request-${index}`,
			body: {
				id: `response-${index}`,
				model: "gpt-5.6-luna-2026-07-01",
				status: "completed",
				output: [
					{
						type: "reasoning",
						content: [
							{ type: "output_text", text: "must-not-be-read" },
						],
					},
					{
						type: "message",
						content: [{ type: "output_text", text: raw }],
					},
				],
				output_text: raw,
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				...overrideBody,
			},
		},
		error: null,
	};
}

function errorEnvelope(
	binding: PreparedBatch["manifest"]["submission"]["routes"][number]["cases"][number],
	index: number,
) {
	return {
		id: `batch-request-${index}`,
		custom_id: binding.customId,
		response: null,
		error: { code: "batch_request_failed", message: "synthetic failure" },
	};
}

function allBindings(prepared: PreparedBatch) {
	return prepared.manifest.submission.routes.flatMap(({ cases }) => cases);
}

function jsonl(values: readonly unknown[]): string {
	return `${values.map((value) => stableJson(value)).join("\n")}\n`;
}

test("retained Batch input immutably binds Collocation's 20 requests", () => {
	const prepared = preparedBatch();
	const requests = prepared.jsonl
		.trimEnd()
		.split("\n")
		.map((line) => JSON.parse(line));

	expect(prepared.requests).toHaveLength(BATCH_REQUEST_COUNT);
	expect(requests).toHaveLength(BATCH_REQUEST_COUNT);
	expect(prepared.manifest.submission.routes.map(({ slug }) => slug)).toEqual(
		["collocation"],
	);
	expect(
		prepared.manifest.submission.routes.map(({ cases }) => cases.length),
	).toEqual([20]);
	expect(new Set(requests.map(({ custom_id }) => custom_id)).size).toBe(
		BATCH_REQUEST_COUNT,
	);
	expect(createHash("sha256").update(prepared.jsonl).digest("hex")).toBe(
		prepared.manifest.submission.input.sha256,
	);

	for (const [index, request] of requests.entries()) {
		const retained = allBindings(prepared)[index];
		expect(request).toEqual(retained?.request);
		expect(request.method).toBe("POST");
		expect(request.url).toBe(BATCH_ENDPOINT);
		expect(request.body.model).toBe("gpt-5.6-luna");
		expect(request.body.reasoning).toEqual({ effort: "none" });
		expect(request.body.store).toBe(false);
		expect(request.body.text.verbosity).toBe("low");
		expect(request.body.text.format.type).toBe("json_schema");
		expect(request.body.max_output_tokens).toBeGreaterThan(0);
		expect(retained?.requestSha256).toMatch(/^[0-9a-f]{64}$/);
	}
	expect(prepared.manifest.submission.completionWindow).toBe(
		BATCH_COMPLETION_WINDOW,
	);
	expect(JSON.stringify(prepared.manifest)).not.toContain("OPENAI_API_KEY");
});

test("selected remediation route prepares and collects one exact 20-request Batch", () => {
	const routes = selectBatchRoutes(["collocation"]);
	const prepared = prepareBatch({
		inputPath: "/retained/remediation/input.jsonl",
		resultPaths: {
			collocation: "/retained/collocation/results.json",
		},
		routes,
		now: new Date("2026-08-03T11:00:00.000Z"),
	});
	const requests = prepared.jsonl
		.trimEnd()
		.split("\n")
		.map((line) => JSON.parse(line));

	expect(prepared.manifest.manifestVersion).toBe(1);
	expect(prepared.manifest.submission.routes.map(({ slug }) => slug)).toEqual(
		["collocation"],
	);
	expect(prepared.manifest.submission.input.requestCount).toBe(20);
	expect(prepared.requests).toHaveLength(20);
	expect(requests).toHaveLength(20);
	expect(new Set(requests.map(({ custom_id }) => custom_id)).size).toBe(20);
	expect(requests[0]?.custom_id).toMatch(/^collocation--/);
	expect(requests.at(-1)?.custom_id).toMatch(/^collocation--/);
	expect(createHash("sha256").update(prepared.jsonl).digest("hex")).toBe(
		prepared.manifest.submission.input.sha256,
	);
	expect(batchManifestSchema.parse(prepared.manifest)).toEqual(
		prepared.manifest,
	);

	const manifest = completedManifest(prepared);
	const outputContent = jsonl(
		allBindings(prepared)
			.map((binding, index) => successEnvelope(binding, index))
			.reverse(),
	);
	const collected = collectBatch({
		manifest,
		output: {
			fileId: "file-output",
			localPath: "/retained/remediation/output.jsonl",
			content: outputContent,
		},
		error: null,
		now: new Date("2026-08-03T11:03:00.000Z"),
	});

	expect(Object.keys(collected.resultsBySlug)).toEqual(["collocation"]);
	expect(collected.manifest.remote.output?.lineCount).toBe(20);
	expect(collected.manifest.collection.envelopes).toHaveLength(20);
	for (const result of Object.values(collected.resultsBySlug)) {
		const retained = result as {
			boundedCalls: number;
			contractScore: number;
			batchProvenance: { requestCounts: { total: number } };
		};
		expect(retained.boundedCalls).toBe(20);
		expect(retained.contractScore).toBe(20);
		expect(retained.batchProvenance.requestCounts.total).toBe(20);
	}
});

test("remediation route selection rejects empty, duplicate, and unknown lists", () => {
	expect(() => selectBatchRoutes([])).toThrow(/At least one/);
	expect(() => selectBatchRoutes(["collocation", "collocation"])).toThrow(
		/duplicates/,
	);
	expect(() => selectBatchRoutes(["collocation", "unknown"])).toThrow(
		/Unknown.*unknown/,
	);
	expect(() => parseRouteList("")).toThrow(/must not be empty/);
	expect(() => parseRouteList("collocation, idiom")).toThrow(/whitespace/);
	expect(parseRouteList("collocation")).toEqual(["collocation"]);
});

test("manifest hash and current-source drift are rejected before collection", () => {
	const prepared = preparedBatch();
	const firstRoute = prepared.manifest.submission.routes[0];
	if (!firstRoute) throw new Error("Expected a retained route.");
	expect(() =>
		batchManifestSchema.parse({
			...prepared.manifest,
			submission: {
				...prepared.manifest.submission,
				routes: [
					{ ...firstRoute, resultPath: "/tampered/results.json" },
					...prepared.manifest.submission.routes.slice(1),
				],
			},
		}),
	).toThrow(/Submission hash/);

	const firstBatchRoute = BATCH_ROUTES[0];
	if (!firstBatchRoute) throw new Error("Expected a Batch route adapter.");
	const driftedRoutes = [
		{
			...firstBatchRoute,
			currentBinding: () => ({
				...firstBatchRoute.currentBinding(),
				promptSha256: "0".repeat(64),
			}),
		},
		...BATCH_ROUTES.slice(1),
	];
	expect(() =>
		assertBatchSubmissionCurrent(prepared.manifest, driftedRoutes),
	).toThrow(/drifted/);
});

test("remote Batch snapshots normalize optional fields and require terminal counts", () => {
	const prepared = preparedBatch();
	const uploaded = withUploadedInput(prepared.manifest, "file-input");
	const remote = {
		id: "batch-shared",
		object: "batch" as const,
		endpoint: BATCH_ENDPOINT,
		completion_window: BATCH_COMPLETION_WINDOW,
		input_file_id: "file-input",
		status: "in_progress" as const,
		created_at: createdAtEpoch,
	};
	expect(snapshotFromBatch(remote, uploaded)).toEqual({
		id: "batch-shared",
		status: "in_progress",
		inputFileId: "file-input",
		outputFileId: null,
		errorFileId: null,
		requestCounts: { total: 0, completed: 0, failed: 0 },
		createdAtEpoch,
		expiresAtEpoch: null,
		inProgressAtEpoch: null,
		finalizingAtEpoch: null,
		completedAtEpoch: null,
		failedAtEpoch: null,
		expiredAtEpoch: null,
		cancellingAtEpoch: null,
		cancelledAtEpoch: null,
		errors: null,
	});
	expect(() =>
		snapshotFromBatch({ ...remote, status: "completed" }, uploaded),
	).toThrow(/request_counts/);
	expect(() =>
		snapshotFromBatch(
			{ ...remote, endpoint: "/v1/chat/completions" },
			uploaded,
		),
	).toThrow(/endpoint/);
});

test("collection maps arbitrary output order and creates strict route evidence", () => {
	const prepared = preparedBatch();
	const manifest = completedManifest(prepared);
	const envelopes = allBindings(prepared)
		.map((binding, index) => successEnvelope(binding, index))
		.reverse();
	const outputContent = jsonl(envelopes);
	const collected = collectBatch({
		manifest,
		output: {
			fileId: "file-output",
			localPath: "/retained/batch/output.jsonl",
			content: outputContent,
		},
		error: null,
		now: new Date("2026-08-03T10:03:00.000Z"),
	});

	expect(Object.keys(collected.resultsBySlug)).toEqual(
		BATCH_ROUTES.map(({ slug }) => slug),
	);
	for (const result of Object.values(collected.resultsBySlug)) {
		const retained = result as {
			transport: string;
			contractScore: number;
			boundedCalls: number;
			attempts: readonly { latencyMs: number | null }[];
			batchProvenance: {
				submissionManifestSha256: string;
				outputJsonlSha256: string;
			};
		};
		expect(retained.transport).toBe("openai-batch-v1");
		expect(retained.contractScore).toBe(20);
		expect(retained.boundedCalls).toBe(20);
		expect(
			retained.attempts.every(({ latencyMs }) => latencyMs === null),
		).toBe(true);
		expect(retained.batchProvenance.submissionManifestSha256).toBe(
			manifest.submissionSha256,
		);
		expect(retained.batchProvenance.outputJsonlSha256).toBe(
			createHash("sha256").update(outputContent).digest("hex"),
		);
	}
	expect(collected.manifest.remote.output?.lineCount).toBe(
		BATCH_REQUEST_COUNT,
	);
	expect(collected.manifest.remote.output?.localPath).toBe(
		"/retained/batch/output.jsonl",
	);
	const firstEnvelope = envelopes[0];
	if (!firstEnvelope) throw new Error("Expected a retained envelope.");
	expect(collected.manifest.collection.envelopes[0]).toEqual({
		source: "output",
		customId: firstEnvelope.custom_id,
		envelopeId: firstEnvelope.id,
		requestId: firstEnvelope.response.request_id,
		statusCode: 200,
		error: null,
	});
	expect(() =>
		collectBatch({
			manifest: collected.manifest,
			output: {
				fileId: "file-output",
				localPath: "/retained/batch/output.jsonl",
				content: outputContent,
			},
			error: null,
		}),
	).toThrow(/already been collected/);
});

test("collection unions the error file and rejects corrupt ID/count/file contracts", () => {
	const prepared = preparedBatch();
	const bindings = allBindings(prepared);
	const failedBinding = bindings.at(-1);
	if (!failedBinding) throw new Error("Expected a retained case.");
	const successes = bindings
		.slice(0, -1)
		.map((binding, index) => successEnvelope(binding, index));
	const failure = errorEnvelope(failedBinding, bindings.length - 1);
	const manifest = completedManifest(prepared, 1);
	const output = {
		fileId: "file-output",
		localPath: "/retained/batch/output.jsonl",
		content: jsonl(successes),
	};
	const error = {
		fileId: "file-error",
		localPath: "/retained/batch/error.jsonl",
		content: jsonl([failure]),
	};
	const collected = collectBatch({ manifest, output, error });
	const collocation = collected.resultsBySlug.collocation as {
		executionErrorCount: number;
		attempts: readonly {
			error?: { code?: string };
			latencyMs: number | null;
		}[];
	};
	expect(collocation.executionErrorCount).toBe(1);
	expect(collocation.attempts.at(-1)?.error?.code).toBe(
		"batch_request_failed",
	);
	expect(collocation.attempts.at(-1)?.latencyMs).toBeNull();
	expect(collected.manifest.remote.error?.lineCount).toBe(1);

	expect(() =>
		collectBatch({
			manifest,
			output: { ...output, content: jsonl([...successes, successes[0]]) },
			error,
		}),
	).toThrow(/Duplicate/);
	expect(() =>
		collectBatch({
			manifest,
			output: { ...output, content: jsonl(successes.slice(1)) },
			error,
		}),
	).toThrow(/missing:/);
	expect(() =>
		collectBatch({
			manifest,
			output: {
				...output,
				content: jsonl([
					...successes.slice(1),
					{ ...successes[0], custom_id: "unknown--case" },
				]),
			},
			error,
		}),
	).toThrow(/unknown:/);
	expect(() =>
		collectBatch({
			manifest,
			output: { ...output, fileId: "wrong" },
			error,
		}),
	).toThrow(/file ID/);
	expect(() =>
		collectBatch({
			manifest: withBatchSnapshot(manifest, {
				...manifest.remote.batch,
				requestCounts: {
					total: BATCH_REQUEST_COUNT,
					completed: BATCH_REQUEST_COUNT,
					failed: 0,
				},
			}),
			output,
			error,
		}),
	).toThrow(/request_counts/);
});

test("collection requires completed status and derives text only from message blocks", () => {
	const prepared = preparedBatch();
	const completed = completedManifest(prepared);
	const bindings = allBindings(prepared);
	const envelopes = bindings.map((binding, index) =>
		successEnvelope(binding, index),
	);
	const output = {
		fileId: "file-output",
		localPath: "/retained/batch/output.jsonl",
		content: jsonl(envelopes),
	};
	expect(() =>
		collectBatch({
			manifest: withBatchSnapshot(completed, {
				...completed.remote.batch,
				status: "expired",
			}),
			output,
			error: null,
		}),
	).toThrow(/Only a completed batch/);

	const first = bindings[0];
	if (!first) throw new Error("Expected a retained case.");
	const helperMismatch = successEnvelope(first, 0, {
		output_text: "helper-does-not-match-message",
	});
	const withMismatch = [helperMismatch, ...envelopes.slice(1)];
	const collected = collectBatch({
		manifest: completed,
		output: { ...output, content: jsonl(withMismatch) },
		error: null,
	});
	const collocation = collected.resultsBySlug.collocation as {
		executionErrorCount: number;
		attempts: readonly { error?: { message: string } }[];
	};
	expect(collocation.executionErrorCount).toBe(1);
	expect(collocation.attempts[0]?.error?.message).toMatch(/disagrees/);
});
