/**
 * How a request the jev cache cannot price is priced by its size. Every jev
 * request costs a fixed overhead, its framing, plus tokens for its
 * characters at a rate that differs by stage: a short headword question
 * pays mostly the overhead, a long route question mostly its characters
 * (#1241 round 4: about 270 tokens of overhead, 0.2 to 0.3 tokens per
 * character). One fit prices every stage: the overhead shared, a rate per
 * stage, over a projection pass's cached requests and the usage a ledger
 * recorded (`Calibration`), each recorded stage of a ledger line weighing
 * as its requests at their mean size. A stage with no data takes the rate
 * of every stage together; with no data at all, the ledger's tokens per
 * request, then a characters-per-token constant, price it. A projection
 * (`round.ts`) prices its misses with it, and a budgeted run reserves room
 * for each request in flight at the same price.
 *
 * The shared overhead keeps one stage's fit from extrapolating: a stage
 * whose requests are all one size cannot tell its overhead from its rate,
 * and fitted alone it once priced breakdown-words at 2,036 tokens a
 * request from four requests of 632 to 636 characters, against 448 spent.
 *
 * The Breakdown segmenters' ledger (`evidence/segment-breakdown/ledger.jsonl`)
 * records each run's fresh requests per stage (`stages`); its calibration
 * reads them back for every Breakdown route, since the overhead and the
 * rates are jev's, and, from lines written before `stages`, its tokens per
 * fresh request.
 */
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { parseStoredJson } from "../../stored-json.js";
import type { CallRecord } from "./jev-cache-records.js";

/** One stage's fresh requests as a ledger line records them. */
export type StageUsage = {
	readonly requests: number;
	/** Characters of the requests as the projection measures them. */
	readonly chars: number;
	readonly inputTokens: number;
};

const stageUsageSchema = z.object({
	requests: z.number(),
	chars: z.number(),
	inputTokens: z.number(),
}) satisfies z.ZodType<StageUsage>;

/** One stage's requests together: a ledger line's, or one cached request (`requests` 1). */
export type StageSample = StageUsage & { readonly stage: string };

/** The usage a ledger recorded, for pricing the requests no cache prices. */
export type Calibration = {
	/** Each line's recorded stages, one sample per line and stage. */
	readonly stages: readonly StageSample[];
	/**
	 * The fresh requests and their input tokens of the latest lines with
	 * fresh calls: those at the latest such line's commit.
	 */
	readonly perRequest?: {
		readonly gitHead: string;
		readonly requests: number;
		readonly inputTokens: number;
	};
};

/** What priced a request the cache could not. */
export type PriceBasis =
	/** The overhead and its stage's rate: the stage has data. */
	| "stage"
	/** The overhead and the rate of every stage: its stage has none. */
	| "allStages"
	/** The ledger's tokens per fresh request: no stage has data. */
	| "ledgerRequest"
	/** `fallbackCharsPerToken`: nothing measured applied. */
	| "characters";

/** Characters per token when nothing measured prices a request. */
export const fallbackCharsPerToken = 3;

/** Headroom on estimated tokens, in a projection and in a reservation. */
export const projectionMargin = 1.25;

/** A cached request of a projection pass. */
type Sample = {
	readonly stage: string;
	readonly chars: number;
	readonly inputTokens: number;
};

/** Tokens a request costs: `overhead` plus its characters at its stage's rate. */
export type TokenModel = {
	readonly overhead: number;
	readonly rates: ReadonlyMap<string, number>;
	/** The rate of every stage together, for a stage with no data. */
	readonly rate: number;
};

type Sums = { cc: number; ct: number; cn: number };

/**
 * The overhead and the rates that fit `samples` best, by least squares
 * with each sample weighted by one over its requests, as its tokens vary
 * with them; undefined without characters to fit. The overhead stays
 * between none and the cheapest sample's tokens per request; when no stage
 * shows two request sizes, nothing tells it apart, and it is none.
 */
