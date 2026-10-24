/**
 * The caps a live resolve.grammar, resolve.reading or knowledge.produce run
 * of the evaluate CLI (`cli/evaluate.ts`) was granted.
 */
import type { GrammarCaps } from "../../lab/evaluation/resolve-grammar/models.js";
import type { RoundCost } from "../../lab/evaluation/resolve-grammar/pricing.js";

/**
 * The caps a live resolve.grammar, resolve.reading and knowledge.produce run was granted, refusing a run with no
 * granted budget or whose price exceeds it: fresh jev input tokens against
 * `--budget`, Luna's input against `--luna-budget` and its output against
 * `--luna-output-budget`, and, when `--usd-budget` is given, the price in
 * dollars at the rate Luna's transport pays: the Batch rate with
 * `--luna-batch`, the configuration's tier otherwise.
 */
export function guardGrammarBudget(
	price:
		| {
				readonly jev: { readonly inputTokens: number };
				readonly luna: {
					readonly inputTokens: number;
					readonly outputTokens: number;
				};
				readonly cost: RoundCost;
		  }
		| undefined,
	jevBudget: string | undefined,
	lunaBudget: string | undefined,
	lunaOutputBudget: string | undefined,
	options: {
		readonly usdBudget?: string | undefined;
		readonly lunaBatch?: boolean;
	} = {},
): GrammarCaps {
	const usd =
		options.usdBudget === undefined ? undefined : Number(options.usdBudget);
	if (usd !== undefined && !Number.isFinite(usd))
		throw Error("--usd-budget is a number of dollars. Nothing was asked.");
	const caps = {
		jevInputTokens: Number(jevBudget),
		lunaInputTokens: Number(lunaBudget),
		lunaOutputTokens: Number(lunaOutputBudget),
	};
	if (
		!jevBudget ||
		!lunaBudget ||
		!lunaOutputBudget ||
		!Object.values(caps).every(Number.isFinite)
	)
		throw Error(
			"A live resolve.grammar, resolve.reading and knowledge.produce run needs --budget (jev input tokens), --luna-budget (Luna input tokens) and --luna-output-budget (Luna output tokens); price it with --estimate first. Nothing was asked.",
		);
	if (
		price &&
		(price.jev.inputTokens > caps.jevInputTokens ||
			price.luna.inputTokens > caps.lunaInputTokens ||
			price.luna.outputTokens > caps.lunaOutputTokens)
	)
		throw Error(
			`This run projects ${price.jev.inputTokens} jev input tokens and ${price.luna.inputTokens} in / ${price.luna.outputTokens} out Luna tokens, past the budgets of ${caps.jevInputTokens}, ${caps.lunaInputTokens} and ${caps.lunaOutputTokens}. Nothing was asked.`,
		);
	const projected = options.lunaBatch
		? price?.cost.totalBatchUsd
		: price?.cost.totalSyncUsd;
	if (usd !== undefined && projected !== undefined && projected > usd)
		throw Error(
			`This run projects $${projected} with Luna ${options.lunaBatch ? "batched" : `synchronous (${price?.cost.luna.syncTier})`}, past the budget of $${usd}. Nothing was asked.`,
		);
	return usd === undefined ? caps : { ...caps, usd };
}
