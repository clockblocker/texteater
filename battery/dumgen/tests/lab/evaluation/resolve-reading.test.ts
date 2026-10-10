import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isRecord } from "common-utils";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import { listExperiments } from "../../../lab/evaluation/experiments.js";
import { createOpenAILunaBatch } from "../../../lab/evaluation/luna-batch.js";
import {
	type LunaBatchEvent,
	readLedgerSizes,
} from "../../../lab/evaluation/resolve-grammar/models.js";
import {
	armsOf,
	candidatesOf,
	freezeReadingSets,
	type ReadingCase,
	readingCases,
} from "../../../lab/evaluation/resolve-reading/cases.js";
import {
	readingExperiment,
	readingMetrics,
} from "../../../lab/evaluation/resolve-reading/experiment.js";
import {
	goldReadingAnswers,
	readingOracle,
} from "../../../lab/evaluation/resolve-reading/oracle.js";
import { evaluateReading } from "../../../lab/evaluation/resolve-reading/scoring.js";
import type { LunaAsk } from "../../../src/luna.js";
import { createOpenAILuna } from "../../../src/openai-luna.js";
import { markedSentence } from "../../../src/resolve/reading.js";
import type { JevAsk } from "../../../src/segment/jev.js";
import { completedResponse, fakeOpenAI, userInputOf } from "./fake-openai.js";

const repository = resolve(import.meta.dir, "../../../../..");
const { dev, heldout } = readingCases();

const find = (test: (goldCase: ReadingCase) => boolean, what: string) => {
	const found = dev.find(test);
	if (!found) throw Error(`No dev case ${what}`);
	return found;
};

/** An open case with another gold Reading, one with none, an authored one with several, and es gibt. */
const sample = [
	find(
		(goldCase) => !goldCase.authored && goldCase.lemmaReadings.length > 1,
		"of an open Lemma with two gold Readings",
	),
	find(
		(goldCase) =>
			!goldCase.authored &&
			goldCase.lemmaReadings.length === 1 &&
			goldCase.rejected.length === 0,
		"of an open Lemma with one gold Reading",
	),
	find(
		(goldCase) =>
			goldCase.authored &&
			goldCase.attestation.surface.lemma.canonicalForm === "doch",
		"of authored doch",
	),
	find((goldCase) => goldCase.rejected.length > 0, "of es gibt"),
];

test("the cases are dumcorpus's Reading gold: Drafts for dev, reviewed records for held-out, with each Lemma's gold Readings as candidates", () => {
	expect(dev.length).toBeGreaterThan(1500);
	// The 90 records reviewed through Reading, and #884's batch 3 (nine).
	expect(new Set(heldout.map(({ record }) => record)).size).toBe(99);
	for (const goldCase of [...dev, ...heldout]) {
		expect(goldCase.lemmaReadings[0]).toBe(goldCase.ideal);
		expect(goldCase.attestation.surface.lemma.family).not.toBe("Foreign");
	}
	const [several, one, doch, esGibt] = sample;
	if (!several || !one || !doch || !esGibt) throw Error("no sample");
	expect(candidatesOf(several, "present")).toContain(several.ideal);
	expect(candidatesOf(several, "removed")).not.toContain(several.ideal);
	expect(candidatesOf(several, "removed").length).toBeGreaterThan(0);
	expect(candidatesOf(one, "removed")).toEqual([]);
	expect(armsOf(doch)).toEqual(["present"]);
	// The folded es gibt case (#694) offers geben's giving Reading too.
	expect(esGibt.attestation.surface.lemma.canonicalForm).toBe("geben");
	expect(esGibt.rejected).toEqual(["🎁", "👉🎁"]);
	expect(candidatesOf(esGibt, "removed")).toEqual(["🎁"]);
	expect(listExperiments().map(({ id }) => id)).toEqual(
		expect.arrayContaining([
			"resolve-reading/de:dev",
			"resolve-reading/de:heldout",
		]),
	);
});

async function frozenRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "resolve-reading-"));
	await freezeReadingSets(join(root, "sets"), repository, {
		dev: sample,
		heldout: heldout.slice(0, 1),
	});
	return root;
}

/**
 * The case a request is about, found by its marked Sentence and Lemma; a
 * Canonical Form call that drafts the description carries no Lemma, only
 * the marked Sentence in `emojiDescriptionInput`.
 */
const caseOf = (input: unknown) => {
	const fields = isRecord(input) ? input : {};
	const draft = isRecord(fields.emojiDescriptionInput)
		? fields.emojiDescriptionInput
		: undefined;
	const marked = draft ? draft.markedSentence : fields.markedSentence;
	const found = sample.find(
		(goldCase) =>
			markedSentence(
				goldCase.sentence.segments,
				goldCase.unit.segments,
			) === marked &&
			(draft !== undefined ||
				goldCase.attestation.surface.lemma.canonicalForm ===
					fields.lemma),
	);
	if (!found) throw Error("No case for this request");
	return found;
};

