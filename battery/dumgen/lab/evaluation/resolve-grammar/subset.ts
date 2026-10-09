/**
 * The round-2 subset of `resolve-grammar/de:dev` (#876): instead of the
 * whole dev set, a round runs the cases the baseline got wrong and a
 * guard against regressions.
 *
 * - **Missed**: every case that missed any report line (Lemma identity,
 *   cell, members, spelling, valencyEvidence, exact) in at least one
 *   baseline repetition, the cases whose Lemma verdict flipped included.
 *   Their baseline verdicts are kept, so a round is compared with the
 *   baseline on the same case ids and repetitions.
 * - **Guard**: a seeded random sample of the cases that passed every line
 *   in every baseline repetition, stratified by route in proportion to
 *   dev. A guard case that now misses any line has regressed.
 *
 * The subset is frozen once into the evidence (`bun cli/resolve-grammar.ts
 * subset <baselineRunId>`), and a run that uses it records its seed and
 * case ids in the manifest.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { recordOf } from "../../records.js";
import { readStoredJsonSync } from "../../stored-json.js";
import {
	type GrammarEvaluation,
	lineOf,
	type ScoredAttempt,
	wilson,
} from "./scoring.js";

/** The report lines a case is selected on, in report order. */
const subsetLines = [
	"lemma",
	"cell",
	"members",
	"spelling",
	"valency",
	"exact",
] as const;
export type SubsetLine = (typeof subsetLines)[number];

/** One attempt's verdict per line; valency is absent where gold records none. */
export type Verdicts = Partial<Record<SubsetLine, boolean>>;

export type GrammarSubset = {
	/** The baseline run the subset was read from. */
	readonly baselineRunId: string;
	readonly experimentId: string;
	/** The frozen dev set's hash the baseline ran on. */
	readonly setHash: string;
	readonly repetitions: number;
	readonly seed: number;
	readonly guardSize: number;
	/**
	 * Each missed case's route, whether gold records its valencyEvidence,
	 * and its baseline verdicts, one per repetition.
	 */
	readonly missed: Readonly<Record<string, MissedCase>>;
	/** The guard's case ids, by route. */
	readonly guard: Readonly<Record<string, readonly string[]>>;
};

type MissedCase = {
	readonly route: string;
	readonly valency: boolean;
	readonly verdicts: readonly Verdicts[];
};

const verdictsSchema = z.partialRecord(z.enum(subsetLines), z.boolean());

const grammarSubsetSchema = z.object({
	baselineRunId: z.string(),
	experimentId: z.string(),
	setHash: z.string(),
	repetitions: z.number(),
	seed: z.number(),
	guardSize: z.number(),
	missed: z.record(
		z.string(),
		z.object({
			route: z.string(),
			valency: z.boolean(),
			verdicts: z.array(verdictsSchema),
		}),
	),
	guard: z.record(z.string(), z.array(z.string())),
}) satisfies z.ZodType<GrammarSubset>;

/**
 * An attempt's verdicts. A failed attempt (no evaluation) misses every
 * line, valencyEvidence too when gold records it, so a click that failed
 * and one that now resolves are counted over the same attempts.
 */
function verdictsOf(
	evaluation: GrammarEvaluation | undefined,
	scoresValency = false,
): Verdicts {
	if (!evaluation)
		return {
			lemma: false,
			cell: false,
			members: false,
			spelling: false,
			...(scoresValency ? { valency: false } : {}),
			exact: false,
		};
	return Object.fromEntries(
		subsetLines.flatMap((line) =>
			evaluation[line] === undefined ? [] : [[line, evaluation[line]]],
		),
	);
}

const misses = (verdicts: Verdicts) =>
	subsetLines.some((line) => verdicts[line] === false);

/** The cases with an attempt that misses a line, and the cases with none, by case id. */
function splitByMisses(
	attempts: readonly ScoredAttempt[],
	scoresValency: (caseId: string) => boolean = () => false,
): {
	readonly missed: Map<string, MissedCase>;
	readonly passed: Map<string, string>;
} {
	const byCase = new Map<
		string,
		{ route: string; valency: boolean; verdicts: Verdicts[] }
	>();
	for (const attempt of attempts) {
		const entry = byCase.get(attempt.caseId) ?? {
			route: attempt.route,
			valency: scoresValency(attempt.caseId),
			verdicts: [],
		};
		entry.verdicts[attempt.repetition] = verdictsOf(
			attempt.evaluation,
			entry.valency,
		);
		byCase.set(attempt.caseId, entry);
	}
	const missed = new Map<string, MissedCase>();
	const passed = new Map<string, string>();
	for (const [caseId, entry] of byCase)
		if (entry.verdicts.some(misses)) missed.set(caseId, entry);
		else passed.set(caseId, entry.route);
	return { missed, passed };
}

