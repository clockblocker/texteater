import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalJson, isRecord } from "common-utils";
import { listExperiments } from "../../../lab/evaluation/experiments.js";
import { storeFrozenSet } from "../../../lab/evaluation/frozen-sets.js";
import {
	type KnowledgeCase,
	type KnowledgeSet,
	knowledgeCases,
	requestOf,
	spotCheckCases,
} from "../../../lab/evaluation/knowledge/cases.js";
import {
	knowledgeExperiment,
	knowledgeMetrics,
} from "../../../lab/evaluation/knowledge/experiment.js";
import {
	goldKnowledgeWritten,
	knowledgeOracle,
} from "../../../lab/evaluation/knowledge/oracle.js";
import {
	evaluateKnowledge,
	type KnowledgeOutput,
	type ScoredKnowledge,
	shadowKey,
	spotCheckReport,
} from "../../../lab/evaluation/knowledge/scoring.js";
import {
	knowledgeSubsetCaseIds,
	saveKnowledgeSubset,
	selectKnowledgeSubset,
} from "../../../lab/evaluation/knowledge/subset.js";
import type { LunaAsk } from "../../../src/luna.js";
import type { JevAsk } from "../../../src/segment/jev.js";

const { dev, heldout } = knowledgeCases();

const caseOf = (lemma: string, cases: readonly KnowledgeCase[] = heldout) => {
	const found = cases.find(
		({ reading }) => reading.lemma.canonicalForm === lemma,
	);
	if (!found) throw Error(`No case of ${lemma}`);
	return found;
};

test("held-out is the Readings reviewed to Knowledge depth, each once with its gold; dev is the Draft Readings held-out lacks (#873, #884)", () => {
	expect(heldout.length).toBeGreaterThan(60);
	const keys = heldout.map(({ reading }) => canonicalJson(reading));
	expect(new Set(keys).size).toBe(keys.length);
	// Every open held-out Reading has gold; authored ones are tf-demo's.
	for (const goldCase of heldout)
		if (!goldCase.authored) expect(goldCase.gold).toBeDefined();
	// sein 🟰 is in several records and is one case.
	expect(
		heldout.filter(({ reading }) => reading.lemma.canonicalForm === "sein"),
	).toHaveLength(1);
	expect(dev.length).toBeGreaterThan(800);
	const heldoutKeys = new Set(keys);
	for (const goldCase of dev)
		expect(heldoutKeys.has(canonicalJson(goldCase.reading))).toBe(false);
});

test("a structural run asks for the route's structural aspects only, a text run for its text aspects", () => {
	expect(requestOf(caseOf("warten"), "structural")).toEqual({
		valency: null,
		conjugationClass: null,
		semanticRelations: {
			synonym: null,
			nearSynonym: null,
			antonym: null,
			nearAntonym: null,
			hypernym: null,
		},
	});
	expect(requestOf(caseOf("warten"), "text")).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
	});
	expect(
		Object.keys(requestOf(caseOf("verheiratet"), "structural")),
	).toContain("participleSource");
});

test("the spot-check set holds #545's six slips and a seeded dev sample (#545, #883 point 10)", () => {
	const { cases, slips } = spotCheckCases(undefined, dev);
	expect(slips.map(({ lemma, language }) => `${lemma}/${language}`)).toEqual([
		"schmecken/en",
		"Paket/ru",
		"Licht ins Dunkel bringen/en",
		"Diplom-Ingenieur/ru",
		"Tomaten auf den Augen haben/en",
		"gut/ru",
	]);
	for (const slip of slips)
		expect(cases.some(({ id }) => id === slip.caseId)).toBe(true);
	expect(cases.length).toBe(36);
	// Seeded: the same sample every time.
	expect(spotCheckCases(undefined, dev).cases.map(({ id }) => id)).toEqual(
		cases.map(({ id }) => id),
	);
	expect(cases.every(({ authored }) => !authored)).toBe(true);
});

const output = (partial: Partial<KnowledgeOutput>): KnowledgeOutput => ({
	changes: [],
	pendingRelations: [],
	failures: [],
	...partial,
});

