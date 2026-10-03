/**
 * The transports a `resolve.grammar` or `resolve.reading` evaluation runs
 * through: jev and Luna behind one disk cache keyed by the request and its
 * repetition, so a re-score replays every answer without a call. Three
 * modes:
 *
 * - `offline` answers only from the cache; a miss fails its attempt.
 * - `live` asks the host's transport on a miss, once, and keeps the answer.
 * - `project` asks nothing: a miss is answered as gold would answer it
 *   (the operation's `GoldOracle`; grammar's is `oracle.ts`), so the
 *   requests that depend on it are found too, and is priced. That is how
 *   a run states its token estimate before any paid call.
 *
 * A projection prices each request it would send from measured sizes
 * wherever they exist (#891), in this order: the same request answered at
 * another repetition; the tokens per character its stage measured on this
 * pass's cache hits; the tokens per request the port's ledger measured in
 * its latest round; and only then a characters-per-token constant. The
 * price says how many requests each basis priced, and what it costs in
 * dollars synchronously and with Luna batched (`pricing.ts`).
 *
 * In `live` mode with a `lunaBatch`, Luna requests go through OpenAI's
 * Batch API in stages (#891): a pass runs jev live and stops each attempt
 * at its first Luna cache miss, which it collects; `sendLunaBatch` sends
 * the misses as one batch under the round's caps, waits for it and fills
 * the cache; the caller passes again, until a pass collects nothing new.
 * Nothing is retried: a request whose batch line failed is a
 * `ProviderFailure` for the rest of the run and is never sent again. Each
 * batch is journalled under the cache before it is waited on, so an
 * interrupted run's batch is resumed, not sent twice.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stableJson } from "promptsmith";
import type { Questions } from "promptsmith/typesafe";
import {
	defaultLunaConfiguration,
	type LunaAsk,
	type LunaConfiguration,
	type LunaRequest,
	type LunaResponse,
} from "../../luna.js";
import { lunaTokens } from "../../luna-call.js";
import type { Answers } from "../../segment/ask.js";
import type { JevAsk, JevRequest, JevResponse } from "../../segment/jev.js";
import {
	type BatchRequest,
	batchRequestLimit,
	type LunaBatch,
} from "../luna-batch.js";
import type { GrammarCase } from "./cases.js";
import { goldAnswers, goldWritten } from "./oracle.js";
import {
	jevUsd,
	type LunaTier,
	lunaUsd,
	type RoundCost,
	roundCost,
	syncTierOf,
} from "./pricing.js";

export type ModelMode = "offline" | "live" | "project";

/**
 * Characters per input token of a jev request (its state and questions as
 * JSON): measured on 503 cached segment.inUnits dev requests on 2026-10-03
 * (5,259,599 characters, 1,827,732 input tokens). The last resort of a
 * projection, after the measured sizes.
 */
export const jevCharsPerToken = 2.88;
/**
 * Characters per token of a Luna request's prompt and input, and of its
 * output: OpenAI's tokenizers give about 3.5 for German with English JSON.
 * An estimate, the last resort of a projection.
 */
export const lunaCharsPerToken = 3.5;

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
export type RequestSize = {
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

/** One Luna batch a live run sent, as the ledger records it. */
export type LunaBatchRecord = {
	readonly batchId: string;
	readonly inputFileId: string;
	readonly submittedAt: string;
	readonly status: string;
	readonly requests: number;
	readonly answered: number;
	readonly failed: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cachedInputTokens: number;
	readonly cacheWriteTokens: number;
	readonly usd: number;
	/** OpenAI's own counts and usage for the batch. */
	readonly requestCounts?: unknown;
	readonly usage?: unknown;
	/** Set when a later run settled a batch an interrupted one sent. */
	readonly resumed?: boolean;
};

/** What a live batch run reports as each batch is sent and settled. */
export type LunaBatchEvent =
	| {
			readonly event: "submitted";
			readonly batchId: string;
			readonly inputFileId: string;
			readonly submittedAt: string;
			readonly requests: number;
			readonly estimate: {
				readonly inputTokens: number;
				readonly outputTokens: number;
				readonly usd: number;
			};
	  }
	| ({ readonly event: "settled" } & LunaBatchRecord);

/** What a run spent, the way it reached Luna, and its batches. */
export type ModelsSpend = {
	readonly jev: ExecutorSpend;
	readonly luna: ExecutorSpend;
	readonly lunaTransport: "sync" | "batch";
	readonly usd: {
		readonly jev: number;
		readonly luna: number;
		readonly lunaTier: LunaTier;
	};
	readonly batches: readonly LunaBatchRecord[];
};

const sha256 = (value: unknown) =>
	createHash("sha256").update(stableJson(value)).digest("hex");

async function readEntry<T>(path: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch {
		return undefined;
	}
}

async function writeEntry(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(value));
}

