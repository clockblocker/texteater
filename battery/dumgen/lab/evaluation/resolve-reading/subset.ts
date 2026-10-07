/**
 * A round's subset of `resolve-reading/de:dev` (#877), the way
 * resolve.grammar's rounds ran (#876): instead of the whole dev set, a round
 * runs the cases the baseline got wrong and a guard against regressions.
 *
 * - **Missed**: every case with an attempt, in either arm and any
 *   repetition, that was not right: a NoMatch with gold offered, a Reuse
 *   with gold removed, a wrong authored pick, a rejected es gibt answer, or
 *   a failed click. Their baseline verdicts are kept, so a round is
 *   compared with the baseline on the same case ids, arms and repetitions.
 * - **Guard**: a seeded sample of the cases right in every arm and
 *   repetition, stratified by gold route in proportion to dev. A guard case
 *   with an attempt that is no longer right has regressed. A case no model
 *   answers (a Closed Route's one authored Reading, a Catalog Miss) can't
 *   regress, so it is neither drawn nor counted in the route shares.
 *
 * The subset is frozen once into the evidence (`bun cli/resolve-reading.ts
 * subset <baselineRunId>`), and a run that uses it records its seed and
 * case ids in the manifest.
 */
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type Line, lineOf, wilson } from "../resolve-grammar/scoring.js";
import { drawGuard } from "../resolve-grammar/subset.js";
import type { ReadingArm } from "./cases.js";
import type { ReadingEvaluation, ScoredReading } from "./scoring.js";

/** One attempt's verdict: right, wrong, a wrong Reuse (wrong too), or failed. */
type ReadingVerdict = "right" | "wrong" | "wrongReuse" | "failed";

type MissedReadingCase = {
	readonly route: string;
	readonly authored: boolean;
	/** The candidates each arm offers. */
	readonly candidates: Readonly<Partial<Record<ReadingArm, number>>>;
	/** Each arm's verdicts, one per repetition. */
	readonly verdicts: Readonly<
		Partial<Record<ReadingArm, readonly ReadingVerdict[]>>
	>;
};

export type ReadingSubset = {
	/** The baseline run the subset was read from. */
	readonly baselineRunId: string;
	readonly experimentId: string;
	/** The frozen dev set's hash the baseline ran on. */
	readonly setHash: string;
	readonly repetitions: number;
	readonly seed: number;
	readonly guardSize: number;
	readonly missed: Readonly<Record<string, MissedReadingCase>>;
	/** The guard's case ids, by route. */
	readonly guard: Readonly<Record<string, readonly string[]>>;
};

/** An attempt's verdict from its evaluation; no evaluation is a failed click. */
function verdictOf(evaluation: ReadingEvaluation | undefined): ReadingVerdict {
	if (!evaluation) return "failed";
	if (evaluation.correct) return "right";
	return evaluation.wrongReuse ? "wrongReuse" : "wrong";
}

type CaseEntry = {
	route: string;
	authored: boolean;
	/** Whether any attempt asked a model; one authored Reading or a Catalog Miss asks none. */
	asked: boolean;
	candidates: Partial<Record<ReadingArm, number>>;
	verdicts: Partial<Record<ReadingArm, ReadingVerdict[]>>;
};

/** Each case's attempts gathered by arm and repetition. */
function byCase(attempts: readonly ScoredReading[]): Map<string, CaseEntry> {
	const cases = new Map<string, CaseEntry>();
	for (const attempt of attempts) {
		const entry = cases.get(attempt.caseId) ?? {
			route: attempt.route,
			authored: attempt.authored,
			asked: false,
			candidates: {},
			verdicts: {},
		};
		const { evaluation } = attempt;
		if (
			!evaluation ||
			(evaluation.reason !== "Authored" &&
				evaluation.outcome !== "CatalogMiss")
		)
			entry.asked = true;
		entry.candidates[attempt.arm] = attempt.candidates;
		const verdicts = entry.verdicts[attempt.arm] ?? [];
		verdicts[attempt.repetition] = verdictOf(attempt.evaluation);
		entry.verdicts[attempt.arm] = verdicts;
		cases.set(attempt.caseId, entry);
	}
	return cases;
}

