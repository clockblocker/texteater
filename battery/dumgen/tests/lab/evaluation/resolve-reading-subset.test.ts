import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReadingArm } from "../../../lab/evaluation/resolve-reading/cases.js";
import type {
	ReadingEvaluation,
	ScoredReading,
} from "../../../lab/evaluation/resolve-reading/scoring.js";
import {
	compareReadingWithBaseline,
	loadReadingSubset,
	readingSubsetCaseIds,
	saveReadingSubset,
	selectReadingSubset,
} from "../../../lab/evaluation/resolve-reading/subset.js";

type Shape = "right" | "noMatch" | "wrongReuse" | "failed";

/** One attempt at a case in an arm, shaped as `shape`. */
function attempt(
	caseId: string,
	route: string,
	arm: ReadingArm,
	repetition: number,
	shape: Shape,
	options: { authored?: boolean; reason?: string } = {},
): ScoredReading {
	const evaluation: ReadingEvaluation | undefined =
		shape === "failed"
			? undefined
			: {
					outcome: shape === "noMatch" ? "New" : "Reuse",
					reason: options.reason ?? "Judged",
					correct: shape === "right",
					wrongReuse: shape === "wrongReuse",
					judged: true,
					rejected: false,
				};
	return {
		caseId,
		arm,
		repetition,
		route,
		record: caseId,
		lemma: "x",
		markedSentence: "<TARGET>x</TARGET>",
		ideal: "🙂",
		candidates: arm === "present" ? 2 : 1,
		authored: options.authored ?? false,
		folded: false,
		evaluation,
	};
}

/** Both arms of an open case, three repetitions each. */
function openCase(
	caseId: string,
	route: string,
	present: readonly Shape[] = ["right", "right", "right"],
	removed: readonly Shape[] = ["right", "right", "right"],
): ScoredReading[] {
	return [
		...present.map((shape, repetition) =>
			attempt(caseId, route, "present", repetition, shape),
		),
		...removed.map((shape, repetition) =>
			attempt(caseId, route, "removed", repetition, shape),
		),
	];
}

/** A baseline: 30 passed NOUN cases, 10 passed VERB, 5 call-free PRON, 3 missed. */
function baseline(): ScoredReading[] {
	return [
		...Array.from({ length: 30 }, (_, index) =>
			openCase(`noun#${index}`, "Lexeme/NOUN"),
		).flat(),
		...Array.from({ length: 10 }, (_, index) =>
			openCase(`verb#${index}`, "Lexeme/VERB"),
		).flat(),
		// A Closed Route's one authored Reading: right, but no model asked.
		...Array.from({ length: 5 }, (_, index) =>
			[0, 1, 2].map((repetition) =>
				attempt(
					`pron#${index}`,
					"Lexeme/PRON",
					"present",
					repetition,
					"right",
					{
						authored: true,
						reason: "Authored",
					},
				),
			),
		).flat(),
		// A NoMatch with gold offered, in one repetition only: a flip.
		...openCase("flip#0", "Lexeme/VERB", ["right", "noMatch", "right"]),
		// A wrong Reuse with gold removed, every time.
		...openCase("merge#0", "Lexeme/NOUN", undefined, [
			"wrongReuse",
			"wrongReuse",
			"wrongReuse",
		]),
		// Luna's answer was no Emoji Description.
		...openCase("invalid#0", "Lexeme/NUM", undefined, [
			"failed",
			"failed",
			"failed",
		]),
	];
}

test("the subset takes every case with an attempt not right, and a seeded guard of passed cases that a model answers, by route", () => {
	const options = {
		baselineRunId: "baseline",
		experimentId: "resolve-reading/de:dev",
		setHash: "abc",
		attempts: baseline(),
		seed: 877,
		guardSize: 8,
	};
	const subset = selectReadingSubset(options);
	const ids = readingSubsetCaseIds(subset);
	expect(ids.missed).toEqual(["flip#0", "invalid#0", "merge#0"]);
	expect(subset.missed["flip#0"]?.verdicts).toEqual({
		present: ["right", "wrong", "right"],
		removed: ["right", "right", "right"],
	});
	expect(subset.missed["merge#0"]?.verdicts.removed).toEqual([
		"wrongReuse",
		"wrongReuse",
		"wrongReuse",
	]);
	expect(subset.repetitions).toBe(3);
	// NOUN 31 and VERB 11 of 44 asked cases: 8 split 6 and 2; no call-free PRON.
	expect(subset.guard["Lexeme/NOUN"]).toHaveLength(6);
	expect(subset.guard["Lexeme/VERB"]).toHaveLength(2);
	expect(subset.guard["Lexeme/PRON"]).toBeUndefined();
	for (const id of ids.guard) expect(ids.missed).not.toContain(id);
	// The same seed draws the same guard; another seed another.
	expect(selectReadingSubset(options).guard).toEqual(subset.guard);
	expect(selectReadingSubset({ ...options, seed: 1 }).guard).not.toEqual(
		subset.guard,
	);
});

test("a run on the subset is compared with the baseline on the same cases, with its moves and the guard's regressions", async () => {
	const subset = selectReadingSubset({
		baselineRunId: "baseline",
		experimentId: "resolve-reading/de:dev",
		setHash: "abc",
		attempts: baseline(),
		seed: 877,
		guardSize: 4,
	});
	const path = join(
		await mkdtemp(join(tmpdir(), "reading-subset-")),
		"subset.json",
	);
	await saveReadingSubset(path, subset);
	expect(loadReadingSubset(path)).toEqual(subset);
	const [regressing, ...steady] = readingSubsetCaseIds(subset).guard;
	if (!regressing) throw Error("no guard");
	const now = [
		// The merge is fixed; the invalid answers are still invalid.
		...openCase("merge#0", "Lexeme/NOUN"),
		...openCase("invalid#0", "Lexeme/NUM", undefined, [
			"failed",
			"failed",
			"failed",
		]),
		// The flip is wrong twice now.
		...openCase("flip#0", "Lexeme/VERB", ["noMatch", "noMatch", "right"]),
		...openCase(regressing, "Lexeme/NOUN", ["right", "noMatch", "right"]),
		...steady.flatMap((id) => openCase(id, "Lexeme/NOUN")),
	];
	const compared = compareReadingWithBaseline(subset, now);
	expect(compared.missedCases).toBe(3);
	expect(compared.lines.wrongReuse.baseline.correct).toBe(3);
	expect(compared.lines.wrongReuse.now.correct).toBe(0);
	expect(compared.lines.noMatch.baseline.correct).toBe(3);
	expect(compared.lines.noMatch.now.correct).toBe(6);
	expect(compared.lines.reuse.now.correct).toBe(7);
	expect(compared.lines.failed.now.correct).toBe(3);
	expect(compared.wrongToRight.map(({ attempt }) => attempt)).toEqual([
		"merge#0:removed",
	]);
	expect(compared.rightToWrong.map(({ attempt }) => attempt)).toEqual([
		"flip#0:present",
	]);
	expect(compared.regression.regressed).toBe(1);
	expect(compared.regression.count).toBe(4);
	expect(compared.regression.cases[0]?.caseId).toBe(regressing);
});
