import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { guardGrammarBudget } from "../../cli/evaluate.js";
import {
	freezeGrammarSets,
	type GrammarCase,
	grammarCases,
} from "../../src/evaluation/resolve-grammar/cases.js";
import {
	grammarExperiment,
	grammarMetrics,
} from "../../src/evaluation/resolve-grammar/experiment.js";
import {
	goldAnswers,
	goldWritten,
} from "../../src/evaluation/resolve-grammar/oracle.js";
import {
	evaluateGrammar,
	wilson,
} from "../../src/evaluation/resolve-grammar/scoring.js";
import type { LunaAsk } from "../../src/luna.js";
import type { JevAsk } from "../../src/segment/jev.js";

const repository = resolve(import.meta.dir, "../../../..");

/** A few dev cases of different routes, frozen into a fresh root. */
async function frozenRoot(): Promise<{
	root: string;
	cases: readonly GrammarCase[];
}> {
	const { dev, heldout } = grammarCases();
	const routes = ["Lexeme/NOUN", "Lexeme/VERB", "Lexeme/PRON", "Lexeme/ADP"];
	// One case per route, each from a record of its own: the fakes find a
	// case by its Sentence.
	const records = new Set<string>();
	const cases = routes.flatMap((route) => {
		const found = dev.find(
			(goldCase) =>
				!records.has(goldCase.record) &&
				`${goldCase.ideal.surface.lemma.family}/${goldCase.ideal.surface.lemma.kind}` ===
					route,
		);
		if (found) records.add(found.record);
		return found ? [found] : [];
	});
	const root = await mkdtemp(join(tmpdir(), "resolve-grammar-"));
	await freezeGrammarSets(root, repository, {
		dev: cases,
		heldout: heldout.slice(0, 1),
	});
	return { root, cases };
}

/** Transports that answer as gold does, counting the calls they get. */
function goldTransports(cases: readonly GrammarCase[], wrongAt?: number) {
	const counter = { jev: 0, luna: 0 };
	// The fakes find their case by the Sentence the request names.
	const caseOf = (sentence: unknown) =>
		cases.find((goldCase) => goldCase.sentence.text === sentence);
	let attempt = 0;
	const jev: JevAsk = async (request) => {
		counter.jev++;
		const goldCase = caseOf(request.state.sentence);
		if (!goldCase) throw Error("No case for this request");
		return {
			model: request.model,
			answers: goldAnswers(goldCase, request.questions),
			usage: { input_tokens: 1000, output_tokens: 3 },
		};
	};
	const luna: LunaAsk = async (request) => {
		counter.luna++;
		const input = request.input as { sentence: string };
		const goldCase = caseOf(input.sentence);
		if (!goldCase) throw Error("No case for this request");
		const written = goldWritten(goldCase, request.input) as {
			canonicalForm: string;
			members: string[];
		};
		attempt++;
		return {
			output:
				attempt === wrongAt
					? { ...written, canonicalForm: `${written.canonicalForm}x` }
					: written,
			metadata: { usage: { input_tokens: 400, output_tokens: 20 } },
		};
	};
	return { jev, luna, counter };
}

