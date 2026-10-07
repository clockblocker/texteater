/**
 * A free no-change check (#1035): every case's requests to jev and Luna,
 * built offline, saved as a request run, and two request runs diffed case
 * by case (`bun run evaluate --experiment <id> --requests`, then
 * `--compare`). A change that leaves every case's requests and outcomes
 * as they were behaves as it did, whatever answers the requests meet; it
 * needs no cached answer for the change and no repin.
 *
 * Each experiment says where its answers come from (`experiments.ts`):
 * segment.inUnits reads the lab's cache and answers a miss with the
 * projection's stand-ins, so a pure refactor walks the paths real answers
 * took; resolve.grammar answers with its gold. A request keeps its key and
 * question order, which is part of what jev reads, so requests compare as
 * `JSON.stringify` writes them, not canonically.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import type { JsonValue } from "@typesafe-ai/sdk";

/** One request a case sends, at one repetition. */
export type RecordedRequest =
	| {
			readonly executor: "jev";
			readonly stage: string;
			readonly repetition: number;
			readonly state: unknown;
			readonly questions: Readonly<Record<string, unknown>>;
	  }
	| {
			readonly executor: "luna";
			readonly stage: string;
			readonly repetition: number;
			readonly request: unknown;
	  };

/** A case's requests in a stable order, and what each repetition returned or why it failed. */
export type CaseRequests = {
	readonly id: string;
	readonly requests: readonly RecordedRequest[];
	readonly outcomes: readonly unknown[];
};

export type RequestRun = {
	readonly runId: string;
	readonly experimentId: string;
	readonly sourceRevision: string;
	readonly createdAt: string;
	/** Where the answers came from, and how many each source gave. */
	readonly answers: Readonly<Record<string, JsonValue>>;
	readonly cases: readonly CaseRequests[];
};

/** The order a case's requests are kept and compared in: concurrent stages may send theirs in any order. */
export const sortedRequests = (requests: readonly RecordedRequest[]) =>
	requests
		.map((request) => ({ request, key: JSON.stringify(request) }))
		.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
		.map(({ request }) => request);

export const newRequestRunId = () =>
	`${new Date().toISOString().replace(/[:.]/gu, "-")}-${randomUUID().slice(0, 8)}`;

const pathOf = (outputDirectory: string, runId: string) =>
	join(outputDirectory, "requests", `${runId}.json.gz`);

/** Whether `runId` names a request run in `outputDirectory`. */
export const isRequestRun = (outputDirectory: string, runId: string) =>
	existsSync(pathOf(outputDirectory, runId));

/** Saves `run` gzipped and returns its path. */
export async function saveRequestRun(
	outputDirectory: string,
	run: RequestRun,
): Promise<string> {
	const path = pathOf(outputDirectory, run.runId);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, gzipSync(JSON.stringify(run)));
	return path;
}

export async function loadRequestRun(
	outputDirectory: string,
	runId: string,
): Promise<RequestRun> {
	return JSON.parse(
		gunzipSync(await readFile(pathOf(outputDirectory, runId))).toString(
			"utf8",
		),
	) as RequestRun;
}

/** How many paths of a difference are listed before the rest are counted. */
const listedPaths = 8;

/** The paths at which two JSON values differ, `listedPaths` at most. */
function differingPaths(left: unknown, right: unknown, at = ""): string[] {
	if (JSON.stringify(left) === JSON.stringify(right)) return [];
	const isObject = (value: unknown): value is Record<string, unknown> =>
		typeof value === "object" && value !== null;
	if (!isObject(left) || !isObject(right)) return [at || "(value)"];
	const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
	const paths: string[] = [];
	for (const key of keys) {
		const path = at ? `${at}.${key}` : key;
		if (!(key in left)) paths.push(`+${path}`);
		else if (!(key in right)) paths.push(`-${path}`);
		else paths.push(...differingPaths(left[key], right[key], path));
		if (paths.length >= listedPaths) break;
	}
	// The same keys in another order.
	return paths.length > 0 ? paths : [`${at ? `${at} ` : ""}(key order)`];
}

