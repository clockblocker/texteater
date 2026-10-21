import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalJson } from "common-utils";
import { listExperiments } from "../../../lab/evaluation/experiments.js";
import { storeFrozenSet } from "../../../lab/evaluation/frozen-sets.js";
import {
	type LicenceCase,
	type LicenceSet,
	licenceCases,
	loadLicenceSet,
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

/** A judge request over the stored forms of a case, as production sends it. */
const question = (part: string, form: string): JevRequest["questions"] => ({
	q: { type: "noul", instructions: { question: "?", part, form } },
});

test("the oracle takes exactly the stored forms gold gives the later Reading", () => {
	const broadcast = caseOf("senden", "📡");
	const nouls = (part: string, form: string) =>
		licenceOracle.answers({ licenceCase: broadcast }, question(part, form))
			.q;
	expect(
		nouls("the third person singular Präteritum (er …)", "sendete"),
	).toEqual({
		type: "noul",
		noul: 1,
	});
	expect(
		nouls("the third person singular Präteritum (er …)", "sandte"),
	).toEqual({
		type: "noul",
		noul: 0,
	});
});

/** The output a perfect run of the case would store: the oracle's pick, and gold's forms after NoMatch. */
function perfect(licenceCase: LicenceCase, judged?: Record<string, string[]>) {
	const events = Object.entries(licenceCase.stored.paradigm).map(
		([dimension, stored]) => {
			const gold =
				licenceCase.later.gold.paradigm[
					dimension as keyof typeof licenceCase.later.gold.paradigm
				] ?? [];
			const taken =
				judged?.[dimension] ??
				(stored ?? [])
					.filter((form) => gold.includes(form))
					.map((form) => form.toLowerCase());
			return {
				name: "ParadigmLicence",
				data: {
					dimension,
					outcome: taken.length > 0 ? "Licensed" : "NoMatch",
					variants: taken,
					nouls: {},
				},
			};
		},
	);
	return { paradigmChanges: [], failures: [], events };
}

test("a dimension is right when the judge takes exactly the stored variants gold gives; NoMatch is scored for precision and recall", () => {
	const lender = caseOf("Bank", "🏦");
	const right = evaluateLicence(lender, perfect(lender));
	expect(right.verdicts).toEqual([
		expect.objectContaining({
			dimension: "plural",
			stored: ["bänke"],
			gold: ["banken"],
			expected: [],
			judged: [],
		}),
	]);
	const leak = evaluateLicence(
		lender,
		perfect(lender, { plural: ["bänke"] }),
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
	expect(report.noMatch.recall).toMatchObject({ correct: 1, count: 2 });
	expect(report.noMatch.precision).toMatchObject({ correct: 1, count: 1 });
	expect(report.misses).toEqual([
		expect.objectContaining({ repetition: 1, judged: ["bänke"] }),
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
	const experiment = licenceExperiment();
	const estimated = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		estimate: true,
		repetitions: 1,
	});
	expect(estimated.run).toBeUndefined();
	expect(estimated.price?.jev.requests).toBe(4);

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
	expect(metrics.licences.asRuleGives.rate).toBe(1);
	expect(metrics.freeControls).toMatchObject({ correct: 1, count: 1 });
	// 🏦's plural is NoMatch, so Luna writes it; 📡 and the control take stored variants only.
	expect(metrics.noMatch.recall).toMatchObject({ correct: 1, count: 1 });

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

test("the evaluation table lists the doublets experiment, which takes no subset or gold filter", async () => {
	expect(listExperiments().map(({ id }) => id)).toContain(
		"knowledge/de:doublets",
	);
});
