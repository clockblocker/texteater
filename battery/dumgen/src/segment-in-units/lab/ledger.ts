/**
 * The lab ledger: one JSON line per lab command that called a model, with
 * the fresh (uncached) tokens it spent, and one per recorded comparison.
 * The repository tracks tokens only. The ledger is committed with the run
 * evidence.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FocusDelta } from "./focus.js";
import type { CallRecord } from "./jev.js";

export type Spend = {
	readonly jev: {
		readonly calls: number;
		readonly freshCalls: number;
		readonly freshInputTokens: number;
		/** Input tokens of every call, cached ones included: what the arm costs. */
		readonly allInputTokens: number;
	};
	readonly luna: {
		readonly calls: number;
		readonly freshCalls: number;
		readonly freshInputTokens: number;
		readonly freshOutputTokens: number;
	};
};

/** A command that called models: `run`, `noise` or `limit-qpc`. */
export type SpendEntry = Spend & {
	readonly runId: string;
	readonly at: string;
	readonly command: "run" | "noise" | "limit-qpc";
	readonly arm?: string;
	readonly options?: Readonly<Record<string, string>>;
	readonly set?: string;
	readonly setHash?: string;
	readonly subset?: string;
	readonly cases?: number;
	readonly repetitions?: number;
	readonly gitHead: string;
	readonly dirty?: boolean;
	readonly codeHash?: string;
	readonly model?: string;
	readonly parent?: string | null;
	readonly hypothesis?: string | null;
};

export type ComparedSide = { readonly runId: string; readonly policy: string };

/** Paired gold units of one bucket: `gained` only the right side matches, `lost` only the left. */
export type BucketDelta = {
	readonly units: number;
	readonly gained: number;
	readonly lost: number;
	readonly p: number;
	/** The |gained − lost| a rerun of the left side reaches by noise alone; null without a noise run. */
	readonly floor: number | null;
	readonly beyondNoise: boolean | null;
};

/** `compare --record`: the paired membership delta of right against left (ADR 0008). */
export type CompareEntry = BucketDelta & {
	readonly at: string;
	readonly command: "compare";
	readonly left: ComparedSide;
	readonly right: ComparedSide;
	readonly subset: string | null;
	readonly noiseRun: string | null;
	readonly verdict: string | null;
	readonly buckets: Readonly<Record<string, BucketDelta>>;
	/** On the membership focus set's source set: what changed on its units and the guardrail (#761). */
	readonly focus?: FocusDelta;
};

export type LedgerEntry = SpendEntry | CompareEntry;

export const isSpend = (entry: LedgerEntry): entry is SpendEntry =>
	entry.command !== "compare";

export function spendOf(calls: readonly CallRecord[]): Spend {
	const jev = calls.filter((call) => call.executor === "jev");
	const luna = calls.filter((call) => call.executor === "luna");
	const freshJev = jev.filter((call) => !call.cached);
	const freshLuna = luna.filter((call) => !call.cached);
	const sum = (
		records: readonly CallRecord[],
		key: "inputTokens" | "outputTokens",
	) => records.reduce((total, call) => total + call[key], 0);
	return {
		jev: {
			calls: jev.length,
			freshCalls: freshJev.length,
			freshInputTokens: sum(freshJev, "inputTokens"),
			allInputTokens: sum(jev, "inputTokens"),
		},
		luna: {
			calls: luna.length,
			freshCalls: freshLuna.length,
			freshInputTokens: sum(freshLuna, "inputTokens"),
			freshOutputTokens: sum(freshLuna, "outputTokens"),
		},
	};
}

export async function readLedger(path: string): Promise<LedgerEntry[]> {
	try {
		return (await readFile(path, "utf8"))
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line) as LedgerEntry);
	} catch {
		return [];
	}
}

export async function appendLedger(
	path: string,
	entry: LedgerEntry,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await appendFile(path, `${JSON.stringify(entry)}\n`);
}

export function ledgerTotals(entries: readonly LedgerEntry[]) {
	return entries.filter(isSpend).reduce(
		(total, entry) => ({
			jevFreshInputTokens:
				total.jevFreshInputTokens + entry.jev.freshInputTokens,
			lunaFreshInputTokens:
				total.lunaFreshInputTokens + entry.luna.freshInputTokens,
			lunaFreshOutputTokens:
				total.lunaFreshOutputTokens + entry.luna.freshOutputTokens,
			lunaFreshCalls: total.lunaFreshCalls + entry.luna.freshCalls,
		}),
		{
			jevFreshInputTokens: 0,
			lunaFreshInputTokens: 0,
			lunaFreshOutputTokens: 0,
			lunaFreshCalls: 0,
		},
	);
}