const fresh = (): ExecutorSpend => ({
	freshCalls: 0,
	freshInputTokens: 0,
	freshOutputTokens: 0,
	freshCachedInputTokens: 0,
	freshCacheWriteTokens: 0,
	cachedCalls: 0,
});

export type GrammarModelsOptions = {
	readonly directory: string;
	readonly mode: ModelMode;
	/** Asked on a cache miss in `live` mode. */
	readonly jev?: JevAsk;
	readonly luna?: LunaAsk;
	/** In `live` mode, Luna's misses go through this Batch API client instead of `luna`. */
	readonly lunaBatch?: LunaBatch;
	/** Receives each batch as it is sent and settled; the ledger's record. */
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	/** Called before every fresh request or batch; throw to stop spending. */
	readonly beforeSpend?: () => void;
	/** The round's hard caps on fresh tokens; a request that would cross one is refused. */
	readonly caps?: GrammarCaps;
	/** The tokens per request the port's ledger measured, for pricing. */
	readonly ledgerSizes?: LedgerSizes;
	/** The stage sizes a pricing pass measured, for a live run's caps. */
	readonly stageSizes?: Readonly<Record<string, StageSize>>;
	/** The configuration Luna is priced at; Dumgen's default otherwise. */
	readonly lunaConfiguration?: LunaConfiguration;
	/**
	 * `project` mode: price every request the run sends, the cached ones
	 * at their own cached usage, as a round whose prompts all moved would
	 * pay; otherwise only the cache's misses are priced.
	 */
	readonly wholeRound?: boolean;
};

/** Hard caps on a live run's fresh tokens (#876: budgets per round), and optionally dollars. */
export type GrammarCaps = {
	readonly jevInputTokens: number;
	readonly lunaInputTokens: number;
	readonly lunaOutputTokens: number;
	/** Dollars, Luna priced at the rate its transport pays (batch or sync). */
	readonly usd?: number;
};

/** Luna output tokens held back per request in flight, against the output cap. */
const lunaOutputPerRequest = 60;
/** Stage samples a measured size needs before it prices a request. */
const minimumStageSamples = 3;

/** How a case's gold answers the questions and writes the text a projection replays. */
export type GoldOracle<Case> = {
	readonly answers: (goldCase: Case, questions: Questions) => Answers;
	readonly written: (goldCase: Case, input: unknown) => unknown;
};

type Executor = "jev" | "luna";

/** The characters a request's size is measured by. */
const jevChars = (request: JevRequest) =>
	stableJson({ state: request.state, questions: request.questions }).length;
const lunaChars = (request: LunaRequest) =>
	request.systemPrompt.length +
	stableJson(request.input).length +
	stableJson(request.outputSchema ?? {}).length;

/** A Luna request waiting for the run's next batch. */
type PendingLuna = { readonly request: LunaRequest; readonly stage: string };

