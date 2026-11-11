/**
 * What a live run of the cached transports (`models.ts`) has spent, and
 * the caps it was granted (#876: budgets per round): every fresh request
 * and every batch is admitted here against them, priced by
 * `model-pricing.ts`, or refused.
 */
import { jevUsd, type LunaTier, lunaUsd } from "./pricing.js";

/** What one executor spent: fresh calls and tokens, and calls the cache answered. */
export type ExecutorSpend = {
	freshCalls: number;
	freshInputTokens: number;
	freshOutputTokens: number;
	/** Of the fresh input, read from OpenAI's prompt cache (Luna only). */
	freshCachedInputTokens: number;
	/** Of the fresh input, written to OpenAI's prompt cache (Luna only). */
	freshCacheWriteTokens: number;
	cachedCalls: number;
};

/** Hard caps on a live run's fresh tokens (#876: budgets per round), and optionally dollars. */
export type GrammarCaps = {
	readonly jevInputTokens: number;
	readonly lunaInputTokens: number;
	readonly lunaOutputTokens: number;
	/** Dollars, Luna priced at the rate its transport pays (batch or sync). */
	readonly usd?: number;
};

/** One request's priced tokens as a batch admits them: its input and the output it may write. */
export type BatchRequestPrice = {
	readonly input: number;
	readonly output: number;
};

/** What a batch admitted: how many of the held requests, and their priced size. */
export type AdmittedBatch = {
	readonly requests: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly usd: number;
};

const fresh = (): ExecutorSpend => ({
	freshCalls: 0,
	freshInputTokens: 0,
	freshOutputTokens: 0,
	freshCachedInputTokens: 0,
	freshCacheWriteTokens: 0,
	cachedCalls: 0,
});

/** One run's spend and caps, and the room its requests in flight hold. */
export class SpendGuard {
	readonly spend = { jev: fresh(), luna: fresh() };
	/** Which cap stopped the run, once one did. */
	capHit: string | undefined;
	readonly #caps: GrammarCaps | undefined;
	readonly #lunaTier: LunaTier;
	readonly #inFlight = { jevInput: 0, lunaInput: 0, lunaCalls: 0, usd: 0 };

	constructor(caps: GrammarCaps | undefined, lunaTier: LunaTier) {
		this.#caps = caps;
		this.#lunaTier = lunaTier;
	}

	/** Dollars spent so far, Luna at the rate its transport pays. */
	spentUsd() {
		return jevUsd(this.spend.jev.freshInputTokens) + this.lunaSpentUsd();
	}

	lunaSpentUsd() {
		const { luna } = this.spend;
		return lunaUsd(
			{
				inputTokens: luna.freshInputTokens,
				outputTokens: luna.freshOutputTokens,
				cachedInputTokens: luna.freshCachedInputTokens,
				cacheWriteTokens: luna.freshCacheWriteTokens,
			},
			this.#lunaTier,
		);
	}

	/**
	 * Admits one fresh jev request priced at `estimate` input tokens, or
	 * throws at the cap it would cross; the room it holds is given back by
	 * the returned release once it is answered.
	 */
	reserveJev(estimate: number): () => void {
		const caps = this.#caps;
		const usd = jevUsd(estimate);
		if (
			caps &&
			(this.capHit !== undefined ||
				this.spend.jev.freshInputTokens +
					this.#inFlight.jevInput +
					estimate >
					caps.jevInputTokens)
		)
			this.capHit ??= `jev input cap of ${caps.jevInputTokens} tokens`;
		if (
			caps?.usd !== undefined &&
			this.capHit === undefined &&
			this.spentUsd() + this.#inFlight.usd + usd > caps.usd
		)
			this.capHit = `dollar cap of $${caps.usd}`;
		if (this.capHit !== undefined)
			throw Error(`Stopped at the ${this.capHit}`);
		this.#inFlight.jevInput += estimate;
		this.#inFlight.usd += usd;
		return () => {
			this.#inFlight.jevInput -= estimate;
			this.#inFlight.usd -= usd;
		};
	}

	/**
	 * Admits one synchronous Luna request priced at `size`, or throws at the
	 * cap it would cross; as `reserveJev`.
	 */
	reserveLuna(size: BatchRequestPrice): () => void {
		const caps = this.#caps;
		const usd = lunaUsd(
			{ inputTokens: size.input, outputTokens: size.output },
			this.#lunaTier,
		);
		if (caps) {
			const input =
				this.spend.luna.freshInputTokens +
				this.#inFlight.lunaInput +
				size.input;
			const output =
				this.spend.luna.freshOutputTokens +
				(this.#inFlight.lunaCalls + 1) * size.output;
			if (this.capHit === undefined && input > caps.lunaInputTokens)
				this.capHit = `Luna input cap of ${caps.lunaInputTokens} tokens`;
			if (this.capHit === undefined && output > caps.lunaOutputTokens)
				this.capHit = `Luna output cap of ${caps.lunaOutputTokens} tokens`;
			if (
				this.capHit === undefined &&
				caps.usd !== undefined &&
				this.spentUsd() + this.#inFlight.usd + usd > caps.usd
			)
				this.capHit = `dollar cap of $${caps.usd}`;
			if (this.capHit !== undefined)
				throw Error(`Stopped at the ${this.capHit}`);
		}
		this.#inFlight.lunaInput += size.input;
		this.#inFlight.lunaCalls++;
		this.#inFlight.usd += usd;
		return () => {
			this.#inFlight.lunaInput -= size.input;
			this.#inFlight.lunaCalls--;
			this.#inFlight.usd -= usd;
		};
	}

	/**
	 * Admits the held requests of the next batch, priced at the Batch rate,
	 * in order until the next would cross a cap, which then stops the run.
	 */
	admitBatch(prices: Iterable<BatchRequestPrice>): AdmittedBatch {
		const caps = this.#caps;
		let requests = 0;
		let input = 0;
		let output = 0;
		let usd = 0;
		for (const size of prices) {
			const cost = lunaUsd(
				{ inputTokens: size.input, outputTokens: size.output },
				"batch",
			);
			if (caps) {
				if (
					this.spend.luna.freshInputTokens + input + size.input >
					caps.lunaInputTokens
				) {
					this.capHit = `Luna input cap of ${caps.lunaInputTokens} tokens`;
					break;
				}
				if (
					this.spend.luna.freshOutputTokens + output + size.output >
					caps.lunaOutputTokens
				) {
					this.capHit = `Luna output cap of ${caps.lunaOutputTokens} tokens`;
					break;
				}
				if (
					caps.usd !== undefined &&
					this.spentUsd() + usd + cost > caps.usd
				) {
					this.capHit = `dollar cap of $${caps.usd}`;
					break;
				}
			}
			requests++;
			input += size.input;
			output += size.output;
			usd += cost;
		}
		return { requests, inputTokens: input, outputTokens: output, usd };
	}
}
