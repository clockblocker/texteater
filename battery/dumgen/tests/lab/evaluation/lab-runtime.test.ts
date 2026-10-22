import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateExperiment } from "../../../lab/evaluation/experiments.js";
import { labRequestBudget } from "../../../lab/evaluation/lab-runtime.js";
import {
	type LabCase,
	storeSet,
} from "../../../lab/segmentation/harness/corpus.js";
import type { JevAsk } from "../../../src/segment/jev.js";
import { goldJudge, labCase, set } from "./experiments-support.js";

const directory = await mkdtemp(join(tmpdir(), "dumgen-lab-runtime-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

/**
 * A lab whose set holds `count` copies of the one gold case, each its own
 * record, and told apart by the trailing whitespace each one adds.
 */
async function labOf(name: string, count: number) {
	const labRoot = join(directory, name);
	const setsRoot = join(labRoot, "sets");
	const cases = Array.from(
		{ length: count },
		(_, at): LabCase => ({
			...labCase,
			id: `${labCase.id}-${at}`,
			record: `${labCase.record}-${at}`,
			input: {
				...labCase.input,
				segments: [
					...labCase.input.segments,
					{ kind: "Whitespace", text: " ".repeat(at + 1) },
				],
			},
		}),
	);
	await storeSet(setsRoot, { ...set, cases });
	return { labRoot, setsRoot };
}

/** Counts the calls a transport has in flight, and the most it ever had. */
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 2));

test("a run's attempts share one request budget of 12, however many cases run at once", async () => {
	const lab = await labOf("budget", 20);
	const { jev: gold } = goldJudge();
	const tracked = inFlight();
	const jev: JevAsk = async (request, context) => {
		tracked.start();
		try {
			await settle();
			return await gold(request, context);
		} finally {
			tracked.end();
		}
	};
	const live = await evaluateExperiment({
		experimentId: "segment-in-units/de:dev",
		jev,
		sourceRevision: "test",
		...lab,
		// 60 attempts at once: 20 cases × 3 repetitions.
		concurrency: 60,
	});
	expect(live.run?.summary.quality).toMatchObject({ passed: 20, failed: 0 });
	expect(labRequestBudget).toBe(12);
	expect(tracked.counts.most).toBe(labRequestBudget);
});

test("aborting a run's signal interrupts its attempts and aborts every call in flight", async () => {
	const lab = await labOf("interrupt", 20);
	const tracked = inFlight();
	const reached = Promise.withResolvers<void>();
	// Never answers: each call settles only when its signal aborts.
	const jev: JevAsk = (_request, { signal }) =>
		new Promise((_resolve, reject) => {
			tracked.start();
			if (tracked.counts.now === labRequestBudget) reached.resolve();
			signal.addEventListener("abort", () => {
				tracked.counts.aborted++;
				tracked.end();
				reject(signal.reason);
			});
		});
	const controller = new AbortController();
	const run = evaluateExperiment({
		experimentId: "segment-in-units/de:dev",
		jev,
		sourceRevision: "test",
		...lab,
		concurrency: 60,
		signal: controller.signal,
	});
	await reached.promise;
	controller.abort();
	await expect(run).rejects.toThrow();
	expect(tracked.counts).toEqual({
		now: 0,
		most: labRequestBudget,
		started: labRequestBudget,
		aborted: labRequestBudget,
	});
});
