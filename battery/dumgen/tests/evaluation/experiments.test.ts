import { afterAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runEvaluationCli } from "../../cli/evaluate.js";
import {
	evaluateExperiment,
	evaluationMetrics,
	listExperiments,
	parityWith,
	productionPolicy,
} from "../../src/evaluation/experiments.js";
import type { SegmentInUnitsInput } from "../../src/evaluation/spec-corpus/segment-in-units.js";
import type { Answers } from "../../src/segment/ask.js";
import type { JevAsk } from "../../src/segment/jev.js";
import {
	type LabCase,
	type LabSet,
	storeSet,
} from "../../src/segment-in-units/lab/corpus.js";
import { readLedger } from "../../src/segment-in-units/lab/ledger.js";
import {
	currentPin,
	type Round,
	readRounds,
	roundOf,
	roundsPath,
	writeRounds,
} from "../../src/segment-in-units/lab/round.js";
import type { LabRun } from "../../src/segment-in-units/lab/run.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

const repository = resolve(import.meta.dir, "..", "..", "..", "..");
const directory = await mkdtemp(join(tmpdir(), "dumgen-experiments-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

// Er0 _1 zog2 _3 sich4 _5 an6 ,7 _8 zu9 m10 _11 Glück12 .13
const input: SegmentInUnitsInput = {
	language: "de",
	segments: [
		...segmentsOf("Er zog sich an, "),
		{ kind: "ResolvableText", text: "zu", surface: "zu" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		...segmentsOf(" Glück."),
	],
};
const route = (family: string, kind: string) => ({
	language: "de",
	family,
	kind,
});
const labCase: LabCase = {
	id: "de/er-zog-sich-an",
	record: "de/er-zog-sich-an",
	input,
	idealOutput: {
		units: [
			{ segments: [0], route: route("Lexeme", "PRON") },
			{ segments: [2, 4, 6], route: route("Lexeme", "VERB") },
			{ segments: [9, 10, 12], route: route("Locution", "ADV") },
		],
	},
	facts: {
		coverage: "Full",
		sources: [{ target: 0 }, { target: 1 }, { target: 2 }],
	},
	rules: [],
	ruleExample: false,
};
const set: LabSet = {
	name: "dev",
	createdAt: "",
	gitHead: "test",
	dirtyRecordFiles: 0,
	hash: "test",
	cases: [labCase],
};

/**
 * A judge that knows the gold, counting its calls: zum is a Fusion, sich
 * and an take zog as host, zu, m and Glück are one fixed expression, and
 * each gold group gets its gold route. Anything else is no.
 */
function goldJudge() {
	const counter = { calls: 0, tokens: 0 };
	const jev: JevAsk = async (request) => {
		counter.calls++;
		counter.tokens += 100;
		const known: Record<string, string> = {
			source_9: "Fusion",
			s_reflexive_3: "p2",
			s_particle_4: "p2",
			r_1: "Lexeme/PRON",
			r_2_3_4: "Lexeme/VERB",
			r_5_6_7: "Locution/ADV",
		};
		const fixed = new Set(["f_5", "f_6", "f_7", "e_5_6", "e_5_7", "e_6_7"]);
		const answers = Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => {
				if (question.type === "noul")
					return [
						id,
						{ type: "noul", noul: fixed.has(id) ? 0.9 : 0.1 },
					];
				const keys = Object.keys(
					question.type === "choice" ? question.criteria : {},
				);
				const wanted = known[id] ?? keys[keys.length - 1];
				return [
					id,
					{
						type: "choice",
						choice: wanted,
						confidence: 1,
						probabilities: Object.fromEntries(
							keys.map((key) => [key, key === wanted ? 1 : 0]),
						),
					},
				];
			}),
		);
		return {
			model: request.model,
			answers: answers as Answers,
			usage: { input_tokens: 100, output_tokens: 0 },
		};
	};
	return { jev, counter };
}

async function labWithSet(name: string) {
	const labRoot = join(directory, name);
	const setsRoot = join(labRoot, "sets");
	await storeSet(setsRoot, set);
	return { labRoot, setsRoot };
}

test("the table lists gold and raw mode per frozen set, text mode, and resolve.grammar's, resolve.reading's and knowledge.produce's sets", () => {
	expect(listExperiments().map(({ id }) => id)).toEqual([
		"segment-in-units/de:dev",
		"segment-in-units/de:dev:raw",
		"segment-in-units/de:heldout",
		"segment-in-units/de:heldout:raw",
		"split-text/de:ud-drafts",
		"resolve-grammar/de:dev",
		"resolve-grammar/de:heldout",
		"resolve-grammar/de:dev:e2e",
		"resolve-reading/de:dev",
		"resolve-reading/de:heldout",
		"knowledge/de:dev",
		"knowledge/de:heldout",
		"knowledge/de:spot-check",
	]);
});

test("gold mode runs production's unit stage, prices itself before asking, then replays offline", async () => {
	const lab = await labWithSet("gold");
	const { jev, counter } = goldJudge();
	const estimate = await evaluateExperiment({
		experimentId: "segment-in-units/de:dev",
		jev,
		sourceRevision: "test",
		...lab,
		estimate: true,
	});
	expect(estimate.run).toBeUndefined();
	expect(estimate.projection?.requests).toBeGreaterThan(0);
	expect(counter.calls).toBe(0);

	const priced: number[] = [];
	const live = await evaluateExperiment({
		experimentId: "segment-in-units/de:dev",
		jev,
		sourceRevision: "test",
		...lab,
		beforeLive: (projection) => {
			priced.push(projection.requests);
		},
	});
	expect(priced).toEqual([estimate.projection?.requests ?? -1]);
	expect(live.spend?.jev.freshCalls).toBe(counter.calls);
	expect(live.spend?.jev.freshInputTokens).toBe(counter.tokens);
	const run = live.run;
	if (!run) throw Error("no run");
	expect(run.summary.quality).toMatchObject({ passed: 1, failed: 0 });
	expect(run.cases[0]?.repetitions?.[0]?.output).toEqual(labCase.idealOutput);
	expect(evaluationMetrics(run)).toMatchObject({
		evaluated: 3,
		rates: { membership: 1, multiMembership: { rate: 1, units: 6 } },
	});

	const calls = counter.calls;
	const offline = await evaluateExperiment({
		experimentId: "segment-in-units/de:dev",
		jev,
		sourceRevision: "test",
		...lab,
		offline: true,
	});
	expect(counter.calls).toBe(calls);
	expect(offline.spend?.jev.freshCalls).toBe(0);
	const outputs = (value: typeof run) =>
		value.cases.map((record) =>
			record.repetitions?.map(({ output }) => output),
		);
	if (!offline.run) throw Error("no offline run");
	expect(outputs(offline.run)).toEqual(outputs(run));

	const labRun: LabRun = {
		runId: "lab",
		arm: "candidates4",
		options: { final: "1", closed: "1" },
		set: "dev",
		setHash: "test",
		setGitHead: "test",
		subset: "all",
		gitHead: "test",
		startedAt: "",
		finishedAt: "",
		repetitions: 3,
		model: "jev-1.13.0",
		cases: [
			{
				id: labCase.id,
				repetitions: [0, 1, 2].map((repetition) => ({
					outputs: {
						[productionPolicy]:
							repetition === 2
								? { units: [] }
								: labCase.idealOutput,
					},
					calls: [],
					wallMs: 0,
				})),
			},
		],
	};
	expect(parityWith(offline.run, labRun, productionPolicy)).toEqual({
		compared: 3,
		identical: 2,
		differing: [`${labCase.id}#2`],
		failed: [],
		missing: [],
	});
});

test("a live run retries a rate limit and counts every retry and failure as transport, apart from the accuracy", async () => {
	const lab = await labWithSet("transport");
	const { jev, counter } = goldJudge();
	let sent = 0;
	// The first request meets a rate limit, the second a bad request.
	const flaky: JevAsk = async (request, context) => {
		sent++;
		if (sent === 1)
			throw Object.assign(Error("TypeSafe answered 429: slow down"), {
				status: 429,
			});
		if (sent === 2)
			throw Object.assign(Error("TypeSafe answered 400: no"), {
				status: 400,
			});
		return jev(request, context);
	};
	const live = await evaluateExperiment({
		experimentId: "segment-in-units/de:dev",
		jev: flaky,
		sourceRevision: "test",
		...lab,
	});
	// The refused request is asked again when promptsmith replays the case.
	expect(live.run?.summary.quality).toMatchObject({ passed: 1, failed: 0 });
	expect(live.transport).toMatchObject({
		requests: counter.calls + 1,
		retries: 1,
		retriedRequests: 1,
		failures: 1,
		retriesBy: { "429": 1 },
		failuresBy: { "400": 1 },
	});
});

test("raw mode cuts the Sentence first, and pieces equal to gold's replay gold mode's unit requests", async () => {
	const lab = await labWithSet("raw");
	const { jev, counter } = goldJudge();
	await evaluateExperiment({
		experimentId: "segment-in-units/de:dev",
		jev,
		sourceRevision: "test",
		...lab,
	});
	const before = counter.calls;
	const estimate = await evaluateExperiment({
		experimentId: "segment-in-units/de:dev:raw",
		jev,
		sourceRevision: "test",
		...lab,
		estimate: true,
	});
	// Only the Segment stage's question about zum, once per repetition.
	expect(estimate.projection?.byStage).toEqual({
		segments: expect.objectContaining({ requests: 3, questions: 3 }),
	});
	const raw = await evaluateExperiment({
		experimentId: "segment-in-units/de:dev:raw",
		jev,
		sourceRevision: "test",
		...lab,
	});
	expect(counter.calls - before).toBe(3);
	const run = raw.run;
	if (!run) throw Error("no run");
	expect(run.cases[0]?.repetitions?.[0]?.output).toEqual({
		segments: input.segments,
		units: labCase.idealOutput.units,
		unresolved: [],
	});
	expect(evaluationMetrics(run)).toMatchObject({
		rates: { membership: 1 },
		pieces: {
			boundaries: { precision: 1, recall: 1 },
			pieces: { precision: 1, recall: 1 },
			exactSentences: 1,
			goldSegments: 1,
		},
	});
});

const roundOn = (pinned: Round["pin"], stopLineTokens = 1_000_000): Round => ({
	id: "test-round",
	opened: "2026-10-02",
	note: "",
	capTokens: 119_047_619,
	stopLineTokens,
	pin: pinned,
	repins: [],
});

async function evidenceWith(name: string, round: Round) {
	const evidenceRoot = join(directory, name);
	await mkdir(evidenceRoot, { recursive: true });
	await writeRounds(roundsPath(evidenceRoot), {
		current: round.id,
		rounds: [round],
	});
	return evidenceRoot;
}

test("evaluate writes a ledger line for its round, refuses a run past the stop line, and refuses drifted dumcorpus unless it re-pins", async () => {
	const pin = await currentPin(repository);
	const lab = await labWithSet("cli");
	const { jev, counter } = goldJudge();
	const warnings: string[] = [];
	const cli = (argv: string[], evidenceRoot: string) =>
		runEvaluationCli(
			[
				"--experiment",
				"segment-in-units/de:dev",
				"--revision",
				"test",
				"--output",
				join(directory, "runs"),
				...argv,
			],
			{
				jev,
				...lab,
				evidenceRoot,
				repository,
				write: () => {},
				warn: (message) => warnings.push(message),
			},
		);

	const tight = await evidenceWith("tight", roundOn(pin, 10));
	await expect(cli([], tight)).rejects.toThrow("past the stop line");
	expect(counter.calls).toBe(0);

	const evidenceRoot = await evidenceWith("evidence", roundOn(pin));
	await cli([], evidenceRoot);
	const [line] = await readLedger(join(evidenceRoot, "ledger.jsonl"));
	expect(line).toMatchObject({
		command: "evaluate",
		round: "test-round",
		experiment: "segment-in-units/de:dev",
		pin: pin.hash,
		cases: 1,
		repetitions: 3,
		jev: { freshCalls: counter.calls, freshInputTokens: counter.tokens },
		transport: { requests: counter.calls, retries: 0, failures: 0 },
	});

	const drifted = {
		...pin,
		hash: "drifted",
		inputs: { ...pin.inputs, rules: "x" },
	};
	const stale = await evidenceWith("stale", roundOn(drifted));
	await expect(cli([], stale)).rejects.toThrow("(rules) changed");
	await cli(["--offline"], stale);
	expect(warnings.at(-1)).toContain(
		"offline answers built from the old inputs",
	);
	await cli(["--repin", "--reason", "peer edit"], stale);
	const repinned = roundOf(await readRounds(roundsPath(stale)));
	expect(repinned.pin.hash).toBe(pin.hash);
	expect(repinned.repins).toMatchObject([{ reason: "peer edit" }]);
});
