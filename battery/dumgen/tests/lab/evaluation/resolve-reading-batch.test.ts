import { expect, test } from "bun:test";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import { createOpenAILunaBatch } from "../../../lab/evaluation/luna-batch.js";
import {
	type LunaBatchEvent,
	readLedgerSizes,
} from "../../../lab/evaluation/resolve-grammar/models.js";
import {
	readingExperiment,
	readingMetrics,
} from "../../../lab/evaluation/resolve-reading/experiment.js";
import { createOpenAILuna } from "../../../src/openai-luna.js";
import { completedResponse, fakeOpenAI, userInputOf } from "./fake-openai.js";
import {
	frozenRoot,
	goldTransports,
	lunaGold,
} from "./resolve-reading-fixture.js";

/**
 * The fake OpenAI's Responses answer: gold's description for the request's
 * case, with Luna's measured usage; the same whether asked alone or in a
 * batch.
 */
const fakeLunaAnswer = (body: Record<string, unknown>) => {
	return {
		status: 200,
		body: completedResponse(lunaGold(userInputOf(body)), {
			input_tokens: 600,
			output_tokens: 14,
		}),
	};
};

const fakeRoot = "https://fake.openai.test/v1";

/** The Luna answers a run's cache holds, by file. */
async function lunaCache(root: string): Promise<Record<string, string>> {
	const directory = join(root, "cache", "luna");
	const files = await readdir(directory, { recursive: true });
	const entries: Record<string, string> = {};
	for (const file of files.filter((name) => name.endsWith(".json")).sort())
		entries[file] = await readFile(join(directory, file), "utf8");
	return entries;
}

test("a replay scores the same whether its cache was filled synchronously or by a Luna batch", async () => {
	const experiment = readingExperiment("dev");
	const outputs = (run: OperationEvaluationRun) =>
		run.cases.map((record) =>
			record.repetitions?.map(({ output, status }) => ({
				output,
				status,
			})),
		);

	const syncRoot = await frozenRoot();
	const syncOpenAI = fakeOpenAI(fakeLunaAnswer);
	const sync = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root: syncRoot,
		setsRoot: join(syncRoot, "sets"),
		jev: goldTransports().jev,
		luna: createOpenAILuna({
			apiKey: "test",
			baseUrl: fakeRoot,
			fetch: syncOpenAI.fetch,
		}),
	});

	const batchRoot = await frozenRoot();
	const batchOpenAI = fakeOpenAI(fakeLunaAnswer);
	const events: LunaBatchEvent[] = [];
	const batched = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root: batchRoot,
		setsRoot: join(batchRoot, "sets"),
		jev: goldTransports().jev,
		lunaBatch: createOpenAILunaBatch({
			apiKey: "test",
			baseUrl: fakeRoot,
			fetch: batchOpenAI.batchFetch,
			pollMs: 0,
		}),
		onLunaBatch: (event) => {
			events.push(event);
		},
	});
	if (!sync.run || !batched.run) throw Error("no run");

	// The batch run sent no synchronous Luna request, and each request once.
	expect(batchOpenAI.counts.responses).toBe(0);
	expect(syncOpenAI.counts.responses).toBeGreaterThan(0);
	expect([...batchOpenAI.sentIds.values()].every((sent) => sent === 1)).toBe(
		true,
	);
	expect(batchOpenAI.sentIds.size).toBe(syncOpenAI.counts.responses);
	// Batched lines are the synchronous body less its service tier.
	expect(batchOpenAI.bodies[0]).not.toHaveProperty("service_tier");
	expect(batchOpenAI.bodies[0]).toMatchObject({ store: false });

	// The same answers on disk, and the same scores replayed from them.
	expect(await lunaCache(batchRoot)).toEqual(await lunaCache(syncRoot));
	expect(outputs(batched.run)).toEqual(outputs(sync.run));
	expect(readingMetrics(batched.run)).toEqual(readingMetrics(sync.run));
	const replay = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root: batchRoot,
		setsRoot: join(batchRoot, "sets"),
		offline: true,
	});
	if (!replay.run) throw Error("no replay");
	expect(readingMetrics(replay.run)).toEqual(readingMetrics(sync.run));

	// Spend: the same tokens, priced at the Batch rate, its ids recorded.
	expect(batched.spend?.luna.freshCalls).toBe(
		sync.spend?.luna.freshCalls ?? -1,
	);
	expect(batched.spend?.luna.freshInputTokens).toBe(
		sync.spend?.luna.freshInputTokens ?? -1,
	);
	expect(batched.spend?.lunaTransport).toBe("batch");
	expect(batched.spend?.usd.lunaTier).toBe("batch");
	expect(sync.spend?.usd.lunaTier).toBe("fast");
	expect(batched.spend?.usd.luna).toBeCloseTo(
		(sync.spend?.usd.luna ?? 0) / 4,
		10,
	);
	const batches = batched.spend?.batches ?? [];
	expect(batches.length).toBeGreaterThan(0);
	expect(batches.map(({ batchId }) => batchId)).toEqual(
		events
			.filter(({ event }) => event === "submitted")
			.map(({ batchId }) => batchId),
	);
	expect(batches[0]).toMatchObject({
		status: "completed",
		failed: 0,
		inputFileId: expect.stringMatching(/^file-in-/u),
	});
	expect(events.map(({ event }) => event)).toEqual(
		batches.flatMap(() => ["submitted", "settled"]),
	);
});

