/**
 * Scores the bench's run files with no model: each call's final answer
 * (its retry's, when it had one) through `produceValency` against gold, and
 * per variant and revision the accuracy, the first-try and final read
 * failures, tokens, dollars per thousand calls on a warm cache, latency,
 * the cases that flip between repetitions, and the paired wins and losses
 * against `json` on the same cases.
 */
import { readFileSync } from "node:fs";
import { lunaUsd } from "../resolve-grammar/pricing.js";
import type { ValencyCase } from "./gold.js";
import { verdictOf } from "./harness.js";
import type { BenchCase, RunRecord } from "./live.js";
import type { Variant } from "./variants.js";

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
	readonly label: string;
	readonly caseId: string;
	readonly run: string;
	readonly repetition: number;
	readonly mode: RunRecord["mode"];
	readonly attempts: readonly RunRecord[];
	readonly correct: boolean;
	readonly firstUnreadable: boolean;
	readonly unreadable: boolean;
	/** The first answer read only with a lenient repair. */
	readonly lenient: boolean;
	readonly text?: string;
	readonly failed?: string;
};

export const readRuns = (files: readonly string[]): RunRecord[] =>
	files.flatMap((file) =>
		readFileSync(file, "utf8")
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line) as RunRecord),
	);

/** Every call of the runs, scored. */
export function scoreCalls(
	records: readonly RunRecord[],
	cases: ReadonlyMap<string, ValencyCase & { readonly bench: BenchCase }>,
	variantOf: (record: RunRecord) => Variant,
): Scored[] {
	const calls = new Map<string, RunRecord[]>();
	for (const record of records) {
		const key = `${record.run}|${record.variant}@${record.revision}|${record.caseId}|${record.repetition}`;
		calls.set(key, [...(calls.get(key) ?? []), record]);
	}
	return [...calls.values()].map((asked) => {
		asked.sort((a, b) => a.attempt - b.attempt);
		const [first] = asked;
		if (!first) throw Error("A call without attempts");
		const entry = cases.get(first.caseId);
		if (!entry) throw Error(`${first.caseId} is no bench case`);
		const variant = variantOf(first);
		const decode = (record: RunRecord) =>
			record.text === undefined
				? undefined
				: variant.decode(record.text, entry.bench.request);
		// Read with today's reader: an answer it reads needed no retry.
		const firstDecoded = decode(first);
		const attempts = firstDecoded?.ok ? [first] : asked;
		const final = attempts[attempts.length - 1] as RunRecord;
		const decoded = decode(final);
		const verdict = verdictOf(entry.goldCase, () =>
			decoded === undefined
				? { ok: false, message: final.failure ?? "no answer" }
				: decoded.ok
					? { ok: true, output: decoded.output }
					: { ok: false, message: decoded.problem },
		);
		return {
			label: `${final.variant}@${final.revision}`,
			caseId: final.caseId,
			run: final.run,
			repetition: final.repetition,
			mode: final.mode,
			attempts,
			correct: verdict.correct,
			firstUnreadable: firstDecoded === undefined || !firstDecoded.ok,
			unreadable: decoded === undefined || !decoded.ok,
			lenient:
				firstDecoded?.ok === true && firstDecoded.lenient !== undefined,
			...(final.text === undefined ? {} : { text: final.text }),
			...(verdict.failed === undefined ? {} : { failed: verdict.failed }),
		};
	});
}

type Rep = ReadonlyMap<string, boolean>;

/** Each rep against each JSON rep: the cases only one of the two got right. */
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

