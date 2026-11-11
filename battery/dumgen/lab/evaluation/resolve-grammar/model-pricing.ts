/**
 * How the cached transports (`models.ts`) price the requests they would
 * send. A projection prices each request from measured sizes wherever
 * they exist (#891), in this order: the same request answered at another
 * repetition; the tokens per character its stage measured on this pass's
 * cache hits; the tokens per request the port's ledger measured in its
 * latest round; and only then a characters-per-token constant. The price
 * says how many requests each basis priced, and what it costs in dollars
 * synchronously and with Luna batched (`pricing.ts`). A live run prices
 * each fresh request the same way against its caps.
 */
import { readFile } from "node:fs/promises";
import { canonicalJson, isRecord } from "common-utils";
import { z } from "zod";
import type { LunaConfiguration, LunaRequest } from "../../../src/luna.js";
import type { JevRequest } from "../../../src/segment/jev.js";
import { storedAs } from "../../stored-json.js";
import { type RoundCost, roundCost } from "./pricing.js";

export type Executor = "jev" | "luna";

/**
 * Characters per input token of a jev request (its state and questions as
 * JSON): measured on 503 cached segment.inUnits dev requests on 2026-10-03
 * (5,259,599 characters, 1,827,732 input tokens). The last resort of a
 * projection, after the measured sizes.
 */
const jevCharsPerToken = 2.88;
/**
 * Characters per token of a Luna request's prompt and input, and of its
 * output: OpenAI's tokenizers give about 3.5 for German with English JSON.
 * An estimate, the last resort of a projection.
 */
const lunaCharsPerToken = 3.5;

/** Stage samples a measured size needs before it prices a request. */
const minimumStageSamples = 3;

/** Luna output tokens held back per request in flight, against the output cap. */
const lunaOutputPerRequest = 60;

/** What a projection found: requests the cache misses, and their priced tokens. */
export type ExecutorProjection = {
	requests: number;
	inputTokens: number;
	outputTokens: number;
	/**
	 * Priced at a cached usage: the same request's at another repetition,
	 * or, pricing a whole round, its own.
	 */
	pricedFromCache: number;
	/** Priced at its stage's tokens per character on this pass's cache hits. */
	pricedFromStage: number;
	/** Priced at the tokens per request of the ledger's latest round. */
	pricedFromLedger: number;
	/** Priced at a characters-per-token constant: no measurement applied. */
	pricedFromCharacters: number;
};

/** One stage's measured sizes, from the cache hits of a pricing pass. */
export type StageSize = {
	readonly samples: number;
	readonly inputTokensPerChar: number;
	readonly outputTokensPerRequest: number;
};

/** One executor's tokens per fresh request in a ledger round. */
type RequestSize = {
	readonly requests: number;
	readonly inputTokensPerRequest: number;
	readonly outputTokensPerRequest: number;
};

/** The sizes the port's ledger measured in its latest round of an experiment. */
export type LedgerSizes = {
	readonly round: string;
	readonly jev?: RequestSize;
	readonly luna?: RequestSize;
};

/** A run's projected spend, per repetition and in all, with its price. */
export type GrammarPrice = {
	readonly repetitions: number;
	readonly attempts: number;
	readonly jev: ExecutorProjection;
	readonly luna: ExecutorProjection;
	/** In dollars: synchronously, and with Luna through the Batch API. */
	readonly cost: RoundCost;
	/** Which measured sizes priced the requests no cache answered. */
	readonly sizes: {
		readonly stages: Readonly<Record<string, StageSize>>;
		readonly ledger?: LedgerSizes;
		readonly basis: string;
	};
};

/** One request's priced tokens, and what measured them. */
export type RequestPrice = {
	readonly input: number;
	readonly output: number;
	readonly basis: "stage" | "ledger" | "characters";
};

/** The characters a request's size is measured by. */
export const jevChars = (request: JevRequest) =>
	canonicalJson({ state: request.state, questions: request.questions })
		.length;
export const lunaChars = (request: LunaRequest) =>
	request.systemPrompt.length +
	canonicalJson(request.input).length +
	canonicalJson(request.outputSchema ?? {}).length;

const freshSpendSchema = z.object({
	freshCalls: z.number().optional(),
	freshInputTokens: z.number().optional(),
	freshOutputTokens: z.number().optional(),
});

/** What `readLedgerSizes` reads of an evaluate line. */
const ledgerLineSchema = z.object({
	round: z.string().optional(),
	jev: freshSpendSchema.optional(),
	luna: freshSpendSchema.optional(),
});

