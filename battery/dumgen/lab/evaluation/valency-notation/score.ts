/**
 * Scores the bench's run files with no model: each answer through
 * production's `produceValency` (its check reading the notation, then
 * Dumgen's and Dumrel's checks) against gold, and per revision the
 * accuracy, the answers that did not read, tokens, dollars per thousand
 * calls on a warm cache, latency, the cases that flip between repetitions,
 * and the paired wins and losses against a baseline revision.
 */
import { readFileSync } from "node:fs";
import { lunaUsd } from "../resolve-grammar/pricing.js";
import type { ValencyCase } from "./gold.js";
import { verdictOf } from "./harness.js";
import type { RunRecord } from "./live.js";

const percentile = (values: readonly number[], p: number) => {
	const sorted = [...values].sort((a, b) => a - b);
	if (sorted.length === 0) return Number.NaN;
	return sorted[
		Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
	] as number;
};
const mean = (values: readonly number[]) =>
	values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const round = (value: number, digits = 1) =>
	Math.round(value * 10 ** digits) / 10 ** digits;

export type Scored = {
	readonly record: RunRecord;
	readonly correct: boolean;
	/** The answer failed before Dumrel saw a frame: no output, or a notation that does not read. */
	readonly unreadable: boolean;
	readonly failed?: string;
};

export const readRuns = (files: readonly string[]): RunRecord[] =>
	files.flatMap((file) =>
		readFileSync(file, "utf8")
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line) as RunRecord),
	);

/** Every answer of the runs, scored. */
export function scoreCalls(
	records: readonly RunRecord[],
	cases: ReadonlyMap<string, ValencyCase>,
	options: {
		readonly ignoreReferent?: boolean;
		/** What a revision's answer reads as in production's notation. */
		readonly adapt?: (revision: string, output: unknown) => unknown;
	} = {},
): Scored[] {
	return records.map((record) => {
		const entry = cases.get(record.caseId);
		if (!entry) throw Error(`${record.caseId} is no bench case`);
		let unreadable = record.output === undefined;
		const verdict = verdictOf(
			entry.goldCase,
			() =>
				record.output === undefined
					? { ok: false, message: record.failure ?? "no answer" }
					: {
							ok: true,
							output: options.adapt
								? options.adapt(record.revision, record.output)
								: record.output,
						},
			{ ignoreReferent: options.ignoreReferent ?? false },
		);
		if (verdict.failed?.startsWith("Luna")) unreadable = true;
		return {
			record,
			correct: verdict.correct,
			unreadable,
			...(verdict.failed === undefined ? {} : { failed: verdict.failed }),
		};
	});
}

type Rep = ReadonlyMap<string, boolean>;

/** Each rep against each baseline rep: the cases only one of the two got right. */
function paired(reps: readonly Rep[], baselines: readonly Rep[]) {
	let wins = 0;
	let losses = 0;
	for (const rep of reps)
		for (const baseline of baselines)
			for (const [id, correct] of rep) {
				if (!baseline.has(id) || baseline.get(id) === correct) continue;
				if (correct) wins += 1;
				else losses += 1;
			}
	return { wins, losses };
}

/** One row per revision. */
export function summarize(scored: readonly Scored[], baseline = "production") {
	const revisions = [...new Set(scored.map(({ record }) => record.revision))];
	const byRep = (revision: string) => {
		const reps = new Map<string, Map<string, boolean>>();
		for (const { record, correct } of scored)
			if (record.revision === revision && record.mode === "batch") {
				const key = `${record.run}|${record.repetition}`;
				const rep = reps.get(key) ?? new Map<string, boolean>();
				rep.set(record.caseId, correct);
				reps.set(key, rep);
			}
		return [...reps.values()];
	};
	const baselineReps = byRep(baseline);
	return revisions.map((revision) => {
		const mine = scored.filter(
			({ record }) => record.revision === revision,
		);
		const reps = byRep(revision);
		const accuracies = reps.map(
			(rep) =>
				(100 * [...rep.values()].filter(Boolean).length) /
				Math.max(1, rep.size),
		);
		const latencies = mine.flatMap(({ record }) =>
			record.latencyMs === undefined ? [] : [record.latencyMs],
		);
		const perCall = (pick: (record: RunRecord) => number) =>
			mean(mine.map(({ record }) => pick(record)));
		const tokens = {
			inputTokens: perCall((r) => r.tokens.inputTokens),
			cachedInputTokens: perCall((r) => r.tokens.cachedInputTokens),
			cacheWriteTokens: perCall((r) => r.tokens.cacheWriteTokens),
			outputTokens: perCall((r) => r.tokens.outputTokens),
		};
		// A warm cache's price: the whole prefix read from the cache.
		const warm = {
			...tokens,
			cachedInputTokens:
				tokens.cachedInputTokens + tokens.cacheWriteTokens,
			cacheWriteTokens: 0,
		};
		const flips =
			reps.length >= 2
				? [...(reps[0] ?? new Map()).entries()].filter(
						([id, correct]) =>
							reps
								.slice(1)
								.some(
									(rep) =>
										rep.has(id) && rep.get(id) !== correct,
								),
					).length
				: undefined;
		const { wins, losses } =
			revision === baseline
				? { wins: 0, losses: 0 }
				: paired(reps, baselineReps);
		return {
			revision,
			calls: mine.length,
			batchReps: reps.length,
			accuracy: round(mean(accuracies)),
			accuracyPerRep: accuracies.map((value) => round(value)),
			unreadable: round(
				(100 * mine.filter(({ unreadable }) => unreadable).length) /
					Math.max(1, mine.length),
			),
			outputTokens: round(tokens.outputTokens),
			cachedInputTokens: round(tokens.cachedInputTokens),
			inputTokens: round(tokens.inputTokens),
			usdPer1kFast: round(1000 * lunaUsd(warm, "fast"), 4),
			usdPer1kBatch: round(1000 * lunaUsd(warm, "batch"), 4),
			latencySamples: latencies.length,
			p50Ms: round(percentile(latencies, 50), 0),
			p90Ms: round(percentile(latencies, 90), 0),
			...(flips === undefined ? {} : { flips }),
			...(revision === baseline || reps.length === 0
				? {}
				: { vsBaseline: `${wins}/${losses}` }),
		};
	});
}

export function table(rows: ReturnType<typeof summarize>): string {
	return [
		"revision | calls | reps | acc % (per rep) | unreadable % | out tok | cached in | in | $/1k fast | $/1k batch | p50 | p90 | flips | vs baseline W/L",
		...rows.map((row) =>
			[
				row.revision,
				row.calls,
				row.batchReps,
				`${row.accuracy} (${row.accuracyPerRep.join("/")})`,
				row.unreadable,
				row.outputTokens,
				row.cachedInputTokens,
				row.inputTokens,
				row.usdPer1kFast,
				row.usdPer1kBatch,
				row.p50Ms,
				row.p90Ms,
				row.flips ?? "",
				row.vsBaseline ?? "",
			].join(" | "),
		),
	].join("\n");
}