test("structural aspects are scored exactly, a reviewed-empty aspect is right only when empty, and a failure is wrong", () => {
	const warten = caseOf("warten");
	const request = requestOf(warten, "structural");
	const gold = warten.gold?.knowledge;
	if (!gold?.valency) throw Error("warten has no gold valency");
	const right = evaluateKnowledge(
		warten,
		request,
		output({
			changes: [
				{ kind: "Contribute", aspect: "valency", value: gold.valency },
				{
					kind: "Contribute",
					aspect: "conjugationClass",
					value: ["Weak"],
				},
			],
		}),
	);
	const verdict = (aspect: string, of = right) =>
		of.verdicts.find((entry) => entry.aspect === aspect);
	expect(verdict("valency")).toMatchObject({
		gold: "Authored",
		correct: true,
		complements: { gold: 6, produced: 6, matched: 6 },
	});
	expect(verdict("conjugationClass")?.correct).toBe(true);
	const wrong = evaluateKnowledge(
		warten,
		request,
		output({
			changes: [
				{
					kind: "Contribute",
					aspect: "conjugationClass",
					value: ["Strong"],
				},
			],
			failures: [
				{ aspect: "valency", code: "ProviderFailure", message: "down" },
			],
		}),
	);
	expect(verdict("conjugationClass", wrong)?.correct).toBe(false);
	expect(verdict("valency", wrong)).toMatchObject({
		correct: false,
		failed: "ProviderFailure",
	});
	// A noun's frame is reviewed empty: a produced frame is wrong.
	const mutter = heldout.find(
		({ reading, gold }) =>
			reading.lemma.canonicalForm === "Mutter" &&
			gold?.coverage.valency === "ReviewedEmpty",
	);
	if (!mutter) throw Error("No Mutter");
	const frame = [
		{
			status: "Optional",
			complements: [{ kind: "Clause", form: "Dass" }],
		},
	];
	const extra = evaluateKnowledge(
		mutter,
		requestOf(mutter, "structural"),
		output({
			changes: [{ kind: "Contribute", aspect: "valency", value: frame }],
		}),
	);
	expect(verdict("valency", extra)).toMatchObject({
		gold: "ReviewedEmpty",
		correct: false,
	});
});

test("relations are scored on recall; extra claims are listed for the spot-check, not counted wrong (#884 ruling 3)", () => {
	const warten = caseOf("warten");
	const evaluation = evaluateKnowledge(
		warten,
		{ semanticRelations: { synonym: null, nearSynonym: null } },
		output({
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "VERB",
						canonicalForm: "Harren",
					},
				},
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "VERB",
						canonicalForm: "ausharren",
					},
				},
			],
		}),
	);
	const synonym = evaluation.verdicts.find(
		({ aspect }) => aspect === "semanticRelations.synonym",
	);
	expect(synonym).toMatchObject({
		gold: "Authored",
		goldClaims: ["Lexeme/VERB/harren"],
		found: ["Lexeme/VERB/harren"],
		extra: ["Lexeme/VERB/ausharren"],
	});
	const near = evaluation.verdicts.find(
		({ aspect }) => aspect === "semanticRelations.nearSynonym",
	);
	expect(near?.goldClaims).toHaveLength(3);
	expect(near?.found).toEqual([]);
	expect(
		shadowKey({ family: "Lexeme", kind: "VERB", canonicalForm: "Sich X" }),
	).toBe("Lexeme/VERB/sich x");
});

test("the spot-check report names each slip and counts the repetitions that repeated it (#545)", () => {
	const slip = {
		caseId: "slip:Paket",
		lemma: "Paket",
		language: "ru" as const,
		rejected: ["пакет"],
		issue: "false friend",
	};
	const attempt = (repetition: number, value: string): ScoredKnowledge => ({
		caseId: "slip:Paket",
		repetition,
		route: "Lexeme/NOUN",
		lemma: "Paket",
		emojiDescription: "📦",
		sentence: "Das <TARGET>Paket</TARGET> wird morgen geliefert.",
		evaluation: {
			verdicts: [
				{ aspect: "translations.ru", produced: true, text: value },
			],
		},
	});
	const report = spotCheckReport(
		[
			attempt(0, "посылка"),
			attempt(1, "Пакет"),
			attempt(2, "посылка; бандероль"),
		],
		[slip],
	);
	expect(report.slips[0]?.replicated).toBe(1);
	expect(report.slipsReplicated).toBe(1);
	expect(report.samples["translations.ru"]?.[0]).toMatchObject({
		caseId: "slip:Paket",
		value: "посылка",
	});
});