/** Gold's answer to a Luna request: the drafting Canonical Form call's, or the description alone. */
const lunaGold = (input: unknown) =>
	readingOracle.written({ goldCase: caseOf(input), arm: "present" }, input);

/** Every attempt of the sample, three repetitions each. */
const sampleAttempts = sample.reduce(
	(sum, goldCase) => sum + armsOf(goldCase).length * 3,
	0,
);

/**
 * Transports that answer as gold does, counting their calls. `wrong`
 * makes the judge's nth answer pick another stored option than gold's.
 */
function goldTransports(wrong?: number) {
	const counter = { jev: 0, luna: 0, drafts: 0 };
	const jev: JevAsk = async (request) => {
		counter.jev++;
		const goldCase = caseOf(request.state);
		const answers = goldReadingAnswers(
			{ goldCase, arm: "present" },
			request.questions,
		);
		const right =
			answers.reading?.type === "choice" && answers.reading.choice;
		const question = request.questions.reading;
		const other = Object.keys(
			question?.type === "choice" ? question.criteria : {},
		).find((option) => option !== right && option !== "NoMatch");
		return {
			model: request.model,
			answers:
				counter.jev === wrong && other
					? {
							reading: {
								type: "choice",
								choice: other,
								confidence: 1,
								probabilities: { [other]: 1 },
							},
						}
					: answers,
			usage: { input_tokens: 500, output_tokens: 1 },
		};
	};
	const luna: LunaAsk = async (request) => {
		counter.luna++;
		if (isRecord(request.input) && "emojiDescriptionInput" in request.input)
			counter.drafts++;
		return {
			output: lunaGold(request.input),
			metadata: { usage: { input_tokens: 900, output_tokens: 4 } },
		};
	};
	return { jev, luna, counter };
}

test("resolve.reading's run prices itself without a call, fills its cache once, and re-scores from it for free", async () => {
	const root = await frozenRoot();
	const experiment = readingExperiment("dev");
	const { jev, luna, counter } = goldTransports();
	const estimate = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		estimate: true,
	});
	expect(estimate.run).toBeUndefined();
	// Each case in its arms, three times: authored doch in one, the open
	// case with one gold Reading in two, and a Lemma with another sense in
	// three, its first click among them.
	expect(armsOf(sample[0] as ReadingCase)).toEqual([
		"present",
		"removed",
		"empty",
	]);
	expect(estimate.price?.attempts).toBe(sampleAttempts);
	expect(estimate.price?.jev.inputTokens).toBeGreaterThan(0);
	expect(estimate.price?.luna.requests).toBeGreaterThan(0);
	expect(counter).toEqual({ jev: 0, luna: 0, drafts: 0 });

	const live = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		jev,
		luna,
		beforeLive: (price) => {
			expect(price.jev.requests).toBe(estimate.price?.jev.requests ?? -1);
		},
	});
	expect(counter.jev).toBe(estimate.price?.jev.requests ?? -1);
	expect(counter.luna).toBe(estimate.price?.luna.requests ?? -1);
	// Luna's description comes from the Canonical Form call that drafts it,
	// as on a click; the standalone prompt is never asked.
	expect(counter.drafts).toBe(counter.luna);
	const run = live.run;
	if (!run) throw Error("no run");
	const metrics = readingMetrics(run);
	expect(metrics.cases).toBe(sample.length);
	expect(metrics.attempts).toBe(sampleAttempts);
	for (const line of [
		"reuse",
		"reuseAmongSeveral",
		"noMatch",
		"noMatchUnjudged",
		"firstMint",
		"authored",
		"esGibt",
	] as const)
		expect(metrics.lines[line].rate).toBe(1);
	expect(metrics.lines.wrongReuse.correct).toBe(0);
	expect(metrics.lines.wrongSense.correct).toBe(0);
	expect(metrics.lines.reuse.interval[1]).toBe(1);
	expect(metrics.esGibtRejected).toBe(0);
	expect(metrics.flips).toEqual([]);
	// Luna wrote where nothing else was stored.
	expect(metrics.spotCheck.length).toBeGreaterThan(0);
	expect(metrics.spotCheck[0]).toMatchObject({
		markedSentence: expect.stringContaining("<TARGET>"),
	});

	const calls = { ...counter };
	const replay = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		offline: true,
	});
	expect(counter).toEqual(calls);
	expect(replay.spend?.jev.freshCalls).toBe(0);
	const outputs = (value: typeof run) =>
		value.cases.map((record) =>
			record.repetitions?.map(({ output }) => output),
		);
	if (!replay.run) throw Error("no replay");
	expect(outputs(replay.run)).toEqual(outputs(run));
});

