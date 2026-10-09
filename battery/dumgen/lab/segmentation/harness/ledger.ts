/**
 * The lab ledger: one JSON line per lab command or `evaluate` run that
 * could call a model, with the fresh (uncached) tokens it spent, and one
 * per recorded comparison. The repository tracks tokens only. The ledger
 * is committed with the run evidence. Each line names the experiment round
 * it belongs to (`round.ts`); lines written before rounds have none,
 * and a round's spend counts only its own lines.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { parseStoredJson } from "../../stored-json.js";
import { type FocusDelta, focusDeltaSchema } from "./focus.js";
import {
	type CallRecord,
	type TransportRecord,
	transportRecordSchema,
} from "./jev-cache.js";

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

/**
 * A command that could call models: `run`, `noise`, `limit-qpc` or
 * `evaluate`, or the retired `limit-stress`, whose lines the ledger keeps.
 */
export type SpendEntry = Spend & {
	readonly runId: string;
	readonly at: string;
	readonly command:
		| "run"
		| "noise"
		| "limit-qpc"
		| "limit-stress"
		| "evaluate";
	/** The round the spend counts against; absent on lines written before rounds. */
	readonly round?: string;
	/** `evaluate`: the experiment id. */
	readonly experiment?: string;
	/** The hash of the dumcorpus prompt inputs the run read (`Pin.hash`). */
	readonly pin?: string;
	readonly arm?: string;
	readonly options?: Readonly<Record<string, string>>;
	readonly set?: string;
	readonly setHash?: string;
	readonly subset?: string;
	/** `evaluate --cases`: the hash of the case list the run took (`CaseList`). */
	readonly caseList?: string;
	readonly cases?: number;
	readonly repetitions?: number;
	readonly gitHead: string;
	readonly dirty?: boolean;
	readonly codeHash?: string;
	readonly model?: string;
	readonly parent?: string | null;
	readonly hypothesis?: string | null;
	/** The fresh requests' retries and failures; absent before #858's follow-up. */
	readonly transport?: TransportRecord;
};

type ComparedSide = { readonly runId: string; readonly policy: string };

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
	readonly round?: string;
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

const spendEntrySchema = z.object({
	jev: z.object({
		calls: z.number(),
		freshCalls: z.number(),
		freshInputTokens: z.number(),
		allInputTokens: z.number(),
	}),
	luna: z.object({
		calls: z.number(),
		freshCalls: z.number(),
		freshInputTokens: z.number(),
		freshOutputTokens: z.number(),
	}),
	runId: z.string(),
	at: z.string(),
	command: z.enum(["run", "noise", "limit-qpc", "limit-stress", "evaluate"]),
	round: z.string().optional(),
	experiment: z.string().optional(),
	pin: z.string().optional(),
	arm: z.string().optional(),
	options: z.record(z.string(), z.string()).optional(),
	set: z.string().optional(),
	setHash: z.string().optional(),
	subset: z.string().optional(),
	caseList: z.string().optional(),
	cases: z.number().optional(),
	repetitions: z.number().optional(),
	gitHead: z.string(),
	dirty: z.boolean().optional(),
	codeHash: z.string().optional(),
	model: z.string().optional(),
	parent: z.string().nullable().optional(),
	hypothesis: z.string().nullable().optional(),
	transport: transportRecordSchema.optional(),
}) satisfies z.ZodType<SpendEntry>;

const bucketDeltaShape = {
	units: z.number(),
	gained: z.number(),
	lost: z.number(),
	p: z.number(),
	floor: z.number().nullable(),
	beyondNoise: z.boolean().nullable(),
};

const comparedSideSchema = z.object({ runId: z.string(), policy: z.string() });

const compareEntrySchema = z.object({
	...bucketDeltaShape,
	at: z.string(),
	command: z.literal("compare"),
	round: z.string().optional(),
	left: comparedSideSchema,
	right: comparedSideSchema,
	subset: z.string().nullable(),
	noiseRun: z.string().nullable(),
	verdict: z.string().nullable(),
	buckets: z.record(z.string(), z.object(bucketDeltaShape)),
	focus: focusDeltaSchema.optional(),
}) satisfies z.ZodType<CompareEntry>;

const ledgerEntrySchema = z.union([spendEntrySchema, compareEntrySchema]);

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

/**
 * Every line of the ledger at `path`, none when there is no ledger yet. A
 * line that is not a ledger entry throws, so a round's spend is never
 * summed over part of its ledger.
 */
export async function readLedger(path: string): Promise<LedgerEntry[]> {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch {
		return [];
	}
	return text
		.split("\n")
		.filter(Boolean)
		.map((line, index) =>
			parseStoredJson(
				ledgerEntrySchema,
				line,
				`${path} entry ${index + 1}`,
			),
		);
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