/**
 * The tokens per fresh request of an experiment's latest round in a port's
 * ledger (`evidence/resolve-*\/ledger.jsonl`): its `evaluate` lines for
 * that experiment and round, summed. Undefined without such a line.
 */
export async function readLedgerSizes(
	path: string,
	experimentId: string,
): Promise<LedgerSizes | undefined> {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch {
		return undefined;
	}
	const lines = text
		.split("\n")
		.filter((line) => line.trim())
		.flatMap((line, index) => {
			let value: unknown;
			try {
				value = JSON.parse(line);
			} catch {
				return [];
			}
			// Only this experiment's evaluate lines are read, so only they
			// are checked.
			if (
				!isRecord(value) ||
				value.command !== "evaluate" ||
				value.experiment !== experimentId
			)
				return [];
			return [
				storedAs(ledgerLineSchema, value, `${path} line ${index + 1}`),
			];
		})
		.filter(
			(line) =>
				typeof line.round === "string" &&
				((line.jev?.freshCalls ?? 0) > 0 ||
					(line.luna?.freshCalls ?? 0) > 0),
		);
	const round = lines.at(-1)?.round;
	if (round === undefined) return undefined;
	const sizeOf = (executor: Executor): RequestSize | undefined => {
		let requests = 0;
		let input = 0;
		let output = 0;
		for (const line of lines) {
			if (line.round !== round) continue;
			requests += line[executor]?.freshCalls ?? 0;
			input += line[executor]?.freshInputTokens ?? 0;
			output += line[executor]?.freshOutputTokens ?? 0;
		}
		return requests > 0
			? {
					requests,
					inputTokensPerRequest: input / requests,
					outputTokensPerRequest: output / requests,
				}
			: undefined;
	};
	const jev = sizeOf("jev");
	const luna = sizeOf("luna");
	return { round, ...(jev ? { jev } : {}), ...(luna ? { luna } : {}) };
}

/** What a pricer is given: the sizes measured before, and Luna's rates. */
export type PricerOptions = {
	readonly ledgerSizes?: LedgerSizes;
	readonly stageSizes?: Readonly<Record<string, StageSize>>;
	readonly lunaConfiguration: LunaConfiguration;
	readonly wholeRound?: boolean;
};

/**
 * One evaluation's request prices: each stage's cache hits measured as a
 * pass sees them, the requests a projection found priced exactly or at
 * the measured sizes, and the size any one fresh request is priced at.
 */
