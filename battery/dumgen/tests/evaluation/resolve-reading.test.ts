import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { listExperiments } from "../../src/evaluation/experiments.js";
import {
	armsOf,
	candidatesOf,
	freezeReadingSets,
	type ReadingCase,
	readingCases,
} from "../../src/evaluation/resolve-reading/cases.js";
import {
	readingExperiment,
	readingMetrics,
} from "../../src/evaluation/resolve-reading/experiment.js";
import { goldReadingAnswers } from "../../src/evaluation/resolve-reading/oracle.js";
import { evaluateReading } from "../../src/evaluation/resolve-reading/scoring.js";
import type { LunaAsk } from "../../src/luna.js";
import { markedSentence } from "../../src/resolve/reading.js";
import type { JevAsk } from "../../src/segment/jev.js";

const repository = resolve(import.meta.dir, "../../../..");
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

test("the cases are dumspec's Reading gold: Drafts for dev, reviewed records for held-out, with each Lemma's gold Readings as candidates", () => {
	expect(dev.length).toBeGreaterThan(1500);
	expect(new Set(heldout.map(({ record }) => record)).size).toBe(90);
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
	await freezeReadingSets(root, repository, {
		dev: sample,
		heldout: heldout.slice(0, 1),
	});
	return root;
}

/** The case a request is about, found by its marked Sentence and Lemma. */
const caseOf = (input: unknown) => {
	const { markedSentence: marked, lemma } = input as {
		markedSentence: string;
		lemma: string;
	};
	const found = sample.find(
		(goldCase) =>
			markedSentence(
				goldCase.sentence.segments,
				goldCase.unit.segments,
			) === marked &&
			goldCase.attestation.surface.lemma.canonicalForm === lemma,
	);
	if (!found) throw Error("No case for this request");
	return found;
};

/**
 * Transports that answer as gold does, counting their calls. `wrong`
 * makes the judge's nth answer pick another stored option than gold's.
 */
function goldTransports(wrong?: number) {
	const counter = { jev: 0, luna: 0 };
	const jev: JevAsk = async (request) => {
		counter.jev++;
		const goldCase = caseOf(request.state);
		const answers = goldReadingAnswers(
			{ goldCase, arm: "present" },
			request.questions,
		);
		const right =
			answers.reading?.type === "choice" && answers.reading.choice;
		const other = Object.keys(
			(request.questions.reading as { criteria: object }).criteria,
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
		return {
			output: caseOf(request.input).ideal,
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
		estimate: true,
	});
	expect(estimate.run).toBeUndefined();
	// Three open cases in two arms and authored doch in one, three times.
	expect(estimate.price?.attempts).toBe(7 * 3);
	expect(estimate.price?.jev.inputTokens).toBeGreaterThan(0);
	expect(estimate.price?.luna.requests).toBeGreaterThan(0);
	expect(counter).toEqual({ jev: 0, luna: 0 });

	const live = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		jev,
		luna,
		beforeLive: (price) => {
			expect(price.jev.requests).toBe(estimate.price?.jev.requests ?? -1);
		},
	});
	expect(counter.jev).toBe(estimate.price?.jev.requests ?? -1);
	expect(counter.luna).toBe(estimate.price?.luna.requests ?? -1);
	const run = live.run;
	if (!run) throw Error("no run");
	const metrics = readingMetrics(run);
	expect(metrics.cases).toBe(sample.length);
	expect(metrics.attempts).toBe(21);
	for (const line of [
		"reuse",
		"reuseAmongSeveral",
		"noMatch",
		"noMatchUnjudged",
		"authored",
		"esGibt",
	] as const)
		expect(metrics.lines[line].rate).toBe(1);
	expect(metrics.lines.wrongReuse.correct).toBe(0);
	expect(metrics.lines.reuse.interval[1]).toBe(1);
	expect(metrics.esGibtRejected).toBe(0);
	expect(metrics.flips).toEqual([]);
	// Luna wrote in the removed arm of the case with nothing else stored.
	expect(metrics.spotCheck.length).toBeGreaterThan(0);
	expect(metrics.spotCheck[0]).toMatchObject({
		markedSentence: expect.stringContaining("<TARGET>"),
	});

	const calls = { ...counter };
	const replay = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
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