/** Each request in `from` that `without` lacks, counted as a multiset. */
function lacking(
	from: readonly RecordedRequest[],
	without: readonly RecordedRequest[],
): RecordedRequest[] {
	const counts = new Map<string, number>();
	for (const request of without) {
		const key = JSON.stringify(request);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return from.filter((request) => {
		const key = JSON.stringify(request);
		const count = counts.get(key) ?? 0;
		if (count === 0) return true;
		counts.set(key, count - 1);
		return false;
	});
}

const slotOf = (request: RecordedRequest) =>
	`${request.executor} ${request.stage} #${request.repetition}`;

/**
 * A case's changed requests: each request only one side sends, paired by
 * executor, stage and repetition where both sides have one, with the paths
 * at which the pair differs.
 */
function requestChanges(
	left: readonly RecordedRequest[],
	right: readonly RecordedRequest[],
) {
	const removed = lacking(left, right);
	const added = lacking(right, left);
	const changes: {
		readonly request: string;
		readonly differs?: readonly string[];
		readonly only?: "left" | "right";
	}[] = [];
	const pending = [...added];
	for (const before of removed) {
		const index = pending.findIndex(
			(after) => slotOf(after) === slotOf(before),
		);
		const after = index >= 0 ? pending.splice(index, 1)[0] : undefined;
		if (!after) {
			changes.push({ request: slotOf(before), only: "left" });
			continue;
		}
		changes.push({
			request: slotOf(before),
			differs:
				before.executor === "jev" && after.executor === "jev"
					? [
							...differingPaths(before.state, after.state).map(
								(path) => `state.${path}`,
							),
							...differingPaths(
								before.questions,
								after.questions,
							),
						]
					: differingPaths(before, after),
		});
	}
	for (const after of pending)
		changes.push({ request: slotOf(after), only: "right" });
	return changes;
}

/**
 * Two request runs side by side: the cases only one has, and every shared
 * case whose requests or outcomes differ, with where they differ.
 */
export function compareRequestRuns(left: RequestRun, right: RequestRun) {
	const rightCases = new Map(right.cases.map((entry) => [entry.id, entry]));
	const leftIds = new Set(left.cases.map(({ id }) => id));
	const changed = left.cases.flatMap((before) => {
		const after = rightCases.get(before.id);
		if (!after) return [];
		const requests = requestChanges(before.requests, after.requests);
		const repetitions = Math.max(
			before.outcomes.length,
			after.outcomes.length,
		);
		const outcomes = Array.from(
			{ length: repetitions },
			(_, repetition) => ({
				repetition,
				differs: differingPaths(
					before.outcomes[repetition],
					after.outcomes[repetition],
				),
			}),
		).filter(({ differs }) => differs.length > 0);
		if (requests.length === 0 && outcomes.length === 0) return [];
		return [
			{
				caseId: before.id,
				...(requests.length > 0 ? { requests } : {}),
				...(outcomes.length > 0 ? { outcomes } : {}),
			},
		];
	});
	const onlyLeft = [...leftIds].filter((id) => !rightCases.has(id));
	const onlyRight = right.cases
		.map(({ id }) => id)
		.filter((id) => !leftIds.has(id));
	const side = (run: RequestRun) => ({
		runId: run.runId,
		experimentId: run.experimentId,
		sourceRevision: run.sourceRevision,
		cases: run.cases.length,
		requests: run.cases.reduce(
			(total, entry) => total + entry.requests.length,
			0,
		),
		answers: run.answers,
	});
	return {
		left: side(left),
		right: side(right),
		sameExperiment: left.experimentId === right.experimentId,
		unchanged: left.cases.length - onlyLeft.length - changed.length,
		onlyLeft,
		onlyRight,
		changed,
	};
}
