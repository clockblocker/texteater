// PROTOTYPE ONLY — OpenAI Batch transport retained for excluded Collocation work.

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import OpenAI, { toFile } from "openai";
import type { Batch } from "openai/resources/batches";

import { stableJson } from "../../../src/lib/stable-json";
import {
	assertBatchSubmissionCurrent,
	BATCH_COMPLETION_WINDOW,
	BATCH_ENDPOINT,
	type BatchManifest,
	type BatchSnapshot,
	batchManifestSchema,
	collectBatch,
	prepareBatch,
	type RawBatchArtifact,
	routesForManifest,
	selectBatchRoutes,
	withBatchSnapshot,
	withUploadedInput,
} from "./batch";
import { BATCH_ROUTES } from "./routes";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const MANIFEST_NAME = "manifest.json";
const INPUT_NAME = "input.jsonl";
const OUTPUT_NAME = "output.jsonl";
const ERROR_NAME = "error.jsonl";
const TERMINAL_STATUSES = new Set([
	"failed",
	"completed",
	"expired",
	"cancelled",
]);

export async function submitBatch(
	runDirectory?: string,
	routes = BATCH_ROUTES,
): Promise<string> {
	const runDir = runDirectory
		? resolve(runDirectory)
		: join(RUNS, filesystemTimestamp(new Date()));
	await mkdir(dirname(runDir), { recursive: true });
	await mkdir(runDir);

	const inputPath = join(runDir, INPUT_NAME);
	const manifestPath = join(runDir, MANIFEST_NAME);
	const resultPaths = Object.fromEntries(
		routes.map((route) => [
			route.slug,
			join(
				HERE,
				`../grammatical-resolution-${route.slug}`,
				"runs",
				basename(runDir),
				"results.json",
			),
		]),
	);
	const prepared = prepareBatch({ inputPath, resultPaths, routes });
	await writeFile(inputPath, prepared.jsonl, {
		encoding: "utf8",
		flag: "wx",
	});
	await writeManifest(manifestPath, prepared.manifest);

	const client = createClient();
	const uploaded = await client.files.create({
		file: await toFile(
			new TextEncoder().encode(prepared.jsonl),
			INPUT_NAME,
			{
				type: "application/jsonl",
			},
		),
		purpose: "batch",
	});
	let manifest = withUploadedInput(prepared.manifest, uploaded.id);
	await writeManifest(manifestPath, manifest);

	const batch = await client.batches.create({
		input_file_id: uploaded.id,
		endpoint: BATCH_ENDPOINT,
		completion_window: BATCH_COMPLETION_WINDOW,
	});
	manifest = withBatchSnapshot(manifest, snapshotFromBatch(batch, manifest));
	await writeManifest(manifestPath, manifest);
	return manifestPath;
}

export async function refreshBatchStatus(
	manifestPath: string,
): Promise<BatchManifest> {
	let manifest = await readManifest(manifestPath);
	const batchId = requireRemoteId(manifest.remote.batch.id, "batch ID");
	const client = createClient();
	const batch = await client.batches.retrieve(batchId);
	manifest = withBatchSnapshot(manifest, snapshotFromBatch(batch, manifest));
	await writeManifest(manifestPath, manifest);
	return manifest;
}

export async function collectCompletedBatch(
	manifestPath: string,
): Promise<BatchManifest> {
	let manifest = await refreshBatchStatus(manifestPath);
	const routes = routesForManifest(manifest);
	assertBatchSubmissionCurrent(manifest, routes);
	if (manifest.collection.collectedAt !== null) {
		throw new Error("This Batch manifest has already been collected.");
	}
	if (manifest.remote.batch.status !== "completed") {
		throw new Error(
			`Only a completed batch can be collected; current status is "${manifest.remote.batch.status}".`,
		);
	}

	const client = createClient();
	const runDir = dirname(resolve(manifestPath));
	const output = await downloadArtifact(
		client,
		manifest.remote.batch.outputFileId,
		join(runDir, OUTPUT_NAME),
	);
	const error = await downloadArtifact(
		client,
		manifest.remote.batch.errorFileId,
		join(runDir, ERROR_NAME),
	);
	const collected = collectBatch({ manifest, output, error, routes });

	for (const route of collected.manifest.submission.routes) {
		const result = collected.resultsBySlug[route.slug];
		if (result === undefined) {
			throw new Error(
				`Collected result is missing route "${route.slug}".`,
			);
		}
		await mkdir(dirname(route.resultPath), { recursive: true });
		await atomicWrite(route.resultPath, `${stableJson(result)}\n`);
	}
	manifest = collected.manifest;
	await writeManifest(manifestPath, manifest);
	return manifest;
}