export function tokenModel(
	samples: readonly StageSample[],
): TokenModel | undefined {
	const points = samples.filter(
		({ requests, inputTokens }) => requests > 0 && inputTokens > 0,
	);
	const sums = new Map<string, Sums>();
	for (const { stage, requests, chars, inputTokens } of points) {
		const sum = sums.get(stage) ?? { cc: 0, ct: 0, cn: 0 };
		sum.cc += (chars * chars) / requests;
		sum.ct += (chars * inputTokens) / requests;
		sum.cn += chars;
		sums.set(stage, sum);
	}
	// With each stage's rate at its best for a given overhead, what is left
	// of a sample's tokens and requests decides the overhead.
	let uv = 0;
	let vv = 0;
	let nn = 0;
	for (const { stage, requests, chars, inputTokens } of points) {
		const sum = sums.get(stage);
		if (!sum || sum.cc === 0) continue;
		const u = inputTokens - (sum.ct / sum.cc) * chars;
		const v = requests - (sum.cn / sum.cc) * chars;
		uv += (u * v) / requests;
		vv += (v * v) / requests;
		nn += requests;
	}
	const cheapest = Math.min(
		...points.map(({ requests, inputTokens }) => inputTokens / requests),
	);
	const overhead =
		vv > 1e-9 * nn ? Math.min(Math.max(0, uv / vv), cheapest) : 0;
	const rates = new Map<string, number>();
	let cc = 0;
	let ct = 0;
	let cn = 0;
	for (const [stage, sum] of sums) {
		if (sum.cc === 0) continue;
		rates.set(stage, (sum.ct - overhead * sum.cn) / sum.cc);
		cc += sum.cc;
		ct += sum.ct;
		cn += sum.cn;
	}
	if (cc === 0) return undefined;
	return { overhead, rates, rate: (ct - overhead * cn) / cc };
}

export type Pricer = (
	stage: string,
	chars: number,
) => { readonly tokens: number; readonly basis: PriceBasis };

/**
 * Prices a request by its stage and size: the overhead and its stage's
 * rate fitted over this pass's cached requests and the ledger's stages,
 * else the rate of every stage, else the ledger's tokens per request, else
 * `fallbackCharsPerToken`.
 */
export function pricerOf(
	samples: readonly Sample[],
	calibration?: Calibration,
): Pricer {
	const model = tokenModel([
		...samples.map((sample) => ({ ...sample, requests: 1 })),
		...(calibration?.stages ?? []),
	]);
	const perRequest = calibration?.perRequest;
	return (stage, chars) => {
		const [estimate, basis]: [number, PriceBasis] = (() => {
			if (model) {
				const own = model.rates.get(stage);
				return own === undefined
					? [model.overhead + model.rate * chars, "allStages"]
					: [model.overhead + own * chars, "stage"];
			}
			if (perRequest && perRequest.requests > 0)
				return [
					perRequest.inputTokens / perRequest.requests,
					"ledgerRequest",
				];
			return [chars / fallbackCharsPerToken, "characters"];
		})();
		return { tokens: Math.max(0, Math.round(estimate)), basis };
	};
}

/** Per stage, a run's fresh jev requests that brought tokens and know their size. */
export function stageUsageOf(
	calls: readonly CallRecord[],
): Record<string, StageUsage> {
	const stages: Record<string, StageUsage> = {};
	for (const call of calls) {
		if (
			call.executor !== "jev" ||
			call.cached ||
			call.chars === undefined ||
			call.inputTokens <= 0
		)
			continue;
		const stage = stages[call.stage];
		stages[call.stage] = {
			requests: (stage?.requests ?? 0) + 1,
			chars: (stage?.chars ?? 0) + call.chars,
			inputTokens: (stage?.inputTokens ?? 0) + call.inputTokens,
		};
	}
	return stages;
}

/** What a calibration reads of a ledger line. */
const ledgerLineSchema = z.object({
	command: z.string(),
	experiment: z.string().optional(),
	gitHead: z.string(),
	jev: z.object({ freshCalls: z.number(), freshInputTokens: z.number() }),
	stages: z.record(z.string(), stageUsageSchema).optional(),
});

/** The Breakdown segmenters' routes, whose ledger lines calibrate one another. */
const breakdownRoutes = [
	"segment-in-constituents/de",
	"segment-in-morphemes/de",
] as const;

/**
 * The calibration of the Breakdown ledger at `path`, every route's lines
 * together; undefined without a ledger or an `evaluate` line with fresh
 * calls. A line not of a Breakdown ledger line's shape throws.
 */
export async function readCalibration(
	path: string,
): Promise<Calibration | undefined> {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch {
		return undefined;
	}
	const lines = text
		.split("\n")
		.filter((line) => line.trim())
		.map((line, index) =>
			parseStoredJson(
				ledgerLineSchema,
				line,
				`${path} line ${index + 1}`,
			),
		)
		.filter(
			(line) =>
				line.command === "evaluate" &&
				breakdownRoutes.some((route) =>
					line.experiment?.startsWith(`${route}:`),
				) &&
				line.jev.freshCalls > 0,
		);
	const latest = lines.at(-1);
	if (!latest) return undefined;
	const stages: StageSample[] = [];
	let requests = 0;
	let inputTokens = 0;
	for (const line of lines) {
		for (const [stage, usage] of Object.entries(line.stages ?? {}))
			stages.push({ stage, ...usage });
		if (line.gitHead !== latest.gitHead) continue;
		requests += line.jev.freshCalls;
		inputTokens += line.jev.freshInputTokens;
	}
	return {
		stages,
		perRequest: { gitHead: latest.gitHead, requests, inputTokens },
	};
}