test("the oracle answers as gold would, so a pricing pass finds every request", () => {
	const verheiratet = caseOf("verheiratet");
	expect(
		goldKnowledgeWritten(
			{ goldCase: verheiratet, scope: "structural" },
			{ aspect: "participleSource" },
		),
	).toMatchObject({
		verb: "verheiraten",
		reflexive: "Acc",
		participle: "verheiratet",
	});
	const warten = caseOf("warten");
	const candidates = goldKnowledgeWritten(
		{ goldCase: warten, scope: "structural" },
		{ aspect: "relationCandidates" },
	);
	expect(candidates).toContain("harren");
	const answers = knowledgeOracle.answers(
		{ goldCase: warten, scope: "structural" },
		{
			relation_0: {
				type: "choice",
				instructions: { candidate: "harren" },
				criteria: { synonym: null, nearSynonym: null, None: "none" },
			},
		},
	);
	expect(answers.relation_0).toMatchObject({ choice: "synonym" });
});

/** A small frozen held-out set: warten, verheiratet and a Saying. */
async function frozenRoot(): Promise<{
	readonly root: string;
	readonly cases: KnowledgeCase[];
}> {
	const root = await mkdtemp(join(tmpdir(), "knowledge-"));
	const cases = [
		caseOf("warten"),
		caseOf("verheiratet"),
		caseOf("Wissen ist Macht"),
	];
	const set: KnowledgeSet = {
		name: "heldout",
		createdAt: "2026-10-03T00:00:00.000Z",
		gitHead: "test",
		dirtyRecordFiles: 0,
		hash: "testheldout00000",
		cases,
	};
	await storeFrozenSet(join(root, "sets"), set);
	return { root, cases };
}

test("the harness prices a round from the oracle without a call, runs live once through the cache, and replays it offline for free (#873 point 7)", async () => {
	const { root } = await frozenRoot();
	const experiment = knowledgeExperiment("heldout");
	const estimated = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		estimate: true,
		repetitions: 1,
	});
	expect(estimated.run).toBeUndefined();
	expect(estimated.price?.luna.requests).toBeGreaterThan(4);
	expect(estimated.price?.jev.requests).toBeGreaterThan(2);
	expect(estimated.price?.cost.totalBatchUsd).toBeGreaterThan(0);
	// Priced at the measured tokens per character, not the constants.
	expect(estimated.price?.luna.pricedFromCharacters).toBe(0);

	let jevCalls = 0;
	let lunaCalls = 0;
	const jev: JevAsk = async (request) => {
		jevCalls++;
		return {
			model: request.model,
			answers: Object.fromEntries(
				Object.entries(request.questions).map(([id, question]) => {
					const options = Object.keys(
						question.type === "choice"
							? (question.criteria ?? {})
							: {},
					);
					const choice =
						id === "sayingType"
							? "WingedWord"
							: id === "form"
								? "Participle"
								: id.startsWith("kind_")
									? "VERB"
									: (options[0] ?? "");
					return [
						id,
						{
							type: "choice",
							choice,
							confidence: 1,
							probabilities: { [choice]: 1 },
						},
					];
				}),
			),
			usage: { input_tokens: 300, output_tokens: 2 },
		};
	};
	const luna: LunaAsk = async (request) => {
		lunaCalls++;
		const aspect = isRecord(request.input)
			? request.input.aspect
			: undefined;
		const answers: Record<string, unknown> = {
			valency: { valency: [] },
			conjugationClass: ["wartete"],
			participleSource: {
				verb: "verheiraten",
				reflexive: "Acc",
				separablePrefix: null,
				preterite: "verheiratete",
				participle: "verheiratet",
			},
			attribution: "Francis Bacon, Meditationes Sacrae",
			relationCandidates: ["harren"],
		};
		return {
			output:
				typeof aspect === "string" ? (answers[aspect] ?? null) : null,
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
	expect(lunaCalls).toBeGreaterThan(0);
	expect(evaluated.spend?.luna.freshCalls).toBe(lunaCalls);
	const run = evaluated.run;
	if (!run) throw Error("no run");
	const metrics = knowledgeMetrics(run);
	if (!("lines" in metrics)) throw Error("Expected a Knowledge report");
	// Each exact aspect's line is keyed by its name.
	expect(metrics.lines.conjugationClass).toMatchObject({
		correct: 1,
		count: 1,
	});
	expect(metrics.lines.sayingType).toMatchObject({ correct: 1, count: 1 });
	expect(metrics.lines.participleSource.count).toBe(1);
	expect(metrics.lines.relationRecall.correct).toBeGreaterThan(0);
	expect(metrics.flips).toEqual([]);

	// A re-score replays the cache: no call at all.
	const calls = { jev: jevCalls, luna: lunaCalls };
	const replayed = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		offline: true,
		repetitions: 1,
	});
	expect({ jev: jevCalls, luna: lunaCalls }).toEqual(calls);
	if (!replayed.run) throw Error("no replayed run");
	expect(canonicalJson(knowledgeMetrics(replayed.run))).toBe(
		canonicalJson(metrics),
	);
});