/** One row per variant and revision. */
export function summarize(scored: readonly Scored[]) {
	const labels = [...new Set(scored.map(({ label }) => label))];
	const repKey = (call: Scored) => `${call.run}|${call.repetition}`;
	const byRep = (label: string) => {
		const reps = new Map<string, Map<string, boolean>>();
		for (const call of scored)
			if (call.label === label && call.mode === "batch") {
				const rep =
					reps.get(repKey(call)) ?? new Map<string, boolean>();
				rep.set(call.caseId, call.correct);
				reps.set(repKey(call), rep);
			}
		return [...reps.values()];
	};
	const jsonReps = labels
		.filter((label) => label.startsWith("json@"))
		.flatMap(byRep);
	return labels.map((label) => {
		const mine = scored.filter((call) => call.label === label);
		const batched = mine.filter(({ mode }) => mode === "batch");
		const reps = byRep(label);
		const accuracies = reps.map(
			(rep) =>
				(100 * [...rep.values()].filter(Boolean).length) /
				Math.max(1, rep.size),
		);
		const latencies = mine
			.filter(({ mode }) => mode === "latency")
			.map(({ attempts }) =>
				attempts.reduce(
					(sum, { latencyMs }) => sum + (latencyMs ?? 0),
					0,
				),
			);
		const perCall = (pick: (record: RunRecord) => number) =>
			mean(
				mine.map(({ attempts }) =>
					attempts.reduce((sum, r) => sum + pick(r), 0),
				),
			);
		const tokens = {
			inputTokens: perCall((r) => r.tokens.inputTokens),
			cachedInputTokens: perCall((r) => r.tokens.cachedInputTokens),
			cacheWriteTokens: perCall((r) => r.tokens.cacheWriteTokens),
			outputTokens: perCall((r) => r.tokens.outputTokens),
		};
		const firstOutput = mean(
			mine.map(({ attempts }) => attempts[0]?.tokens.outputTokens ?? 0),
		);
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
		const { wins, losses } = label.startsWith("json@")
			? { wins: 0, losses: 0 }
			: paired(reps, jsonReps);
		return {
			label,
			calls: mine.length,
			batchReps: reps.length,
			accuracy: round(mean(accuracies)),
			accuracyPerRep: accuracies.map((value) => round(value)),
			firstTryUnreadable: round(
				(100 *
					mine.filter(({ firstUnreadable }) => firstUnreadable)
						.length) /
					Math.max(1, mine.length),
			),
			lenientReads: round(
				(100 * mine.filter(({ lenient }) => lenient).length) /
					Math.max(1, mine.length),
			),
			finalUnreadable: round(
				(100 * mine.filter(({ unreadable }) => unreadable).length) /
					Math.max(1, mine.length),
			),
			outputTokens: round(firstOutput),
			uncachedInputTokens: round(
				tokens.inputTokens -
					tokens.cachedInputTokens -
					tokens.cacheWriteTokens,
			),
			inputTokens: round(tokens.inputTokens),
			usdPer1kFast: round(1000 * lunaUsd(warm, "fast"), 4),
			usdPer1kBatch: round(1000 * lunaUsd(warm, "batch"), 4),
			latencySamples: latencies.length,
			p50Ms: round(percentile(latencies, 50), 0),
			p90Ms: round(percentile(latencies, 90), 0),
			...(flips === undefined ? {} : { flips }),
			...(label.startsWith("json@") || batched.length === 0
				? {}
				: { vsJson: `${wins}/${losses}` }),
		};
	});
}

export function table(rows: ReturnType<typeof summarize>): string {
	return [
		"variant | reps | acc % (per rep) | 1st-try unreadable % | lenient reads % | final unreadable % | out tok | uncached in | in | $/1k fast | $/1k batch | p50 | p90 | flips | vs json W/L",
		...rows.map((row) =>
			[
				row.label,
				row.batchReps,
				`${row.accuracy} (${row.accuracyPerRep.join("/")})`,
				row.firstTryUnreadable,
				row.lenientReads,
				row.finalUnreadable,
				row.outputTokens,
				row.uncachedInputTokens,
				row.inputTokens,
				row.usdPer1kFast,
				row.usdPer1kBatch,
				row.p50Ms,
				row.p90Ms,
				row.flips ?? "",
				row.vsJson ?? "",
			].join(" | "),
		),
	].join("\n");
}
