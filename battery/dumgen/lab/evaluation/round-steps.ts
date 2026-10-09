/**
 * The steps resolve.grammar's, resolve.reading's and knowledge.produce's
 * `evaluate` share before their run: open the frozen set, take a frozen
 * subset's cases, price the run and stop or go live, and fill the cache in
 * stages. Each port passes its own loader, models and pass.
 */
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LunaAsk } from "../../src/luna.js";
import type { JevAsk } from "../../src/segment/jev.js";
import type { CaseFilter } from "../run-directory.js";
import { type FrozenSet, isFrozen } from "./frozen-sets.js";
import type { LunaBatch } from "./luna-batch.js";
import {
	type CachedModels,
	type GrammarCaps,
	type GrammarModelsOptions,
	type GrammarPrice,
	type LedgerSizes,
	type LunaBatchEvent,
	readLedgerSizes,
	type StageSize,
} from "./resolve-grammar/models.js";

/** The package root a subset's path in the manifest is relative to. */
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

/** What the shared steps read of a port's `evaluate` arguments. */
type RoundArgs = {
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	readonly lunaBatch?: LunaBatch;
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	readonly ledger?: string;
	readonly offline?: boolean;
	readonly estimate?: boolean;
	readonly wholeRound?: boolean;
	readonly beforeLive?: (price: GrammarPrice) => void | Promise<void>;
	readonly beforeSpend?: () => void;
	readonly caps?: GrammarCaps;
	readonly signal?: AbortSignal;
};

/**
 * The current frozen set `setName`, and the attempts per case, `repetitions`
 * or `maximum`, checked to be 1 to `maximum`. An unfrozen set throws, naming
 * the command that freezes it.
 */
export async function openFrozenSet<Name extends string, Set>(open: {
	readonly setsRoot: string;
	readonly setName: Name;
	readonly route: string;
	readonly freezeCommand: string;
	readonly load: (setsRoot: string, setName: Name) => Promise<Set>;
	readonly maximum: number;
	readonly repetitions: number | undefined;
}): Promise<{ readonly set: Set; readonly repetitions: number }> {
	if (!isFrozen(open.setsRoot, open.setName))
		throw Error(
			`The ${open.setName} set of ${open.route} is not frozen; run \`${open.freezeCommand}\` first`,
		);
	const set = await open.load(open.setsRoot, open.setName);
	const repetitions = open.repetitions ?? open.maximum;
	if (
		!Number.isInteger(repetitions) ||
		repetitions < 1 ||
		repetitions > open.maximum
	)
		throw Error(
			`repetitions must be 1 to ${open.maximum}, not ${repetitions}`,
		);
	return { set, repetitions };
}

/** What a frozen subset records of where it was drawn. */
type SubsetOrigin = {
	readonly setHash: string;
	readonly baselineRunId: string;
	readonly seed: number;
};

/**
 * The cases of `set` a frozen subset's file names, its baseline's misses
 * and its guard, and the case filter a run's manifest records; every case
 * without a subset. A subset drawn from another set, or naming a case the
 * set lacks, throws.
 */
export function selectSubset<
	Case extends { readonly id: string },
	Subset extends SubsetOrigin,
>(select: {
	readonly set: FrozenSet & { readonly cases: readonly Case[] };
	readonly subset: string | undefined;
	readonly load: (path: string) => Subset;
	readonly caseIds: (subset: Subset) => {
		readonly missed: readonly string[];
		readonly guard: readonly string[];
	};
}): { readonly cases: readonly Case[]; readonly caseFilter?: CaseFilter } {
	const { set } = select;
	if (!select.subset) return { cases: set.cases };
	const path = resolve(packageRoot, select.subset);
	const subset = select.load(path);
	if (subset.setHash !== set.hash)
		throw Error(
			`The subset was read from set ${subset.setHash}, not the frozen ${set.hash}`,
		);
	const ids = select.caseIds(subset);
	const wanted = new Set([...ids.missed, ...ids.guard]);
	const cases = set.cases.filter(({ id }) => wanted.has(id));
	if (cases.length !== wanted.size)
		throw Error("The subset names cases the frozen set lacks");
	return {
		cases,
		caseFilter: {
			subset: relative(packageRoot, path),
			baselineRunId: subset.baselineRunId,
			seed: subset.seed,
			missed: ids.missed,
			guard: ids.guard,
		},
	};
}