test("resolve.grammar's run prices itself without a call, fills its cache once, and re-scores from it for free", async () => {
	const { root, cases } = await frozenRoot();
	const experiment = grammarExperiment("dev", false);
	const { jev, luna, counter } = goldTransports(cases);
	const estimate = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		estimate: true,
	});
	expect(estimate.run).toBeUndefined();
	expect(estimate.price?.attempts).toBe(cases.length * 3);
	expect(estimate.price?.jev.requests).toBeGreaterThanOrEqual(
		3 * (cases.length - 1),
	);
	expect(estimate.price?.jev.inputTokens).toBeGreaterThan(0);
	expect(counter).toEqual({ jev: 0, luna: 0 });

	const prices: number[] = [];
	const live = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		jev,
		luna,
		beforeLive: (price) => {
			prices.push(price.jev.requests);
		},
	});
	expect(prices).toEqual([estimate.price?.jev.requests ?? -1]);
	expect(counter.jev).toBe(estimate.price?.jev.requests ?? -1);
	expect(counter.luna).toBe(estimate.price?.luna.requests ?? -1);
	expect(live.spend?.jev).toMatchObject({
		freshCalls: counter.jev,
		freshInputTokens: 1000 * counter.jev,
	});
	expect(live.spend?.luna).toMatchObject({
		freshCalls: counter.luna,
		freshInputTokens: 400 * counter.luna,
		freshOutputTokens: 20 * counter.luna,
	});
	const run = live.run;
	if (!run) throw Error("no run");
	const metrics = grammarMetrics(run);
	expect(metrics.cases).toBe(cases.length);
	expect(metrics.attempts).toBe(cases.length * 3);
	expect(metrics.table.lemma).toMatchObject({
		correct: cases.length * 3,
		count: cases.length * 3,
		rate: 1,
	});
	expect(metrics.table.lemma.interval[0]).toBeGreaterThan(0.7);
	expect(metrics.table.lemma.interval[1]).toBe(1);
	expect(metrics.flips).toEqual([]);
	expect(Object.keys(metrics.slices)).toContain("NOUN Case (#542)");

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

test("a case whose Lemma verdict differs between repetitions is named as a flip", async () => {
	const { root, cases } = await frozenRoot();
	const experiment = grammarExperiment("dev", false);
	// The second Luna answer of the run is a wrong headword.
	const { jev, luna } = goldTransports(cases, 2);
	const { run } = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		jev,
		luna,
		concurrency: 1,
	});
	if (!run) throw Error("no run");
	const metrics = grammarMetrics(run);
	expect(metrics.flips).toHaveLength(1);
	expect(metrics.table.lemma.correct).toBe(cases.length * 3 - 1);
});

test("a click that is not Resolved is wrong on every line, and a field line can fail alone", () => {
	const [goldCase] = grammarCases().dev;
	if (!goldCase) throw Error("no case");
	expect(
		evaluateGrammar(goldCase.ideal, { _tag: "Unresolved", reason: "x" }),
	).toMatchObject({
		outcome: "Unresolved",
		reason: "x",
		lemma: false,
		cell: false,
		members: false,
		spelling: false,
		exact: false,
	});
	const respelled = {
		...goldCase.ideal,
		surface: {
			...goldCase.ideal.surface,
			normalizedSurface: `${goldCase.ideal.surface.normalizedSurface}x`,
		},
	};
	expect(
		evaluateGrammar(goldCase.ideal, {
			_tag: "Resolved",
			attestation: respelled,
		}),
	).toMatchObject({ lemma: true, cell: true, spelling: false, exact: false });
	const [low, high] = wilson(8, 10);
	expect(low).toBeCloseTo(0.4902, 3);
	expect(high).toBeCloseTo(0.9433, 3);
	expect(wilson(0, 0)).toEqual([0, 1]);
});

test("a live resolve.grammar run needs granted budgets and stays under them", () => {
	const price = {
		repetitions: 3,
		attempts: 3,
		jev: {
			requests: 3,
			inputTokens: 3000,
			outputTokens: 0,
			pricedFromCache: 0,
		},
		luna: {
			requests: 3,
			inputTokens: 1200,
			outputTokens: 60,
			pricedFromCache: 0,
		},
	};
	expect(() => guardGrammarBudget(price, undefined, "5000")).toThrow(
		"needs --budget",
	);
	expect(() => guardGrammarBudget(price, "2999", "5000")).toThrow(
		"past the budgets",
	);
	expect(() => guardGrammarBudget(price, "3000", "1200")).toThrow(
		"past the budgets",
	);
	expect(() => guardGrammarBudget(price, "3000", "1260")).not.toThrow();
});
