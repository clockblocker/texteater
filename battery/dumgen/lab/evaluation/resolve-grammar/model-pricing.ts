/**
 * How the cached transports (`models.ts`) price the requests they would
 * send, in a projection and against a live run's caps alike (#891, #1345).
 * A request a cached answer prices (the same request at another
 * repetition, or, pricing a whole round, its own) costs that answer's
 * usage. Every other request is priced from itself, its own characters:
 *
 * - at the tokens per character its stage measured on a pricing pass's
 *   cache hits (three at least), with `stageMargin`;
 * - else at `unmeasuredBound`, a bound on tokens per character that every
 *   request the stored runs billed stays under.
 *
 * Never at a past round's tokens per request: the requests grow as their
 * prompts do, and a round priced at an old mean once sent a Luna batch
 * 1.7 times its price (#1345). The price says how many requests each
 * basis priced, and what it costs in dollars synchronously and with Luna
 * batched (`pricing.ts`).
 */
import { canonicalJson } from "common-utils";
import type { LunaConfiguration, LunaRequest } from "../../../src/luna.js";
import type { JevRequest } from "../../../src/segment/jev.js";
import { type RoundCost, roundCost } from "./pricing.js";

export type Executor = "jev" | "luna";

/** Stage samples a measured size needs before it prices a request. */
const minimumStageSamples = 3;

/**
 * Headroom on a stage's measured sizes. On the stored runs (2026-11-11:
 * the 16,495 Luna requests of every batch journal under `.runs/`, grouped
 * by system prompt, and the 22,286 jev and Luna cache hits of the dev
 * sets' pricing passes, by stage), a stage's rate measured on its first
 * three requests priced the rest of it within 12% of their billed input
 * (worst: jev sayingType) and 19% of Luna's billed output (worst: Luna
 * canonical); measured on half the stage, within 2% of both.
 */
const stageMargin = 1.2;

/**
 * What a request no stage measured is priced at: a fixed overhead plus
 * tokens per character that bound every request the stored runs billed.
 * Luna: 0.226 to 0.287 tokens per character over the 16,495 batch-journal
 * requests of 2026-10-03 to 2026-11-11 (0.245 at the median), so 0.29
 * prices each of their 31 batches 15% to 25% over what it billed; the
 * batch that crossed its cap (#1345), billed 2,800,483 tokens, at
 * 3,366,826. jev pays a framing overhead per request: 240 tokens and
 * 0.39 per character bound all 11,662 dev cache hits of resolve.grammar,
 * resolve.reading and knowledge.produce (0.36 to 0.82 tokens per
 * character by stage), 25% over what they billed.
 */
const unmeasuredBound: Readonly<
	Record<Executor, { readonly overhead: number; readonly perChar: number }>
> = {
	jev: { overhead: 240, perChar: 0.39 },
	luna: { overhead: 0, perChar: 0.29 },
};

/**
 * Luna output tokens held back per request in flight when no stage
 * measured its answers, against the output cap: above every stored
 * batch's mean answer (13 to 57 tokens).
 */
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
	/** Priced from its characters at its stage's measured tokens per character. */
	pricedFromStage: number;
	/** Priced from its characters at the stored runs' bound: no stage measured it. */
	pricedFromBound: number;
};

/** One stage's measured sizes, from the cache hits of a pricing pass. */
export type StageSize = {
	readonly samples: number;
	readonly inputTokensPerChar: number;
	readonly outputTokensPerRequest: number;
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
		readonly basis: string;
	};
};

/** One request's priced tokens, and what priced them. */
export type RequestPrice = {
	readonly input: number;
	readonly output: number;
	readonly basis: "stage" | "bound";
};

/** The characters a request is priced by. */
export const jevChars = (request: JevRequest) =>
	canonicalJson({ state: request.state, questions: request.questions })
		.length;
export const lunaChars = (request: LunaRequest) =>
	request.systemPrompt.length +
	canonicalJson(request.input).length +
	canonicalJson(request.outputSchema ?? {}).length;

/** What a pricer is given: the sizes measured before, and Luna's rates. */
export type PricerOptions = {
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

	/**
	 * The tokens one uncached request is priced at, from its own
	 * characters, and what priced them; its output from the answer gold
	 * would write (`outputChars`), when no stage measured it.
	 */
	size(
		executor: Executor,
		stage: string,
		chars: number,
		outputChars: number,
		stages: Readonly<Record<string, StageSize>> = this.stageSizes,
	): RequestPrice {
		const measured = stages[`${executor}:${stage}`];
		if (measured && measured.samples >= minimumStageSamples)
			return {
				input: Math.ceil(
					chars * measured.inputTokensPerChar * stageMargin,
				),
				output: Math.ceil(
					measured.outputTokensPerRequest * stageMargin,
				),
				basis: "stage",
			};
		const bound = unmeasuredBound[executor];
		return {
			input: Math.ceil(bound.overhead + chars * bound.perChar),
			output:
				executor === "jev"
					? 0
					: Math.ceil(outputChars * unmeasuredBound.luna.perChar),
			basis: "bound",
		};
	}

	/**
	 * A fresh Luna request as a live run admits it: its input, and the
	 * output held for it. A batched request may write its stage's
	 * measured answer with the margin, or the synchronous hold when no
	 * stage measured it.
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
				!batched || size.basis === "bound"
					? lunaOutputPerRequest
					: size.output,
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
				pricedFromBound: 0,
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
				else projection.pricedFromBound++;
			}
			return projection;
		};
		return { jev: of("jev"), luna: of("luna") };
	}

	/** A projection's price: its requests, dollars, and the sizes that priced them. */
	price(repetitions: number, attempts: number): GrammarPrice {
		const { jev, luna } = this.projection;
		const stages = this.stageSizes;
		const counts = (projection: ExecutorProjection) =>
			`${projection.pricedFromCache} from a cached answer's usage, ${projection.pricedFromStage} from their characters at their stage's measured tokens per character, ${projection.pricedFromBound} from their characters at the stored runs' bound`;
		return {
			repetitions,
			attempts,
			jev,
			luna,
			cost: roundCost(jev, luna, this.#options.lunaConfiguration),
			sizes: {
				stages,
				basis: `${this.#options.wholeRound ? "The whole round, cached requests included. " : ""}Every request priced by its cached usage or its own characters: jev's ${jev.requests} requests ${counts(jev)}; Luna's ${luna.requests} requests ${counts(luna)}.`,
			},
		};
	}
}