const misses = (entry: Pick<CaseEntry, "verdicts">) =>
	Object.values(entry.verdicts).some((verdicts) =>
		verdicts?.some((verdict) => verdict !== "right"),
	);

/** The subset of a baseline run's attempts: its misses and a seeded guard. */
export function selectReadingSubset(options: {
	readonly baselineRunId: string;
	readonly experimentId: string;
	readonly setHash: string;
	readonly attempts: readonly ScoredReading[];
	readonly seed: number;
	readonly guardSize: number;
}): ReadingSubset {
	const cases = byCase(options.attempts);
	const missed: Record<string, MissedReadingCase> = {};
	const devRoutes = new Map<string, number>();
	const passedByRoute = new Map<string, string[]>();
	for (const [caseId, entry] of [...cases].sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		if (misses(entry)) {
			const { asked: _, ...kept } = entry;
			missed[caseId] = kept;
		}
		if (!entry.asked) continue;
		devRoutes.set(entry.route, (devRoutes.get(entry.route) ?? 0) + 1);
		if (!misses(entry))
			passedByRoute.set(entry.route, [
				...(passedByRoute.get(entry.route) ?? []),
				caseId,
			]);
	}
	return {
		baselineRunId: options.baselineRunId,
		experimentId: options.experimentId,
		setHash: options.setHash,
		repetitions: Math.max(
			0,
			...options.attempts.map(({ repetition }) => repetition + 1),
		),
		seed: options.seed,
		guardSize: options.guardSize,
		missed,
		guard: drawGuard(
			devRoutes,
			passedByRoute,
			options.guardSize,
			options.seed,
		),
	};
}

/** Every case id of a subset, missed first, then the guard. */
export function readingSubsetCaseIds(subset: ReadingSubset): {
	readonly missed: readonly string[];
	readonly guard: readonly string[];
} {
	return {
		missed: Object.keys(subset.missed),
		guard: Object.values(subset.guard).flat().sort(),
	};
}

export async function saveReadingSubset(
	path: string,
	subset: ReadingSubset,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	// One line per case keeps the evidence file small and its diffs readable.
	const { missed, guard, ...head } = subset;
	const entries = (record: Readonly<Record<string, unknown>>) =>
		Object.entries(record)
			.map(
				([key, value]) =>
					`\t\t${JSON.stringify(key)}: ${JSON.stringify(value)}`,
			)
			.join(",\n");
	const text = [
		"{",
		...Object.entries(head).map(
			([key, value]) =>
				`\t${JSON.stringify(key)}: ${JSON.stringify(value)},`,
		),
		`\t"missed": {\n${entries(missed)}\n\t},`,
		`\t"guard": {\n${entries(guard)}\n\t}`,
		"}",
	].join("\n");
	await writeFile(path, `${text}\n`);
}

export function loadReadingSubset(path: string): ReadingSubset {
	return JSON.parse(readFileSync(path, "utf8")) as ReadingSubset;
}

/** One attempt as the subset lines read it. */
type LineAttempt = {
	readonly arm: ReadingArm;
	readonly authored: boolean;
	readonly candidates: number;
	readonly verdict: ReadingVerdict;
};

/** The report's lines over some attempts, as `scoring.ts` defines them. */
function linesOf(attempts: readonly LineAttempt[]) {
	const open = attempts.filter(({ authored }) => !authored);
	const right = (some: readonly LineAttempt[]) =>
		lineOf(some.map(({ verdict }) => verdict === "right"));
	return {
		/** Every attempt right. */
		right: right(attempts),
		reuse: right(open.filter(({ arm }) => arm === "present")),
		noMatch: right(
			open.filter(
				({ arm, candidates }) => arm === "removed" && candidates > 0,
			),
		),
		/** Of the open attempts, those that reused another description than gold's. */
		wrongReuse: lineOf(open.map(({ verdict }) => verdict === "wrongReuse")),
		authored: right(attempts.filter(({ authored }) => authored)),
		failed: lineOf(attempts.map(({ verdict }) => verdict === "failed")),
	};
}