test("the evaluation table lists the three Knowledge experiments", () => {
	const ids = listExperiments().map(({ id }) => id);
	expect(ids).toEqual(
		expect.arrayContaining([
			"knowledge/de:dev",
			"knowledge/de:heldout",
			"knowledge/de:spot-check",
		]),
	);
});

test("--gold-only keeps the cases with gold, and a subset keeps its missed and guard cases (#887)", async () => {
	const root = await mkdtemp(join(tmpdir(), "knowledge-dev-"));
	const withGold = dev.filter(
		({ gold, authored }) => gold !== undefined && !authored,
	);
	const withoutGold = dev.filter(
		({ gold, authored }) => gold === undefined && !authored,
	);
	const cases = [...withGold.slice(0, 3), ...withoutGold.slice(0, 2)];
	const set: KnowledgeSet = {
		name: "dev",
		createdAt: "2026-10-03T00:00:00.000Z",
		gitHead: "test",
		dirtyRecordFiles: 0,
		hash: "testdev000000000",
		cases,
	};
	await storeFrozenSet(join(root, "sets"), set);
	const experiment = knowledgeExperiment("dev");
	const requests = async (options: { goldOnly?: boolean; subset?: string }) =>
		(
			await experiment.evaluate({
				experimentId: experiment.id,
				sourceRevision: "test",
				root,
				setsRoot: join(root, "sets"),
				estimate: true,
				repetitions: 1,
				...options,
			})
		).price?.luna.requests ?? 0;
	const all = await requests({});
	const goldOnly = await requests({ goldOnly: true });
	expect(goldOnly).toBeGreaterThan(0);
	expect(goldOnly).toBeLessThan(all);

	const [first, second] = withGold;
	if (!first || !second) throw Error("dev has too little gold");
	const subset = selectKnowledgeSubset({
		baselineRunId: "baseline",
		experimentId: experiment.id,
		setHash: set.hash,
		seed: 887,
		guardSize: 1,
		attempts: [
			{
				caseId: first.id,
				repetition: 0,
				route: "Lexeme/VERB",
				lemma: "a",
				emojiDescription: "",
				sentence: "",
				evaluation: {
					verdicts: [
						{ aspect: "valency", produced: true, correct: false },
					],
				},
			},
			{
				caseId: second.id,
				repetition: 0,
				route: "Lexeme/VERB",
				lemma: "b",
				emojiDescription: "",
				sentence: "",
				evaluation: {
					verdicts: [
						{ aspect: "valency", produced: true, correct: true },
					],
				},
			},
		],
	});
	expect(subset.missed).toEqual({ [first.id]: ["valency"] });
	expect(knowledgeSubsetCaseIds(subset).guard).toEqual([second.id]);
	const path = join(root, "subset.json");
	await saveKnowledgeSubset(path, subset);
	const subsetRequests = await requests({ subset: path });
	expect(subsetRequests).toBeGreaterThan(0);
	expect(subsetRequests).toBeLessThan(goldOnly);
	await saveKnowledgeSubset(path, { ...subset, setHash: "other" });
	await expect(requests({ subset: path })).rejects.toThrow(/drawn from/u);
});
