import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	freezeGrammarSets,
	grammarCases,
	loadGrammarSet,
} from "../../../lab/evaluation/resolve-grammar/cases.js";
import {
	grammarExperiment,
	grammarMetrics,
} from "../../../lab/evaluation/resolve-grammar/experiment.js";
import type {
	GrammarEvaluation,
	ScoredAttempt,
} from "../../../lab/evaluation/resolve-grammar/scoring.js";
import {
	compareWithBaseline,
	guardQuotas,
	saveSubset,
	selectSubset,
	subsetCaseIds,
} from "../../../lab/evaluation/resolve-grammar/subset.js";

const repository = resolve(import.meta.dir, "../../../../..");

const right: GrammarEvaluation = {
	outcome: "Resolved",
	lemma: true,
	cell: true,
	members: true,
	spelling: true,
	exact: true,
};

/** Three attempts at one case, `wrong` naming the lines each one misses. */
function attemptsAt(
	caseId: string,
	route: string,
	wrong: readonly (readonly (keyof GrammarEvaluation)[] | "failed")[] = [
		[],
		[],
		[],
	],
): ScoredAttempt[] {
	return wrong.map((lines, repetition) => ({
		caseId,
		repetition,
		route,
		record: caseId,
		rules: [],
		evaluation:
			lines === "failed"
				? undefined
				: {
						...right,
						...Object.fromEntries(
							lines.map((line) => [line, false]),
						),
					},
	}));
}

/** A baseline: 40 passed NOUN cases, 20 passed VERB, 4 missed in different ways. */
function baseline(): ScoredAttempt[] {
	return [
		...Array.from({ length: 40 }, (_, index) =>
			attemptsAt(`noun#${index}`, "Lexeme/NOUN"),
		).flat(),
		...Array.from({ length: 20 }, (_, index) =>
			attemptsAt(`verb#${index}`, "Lexeme/VERB"),
		).flat(),
		// A flip: the Lemma is wrong in one repetition only.
		...attemptsAt("flip#0", "Lexeme/VERB", [[], ["lemma", "exact"], []]),
		// Only a field line misses, in every repetition.
		...attemptsAt("spelling#0", "Lexeme/NOUN", [
			["spelling"],
			["spelling"],
			["spelling"],
		]),
		...attemptsAt("valency#0", "Lexeme/VERB", [[], [], ["valency"]]),
		...attemptsAt("failed#0", "Lexeme/ADJ", ["failed", "failed", "failed"]),
	];
}

test("the subset takes every case that missed a line in any repetition, flips and failures included", () => {
	const subset = selectSubset({
		baselineRunId: "run",
		experimentId: "resolve-grammar/de:dev",
		setHash: "hash",
		attempts: baseline(),
		seed: 7,
		guardSize: 12,
		scoresValency: (caseId) => caseId === "failed#0",
	});
	expect(Object.keys(subset.missed).sort()).toEqual([
		"failed#0",
		"flip#0",
		"spelling#0",
		"valency#0",
	]);
	expect(subset.missed["flip#0"]?.verdicts[1]).toMatchObject({
		lemma: false,
		exact: false,
		cell: true,
	});
	// A failed attempt misses valencyEvidence too where gold records it.
	expect(subset.missed["failed#0"]).toMatchObject({
		valency: true,
		verdicts: [{ lemma: false, valency: false }, {}, {}],
	});
	expect(subset.missed["flip#0"]?.valency).toBe(false);
	expect(subset.repetitions).toBe(3);
	const { guard } = subsetCaseIds(subset);
	expect(guard).toHaveLength(12);
	expect(guard.some((id) => Object.hasOwn(subset.missed, id))).toBe(false);
});

