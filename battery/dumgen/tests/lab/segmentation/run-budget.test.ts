import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	labRequestBudget,
	makeLabRuntime,
	runInterruptibly,
	runOn,
} from "../../../lab/evaluation/lab-runtime.js";
import { candidates4Arm } from "../../../lab/segmentation/de/arms/candidates4.js";
import type {
	LabCase,
	LabSet,
} from "../../../lab/segmentation/harness/corpus.js";
import { JevCache } from "../../../lab/segmentation/harness/jev-cache.js";
import { runArm } from "../../../lab/segmentation/harness/run.js";
import type { JevAsk } from "../../../src/segment/jev.js";
import { segmentsOf } from "../evaluation/spec-corpus/fixtures.js";
import { answerEach, zogSichAnGold } from "./support.js";

const directory = await mkdtemp(join(tmpdir(), "segment-run-budget-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

let caches = 0;
const cacheDirectory = () => join(directory, `cache-${caches++}`);

/** 40 cases of one Sentence: each misses the cache and asks on its own. */
const cases: LabCase[] = Array.from({ length: 40 }, (_, at) => ({
	id: `de/er-zog-sich-an-${at}`,
	record: `de/er-zog-sich-an-${at}`,
	input: { language: "de", segments: segmentsOf("Er zog sich an.") },
	idealOutput: { units: [] },
	facts: { coverage: "Full", sources: [] },
	rules: [],
	ruleExample: false,
}));

const set: LabSet = {
	name: "dev",
	createdAt: "",
	gitHead: "test",
	dirtyRecordFiles: 0,
	hash: "test",
	cases,
};

/** The lab run of candidates4 over every case at once, asking `jev`. */
const runOver = (jev: JevCache) =>
	runArm({
		runId: "budget",
		arm: candidates4Arm,
		options: { final: "1", closed: "1" },
		set,
		subset: "all",
		cases,
		repetitions: 1,
		jev,
		concurrency: cases.length,
		gitHead: "test",
	});

/** Counts the requests a transport has in flight, and the most it ever had. */
function inFlight() {
	const counts = { now: 0, most: 0, started: 0, aborted: 0 };
	return {
		counts,
		start() {
			counts.started++;
			counts.now++;
			counts.most = Math.max(counts.most, counts.now);
		},
		end() {
			counts.now--;
		},
	};
}

/** A gold judge that answers after a moment, tracked by `tracked`. */
const slowGold =
	(tracked: ReturnType<typeof inFlight>): JevAsk =>
	async (request) => {
		tracked.start();
		try {
			await new Promise((resolve) => setTimeout(resolve, 2));
			return {
				model: request.model,
				answers: answerEach(request.questions, zogSichAnGold()),
				usage: { input_tokens: 1, output_tokens: 0 },
			};
		} finally {
			tracked.end();
		}
	};

/** A judge that never answers: each request settles only when its signal aborts. */
const hanging =
	(
		tracked: ReturnType<typeof inFlight>,
		reached: PromiseWithResolvers<void>,
		permits: number,
	): JevAsk =>
	(_request, { signal }) =>
		new Promise((_resolve, reject) => {
			tracked.start();
			if (tracked.counts.now === permits) reached.resolve();
			signal.addEventListener("abort", () => {
				tracked.counts.aborted++;
				tracked.end();
				reject(signal.reason);
			});
		});

test("a lab run's asks share its request budget, however many cases run at once", async () => {
	for (const permits of [labRequestBudget, 3]) {
		const tracked = inFlight();
		const runtime = makeLabRuntime(permits);
		try {
			const run = await runOn(
				runtime,
				runOver(
					new JevCache({
						cacheDirectory: cacheDirectory(),
						transport: slowGold(tracked),
					}),
				),
				undefined,
			);
			expect(
				run.cases.flatMap(({ repetitions }) =>
					repetitions.flatMap(({ error }) => (error ? [error] : [])),
				),
			).toEqual([]);
		} finally {
			await runtime.dispose();
		}
		expect(tracked.counts.started).toBeGreaterThan(permits);
		expect(tracked.counts.most).toBe(permits);
	}
});

test("aborting a lab run interrupts its arms and aborts every ask in flight", async () => {
	const tracked = inFlight();
	const reached = Promise.withResolvers<void>();
	const jev = new JevCache({
		cacheDirectory: cacheDirectory(),
		transport: hanging(tracked, reached, labRequestBudget),
	});
	const runtime = makeLabRuntime();
	const controller = new AbortController();
	try {
		const run = runOn(runtime, runOver(jev), controller.signal);
		await reached.promise;
		controller.abort();
		await expect(run).rejects.toThrow();
	} finally {
		await runtime.dispose();
	}
	expect(tracked.counts).toEqual({
		now: 0,
		most: labRequestBudget,
		started: labRequestBudget,
		aborted: labRequestBudget,
	});
	// The cache counts each aborted request once its transport settled.
	await new Promise((resolve) => setTimeout(resolve, 10));
	expect(jev.transport).toMatchObject({
		requests: labRequestBudget,
		interrupted: labRequestBudget,
		failures: 0,
	});
});

test("Ctrl-C at a lab command's runtime edge aborts the asks in flight", async () => {
	const tracked = inFlight();
	const reached = Promise.withResolvers<void>();
	const runtime = makeLabRuntime();
	const listening = process.listenerCount("SIGINT");
	try {
		const run = runInterruptibly(
			runtime,
			runOver(
				new JevCache({
					cacheDirectory: cacheDirectory(),
					transport: hanging(tracked, reached, labRequestBudget),
				}),
			),
		);
		await reached.promise;
		expect(process.listenerCount("SIGINT")).toBe(listening + 1);
		process.emit("SIGINT");
		await expect(run).rejects.toThrow();
	} finally {
		await runtime.dispose();
	}
	expect(tracked.counts.aborted).toBe(labRequestBudget);
	expect(tracked.counts.now).toBe(0);
	expect(process.listenerCount("SIGINT")).toBe(listening);
});