type SubsetLine = keyof ReturnType<typeof linesOf>;

/** How one case and arm moved: wrong to right when its majority did. */
type ReadingCaseMove = {
	readonly attempt: string;
	readonly route: string;
	/** Right attempts out of the attempts, baseline then this run. */
	readonly baseline: string;
	readonly now: string;
};

const majority = (verdicts: readonly boolean[]) =>
	verdicts.filter(Boolean).length * 2 > verdicts.length;

/**
 * A run on the subset against the baseline on the same case ids. Each line
 * is a rate over the attempts, so a run at fewer repetitions compares too.
 * A missed case's arm moved wrong to right when the majority of its
 * baseline attempts were wrong and the majority of this run's right, and
 * right to wrong the other way. The guard's regression line counts the
 * guard cases with an attempt that is no longer right.
 */
export function compareReadingWithBaseline(
	subset: ReadingSubset,
	attempts: readonly ScoredReading[],
) {
	const ids = readingSubsetCaseIds(subset);
	const guardIds = new Set(ids.guard);
	const baselineAttempts: LineAttempt[] = Object.values(
		subset.missed,
	).flatMap(({ authored, candidates, verdicts }) =>
		(Object.entries(verdicts) as [ReadingArm, ReadingVerdict[]][]).flatMap(
			([arm, armVerdicts]) =>
				armVerdicts.map((verdict) => ({
					arm,
					authored,
					candidates: candidates[arm] ?? 0,
					verdict,
				})),
		),
	);
	const now = byCase(attempts);
	const nowAttempts: LineAttempt[] = [];
	const wrongToRight: ReadingCaseMove[] = [];
	const rightToWrong: ReadingCaseMove[] = [];
	for (const [caseId, missed] of Object.entries(subset.missed)) {
		const entry = now.get(caseId);
		if (!entry) continue;
		for (const [arm, verdicts] of Object.entries(entry.verdicts) as [
			ReadingArm,
			ReadingVerdict[],
		][]) {
			for (const verdict of verdicts)
				nowAttempts.push({
					arm,
					authored: entry.authored,
					candidates: entry.candidates[arm] ?? 0,
					verdict,
				});
			const before = (missed.verdicts[arm] ?? []).map(
				(verdict) => verdict === "right",
			);
			const after = verdicts.map((verdict) => verdict === "right");
			const move = {
				attempt: `${caseId}:${arm}`,
				route: missed.route,
				baseline: `${before.filter(Boolean).length}/${before.length}`,
				now: `${after.filter(Boolean).length}/${after.length}`,
			};
			if (!majority(before) && majority(after)) wrongToRight.push(move);
			if (majority(before) && !majority(after)) rightToWrong.push(move);
		}
	}
	const baselineLines = linesOf(baselineAttempts);
	const nowLines = linesOf(nowAttempts);
	const lines = Object.fromEntries(
		(Object.keys(baselineLines) as SubsetLine[]).map((line) => [
			line,
			{ baseline: baselineLines[line], now: nowLines[line] },
		]),
	) as Record<SubsetLine, { baseline: Line; now: Line }>;
	const regressed = [...now]
		.filter(([caseId, entry]) => guardIds.has(caseId) && misses(entry))
		.map(([caseId, entry]) => ({ caseId, verdicts: entry.verdicts }))
		.sort((left, right) => left.caseId.localeCompare(right.caseId));
	const guarded = [...now.keys()].filter((caseId) =>
		guardIds.has(caseId),
	).length;
	return {
		baselineRunId: subset.baselineRunId,
		missedCases: ids.missed.length,
		lines,
		wrongToRight,
		rightToWrong,
		regression: {
			regressed: regressed.length,
			count: guarded,
			rate: guarded === 0 ? 0 : regressed.length / guarded,
			interval: wilson(regressed.length, guarded),
			cases: regressed,
		},
	};
}
