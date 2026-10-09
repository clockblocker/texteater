/**
 * A round's subset of `knowledge/de:dev` (#887), the way resolve.grammar's
 * and resolve.reading's rounds ran (#876, #877): instead of the whole
 * gold-only set, a round runs the cases the baseline got wrong and a guard
 * against regressions.
 *
 * - **Missed**: every case with an attempt that was not right in any
 *   repetition: a structural aspect scored wrong (a failure included), a
 *   gold relation claim the run did not find, or an attempt that never
 *   finished.
 * - **Guard**: a seeded sample of the cases right in every scored verdict
 *   and repetition, stratified by route in proportion to the baseline. A
 *   guard case that misses now has regressed.
 *
 * The subset is frozen once into the evidence (`bun cli/knowledge.ts
 * subset <baselineRunId>`), and a run that uses it records its path, seed
 * and baseline in the manifest. `compareKnowledgeRuns` reads a run against
 * its baseline on the same case ids.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { readStoredJsonSync } from "../../stored-json.js";
import { drawGuard } from "../resolve-grammar/subset.js";
import { knowledgeReport, type ScoredKnowledge } from "./scoring.js";

export type KnowledgeSubset = {
	/** The baseline run the subset was read from. */
	readonly baselineRunId: string;
	readonly experimentId: string;
	/** The frozen set's hash the baseline ran on. */
	readonly setHash: string;
	readonly seed: number;
	readonly guardSize: number;
	/** The missed case ids, each with the aspects it missed. */
	readonly missed: Readonly<Record<string, readonly string[]>>;
	/** The guard's case ids, by route. */
	readonly guard: Readonly<Record<string, readonly string[]>>;
};

const knowledgeSubsetSchema = z.object({
	baselineRunId: z.string(),
	experimentId: z.string(),
	setHash: z.string(),
	seed: z.number(),
	guardSize: z.number(),
	missed: z.record(z.string(), z.array(z.string())),
	guard: z.record(z.string(), z.array(z.string())),
}) satisfies z.ZodType<KnowledgeSubset>;

/** The aspects an attempt missed; a failed attempt misses `attempt`. */
function missedAspects(attempt: ScoredKnowledge): string[] {
	if (!attempt.evaluation) return ["attempt"];
	return attempt.evaluation.verdicts.flatMap((verdict) =>
		verdict.correct === false ||
		verdict.goldClaims?.some(
			(claim) => !(verdict.found ?? []).includes(claim),
		)
			? [verdict.aspect]
			: [],
	);
}

/** The subset of a baseline run's attempts: its misses and a seeded guard. */
export function selectKnowledgeSubset(options: {
	readonly baselineRunId: string;
	readonly experimentId: string;
	readonly setHash: string;
	readonly attempts: readonly ScoredKnowledge[];
	readonly seed: number;
	readonly guardSize: number;
}): KnowledgeSubset {
	const routes = new Map<string, string>();
	const missedBy = new Map<string, Set<string>>();
	for (const attempt of options.attempts) {
		routes.set(attempt.caseId, attempt.route);
		const missed = missedAspects(attempt);
		if (missed.length === 0) continue;
		const aspects = missedBy.get(attempt.caseId) ?? new Set<string>();
		for (const aspect of missed) aspects.add(aspect);
		missedBy.set(attempt.caseId, aspects);
	}
	const devRoutes = new Map<string, number>();
	const passedByRoute = new Map<string, string[]>();
	for (const [caseId, route] of [...routes].sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		devRoutes.set(route, (devRoutes.get(route) ?? 0) + 1);
		if (!missedBy.has(caseId))
			passedByRoute.set(route, [
				...(passedByRoute.get(route) ?? []),
				caseId,
			]);
	}
	return {
		baselineRunId: options.baselineRunId,
		experimentId: options.experimentId,
		setHash: options.setHash,
		seed: options.seed,
		guardSize: options.guardSize,
		missed: Object.fromEntries(
			[...missedBy]
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([caseId, aspects]) => [caseId, [...aspects].sort()]),
		),
		guard: drawGuard(
			devRoutes,
			passedByRoute,
			options.guardSize,
			options.seed,
		),
	};
}

/** Every case id of a subset, missed first, then the guard. */
export function knowledgeSubsetCaseIds(subset: KnowledgeSubset): {
	readonly missed: readonly string[];
	readonly guard: readonly string[];
} {
	return {
		missed: Object.keys(subset.missed),
		guard: Object.values(subset.guard).flat().sort(),
	};
}

export async function saveKnowledgeSubset(
	path: string,
	subset: KnowledgeSubset,
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

export function loadKnowledgeSubset(path: string): KnowledgeSubset {
	return readStoredJsonSync(knowledgeSubsetSchema, path);
}

/**
 * A run against its baseline on the same case ids: the structural report
 * of each on the missed cases, the guard and both, and the guard cases
 * that regressed.
 */
export function compareKnowledgeRuns(
	subset: KnowledgeSubset,
	baseline: readonly ScoredKnowledge[],
	run: readonly ScoredKnowledge[],
) {
	const ids = knowledgeSubsetCaseIds(subset);
	const missed = new Set(ids.missed);
	const guard = new Set(ids.guard);
	const lines = (attempts: readonly ScoredKnowledge[]) => {
		const { lines: own, aspects } = knowledgeReport(attempts);
		return {
			lines: own,
			failed: Object.fromEntries(
				Object.entries(aspects).map(([aspect, { failed }]) => [
					aspect,
					failed,
				]),
			),
		};
	};
	const within = (
		attempts: readonly ScoredKnowledge[],
		cases: ReadonlySet<string>,
	) => attempts.filter(({ caseId }) => cases.has(caseId));
	const both = new Set([...missed, ...guard]);
	const regressed = [
		...new Set(
			within(run, guard)
				.filter((attempt) => missedAspects(attempt).length > 0)
				.map(
					(attempt) =>
						`${attempt.caseId}: ${missedAspects(attempt).join(", ")}`,
				),
		),
	].sort();
	return {
		baselineRunId: subset.baselineRunId,
		missed: {
			baseline: lines(within(baseline, missed)),
			run: lines(within(run, missed)),
		},
		guard: {
			baseline: lines(within(baseline, guard)),
			run: lines(within(run, guard)),
		},
		whole: {
			baseline: lines(within(baseline, both)),
			run: lines(within(run, both)),
		},
		regressed,
	};
}