test("the guard is stratified by route in proportion to dev, and a seed always draws the same cases", () => {
	const draw = (seed: number) =>
		selectSubset({
			baselineRunId: "run",
			experimentId: "resolve-grammar/de:dev",
			setHash: "hash",
			attempts: baseline(),
			seed,
			guardSize: 12,
		}).guard;
	// Dev: 41 NOUN, 22 VERB, 1 ADJ of 64; the ADJ case has no passed case.
	expect(
		Object.fromEntries(
			Object.entries(draw(7)).map(([route, ids]) => [route, ids.length]),
		),
	).toEqual({
		"Lexeme/NOUN": 8,
		"Lexeme/VERB": 4,
	});
	expect(draw(7)).toEqual(draw(7));
	expect(draw(7)).not.toEqual(draw(8));
	// A route with too few passed cases gives its share to the others.
	expect(
		guardQuotas(
			new Map([
				["A", 50],
				["B", 50],
			]),
			new Map([
				["A", 100],
				["B", 2],
			]),
			10,
		),
	).toEqual(
		new Map([
			["A", 8],
			["B", 2],
		]),
	);
});

test("a run on the subset compares each line with the baseline, names the cases that moved, and counts regressions", () => {
	const subset = selectSubset({
		baselineRunId: "run",
		experimentId: "resolve-grammar/de:dev",
		setHash: "hash",
		attempts: baseline(),
		seed: 7,
		guardSize: 12,
	});
	const [firstGuard, ...otherGuard] = subsetCaseIds(subset).guard;
	if (!firstGuard) throw Error("no guard");
	const now = [
		// The failed case is now right every time: wrong to right.
		...attemptsAt("failed#0", "Lexeme/ADJ"),
		// The flip now misses its Lemma twice: right to wrong.
		...attemptsAt("flip#0", "Lexeme/VERB", [["lemma"], ["lemma"], []]),
		...attemptsAt("spelling#0", "Lexeme/NOUN"),
		...attemptsAt("valency#0", "Lexeme/VERB"),
		// One guard case regresses on its cell.
		...attemptsAt(firstGuard, "Lexeme/NOUN", [[], ["cell"], []]),
		...otherGuard.flatMap((id) => attemptsAt(id, "Lexeme/VERB")),
	];
	const compared = compareWithBaseline(subset, now);
	expect(compared.missedCases).toBe(4);
	expect(compared.lines.lemma.baseline).toMatchObject({
		correct: 8,
		count: 12,
	});
	expect(compared.lines.lemma.now).toMatchObject({ correct: 10, count: 12 });
	expect(compared.lines.spelling.baseline.correct).toBe(6);
	expect(compared.lines.spelling.now.correct).toBe(12);
	// Valency counts only the attempts that score it, as the report does.
	expect(compared.lines.valency.baseline).toMatchObject({
		correct: 0,
		count: 1,
	});
	expect(compared.wrongToRight.map(({ caseId }) => caseId)).toEqual([
		"failed#0",
	]);
	expect(compared.wrongToRight[0]).toMatchObject({
		baseline: "0/3",
		now: "3/3",
	});
	expect(compared.rightToWrong.map(({ caseId }) => caseId)).toEqual([
		"flip#0",
	]);
	expect(compared.regression).toMatchObject({
		regressed: 1,
		count: 12,
		cases: [{ caseId: firstGuard, lines: ["cell"] }],
	});
	expect(compared.regression.interval[0]).toBeGreaterThan(0);
	// One repetition compares as a rate too.
	const once = compareWithBaseline(
		subset,
		now.filter(({ repetition }) => repetition === 0),
	);
	expect(once.lines.lemma.now).toMatchObject({ correct: 3, count: 4 });
});

