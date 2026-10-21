import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalJson } from "common-utils";
import { paradigmChangesFor } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { listExperiments } from "../../../lab/evaluation/experiments.js";
import { storeFrozenSet } from "../../../lab/evaluation/frozen-sets.js";
import {
	doubletSplitOf,
	type LicenceCase,
	type LicenceSet,
	licenceCases,
	loadLicenceSet,
	splitCases,
	trackedLicenceSetsRoot,
} from "../../../lab/evaluation/licence/cases.js";
import {
	licenceExperiment,
	licenceMetrics,
} from "../../../lab/evaluation/licence/experiment.js";
import { licenceOracle } from "../../../lab/evaluation/licence/oracle.js";
import {
	evaluateLicence,
	licenceReport,
} from "../../../lab/evaluation/licence/scoring.js";
import type { LunaAsk } from "../../../src/luna.js";
import type { JevAsk, JevRequest } from "../../../src/segment/jev.js";

const cases = licenceCases();

const caseOf = (lemma: string, later: string) => {
	const found = cases.find(
		(entry) =>
			entry.lemma === lemma &&
			"emojiDescription" in entry.later.reading &&
			entry.later.reading.emojiDescription === later,
	);
	if (!found) throw Error(`No ${lemma} ${later} case`);
	return found;
};

test("the doublets set is each doublet's two Readings, each produced after the other, and a Free control per Lemma whose one Reading takes two forms (ADR 0048)", async () => {
	expect(cases).toHaveLength(30);
	expect(
		cases.filter(({ control }) => control).map(({ lemma }) => lemma),
	).toEqual(["melken", "Pizza"]);
	const lemmas = new Set(cases.map(({ lemma }) => lemma));
	for (const lemma of ["Bank", "Mutter", "senden", "wenden", "hängen"])
		expect(lemmas).toContain(lemma);
	// Lot and sein ride on a doublet's record but are no doublet.
	expect(lemmas.has("Lot")).toBe(false);
	const bank = caseOf("Bank", "🏦");
	expect(bank.stored.paradigm).toEqual({ plural: ["Bänke"] });
	// The tracked set is today's.
	const frozen = await loadLicenceSet(trackedLicenceSetsRoot);
	expect(canonicalJson(frozen.cases)).toBe(canonicalJson(cases));
});

test("the split keeps each doublet's two cases together and halves every stratum: noun doublets, verb doublets with and without a shared form choice, and the Free controls", () => {
	const halves = doubletSplitOf(cases);
	const lemmasOf = (split: string) =>
		[...halves]
			.flatMap(([lemma, half]) => (half === split ? [lemma] : []))
			.sort();
	expect(lemmasOf("tuning")).toEqual(
		[
			"Gesicht",
			"Mutter",
			"Strauß",
			"bewegen",
			"melken",
			"schaffen",
			"schleifen",
			"wenden",
		].sort(),
	);
	expect(lemmasOf("heldout")).toEqual(
		[
			"Bank",
			"Druck",
			"Pizza",
			"Wort",
			"erschrecken",
			"hängen",
			"senden",
			"wiegen",
		].sort(),
	);
	expect(splitCases(cases, "tuning")).toHaveLength(15);
	expect(splitCases(cases, "heldout")).toHaveLength(15);
});

/** A licence request over `forms`, as production sends it, its options every selection. */
const question = (
	part: string,
	forms: readonly string[],
	criteria: Readonly<Record<string, string>>,
): JevRequest["questions"] => ({
	q: {
		type: "choice",
		instructions: { question: "?", part, forms: [...forms] },
		criteria,
	},
});

test("the oracle picks the selection of the shown forms gold gives the later Reading", () => {
	const preterite = "the third person singular Präteritum (er …)";
	const options = { s0: "sandte", s1: "sendete", s2: "sandte and sendete" };
	const pick = (emoji: string) =>
		licenceOracle.answers(
			{ licenceCase: caseOf("senden", emoji) },
			question(preterite, ["sandte", "sendete"], options),
		).q;
	expect(pick("📡")).toMatchObject({ type: "choice", choice: "s1" });
	expect(pick("📨")).toMatchObject({ type: "choice", choice: "s2" });
});

/** The output of a run whose Luna wrote `written` per dimension and whose Licence is `licensed`. */
function output(
	licenceCase: LicenceCase,
	licensed: Readonly<Record<string, readonly string[]>>,
	outcome: "Matched" | "Judged" = "Judged",
) {
	const { reading } = licenceCase.later;
	const paradigmChanges = Object.entries(licensed).flatMap(
		([dimension, values]) =>
			paradigmChangesFor({
				reading,
				dimension: dimension as Dumrel.DimensionId,
				values,
				provenance: "Produced",
			}),
	);
	const events = Object.entries(licensed).map(([dimension, values]) => ({
		name: "ParadigmLicence",
		data: { dimension, outcome, written: values, variants: [] },
	}));
	return { paradigmChanges, failures: [], events };
}

