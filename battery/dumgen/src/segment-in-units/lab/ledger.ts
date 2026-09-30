/**
 * The cost ledger: one JSON line per lab command that called a model, with
 * the fresh (uncached) tokens it spent. jev bills input tokens only, at
 * $0.042 per million. Luna's price is not known here, so only its tokens
 * are kept. The ledger is committed with the lab doc.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CallRecord } from "./jev.js";

export const jevUsdPerToken = 0.042 / 1_000_000;

export type LedgerEntry = {
	readonly runId: string;
	readonly at: string;
	readonly command: string;
	readonly arm?: string;
	readonly options?: Readonly<Record<string, string>>;
	readonly set?: string;
	readonly setHash?: string;
	readonly subset?: string;
	readonly cases?: number;
	readonly repetitions?: number;
	readonly gitHead: string;
	readonly jev: {
		readonly calls: number;
		readonly freshCalls: number;
		readonly freshInputTokens: number;
		readonly usd: number;
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

export function spendOf(calls: readonly CallRecord[]) {
	const jev = calls.filter((call) => call.executor === "jev");
	const luna = calls.filter((call) => call.executor === "luna");
	const freshJev = jev.filter((call) => !call.cached);
	const freshLuna = luna.filter((call) => !call.cached);
	const sum = (
		records: readonly CallRecord[],
		key: "inputTokens" | "outputTokens",
	) => records.reduce((total, call) => total + call[key], 0);
	const freshInputTokens = sum(freshJev, "inputTokens");
	return {
		jev: {
			calls: jev.length,
			freshCalls: freshJev.length,
			freshInputTokens,
			usd: freshInputTokens * jevUsdPerToken,
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
	return entries.reduce(
		(total, entry) => ({
			jevFreshInputTokens:
				total.jevFreshInputTokens + entry.jev.freshInputTokens,
			jevUsd: total.jevUsd + entry.jev.usd,
			lunaFreshInputTokens:
				total.lunaFreshInputTokens + entry.luna.freshInputTokens,
			lunaFreshOutputTokens:
				total.lunaFreshOutputTokens + entry.luna.freshOutputTokens,
			lunaFreshCalls: total.lunaFreshCalls + entry.luna.freshCalls,
		}),
		{
			jevFreshInputTokens: 0,
			jevUsd: 0,
			lunaFreshInputTokens: 0,
			lunaFreshOutputTokens: 0,
			lunaFreshCalls: 0,
		},
	);
}