test("an evaluation on a subset runs only its cases, at the asked repetitions, and records its seed and case ids in the manifest", async () => {
	const { dev, heldout } = grammarCases();
	const cases = dev.slice(0, 3);
	const root = await mkdtemp(join(tmpdir(), "resolve-grammar-subset-"));
	await freezeGrammarSets(join(root, "sets"), repository, {
		dev: cases,
		heldout: heldout.slice(0, 1),
	});
	const set = await loadGrammarSet(join(root, "sets"), "dev");
	const [missed, guarded] = cases;
	if (!missed || !guarded) throw Error("no cases");
	const route = (index: number) =>
		`${cases[index]?.ideal.surface.lemma.family}/${cases[index]?.ideal.surface.lemma.kind}`;
	const subset = selectSubset({
		baselineRunId: "baseline",
		experimentId: "resolve-grammar/de:dev",
		setHash: set.hash,
		attempts: [
			...attemptsAt(missed.id, route(0), [["lemma"], [], []]),
			...attemptsAt(guarded.id, route(1)),
		],
		seed: 1,
		guardSize: 1,
	});
	const path = join(root, "subset.json");
	await saveSubset(path, subset);
	const experiment = grammarExperiment("dev", false);
	const estimate = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		subset: path,
		repetitions: 1,
		estimate: true,
	});
	expect(estimate.price).toMatchObject({ repetitions: 1, attempts: 2 });
	await expect(
		experiment.evaluate({
			experimentId: experiment.id,
			sourceRevision: "test",
			root,
			setsRoot: join(root, "sets"),
			subset: path,
			repetitions: 4,
			estimate: true,
		}),
	).rejects.toThrow("repetitions must be 1 to 3");
	// Offline, every attempt misses the empty cache and fails: still a run.
	const { run } = await experiment.evaluate({
		experimentId: experiment.id,
		sourceRevision: "test",
		root,
		setsRoot: join(root, "sets"),
		subset: path,
		repetitions: 1,
		offline: true,
	});
	if (!run) throw Error("no run");
	expect(run.manifest.corpus.caseIds.sort()).toEqual(
		[missed.id, guarded.id].sort(),
	);
	expect(run.manifest.repetitions ?? 1).toBe(1);
	expect(run.cases[0]?.repetitions ?? [run.cases[0]]).toHaveLength(1);
	expect(run.manifest.configurations.judgment.settings).toMatchObject({
		caseFilter: {
			baselineRunId: "baseline",
			seed: 1,
			missed: [missed.id],
			guard: [guarded.id],
		},
	});
	const metrics = grammarMetrics(run);
	expect(metrics.againstBaseline?.regression).toMatchObject({
		regressed: 1,
		count: 1,
	});
	expect(metrics.againstBaseline?.lines.lemma.baseline).toMatchObject({
		correct: 2,
		count: 3,
	});
});

test("a later round reads its misses from the round before and draws a fresh guard from the baseline, excluding an earlier guard", () => {
	const first = selectSubset({
		baselineRunId: "baseline",
		experimentId: "resolve-grammar/de:dev",
		setHash: "hash",
		attempts: baseline(),
		seed: 7,
		guardSize: 12,
	});
	const earlierGuard = new Set(subsetCaseIds(first).guard);
	// Round 2 ran the first subset: one missed case and one guard case miss.
	const [regressed] = [...earlierGuard];
	if (!regressed) throw Error("no guard");
	const round = [
		...attemptsAt("failed#0", "Lexeme/ADJ"),
		...attemptsAt("flip#0", "Lexeme/VERB", [["cell"], [], []]),
		...attemptsAt(regressed, "Lexeme/NOUN", [[], [], ["members"]]),
	];
	const next = selectSubset({
		baselineRunId: "round-2",
		experimentId: "resolve-grammar/de:dev",
		setHash: "hash",
		attempts: round,
		guardAttempts: baseline(),
		exclude: earlierGuard,
		seed: 9,
		guardSize: 12,
	});
	expect(Object.keys(next.missed).sort()).toEqual(
		["flip#0", regressed].sort(),
	);
	const fresh = subsetCaseIds(next).guard;
	expect(fresh).toHaveLength(12);
	expect(fresh.some((id) => earlierGuard.has(id))).toBe(false);
	expect(fresh.some((id) => Object.hasOwn(next.missed, id))).toBe(false);
});