test("a dimension is right when the Licence the run leaves is gold's forms; stored-variant takes and drops, Luna and the judge are read apart", () => {
	const lender = caseOf("Bank", "🏦");
	const right = evaluateLicence(
		lender,
		output(lender, { plural: ["Banken"] }),
	);
	expect(right.verdicts).toEqual([
		expect.objectContaining({
			dimension: "plural",
			stored: ["bänke"],
			gold: ["banken"],
			written: ["banken"],
			outcome: "Judged",
			licensed: ["banken"],
		}),
	]);
	const leak = evaluateLicence(
		lender,
		output(lender, { plural: ["Bänke"] }, "Matched"),
	);
	const report = licenceReport([
		{
			caseId: lender.id,
			repetition: 0,
			lemma: "Bank",
			control: false,
			evaluation: right,
		},
		{
			caseId: lender.id,
			repetition: 1,
			lemma: "Bank",
			control: false,
			evaluation: leak,
		},
	]);
	expect(report.dimensions).toMatchObject({ correct: 1, count: 2 });
	expect(report.variants).toMatchObject({ wrongTakes: 1, wrongDrops: 0 });
	expect(report.luna).toMatchObject({ correct: 1, count: 2 });
	expect(report.matched).toMatchObject({ correct: 0, count: 1 });
	expect(report.judged).toMatchObject({ correct: 1, count: 1 });
	expect(report.judgeRequests).toMatchObject({ correct: 1, count: 2 });
	expect(report.misses).toEqual([
		expect.objectContaining({ repetition: 1, licensed: ["bänke"] }),
	]);
});

test("the harness prices from the oracle, runs live once through the cache and replays it offline for free; a perfect judge scores every line", async () => {
	const root = await mkdtemp(join(tmpdir(), "licence-"));
	const chosen = [
		caseOf("Bank", "🏦"),
		caseOf("senden", "📡"),
		caseOf("melken", "🐄🥛"),
	];
	const set: LicenceSet = {
		name: "doublets",
		createdAt: "2026-10-21T00:00:00.000Z",
		gitHead: "test",
		dirtyRecordFiles: 0,
		hash: "testdoublets0000",
		cases: chosen,
	};
	await storeFrozenSet(join(root, "sets"), set);
	// Each case is its stratum's one Lemma, so all three are in tuning.
	const experiment = licenceExperiment("tuning");
	const estimated = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		estimate: true,
		repetitions: 1,
	});
	expect(estimated.run).toBeUndefined();
	// Bank's plurality and licence, senden's licence; melken's gold matches.
	expect(estimated.price?.jev.requests).toBe(3);

	let calls = 0;
	// A jev and Luna that answer as gold does, through the oracle.
	const byLemma = new Map(chosen.map((entry) => [entry.lemma, entry]));
	const caseIn = (body: unknown) => {
		const text = JSON.stringify(body);
		const found = [...byLemma.values()].find((entry) =>
			text.includes(`"lemma":"${entry.lemma}"`),
		);
		if (!found) throw Error("No case for the request");
		return found;
	};
	const jev: JevAsk = async (request) => {
		calls++;
		return {
			model: request.model,
			answers: licenceOracle.answers(
				{ licenceCase: caseIn(request.state) },
				request.questions,
			),
			usage: { input_tokens: 300, output_tokens: 2 },
		};
	};
	const luna: LunaAsk = async (request) => {
		calls++;
		const licenceCase = caseIn(request.input);
		return {
			output: licenceOracle.written({ licenceCase }, request.input),
			metadata: { usage: { input_tokens: 600, output_tokens: 20 } },
		};
	};
	const evaluated = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		jev,
		luna,
		repetitions: 1,
		caps: {
			jevInputTokens: 1e6,
			lunaInputTokens: 1e6,
			lunaOutputTokens: 1e5,
		},
	});
	const run = evaluated.run;
	if (!run) throw Error("no run");
	const metrics = licenceMetrics(run);
	expect(metrics.unscored).toBe(0);
	expect(metrics.dimensions.rate).toBe(1);
	expect(metrics.cases).toMatchObject({ correct: 3, count: 3 });
	expect(metrics.freeControls).toMatchObject({ correct: 1, count: 1 });
	// Luna writes gold: melken's forms are the stored ones, so it asks no judge.
	expect(metrics.judgeRequests).toMatchObject({ correct: 2, count: 3 });

	const before = calls;
	const replayed = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		offline: true,
		repetitions: 1,
	});
	expect(calls).toBe(before);
	if (!replayed.run) throw Error("no replayed run");
	expect(canonicalJson(licenceMetrics(replayed.run))).toBe(
		canonicalJson(metrics),
	);
});

test("the evaluation table lists the doublets set's two halves", async () => {
	const ids = listExperiments().map(({ id }) => id);
	expect(ids).toContain("knowledge/de:doublets:tuning");
	expect(ids).toContain("knowledge/de:doublets:heldout");
	expect(licenceExperiment("heldout").caseCount()).toBe(15);
});
