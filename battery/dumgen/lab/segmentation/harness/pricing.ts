/**
 * How a request the jev cache cannot price is priced by its size: a fit of
 * tokens on characters over a projection pass's cached requests, then the
 * usage a ledger recorded (`Calibration`), then a characters-per-token
 * constant. A projection (`round.ts`) prices its misses with it, and a
 * budgeted run reserves room for each request in flight at the same price.
 *
 * The Breakdown segmenters' ledger (`evidence/segment-breakdown/ledger.jsonl`)
 * records each run's fresh requests per stage (`stages`); its calibration
 * reads them back for the same route, and, from lines written before
 * `stages`, its tokens per fresh request.
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

/** The usage a ledger recorded, for pricing the requests no cache prices. */
export type Calibration = {
	/** Per stage, the fresh requests of every line that records `stages`, summed. */
	readonly stages: Readonly<Record<string, StageUsage>>;
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
	/** This pass's fit of the request's stage. */
	| "stage"
	/** The ledger's tokens per character of the request's stage. */
	| "ledgerStage"
	/** This pass's fit of every stage. */
	| "allStages"
	/** The ledger's tokens per fresh request. */
	| "ledgerRequest"
	/** `fallbackCharsPerToken`: nothing measured applied. */
	| "characters";

/** Characters per token when nothing measured prices a request. */
export const fallbackCharsPerToken = 3;

/** Headroom on estimated tokens, in a projection and in a reservation. */
export const projectionMargin = 1.25;

type Sample = { readonly chars: number; readonly inputTokens: number };

/** Least squares of tokens on characters; undefined without a sample. */
function fit(samples: readonly Sample[]) {
	const n = samples.length;
	if (n === 0) return undefined;
	const meanX = samples.reduce((total, { chars }) => total + chars, 0) / n;
	const meanY =
		samples.reduce((total, { inputTokens }) => total + inputTokens, 0) / n;
	let covariance = 0;
	let variance = 0;
	for (const { chars, inputTokens } of samples) {
		covariance += (chars - meanX) * (inputTokens - meanY);
		variance += (chars - meanX) ** 2;
	}
	if (variance === 0)
		return (chars: number) =>
			meanX === 0 ? meanY : (meanY / meanX) * chars;
	const slope = covariance / variance;
	return (chars: number) => meanY + slope * (chars - meanX);
}

export type Pricer = (
	stage: string,
	chars: number,
) => { readonly tokens: number; readonly basis: PriceBasis };

/**
 * Prices a request by its stage and size, from the first that applies:
 * this pass's same-stage fit, the ledger's same-stage tokens per character,
 * this pass's all-stage fit, the ledger's tokens per request, and
 * `fallbackCharsPerToken`.
 */
export function pricerOf(
	samples: readonly (Sample & { readonly stage: string })[],
	calibration?: Calibration,
): Pricer {
	const all = fit(samples);
	const byStage = new Map<string, ReturnType<typeof fit>>();
	const stageFit = (stage: string) => {
		if (!byStage.has(stage))
			byStage.set(
				stage,
				fit(samples.filter((sample) => sample.stage === stage)),
			);
		return byStage.get(stage);
	};
	const perRequest = calibration?.perRequest;
	return (stage, chars) => {
		const measured = calibration?.stages[stage];
		const [estimate, basis]: [number, PriceBasis] = (() => {
			const own = stageFit(stage);
			if (own) return [own(chars), "stage"];
			if (measured && measured.chars > 0 && measured.inputTokens > 0)
				return [
					(chars * measured.inputTokens) / measured.chars,
					"ledgerStage",
				];
			if (all) return [all(chars), "allStages"];
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

/**
 * The calibration of `route`'s experiments (`<route>:<set>`) in the ledger
 * at `path`; undefined without a ledger or a line of the route with fresh
 * calls. A line not of a Breakdown ledger line's shape throws.
 */
export async function readCalibration(
	path: string,
	route: string,
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
				line.experiment?.startsWith(`${route}:`) &&
				line.jev.freshCalls > 0,
		);
	const latest = lines.at(-1);
	if (!latest) return undefined;
	const stages: Record<string, StageUsage> = {};
	let requests = 0;
	let inputTokens = 0;
	for (const line of lines) {
		for (const [stage, usage] of Object.entries(line.stages ?? {})) {
			const sum = stages[stage];
			stages[stage] = {
				requests: (sum?.requests ?? 0) + usage.requests,
				chars: (sum?.chars ?? 0) + usage.chars,
				inputTokens: (sum?.inputTokens ?? 0) + usage.inputTokens,
			};
		}
		if (line.gitHead !== latest.gitHead) continue;
		requests += line.jev.freshCalls;
		inputTokens += line.jev.freshInputTokens;
	}
	return {
		stages,
		perRequest: { gitHead: latest.gitHead, requests, inputTokens },
	};
}