test("a judge's wrong pick is a wrong Reuse, and the attempt that flips between repetitions is named", async () => {
	const root = await frozenRoot();
	const experiment = readingExperiment("dev");
	const { jev, luna } = goldTransports(1);
	const { run } = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		jev,
		luna,
		concurrency: 1,
	});
	if (!run) throw Error("no run");
	const metrics = readingMetrics(run);
	expect(metrics.flips).toEqual([`${sample[0]?.id}:present`]);
	expect(metrics.lines.wrongReuse.correct).toBe(1);
	expect(metrics.wrongReuseBy).toEqual({ Judged: 1 });
	expect(metrics.lines.reuse.correct).toBe(metrics.lines.reuse.count - 1);
});

test("each arm has its verdict: Reuse of gold, NoMatch, a rejected answer and an authored one", () => {
	const [several, , doch, esGibt] = sample;
	if (!several || !doch || !esGibt) throw Error("no sample");
	const other = candidatesOf(several, "removed")[0] ?? "";
	expect(
		evaluateReading(several, "present", {
			_tag: "Reuse",
			emojiDescription: several.ideal,
		}),
	).toMatchObject({ correct: true, wrongReuse: false, judged: true });
	expect(
		evaluateReading(several, "present", {
			_tag: "Reuse",
			emojiDescription: other,
			reason: "Judged",
		}),
	).toMatchObject({ correct: false, wrongReuse: true });
	expect(
		evaluateReading(several, "removed", {
			_tag: "New",
			emojiDescription: several.ideal,
		}),
	).toMatchObject({ correct: true, matchesGold: true });
	expect(
		evaluateReading(several, "removed", {
			_tag: "Reuse",
			emojiDescription: other,
		}),
	).toMatchObject({ correct: false, wrongReuse: true });
	expect(
		evaluateReading(esGibt, "removed", {
			_tag: "New",
			emojiDescription: "👉🎁",
		}),
	).toMatchObject({ correct: false, rejected: true });
	expect(
		evaluateReading(doch, "present", {
			_tag: "New",
			emojiDescription: doch.ideal,
		}),
	).toMatchObject({ correct: true, judged: false });
});

test("a New naming another gold sense is wrong in every arm: a first click on «auf der Bank» that mints 🏦 fails (#1165)", () => {
	const byId = (id: string) => {
		const found = dev.find((goldCase) => goldCase.id === id);
		if (!found) throw Error(`No dev case ${id}`);
		return found;
	};
	const bench = byId("de/ich-sitze-im-garten-auf-der-bank#0");
	const bank = byId("de/die-bank-genehmigte-den-kredit#0");
	expect(bench.ideal).toBe("🪑");
	expect(bank.ideal).toBe("🏦");
	// Both senses stand in gold, so each case plays both orders: the other
	// sense stored first, and this one first with nothing stored.
	expect(armsOf(bench)).toEqual(["present", "removed", "empty"]);
	expect(candidatesOf(bench, "removed")).toEqual(["🏦"]);
	expect(candidatesOf(bench, "empty")).toEqual([]);
	expect(candidatesOf(bank, "removed")).toEqual(["🪑"]);
	// tf-demo's click: nothing stored, Luna drafted 🏦 for the bench.
	expect(
		evaluateReading(bench, "empty", {
			_tag: "New",
			emojiDescription: "🏦",
			reason: "Drafted",
		}),
	).toMatchObject({ correct: false, wrongSense: true, judged: false });
	expect(
		evaluateReading(bench, "empty", {
			_tag: "New",
			emojiDescription: "🪑",
			reason: "Drafted",
		}),
	).toMatchObject({ correct: true, wrongSense: false });
	// The bank first: the judge must reject 🪑, and a Luna collision with
	// it is a wrong Reuse.
	expect(
		evaluateReading(bank, "removed", {
			_tag: "Reuse",
			emojiDescription: "🪑",
			reason: "Collision",
		}),
	).toMatchObject({ correct: false, wrongReuse: true, wrongSense: true });
	// The other homonym pairs the gold holds play the same arms.
	for (const lemma of [
		"Maus",
		"Absatz",
		"Hahn",
		"Schimmel",
		"Bremse",
		"Flügel",
	])
		expect(
			dev.filter(
				(goldCase) =>
					goldCase.attestation.surface.lemma.canonicalForm ===
						lemma && armsOf(goldCase).includes("empty"),
			).length,
		).toBeGreaterThanOrEqual(2);
});

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