/** A run's price, and the sizes its live models price their calls by. */
type Priced = {
	readonly price?: GrammarPrice;
	readonly ledgerSizes?: LedgerSizes;
	readonly stageSizes?: Readonly<Record<string, StageSize>>;
};

/**
 * Prices an estimate or a live run: the latest ledger round's sizes, then
 * one pass of `models` in `project` mode. A live run's price goes to
 * `beforeLive`, which may refuse; an estimate's is only returned. An
 * offline run prices nothing.
 */
export async function priceRound<
	Models extends Pick<CachedModels<unknown>, "price">,
>(
	args: RoundArgs,
	round: {
		readonly id: string;
		/** The port's ledger, read unless `args.ledger` names another. */
		readonly ledger: string;
		readonly directory: string;
		/** Stage sizes to project with before the ledger has any. */
		readonly stageSizes?: Readonly<Record<string, StageSize>>;
		readonly models: (options: GrammarModelsOptions) => Models;
		readonly pass: (models: Models) => Promise<void>;
		readonly repetitions: number;
		readonly attempts: number;
	},
): Promise<Priced> {
	if (!args.estimate && args.offline) return {};
	const ledgerSizes = await readLedgerSizes(
		args.ledger ?? round.ledger,
		round.id,
	);
	const projecting = round.models({
		directory: round.directory,
		mode: "project",
		...(round.stageSizes ? { stageSizes: round.stageSizes } : {}),
		...(ledgerSizes ? { ledgerSizes } : {}),
		...(args.estimate && args.wholeRound ? { wholeRound: true } : {}),
	});
	await round.pass(projecting);
	const price = projecting.price(round.repetitions, round.attempts);
	if (!args.estimate) await args.beforeLive?.(price);
	return {
		price,
		...(ledgerSizes ? { ledgerSizes } : {}),
		stageSizes: price.sizes.stages,
	};
}

/** The options of the models a run asks through: live, or offline. */
export const runModelsOptions = (
	args: RoundArgs,
	directory: string,
	priced: Priced,
): GrammarModelsOptions => ({
	directory,
	mode: args.offline ? "offline" : "live",
	...(args.jev ? { jev: args.jev } : {}),
	...(args.luna ? { luna: args.luna } : {}),
	...(args.lunaBatch ? { lunaBatch: args.lunaBatch } : {}),
	...(args.onLunaBatch ? { onLunaBatch: args.onLunaBatch } : {}),
	...(args.beforeSpend ? { beforeSpend: args.beforeSpend } : {}),
	...(args.caps ? { caps: args.caps } : {}),
	...(priced.ledgerSizes ? { ledgerSizes: priced.ledgerSizes } : {}),
	...(priced.stageSizes ? { stageSizes: priced.stageSizes } : {}),
});

/**
 * Fills a live run's cache, staged with a batch: each pass stops attempts
 * at their Luna misses, one batch answers them, and the next pass goes on.
 * A run stopped at a cap throws with its spend. An offline run asks nothing.
 */
export async function fillLive(
	args: RoundArgs,
	live: Pick<
		CachedModels<unknown>,
		"resumeLunaBatches" | "sendLunaBatch" | "capHit" | "report"
	>,
	operation: string,
	pass: () => Promise<void>,
): Promise<void> {
	if (args.offline) return;
	if (!args.jev || !(args.luna || args.lunaBatch))
		throw Error(`A live ${operation} run needs jev and Luna`);
	const signal = args.signal ?? new AbortController().signal;
	await live.resumeLunaBatches(signal);
	await pass();
	while (await live.sendLunaBatch(signal)) await pass();
	if (live.capHit !== undefined)
		throw Error(
			`The run stopped at the ${live.capHit}; spent ${JSON.stringify(live.report())}`,
		);
}
