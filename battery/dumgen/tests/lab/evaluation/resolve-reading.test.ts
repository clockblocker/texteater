import { expect, test } from "bun:test";
import { join } from "node:path";
import { listExperiments } from "../../../lab/evaluation/experiments.js";
import {
	armsOf,
	candidatesOf,
	type ReadingCase,
} from "../../../lab/evaluation/resolve-reading/cases.js";
import {
	readingExperiment,
	readingMetrics,
} from "../../../lab/evaluation/resolve-reading/experiment.js";
import { evaluateReading } from "../../../lab/evaluation/resolve-reading/scoring.js";
import {
	dev,
	frozenRoot,
	goldTransports,
	heldout,
	sample,
	sampleAttempts,
} from "./resolve-reading-fixture.js";

test("the cases are dumcorpus's Reading gold: Drafts for dev, reviewed records for held-out, with each Lemma's gold Readings as candidates", () => {
	expect(dev.length).toBeGreaterThan(1500);
	// The 90 records reviewed through Reading, #884's batch 3 (nine) and
	// #1279's four Source records.
	expect(new Set(heldout.map(({ record }) => record)).size).toBe(103);
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
