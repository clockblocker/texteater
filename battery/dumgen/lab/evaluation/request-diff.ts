/**
 * A free no-change check (#1035): every case's requests to jev and Luna,
 * built offline, saved as a request run, and two request runs diffed case
 * by case (`bun run evaluate --experiment <id> --requests`, then
 * `--compare`). A change that leaves every case's requests and outcomes
 * as they were behaves as it did, whatever answers the requests meet; it
 * needs no cached answer for the change and no repin.
 *
 * Each experiment says where its answers come from (`experiments.ts`):
 * segment.inUnits reads the lab's cache and answers a miss twice, once
 * with the projection's stand-ins and once with their contrary, so a pure
 * refactor walks the paths real answers took and, where the cache is cold,
 * the branches behind a "no" or a later option too. resolve.grammar,
 * resolve.reading and knowledge.produce answer with their gold oracles
 * (`goldRequests`). A request keeps its key and
 * question order, which is part of what jev reads, so requests compare as
 * `JSON.stringify` writes them, not canonically.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import type { JsonValue } from "@typesafe-ai/sdk";
import { messageOf } from "common-utils";
import * as Effect from "effect/Effect";
import type { LunaAsk } from "../../src/luna.js";
import type { JevAsk } from "../../src/segment/jev.js";
import type { GoldOracle } from "./resolve-grammar/models.js";

/**
 * Where a request or outcome sits: its repetition, and the answer path it
 * was built on where an experiment walks more than one (#1064).
 */
type At = {
	readonly repetition: number;
	readonly path?: string;
};

/** One request a case sends, at one repetition. */
export type RecordedRequest = At &
	(
		| {
				readonly executor: "jev";
				readonly stage: string;
				readonly state: unknown;
				readonly questions: Readonly<Record<string, unknown>>;
		  }
		| {
				readonly executor: "luna";
				readonly stage: string;
				readonly request: unknown;
		  }
	);

/** What one repetition returned, or why it failed. */
export type RecordedOutcome = At & { readonly outcome: unknown };

/** A case's requests in a stable order, and what each repetition returned or why it failed. */
export type CaseRequests = {
	readonly id: string;
	readonly requests: readonly RecordedRequest[];
	readonly outcomes: readonly RecordedOutcome[];
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

/** The jev and Luna an attempt asks, per what the oracle answers for and repetition, as a port's cached models hand them out. */
type AttemptModels<At> = {
	readonly jev: (at: At, repetition: number) => JevAsk;
	readonly luna: (at: At, repetition: number) => LunaAsk;
};

/**
 * A port's requests answered by its gold oracle (resolve.grammar,
 * resolve.reading, knowledge.produce): each case's attempt once, every
 * jev question answered and every Luna call written as gold would, each
 * request recorded, so the requests and the outcome are fixed.
 */
export async function goldRequests<At>(args: {
	readonly cases: readonly { readonly id: string; readonly at: At }[];
	readonly oracle: GoldOracle<At>;
	readonly attempt: (at: At, models: AttemptModels<At>) => Promise<unknown>;
	readonly concurrency: number;
}): Promise<Pick<RequestRun, "answers" | "cases">> {
	const { oracle } = args;
	const cases = await Effect.runPromise(
		Effect.forEach(
			args.cases,
			({ id, at }) =>
				Effect.promise(async (): Promise<CaseRequests> => {
					const requests: RecordedRequest[] = [];
					const outcome = await args
						.attempt(at, {
							jev:
								(asked, repetition) =>
								async (request, { stage }) => {
									requests.push({
										executor: "jev",
										stage,
										repetition,
										state: request.state,
										questions: request.questions,
									});
									return {
										model: request.model,
										answers: oracle.answers(
											asked,
											request.questions,
										),
										usage: {
											input_tokens: 0,
											output_tokens: 0,
										},
									};
								},
							luna:
								(asked, repetition) =>
								async (request, { stage }) => {
									requests.push({
										executor: "luna",
										stage,
										repetition,
										request,
									});
									return {
										output: oracle.written(
											asked,
											request.input,
										),
									};
								},
						})
						.catch((error: unknown) => ({
							failure: messageOf(error),
						}));
					return {
						id,
						requests: sortedRequests(requests),
						outcomes: [{ repetition: 0, outcome }],
					};
				}),
			{ concurrency: Math.max(1, args.concurrency) },
		),
	);
	return { answers: { source: "gold" }, cases };
}

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

const atText = ({ repetition, path }: At) =>
	`#${repetition}${path === undefined ? "" : ` (${path})`}`;

const slotOf = (request: RecordedRequest) =>
	`${request.executor} ${request.stage} ${atText(request)}`;

/**
 * A case's changed requests: each request only one side sends, paired by
 * executor, stage, repetition and answer path where both sides have one,
 * with the paths at which the pair differs.
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

/** A case's changed outcomes, paired by repetition and path, with the paths at which each pair differs. */
function outcomeChanges(
	left: readonly RecordedOutcome[],
	right: readonly RecordedOutcome[],
) {
	const rightAt = new Map(right.map((entry) => [atText(entry), entry]));
	const leftAt = new Set(left.map(atText));
	return [
		...left.map((before) => ({
			at: before,
			before,
			after: rightAt.get(atText(before)),
		})),
		...right
			.filter((after) => !leftAt.has(atText(after)))
			.map((after) => ({ at: after, before: undefined, after })),
	].flatMap(({ at: { repetition, path }, before, after }) => {
		const differs = differingPaths(before?.outcome, after?.outcome);
		return differs.length > 0
			? [{ repetition, ...(path === undefined ? {} : { path }), differs }]
			: [];
	});
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
		const outcomes = outcomeChanges(before.outcomes, after.outcomes);
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
