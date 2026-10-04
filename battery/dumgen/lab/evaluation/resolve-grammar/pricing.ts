/**
 * What an evaluation's tokens cost in US dollars, synchronously and through
 * OpenAI's Batch API (#891), so a round's price states both before it is
 * granted. The repository tracks tokens; these rates turn them into money
 * only for the price a round is asked for.
 *
 * - Luna: OpenAI's pricing page (https://developers.openai.com/api/docs/pricing,
 *   read 2026-10-03), USD per million tokens of `gpt-5.6-luna`. A
 *   synchronous request pays its configuration's service tier (Dumgen's
 *   default asks for `fast`); a batch request pays the Batch rate, half of
 *   Standard.
 * - jev: TypeSafe's models page (https://docs.typesafe.ai/models.md), $0.042
 *   per million input tokens, output free. TypeSafe documents no batch or
 *   discount mode, so jev costs the same either way.
 *
 * OpenAI counts cached and cache-write tokens inside `input_tokens`; the
 * rest of the input pays the plain input rate.
 */
import type { LunaConfiguration } from "../../../src/luna.js";

/** USD per million tokens of one Luna tier. */
export type LunaRates = {
	readonly input: number;
	readonly cachedInput: number;
	readonly cacheWrite: number;
	readonly output: number;
};

export type LunaTier = "standard" | "batch" | "flex" | "fast";

/** `gpt-5.6-luna`'s rates by tier, from OpenAI's pricing page on 2026-10-03. */
const lunaRates: Readonly<Record<LunaTier, LunaRates>> = {
	standard: { input: 0.2, cachedInput: 0.02, cacheWrite: 0.25, output: 1.2 },
	batch: { input: 0.1, cachedInput: 0.01, cacheWrite: 0.125, output: 0.6 },
	flex: { input: 0.1, cachedInput: 0.01, cacheWrite: 0.125, output: 0.6 },
	fast: { input: 0.4, cachedInput: 0.04, cacheWrite: 0.5, output: 2.4 },
};

/** jev's price: USD per million input tokens; output is free. */
const jevUsdPerMillionInput = 0.042;

/** The tier a synchronous Luna request pays under its configuration. */
export function syncTierOf(configuration: LunaConfiguration): LunaTier {
	const tier = configuration.settings.service_tier;
	if (tier === "fast" || tier === "priority") return "fast";
	if (tier === "flex") return "flex";
	return "standard";
}

/** Luna tokens as a price reads them; the cache counts sit inside `inputTokens`. */
export type LunaTokenCounts = {
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cachedInputTokens?: number;
	readonly cacheWriteTokens?: number;
};

const perMillion = (tokens: number, rate: number) => (tokens * rate) / 1e6;

/** What these Luna tokens cost at one tier's rates. */
export function lunaUsd(tokens: LunaTokenCounts, tier: LunaTier): number {
	const rates = lunaRates[tier];
	const cached = tokens.cachedInputTokens ?? 0;
	const written = tokens.cacheWriteTokens ?? 0;
	return (
		perMillion(
			Math.max(0, tokens.inputTokens - cached - written),
			rates.input,
		) +
		perMillion(cached, rates.cachedInput) +
		perMillion(written, rates.cacheWrite) +
		perMillion(tokens.outputTokens, rates.output)
	);
}

/** What these jev input tokens cost. */
export const jevUsd = (inputTokens: number) =>
	perMillion(inputTokens, jevUsdPerMillionInput);

/** A round's price in dollars, synchronously and with Luna batched. */
export type RoundCost = {
	readonly jevUsd: number;
	readonly luna: {
		readonly syncTier: LunaTier;
		readonly syncUsd: number;
		readonly batchUsd: number;
	};
	readonly totalSyncUsd: number;
	readonly totalBatchUsd: number;
};

/** Dollars to a hundredth of a cent. */
const rounded = (usd: number) => Math.round(usd * 1e4) / 1e4;

export function roundCost(
	jev: { readonly inputTokens: number },
	luna: LunaTokenCounts,
	configuration: LunaConfiguration,
): RoundCost {
	const syncTier = syncTierOf(configuration);
	const jevCost = jevUsd(jev.inputTokens);
	const syncUsd = lunaUsd(luna, syncTier);
	const batchUsd = lunaUsd(luna, "batch");
	return {
		jevUsd: rounded(jevCost),
		luna: {
			syncTier,
			syncUsd: rounded(syncUsd),
			batchUsd: rounded(batchUsd),
		},
		totalSyncUsd: rounded(jevCost + syncUsd),
		totalBatchUsd: rounded(jevCost + batchUsd),
	};
}