test("a failed or unanswered batch line is a ProviderFailure for its request alone, never sent again", async () => {
	const experiment = readingExperiment("dev");
	const root = await frozenRoot();
	// The first line the batch reads fails; the second it never runs.
	const seen: string[] = [];
	const rank = (customId: string) => {
		if (!seen.includes(customId)) seen.push(customId);
		return seen.indexOf(customId);
	};
	const openAI = fakeOpenAI(fakeLunaAnswer, {
		dropped: (customId) => rank(customId) === 1,
		failing: (customId) => rank(customId) === 0,
	});
	const result = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		jev: goldTransports().jev,
		lunaBatch: createOpenAILunaBatch({
			apiKey: "test",
			baseUrl: fakeRoot,
			fetch: openAI.batchFetch,
			pollMs: 0,
		}),
	});
	if (!result.run) throw Error("no run");
	expect([...openAI.sentIds.values()].every((sent) => sent === 1)).toBe(true);
	const [first] = result.spend?.batches ?? [];
	expect(first).toMatchObject({ status: "expired", failed: 2 });
	expect(first?.answered).toBe((first?.requests ?? 0) - 2);
	const failures = result.run.cases.flatMap(
		(record) =>
			record.repetitions?.filter(
				({ status }) => status === "ProviderFailure",
			) ?? [],
	);
	// Each failed line fails every attempt that waits on its request: a
	// case's arms share the draft when they store the same Readings.
	expect(failures.length).toBeGreaterThanOrEqual(2);
	expect(Object.keys(await lunaCache(root))).toHaveLength(
		openAI.sentIds.size - 2,
	);
});

test("an interrupted batch run's batch is settled by the next run, not sent again", async () => {
	const experiment = readingExperiment("dev");
	const root = await frozenRoot();
	const openAI = fakeOpenAI(fakeLunaAnswer, { pollsBeforeEnd: 3 });
	const batch = createOpenAILunaBatch({
		apiKey: "test",
		baseUrl: fakeRoot,
		fetch: openAI.batchFetch,
		pollMs: 5,
	});
	const controller = new AbortController();
	await expect(
		experiment.evaluate({
			experimentId: experiment.id,
			sourceRevision: "test",
			root,
			setsRoot: join(root, "sets"),
			jev: goldTransports().jev,
			lunaBatch: batch,
			signal: controller.signal,
			onLunaBatch: (event) => {
				if (event.event === "submitted") controller.abort();
			},
		}),
	).rejects.toThrow("aborted");
	expect(openAI.counts.batches).toBe(1);
	const resumed = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		jev: goldTransports().jev,
		lunaBatch: batch,
	});
	expect([...openAI.sentIds.values()].every((sent) => sent === 1)).toBe(true);
	expect(resumed.spend?.batches[0]).toMatchObject({
		batchId: "batch_1",
		resumed: true,
		status: "completed",
	});
	if (!resumed.run) throw Error("no run");
	expect(readingMetrics(resumed.run).lines.reuse.rate).toBe(1);
});

test("the pricing pass prices uncached requests from measured sizes, the ledger's or its stages', and says so", async () => {
	const experiment = readingExperiment("dev");
	const root = await frozenRoot();
	const ledger = join(root, "ledger.jsonl");
	await writeFile(
		ledger,
		`${[
			{
				command: "evaluate",
				experiment: experiment.id,
				round: "old",
				jev: { freshCalls: 10, freshInputTokens: 1000 },
				luna: {
					freshCalls: 10,
					freshInputTokens: 1000,
					freshOutputTokens: 10,
				},
			},
			{
				command: "evaluate",
				experiment: experiment.id,
				round: "latest",
				jev: {
					freshCalls: 4389,
					freshInputTokens: 2772735,
					freshOutputTokens: 0,
				},
				luna: {
					freshCalls: 4462,
					freshInputTokens: 2718169,
					freshOutputTokens: 60511,
				},
			},
			{
				command: "luna-batch",
				experiment: experiment.id,
				batchId: "batch_x",
			},
		]
			.map((line) => JSON.stringify(line))
			.join("\n")}\n`,
	);
	expect(await readLedgerSizes(ledger, experiment.id)).toMatchObject({
		round: "latest",
		jev: { requests: 4389 },
		luna: { requests: 4462 },
	});
	const fromLedger = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		estimate: true,
		ledger,
	});
	const price = fromLedger.price;
	if (!price) throw Error("no price");
	expect(price.jev.pricedFromLedger).toBe(price.jev.requests);
	expect(price.luna.pricedFromLedger).toBe(price.luna.requests);
	// 632 jev tokens and 13.6 Luna output tokens per request, measured.
	expect(price.jev.inputTokens).toBe(632 * price.jev.requests);
	expect(price.luna.outputTokens).toBe(14 * price.luna.requests);
	expect(price.sizes.basis).toContain("ledger round latest");
	expect(price.cost.totalBatchUsd).toBeLessThan(price.cost.totalSyncUsd);
	expect(price.cost.luna.syncTier).toBe("fast");

	// Once two cases are cached, the rest are priced at their stages' sizes.
	await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		limit: 2,
		ledger,
		...goldTransports(),
	});
	const measured = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		estimate: true,
		ledger,
	});
	expect(measured.price?.jev.pricedFromStage).toBeGreaterThan(0);
	// A whole round prices the cached requests too, at their own usage.
	const whole = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		estimate: true,
		wholeRound: true,
		ledger,
	});
	expect(whole.price?.jev.requests).toBe(price.jev.requests);
	expect(whole.price?.jev.pricedFromCache).toBe(
		price.jev.requests - (measured.price?.jev.requests ?? 0),
	);
	expect(whole.price?.sizes.basis).toStartWith("The whole round");
	expect(Object.keys(measured.price?.sizes.stages ?? {})).toEqual(
		expect.arrayContaining([expect.stringMatching(/^jev:/u)]),
	);
});