export class RequestPricer {
	readonly #options: PricerOptions;
	/** A projection's requests priced exactly, from another repetition. */
	readonly #exact = {
		jev: { requests: 0, inputTokens: 0, outputTokens: 0 },
		luna: { requests: 0, inputTokens: 0, outputTokens: 0 },
	};
	/** A projection's requests no cache answered, priced once the pass is over. */
	readonly #unpriced: {
		readonly executor: Executor;
		readonly stage: string;
		readonly chars: number;
		readonly outputChars: number;
	}[] = [];
	/** Each stage's cache hits: characters sent and tokens reported. */
	readonly #samples = new Map<
		string,
		{ samples: number; chars: number; input: number; output: number }
	>();

	constructor(options: PricerOptions) {
		this.#options = options;
	}

	/** A cache hit's size, measured for its stage. */
	sample(
		executor: Executor,
		stage: string,
		chars: number,
		tokens: { inputTokens: number; outputTokens: number },
	) {
		const key = `${executor}:${stage}`;
		const sample = this.#samples.get(key) ?? {
			samples: 0,
			chars: 0,
			input: 0,
			output: 0,
		};
		sample.samples++;
		sample.chars += chars;
		sample.input += tokens.inputTokens;
		sample.output += tokens.outputTokens;
		this.#samples.set(key, sample);
	}

	/** A projected request priced exactly, at a cached usage. */
	exact(executor: Executor, inputTokens: number, outputTokens: number) {
		const exact = this.#exact[executor];
		exact.requests++;
		exact.inputTokens += inputTokens;
		exact.outputTokens += outputTokens;
	}

	/** A projected request no cache answered, priced once the pass is over. */
	unpriced(
		executor: Executor,
		stage: string,
		chars: number,
		outputChars: number,
	) {
		this.#unpriced.push({ executor, stage, chars, outputChars });
	}

	/** Each stage's measured sizes, from this pass's cache hits or the pricing pass's. */
	get stageSizes(): Readonly<Record<string, StageSize>> {
		const measured: Record<string, StageSize> = {
			...this.#options.stageSizes,
		};
		for (const [key, sample] of this.#samples)
			if (sample.samples >= minimumStageSamples && sample.chars > 0)
				measured[key] = {
					samples: sample.samples,
					inputTokensPerChar: sample.input / sample.chars,
					outputTokensPerRequest: sample.output / sample.samples,
				};
		return measured;
	}

	/** The tokens one uncached request is priced at, and what measured them. */
	size(
		executor: Executor,
		stage: string,
		chars: number,
		outputChars: number,
		stages: Readonly<Record<string, StageSize>> = this.stageSizes,
	): RequestPrice {
		const measured = stages[`${executor}:${stage}`];
		if (measured)
			return {
				input: Math.ceil(chars * measured.inputTokensPerChar),
				output: Math.ceil(measured.outputTokensPerRequest),
				basis: "stage",
			};
		const ledger = this.#options.ledgerSizes?.[executor];
		if (ledger)
			return {
				input: Math.ceil(ledger.inputTokensPerRequest),
				output: Math.ceil(ledger.outputTokensPerRequest),
				basis: "ledger",
			};
		return executor === "jev"
			? {
					input: Math.ceil(chars / jevCharsPerToken),
					output: 0,
					basis: "characters",
				}
			: {
					input: Math.ceil(chars / lunaCharsPerToken),
					output: Math.ceil(outputChars / lunaCharsPerToken),
					basis: "characters",
				};
	}

	/**
	 * A fresh Luna request as a live run admits it: its input, and the
	 * output held for it. A batched request may write its measured size
	 * with a margin, or the synchronous hold when nothing measured it.
	 */
	lunaHold(
		stage: string,
		chars: number,
		batched: boolean,
	): { readonly input: number; readonly output: number } {
		const size = this.size("luna", stage, chars, 0);
		return {
			input: size.input,
			output:
				!batched || size.basis === "characters"
					? lunaOutputPerRequest
					: Math.ceil(size.output * 1.25),
		};
	}

	/** What a projection found, its uncached requests priced at the measured sizes. */
	get projection(): { jev: ExecutorProjection; luna: ExecutorProjection } {
		const stages = this.stageSizes;
		const of = (executor: Executor): ExecutorProjection => {
			const exact = this.#exact[executor];
			const projection: ExecutorProjection = {
				requests: exact.requests,
				inputTokens: exact.inputTokens,
				outputTokens: exact.outputTokens,
				pricedFromCache: exact.requests,
				pricedFromStage: 0,
				pricedFromLedger: 0,
				pricedFromCharacters: 0,
			};
			for (const request of this.#unpriced) {
				if (request.executor !== executor) continue;
				const size = this.size(
					executor,
					request.stage,
					request.chars,
					request.outputChars,
					stages,
				);
				projection.requests++;
				projection.inputTokens += size.input;
				projection.outputTokens += size.output;
				if (size.basis === "stage") projection.pricedFromStage++;
				else if (size.basis === "ledger") projection.pricedFromLedger++;
				else projection.pricedFromCharacters++;
			}
			return projection;
		};
		return { jev: of("jev"), luna: of("luna") };
	}

	/** A projection's price: its requests, dollars, and the sizes that priced them. */
	price(repetitions: number, attempts: number): GrammarPrice {
		const { jev, luna } = this.projection;
		const stages = this.stageSizes;
		const ledger = this.#options.ledgerSizes;
		const counts = (projection: ExecutorProjection) =>
			`${projection.pricedFromCache} from a cached answer's usage, ${projection.pricedFromStage} from their stage's measured tokens per character, ${projection.pricedFromLedger} from the ledger's tokens per request, ${projection.pricedFromCharacters} from a characters-per-token constant`;
		return {
			repetitions,
			attempts,
			jev,
			luna,
			cost: roundCost(jev, luna, this.#options.lunaConfiguration),
			sizes: {
				stages,
				...(ledger ? { ledger } : {}),
				basis: `${this.#options.wholeRound ? "The whole round, cached requests included. " : ""}Measured sizes priced every request they could: jev's ${jev.requests} requests ${counts(jev)}; Luna's ${luna.requests} requests ${counts(luna)}${ledger ? ` (ledger round ${ledger.round})` : ""}.`,
			},
		};
	}
}