/** A batch on disk, from its submission until it settled. */
type BatchJournal = {
	readonly batchId: string;
	readonly inputFileId: string;
	readonly submittedAt: string;
	readonly requests: readonly BatchRequest[];
	readonly settled?: LunaBatchRecord;
};

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
	type Line = {
		command?: string;
		experiment?: string;
		round?: string;
		jev?: Partial<ExecutorSpend>;
		luna?: Partial<ExecutorSpend>;
	};
	const lines = text
		.split("\n")
		.filter((line) => line.trim())
		.flatMap((line): Line[] => {
			try {
				return [JSON.parse(line) as Line];
			} catch {
				return [];
			}
		})
		.filter(
			(line) =>
				line.command === "evaluate" &&
				line.experiment === experimentId &&
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

/** The cached transports of one evaluation, with what they spent or foresaw. */
export class CachedModels<Case> {
	readonly spend = { jev: fresh(), luna: fresh() };
	/** Which cap stopped the run, once one did. */
	capHit: string | undefined;
	readonly #options: GrammarModelsOptions;
	readonly #inFlight = { jevInput: 0, lunaInput: 0, lunaCalls: 0, usd: 0 };
	readonly #oracle: GoldOracle<Case>;
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
	readonly #pending = new Map<string, PendingLuna>();
	readonly #failed = new Map<string, string>();
	readonly #batches: LunaBatchRecord[] = [];

	constructor(options: GrammarModelsOptions, oracle: GoldOracle<Case>) {
		this.#options = options;
		this.#oracle = oracle;
	}

	#path(executor: Executor, key: string) {
		return join(
			this.#options.directory,
			executor,
			key.slice(0, 2),
			`${key}.json`,
		);
	}

	get #journals() {
		return join(this.#options.directory, "batches");
	}

	get #lunaConfiguration() {
		return this.#options.lunaConfiguration ?? defaultLunaConfiguration;
	}

	/** The tier Luna's fresh requests pay: the Batch rate, or the configuration's. */
	get #lunaTier(): LunaTier {
		return this.#options.lunaBatch
			? "batch"
			: syncTierOf(this.#lunaConfiguration);
	}

	#sample(
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
	#size(
		executor: Executor,
		stage: string,
		chars: number,
		outputChars: number,
		stages: Readonly<Record<string, StageSize>> = this.stageSizes,
	): {
		input: number;
		output: number;
		basis: "stage" | "ledger" | "characters";
	} {
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
				const size = this.#size(
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
			cost: roundCost(jev, luna, this.#lunaConfiguration),
			sizes: {
				stages,
				...(ledger ? { ledger } : {}),
				basis: `${this.#options.wholeRound ? "The whole round, cached requests included. " : ""}Measured sizes priced every request they could: jev's ${jev.requests} requests ${counts(jev)}; Luna's ${luna.requests} requests ${counts(luna)}${ledger ? ` (ledger round ${ledger.round})` : ""}.`,
			},
		};
	}

	/** Dollars spent so far, Luna at the rate its transport pays. */
	#spentUsd() {
		return jevUsd(this.spend.jev.freshInputTokens) + this.#lunaSpentUsd();
	}

	#lunaSpentUsd() {
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

	/** What the run spent, how it reached Luna, and its batches. */
	report(): ModelsSpend {
		return {
			jev: { ...this.spend.jev },
			luna: { ...this.spend.luna },
			lunaTransport: this.#options.lunaBatch ? "batch" : "sync",
			usd: {
				jev: jevUsd(this.spend.jev.freshInputTokens),
				luna: this.#lunaSpentUsd(),
				lunaTier: this.#lunaTier,
			},
			batches: [...this.#batches],
		};
	}

	/** jev for one attempt at `goldCase`, at `repetition`. */
	jev(goldCase: Case, repetition: number): JevAsk {
		return async (request: JevRequest, context) => {
			const body = {
				model: request.model,
				state: request.state,
				questions: request.questions,
			};
			const keyOf = (at: number) => sha256({ ...body, repetition: at });
			const path = this.#path("jev", keyOf(repetition));
			const { mode } = this.#options;
			const hit = await readEntry<JevResponse>(path);
			if (hit) {
				this.spend.jev.cachedCalls++;
				if (mode === "project") {
					this.#sample("jev", context.stage, jevChars(request), {
						inputTokens: hit.usage.input_tokens,
						outputTokens: hit.usage.output_tokens,
					});
					if (this.#options.wholeRound) {
						this.#exact.jev.requests++;
						this.#exact.jev.inputTokens += hit.usage.input_tokens;
					}
				}
				return hit;
			}
			if (mode === "project") {
				const other = await this.#otherRepetition<JevResponse>(
					"jev",
					keyOf,
					repetition,
				);
				if (other) {
					this.#exact.jev.requests++;
					this.#exact.jev.inputTokens += other.usage.input_tokens;
					this.#sample("jev", context.stage, jevChars(request), {
						inputTokens: other.usage.input_tokens,
						outputTokens: other.usage.output_tokens,
					});
					return other;
				}
				this.#unpriced.push({
					executor: "jev",
					stage: context.stage,
					chars: jevChars(request),
					outputChars: 0,
				});
				return {
					model: request.model,
					answers: this.#oracle.answers(goldCase, request.questions),
					usage: { input_tokens: 0, output_tokens: 0 },
				};
			}
			if (mode === "offline" || !this.#options.jev)
				throw Error(
					`jev cache miss in offline mode (${context.stage})`,
				);
			this.#options.beforeSpend?.();
			const estimate = this.#size(
				"jev",
				context.stage,
				jevChars(request),
				0,
			).input;
			const { caps } = this.#options;
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
				this.#spentUsd() + this.#inFlight.usd + usd > caps.usd
			)
				this.capHit = `dollar cap of $${caps.usd}`;
			if (this.capHit !== undefined)
				throw Error(`Stopped at the ${this.capHit}`);
			this.#inFlight.jevInput += estimate;
			this.#inFlight.usd += usd;
			let response: JevResponse;
			try {
				response = await this.#options.jev(request, context);
			} finally {
				this.#inFlight.jevInput -= estimate;
				this.#inFlight.usd -= usd;
			}
			this.spend.jev.freshCalls++;
			this.spend.jev.freshInputTokens += response.usage.input_tokens;
			this.spend.jev.freshOutputTokens += response.usage.output_tokens;
			await writeEntry(path, response);
			return response;
		};
	}

	/** Luna for one attempt at `goldCase`, at `repetition`. */
	luna(goldCase: Case, repetition: number): LunaAsk {
		return async (request: LunaRequest, context) => {
			const keyOf = (at: number) =>
				sha256({ ...request, repetition: at });
			const key = keyOf(repetition);
			const path = this.#path("luna", key);
			const { mode } = this.#options;
			const hit = await readEntry<LunaResponse>(path);
			if (hit) {
				this.spend.luna.cachedCalls++;
				if (mode === "project") {
					const tokens = lunaTokens(hit.metadata);
					this.#sample(
						"luna",
						context.stage,
						lunaChars(request),
						tokens,
					);
					if (this.#options.wholeRound) {
						this.#exact.luna.requests++;
						this.#exact.luna.inputTokens += tokens.inputTokens;
						this.#exact.luna.outputTokens += tokens.outputTokens;
					}
				}
				return hit;
			}
			if (mode === "project") {
				const other = await this.#otherRepetition<LunaResponse>(
					"luna",
					keyOf,
					repetition,
				);
				if (other) {
					const tokens = lunaTokens(other.metadata);
					this.#exact.luna.requests++;
					this.#exact.luna.inputTokens += tokens.inputTokens;
					this.#exact.luna.outputTokens += tokens.outputTokens;
					this.#sample(
						"luna",
						context.stage,
						lunaChars(request),
						tokens,
					);
					return other;
				}
				const output = this.#oracle.written(goldCase, request.input);
				this.#unpriced.push({
					executor: "luna",
					stage: context.stage,
					chars: lunaChars(request),
					outputChars: stableJson({ value: output }).length,
				});
				return { output };
			}
			if (
				mode === "offline" ||
				(!this.#options.luna && !this.#options.lunaBatch)
			)
				throw Error(
					`Luna cache miss in offline mode (${context.stage})`,
				);
			if (this.#options.lunaBatch) {
				// Staged: the miss waits for the run's next batch, and the
				// attempt stops here; a failed batch line is never re-sent.
				const failure = this.#failed.get(key);
				if (failure !== undefined) throw Error(failure);
				if (this.capHit !== undefined)
					throw Error(`Stopped at the ${this.capHit}`);
				if (!this.#pending.has(key))
					this.#pending.set(key, { request, stage: context.stage });
				throw Error(
					`Luna request held for the run's next batch (${context.stage})`,
				);
			}
			const luna = this.#options.luna;
			if (!luna)
				throw Error(
					`Luna cache miss in offline mode (${context.stage})`,
				);
			this.#options.beforeSpend?.();
			const size = this.#size(
				"luna",
				context.stage,
				lunaChars(request),
				0,
			);
			const estimate = size.input;
			const usd = lunaUsd(
				{ inputTokens: estimate, outputTokens: lunaOutputPerRequest },
				this.#lunaTier,
			);
			const { caps } = this.#options;
			if (caps) {
				const input =
					this.spend.luna.freshInputTokens +
					this.#inFlight.lunaInput +
					estimate;
				const output =
					this.spend.luna.freshOutputTokens +
					(this.#inFlight.lunaCalls + 1) * lunaOutputPerRequest;
				if (this.capHit === undefined && input > caps.lunaInputTokens)
					this.capHit = `Luna input cap of ${caps.lunaInputTokens} tokens`;
				if (this.capHit === undefined && output > caps.lunaOutputTokens)
					this.capHit = `Luna output cap of ${caps.lunaOutputTokens} tokens`;
				if (
					this.capHit === undefined &&
					caps.usd !== undefined &&
					this.#spentUsd() + this.#inFlight.usd + usd > caps.usd
				)
					this.capHit = `dollar cap of $${caps.usd}`;
				if (this.capHit !== undefined)
					throw Error(`Stopped at the ${this.capHit}`);
			}
			this.#inFlight.lunaInput += estimate;
			this.#inFlight.lunaCalls++;
			this.#inFlight.usd += usd;
			let response: LunaResponse;
			try {
				response = await luna(request, context);
			} finally {
				this.#inFlight.lunaInput -= estimate;
				this.#inFlight.lunaCalls--;
				this.#inFlight.usd -= usd;
			}
			this.#spent(response);
			await writeEntry(path, response);
			return response;
		};
	}

	/** Counts a fresh Luna answer's tokens. */
	#spent(response: LunaResponse) {
		const tokens = lunaTokens(response.metadata);
		this.spend.luna.freshCalls++;
		this.spend.luna.freshInputTokens += tokens.inputTokens;
		this.spend.luna.freshOutputTokens += tokens.outputTokens;
		this.spend.luna.freshCachedInputTokens += tokens.cachedInputTokens;
		this.spend.luna.freshCacheWriteTokens += tokens.cacheWriteTokens;
		return tokens;
	}

	/** Luna requests the last pass held for a batch. */
	get pendingLuna(): number {
		return this.#pending.size;
	}

	/**
	 * Settles the batches an interrupted run sent and never read, filling
	 * the cache from them; none are sent again.
	 */
	async resumeLunaBatches(signal: AbortSignal): Promise<void> {
		if (!this.#options.lunaBatch) return;
		let names: string[];
		try {
			names = await readdir(this.#journals);
		} catch {
			return;
		}
		for (const name of names
			.filter((file) => file.endsWith(".json"))
			.sort()) {
			const journal = await readEntry<BatchJournal>(
				join(this.#journals, name),
			);
			if (journal && !journal.settled)
				await this.#settle(journal, signal, true);
		}
	}

	/**
	 * Sends the Luna requests the last pass held as one batch, within the
	 * round's caps priced at the Batch rate, waits for it and fills the
	 * cache. False when nothing was sent: none were held, or a cap stopped
	 * the run.
	 */
	async sendLunaBatch(signal: AbortSignal): Promise<boolean> {
		const batch = this.#options.lunaBatch;
		if (!batch || this.#pending.size === 0 || this.capHit !== undefined)
			return false;
		this.#options.beforeSpend?.();
		const { caps } = this.#options;
		const chosen: [string, PendingLuna][] = [];
		let input = 0;
		let output = 0;
		let usd = 0;
		for (const entry of this.#pending) {
			if (chosen.length >= batchRequestLimit) break;
			const [, { request, stage }] = entry;
			const size = this.#size("luna", stage, lunaChars(request), 0);
			// What a request may write: its measured size with a margin, or
			// the synchronous hold when nothing measured it.
			const held =
				size.basis === "characters"
					? lunaOutputPerRequest
					: Math.ceil(size.output * 1.25);
			const cost = lunaUsd(
				{ inputTokens: size.input, outputTokens: held },
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
					this.spend.luna.freshOutputTokens + output + held >
					caps.lunaOutputTokens
				) {
					this.capHit = `Luna output cap of ${caps.lunaOutputTokens} tokens`;
					break;
				}
				if (
					caps.usd !== undefined &&
					this.#spentUsd() + usd + cost > caps.usd
				) {
					this.capHit = `dollar cap of $${caps.usd}`;
					break;
				}
			}
			chosen.push(entry);
			input += size.input;
			output += held;
			usd += cost;
		}
		if (chosen.length === 0) return false;
		const requests = chosen.map(([customId, { request }]) => ({
			customId,
			request,
		}));
		const submitted = await batch.submit(requests, signal);
		const journal: BatchJournal = {
			batchId: submitted.id,
			inputFileId: submitted.inputFileId,
			submittedAt: new Date().toISOString(),
			requests,
		};
		await writeEntry(join(this.#journals, `${submitted.id}.json`), journal);
		for (const [key] of chosen) this.#pending.delete(key);
		await this.#options.onLunaBatch?.({
			event: "submitted",
			batchId: journal.batchId,
			inputFileId: journal.inputFileId,
			submittedAt: journal.submittedAt,
			requests: requests.length,
			estimate: { inputTokens: input, outputTokens: output, usd },
		});
		await this.#settle(journal, signal, false);
		return true;
	}

	/** Waits for one batch, fills the cache from its answers and records it. */
	async #settle(
		journal: BatchJournal,
		signal: AbortSignal,
		resumed: boolean,
	) {
		const batch = this.#options.lunaBatch;
		if (!batch) return;
		const settled = await batch.settle(
			journal.batchId,
			journal.requests,
			signal,
		);
		const totals = {
			answered: 0,
			failed: 0,
			inputTokens: 0,
			outputTokens: 0,
			cachedInputTokens: 0,
			cacheWriteTokens: 0,
		};
		for (const { customId } of journal.requests) {
			const answer = settled.answers.get(customId);
			if (answer?.ok) {
				const tokens = this.#spent(answer.response);
				totals.answered++;
				totals.inputTokens += tokens.inputTokens;
				totals.outputTokens += tokens.outputTokens;
				totals.cachedInputTokens += tokens.cachedInputTokens;
				totals.cacheWriteTokens += tokens.cacheWriteTokens;
				await writeEntry(this.#path("luna", customId), answer.response);
			} else {
				totals.failed++;
				this.#failed.set(
					customId,
					answer?.message ??
						`No answer in OpenAI batch ${journal.batchId}`,
				);
			}
		}
		const record: LunaBatchRecord = {
			batchId: journal.batchId,
			inputFileId: journal.inputFileId,
			submittedAt: journal.submittedAt,
			status: settled.status,
			requests: journal.requests.length,
			...totals,
			usd: lunaUsd(totals, "batch"),
			...(settled.requestCounts === undefined
				? {}
				: { requestCounts: settled.requestCounts }),
			...(settled.usage === undefined ? {} : { usage: settled.usage }),
			...(resumed ? { resumed: true } : {}),
		};
		this.#batches.push(record);
		await writeEntry(join(this.#journals, `${journal.batchId}.json`), {
			...journal,
			settled: record,
		});
		await this.#options.onLunaBatch?.({ event: "settled", ...record });
	}

	/** The same request answered at another repetition, for pricing. */
	async #otherRepetition<T>(
		executor: Executor,
		keyOf: (repetition: number) => string,
		repetition: number,
	): Promise<T | undefined> {
		for (const at of [0, 1, 2]) {
			if (at === repetition) continue;
			const other = await readEntry<T>(this.#path(executor, keyOf(at)));
			if (other) return other;
		}
		return undefined;
	}
}

/** `resolve.grammar`'s cached transports, its projections answered by `oracle.ts`. */
export class GrammarModels extends CachedModels<GrammarCase> {
	constructor(options: GrammarModelsOptions) {
		super(options, { answers: goldAnswers, written: goldWritten });
	}
}