/** mulberry32: a small seeded generator, so a seed always draws the same sample. */
function generator(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * How many guard cases each route gets: `size` split in proportion to the
 * route's share of dev (largest remainders), never more than the route's
 * passed cases; what a route cannot take goes to the others the same way.
 */
export function guardQuotas(
	devRoutes: ReadonlyMap<string, number>,
	available: ReadonlyMap<string, number>,
	size: number,
): Map<string, number> {
	const quotas = new Map<string, number>();
	let left = Math.min(
		size,
		[...available.values()].reduce((sum, count) => sum + count, 0),
	);
	while (left > 0) {
		const open = [...devRoutes].filter(
			([route]) => (available.get(route) ?? 0) > (quotas.get(route) ?? 0),
		);
		const total = open.reduce((sum, [, count]) => sum + count, 0);
		const shares = open.map(([route, count]) => ({
			route,
			exact: (left * count) / total,
		}));
		let given = 0;
		for (const { route, exact } of shares) {
			const room = (available.get(route) ?? 0) - (quotas.get(route) ?? 0);
			const take = Math.min(room, Math.floor(exact));
			quotas.set(route, (quotas.get(route) ?? 0) + take);
			given += take;
		}
		const byRemainder = shares
			.map(({ route, exact }) => ({
				route,
				rest: exact - Math.floor(exact),
			}))
			.sort(
				(left, right) =>
					right.rest - left.rest ||
					left.route.localeCompare(right.route),
			);
		for (const { route } of byRemainder) {
			if (given >= left) break;
			if ((available.get(route) ?? 0) <= (quotas.get(route) ?? 0))
				continue;
			quotas.set(route, (quotas.get(route) ?? 0) + 1);
			given++;
		}
		if (given === 0) break;
		left -= given;
	}
	return quotas;
}

/**
 * A seeded guard: `size` of the passed case ids, split over their routes by
 * `guardQuotas` in proportion to dev, each route's share drawn without
 * repeats by a partial Fisher-Yates shuffle. Ids come back sorted by route
 * and id, so a seed always draws the same guard.
 */
export function drawGuard(
	devRoutes: ReadonlyMap<string, number>,
	passedByRoute: ReadonlyMap<string, readonly string[]>,
	size: number,
	seed: number,
): Record<string, string[]> {
	const quotas = guardQuotas(
		new Map(
			[...devRoutes].sort(([left], [right]) => left.localeCompare(right)),
		),
		new Map([...passedByRoute].map(([route, ids]) => [route, ids.length])),
		size,
	);
	const random = generator(seed);
	const guard: Record<string, string[]> = {};
	for (const [route, ids] of [...passedByRoute].sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		const quota = quotas.get(route) ?? 0;
		if (quota === 0) continue;
		const pool = [...ids];
		for (let index = 0; index < quota; index++) {
			const pick = index + Math.floor(random() * (pool.length - index));
			const picked = pool[pick];
			const current = pool[index];
			// `random()` is below 1, so `pick` stays within the pool.
			if (picked === undefined || current === undefined)
				throw Error(`The guard's shuffle left the ${route} pool`);
			pool[index] = picked;
			pool[pick] = current;
		}
		guard[route] = pool.slice(0, quota).sort();
	}
	return guard;
}

/** The subset of a baseline run's attempts: its misses and a seeded guard. */
export function selectSubset(options: {
	readonly baselineRunId: string;
	readonly experimentId: string;
	readonly setHash: string;
	readonly attempts: readonly ScoredAttempt[];
	readonly seed: number;
	readonly guardSize: number;
	/** Whether gold records a case's valencyEvidence; a failed attempt then misses it. */
	readonly scoresValency?: (caseId: string) => boolean;
	/**
	 * A whole-set run the guard is drawn from, its passed cases stratified by
	 * its routes; `attempts` by default. A later round reads its misses from
	 * the round before and draws a fresh guard from the baseline.
	 */
	readonly guardAttempts?: readonly ScoredAttempt[];
	/** Cases the guard never takes, such as an earlier round's guard. */
	readonly exclude?: ReadonlySet<string>;
}): GrammarSubset {
	const { missed } = splitByMisses(options.attempts, options.scoresValency);
	const source = splitByMisses(
		options.guardAttempts ?? options.attempts,
		options.scoresValency,
	);
	const devRoutes = new Map<string, number>();
	for (const { route } of source.missed.values())
		devRoutes.set(route, (devRoutes.get(route) ?? 0) + 1);
	for (const route of source.passed.values())
		devRoutes.set(route, (devRoutes.get(route) ?? 0) + 1);
	const passedByRoute = new Map<string, string[]>();
	for (const [caseId, route] of [...source.passed].sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		if (missed.has(caseId) || options.exclude?.has(caseId)) continue;
		passedByRoute.set(route, [...(passedByRoute.get(route) ?? []), caseId]);
	}
	const guard = drawGuard(
		devRoutes,
		passedByRoute,
		options.guardSize,
		options.seed,
	);
	const repetitions = Math.max(
		0,
		...options.attempts.map(({ repetition }) => repetition + 1),
	);
	return {
		baselineRunId: options.baselineRunId,
		experimentId: options.experimentId,
		setHash: options.setHash,
		repetitions,
		seed: options.seed,
		guardSize: options.guardSize,
		missed: Object.fromEntries(
			[...missed].sort(([left], [right]) => left.localeCompare(right)),
		),
		guard,
	};
}

/** Every case id of a subset, missed first, then the guard. */
export function subsetCaseIds(subset: GrammarSubset): {
	readonly missed: readonly string[];
	readonly guard: readonly string[];
} {
	return {
		missed: Object.keys(subset.missed),
		guard: Object.values(subset.guard).flat().sort(),
	};
}

export async function saveSubset(
	path: string,
	subset: GrammarSubset,
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

export function loadSubset(path: string): GrammarSubset {
	return readStoredJsonSync(grammarSubsetSchema, path);
}

/** How a case's Lemma verdict moved: wrong to right when its majority did. */
type CaseMove = {
	readonly caseId: string;
	readonly route: string;
	/** Correct Lemma attempts out of the attempts, baseline then this run. */
	readonly baseline: string;
	readonly now: string;
};

const majority = (verdicts: readonly boolean[]) =>
	verdicts.filter(Boolean).length * 2 > verdicts.length;

/**
 * A run on the subset against the baseline on the same case ids. Each line
 * is a rate over the attempts, so a run at fewer repetitions compares too.
 * A missed case moved wrong to right when the majority of its baseline
 * attempts got the Lemma wrong and the majority of this run's got it
 * right, and right to wrong the other way. The guard's regression line
 * counts the guard cases with an attempt that misses any line.
 */
export function compareWithBaseline(
	subset: GrammarSubset,
	attempts: readonly ScoredAttempt[],
) {
	const ids = subsetCaseIds(subset);
	const missedIds = new Set(ids.missed);
	const guardIds = new Set(ids.guard);
	const onMissed = attempts.filter(({ caseId }) => missedIds.has(caseId));
	const baselineVerdicts = Object.values(subset.missed).flatMap(
		({ verdicts }) => verdicts,
	);
	const nowVerdicts = onMissed.map(({ caseId, evaluation }) =>
		verdictsOf(evaluation, subset.missed[caseId]?.valency ?? false),
	);
	const lineOn = (verdicts: readonly Verdicts[], line: SubsetLine) =>
		lineOf(
			verdicts.flatMap((verdict) => {
				const value = verdict[line];
				return value === undefined ? [] : [value];
			}),
		);
	const lines = recordOf(subsetLines, (line) => ({
		baseline: lineOn(baselineVerdicts, line),
		now: lineOn(nowVerdicts, line),
	}));
	const nowByCase = new Map<string, boolean[]>();
	for (const { caseId, evaluation } of onMissed)
		nowByCase.set(caseId, [
			...(nowByCase.get(caseId) ?? []),
			evaluation?.lemma ?? false,
		]);
	const wrongToRight: CaseMove[] = [];
	const rightToWrong: CaseMove[] = [];
	for (const [caseId, { route, verdicts }] of Object.entries(subset.missed)) {
		const now = nowByCase.get(caseId);
		if (!now) continue;
		const before = verdicts.map((verdict) => verdict.lemma ?? false);
		const move = {
			caseId,
			route,
			baseline: `${before.filter(Boolean).length}/${before.length}`,
			now: `${now.filter(Boolean).length}/${now.length}`,
		};
		if (!majority(before) && majority(now)) wrongToRight.push(move);
		if (majority(before) && !majority(now)) rightToWrong.push(move);
	}
	const guardByCase = new Map<string, Verdicts[]>();
	for (const { caseId, evaluation } of attempts)
		if (guardIds.has(caseId))
			guardByCase.set(caseId, [
				...(guardByCase.get(caseId) ?? []),
				verdictsOf(evaluation),
			]);
	const regressed = [...guardByCase]
		.filter(([, verdicts]) => verdicts.some(misses))
		.map(([caseId, verdicts]) => ({
			caseId,
			lines: subsetLines.filter((line) =>
				verdicts.some((verdict) => verdict[line] === false),
			),
		}))
		.sort((left, right) => left.caseId.localeCompare(right.caseId));
	const guarded = guardByCase.size;
	return {
		baselineRunId: subset.baselineRunId,
		missedCases: missedIds.size,
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