export function snapshotFromBatch(
	batch: Batch,
	manifest: BatchManifest,
): BatchSnapshot {
	if (
		batch.id !== manifest.remote.batch.id &&
		manifest.remote.batch.id !== null
	) {
		throw new Error("Retrieved batch ID does not match the manifest.");
	}
	if (batch.input_file_id !== manifest.remote.inputFileId) {
		throw new Error(
			"Retrieved batch input file ID does not match the manifest.",
		);
	}
	if (batch.endpoint !== BATCH_ENDPOINT) {
		throw new Error(`Retrieved batch endpoint is "${batch.endpoint}".`);
	}
	if (batch.completion_window !== BATCH_COMPLETION_WINDOW) {
		throw new Error(
			`Retrieved batch completion window is "${batch.completion_window}".`,
		);
	}
	if (
		TERMINAL_STATUSES.has(batch.status) &&
		batch.request_counts === undefined
	) {
		throw new Error("Terminal batch is missing request_counts.");
	}
	return {
		id: batch.id,
		status: batch.status,
		inputFileId: batch.input_file_id,
		outputFileId: batch.output_file_id ?? null,
		errorFileId: batch.error_file_id ?? null,
		requestCounts: batch.request_counts ?? {
			total: 0,
			completed: 0,
			failed: 0,
		},
		createdAtEpoch: batch.created_at ?? null,
		expiresAtEpoch: batch.expires_at ?? null,
		inProgressAtEpoch: batch.in_progress_at ?? null,
		finalizingAtEpoch: batch.finalizing_at ?? null,
		completedAtEpoch: batch.completed_at ?? null,
		failedAtEpoch: batch.failed_at ?? null,
		expiredAtEpoch: batch.expired_at ?? null,
		cancellingAtEpoch: batch.cancelling_at ?? null,
		cancelledAtEpoch: batch.cancelled_at ?? null,
		errors: batch.errors ?? null,
	};
}

async function downloadArtifact(
	client: OpenAI,
	fileId: string | null,
	localPath: string,
): Promise<RawBatchArtifact | null> {
	if (fileId === null) return null;
	const content = await client.files
		.content(fileId)
		.then((response) => response.text());
	await atomicWrite(localPath, content);
	return { fileId, localPath, content };
}

function createClient(): OpenAI {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error(
			"OPENAI_API_KEY is required for submit, status, and collect.",
		);
	}
	return new OpenAI({ maxRetries: 0 });
}

async function readManifest(path: string): Promise<BatchManifest> {
	return batchManifestSchema.parse(JSON.parse(await readFile(path, "utf8")));
}

async function writeManifest(
	path: string,
	manifest: BatchManifest,
): Promise<void> {
	await atomicWrite(
		path,
		`${stableJson(batchManifestSchema.parse(manifest))}\n`,
	);
}

async function atomicWrite(path: string, value: string): Promise<void> {
	const temporaryPath = `${path}.tmp`;
	try {
		await writeFile(temporaryPath, value, "utf8");
		await rename(temporaryPath, path);
	} finally {
		await rm(temporaryPath, { force: true });
	}
}

function requireRemoteId(value: string | null, label: string): string {
	if (value === null) throw new Error(`Manifest is missing ${label}.`);
	return value;
}

function filesystemTimestamp(now: Date): string {
	return now.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function main(): Promise<void> {
	const [command, ...arguments_] = process.argv.slice(2);
	switch (command) {
		case "submit": {
			if (arguments_.length > 1)
				throw new Error("submit accepts at most one run directory.");
			const manifestPath = await submitBatch(arguments_[0]);
			console.log(`Submitted shared batch; manifest: ${manifestPath}`);
			return;
		}
		case "submit-routes": {
			if (arguments_.length < 1 || arguments_.length > 2) {
				throw new Error(
					"submit-routes requires a comma-separated route list and accepts one optional run directory.",
				);
			}
			const routeList = arguments_[0];
			if (routeList === undefined) {
				throw new Error("submit-routes requires a route list.");
			}
			const routes = selectBatchRoutes(parseRouteList(routeList));
			const manifestPath = await submitBatch(arguments_[1], routes);
			console.log(
				`Submitted ${routes.map(({ slug }) => slug).join(",")} batch; manifest: ${manifestPath}`,
			);
			return;
		}
		case "status": {
			if (arguments_.length !== 1 || !arguments_[0])
				throw new Error("status requires a manifest path.");
			const manifest = await refreshBatchStatus(resolve(arguments_[0]));
			console.log(
				stableJson({
					id: manifest.remote.batch.id,
					status: manifest.remote.batch.status,
					requestCounts: manifest.remote.batch.requestCounts,
					outputFileId: manifest.remote.batch.outputFileId,
					errorFileId: manifest.remote.batch.errorFileId,
				}),
			);
			return;
		}
		case "collect": {
			if (arguments_.length !== 1 || !arguments_[0])
				throw new Error("collect requires a manifest path.");
			const manifest = await collectCompletedBatch(
				resolve(arguments_[0]),
			);
			console.log(
				`Collected ${manifest.submission.input.requestCount} requests into ${manifest.submission.routes.length} route results.`,
			);
			return;
		}
		default:
			throw new Error(
				"Usage: run.ts submit [run-directory] | submit-routes <slug,slug> [run-directory] | status <manifest.json> | collect <manifest.json>",
			);
	}
}

export function parseRouteList(value: string): readonly string[] {
	if (value.length === 0) {
		throw new Error("Batch route list must not be empty.");
	}
	const slugs = value.split(",");
	if (slugs.some((slug) => slug.length === 0 || slug.trim() !== slug)) {
		throw new Error(
			"Batch route list must be comma-separated slugs without blanks or whitespace.",
		);
	}
	return slugs;
}

if (import.meta.main) {
	await main();
}
