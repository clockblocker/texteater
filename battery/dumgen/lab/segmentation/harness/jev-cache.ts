/**
 * The cached, retrying jev that segmentation evaluations and lab runs ask
 * through. It is a `JevAsk`, so `JevTransport.fromAsk` makes it the
 * transport `DumgenCore` takes and an evaluation runs the production path;
 * the lab's arms reach it through `port`, the stages' `ask` port on the
 * run's request budget, which fails as production's `Jev` does: a `ProviderFailure` when no answer
 * came (an unusable fresh answer is refused as the transport's failure),
 * an `InvalidModelOutput` when a cached one does not fit its question.
 *
 * - **The cache keys each answer by its question**: the model, the judge
 *   state, the repetition and the question with its id. How a request was
 *   chunked never decides a hit, and a request whose questions are partly
 *   cached sends only the others. The answers live in one file per model,
 *   state and repetition, under `<cacheDirectory>/jev-questions/`.
 * - **Answers the lab cached per request before #858's follow-up**
 *   (`<cacheDirectory>/jev/`) are not read: their keys were taken over JSON
 *   with `localeCompare` key order, and common-utils' `canonicalJson`
 *   replaced it (#817), so jev answers those requests once more.
 * - **Retries live here, not in production**: a fresh request that fails
 *   on a 429, a 5xx or without a status is sent again after a backoff, up
 *   to `maxRetries` times. Every retry and every request that still failed
 *   is counted in `transport`, which a run records beside its accuracy.
 * - **The model is pinned**: an answer from another version than the one
 *   requested fails its request and is never cached. A floating alias
 *   (`jev-latest`) needs `allowFloatingModel`.
 * - **A projecting cache** (`project`) asks nothing and writes nothing: it
 *   answers a miss from the same questions at another repetition, or else
 *   with the projector's stand-in answers, and keeps every miss in
 *   `projection`, so a live run can price itself first (`round.ts`).
 */
import { join } from "node:path";
import type { EntryType, Question, Questions } from "@typesafe-ai/sdk";
import { canonicalJson, messageOf } from "common-utils";
import * as Effect from "effect/Effect";
import { RequestBudget, withPermit } from "../../../src/call.js";
import { InvalidModelOutput, ProviderFailure } from "../../../src/errors.js";
import { checkedAnswers } from "../../../src/jev-call.js";
import type { Answers, Ask } from "../../../src/segment/ask.js";
import {
	isFloatingModel,
	type JevAsk,
	type JevRequest,
	type JevResponse,
	pinnedJevModel,
	questionsPerRequest,
} from "../../../src/segment/jev.js";
import {
	type Bucket,
	canonicalObject,
	emptyBucket,
	hashOf,
	hashOfText,
	lookupIn,
	readBucket,
	requestText,
	type Sent,
	type Spelling,
	spell,
	spelledAt,
	writeJson,
} from "./jev-cache-buckets.js";
import {
	type AskContext,
	type CallRecord,
	causeOf,
	defaultRetryDelay,
	type JevCacheOptions,
	type Projection,
	type Projector,
	retryable,
	sleep,
	type TransportRecord,
	type TransportTally,
	tally,
} from "./jev-cache-records.js";

export { hashOf } from "./jev-cache-buckets.js";
export {
	type CallRecord,
	callRecordSchema,
	type JevCacheOptions,
	type Projection,
	type Projector,
	type TransportRecord,
	transportRecordSchema,
	transportText,
} from "./jev-cache-records.js";

/** Repetitions a projection pass reads a missed request's answers from. */
const projectedRepetitions = [0, 1, 2] as const;

export class JevCache {
	readonly model: string;
	readonly questionsPerRequest: number;
	/** Every model an answer came from, cached ones included. */
	readonly resolvedModels = new Set<string>();
	/** What a projecting cache saw: cached requests and the ones it would send. */
	readonly projection: Projection = { samples: [], requests: [] };
	readonly #options: JevCacheOptions;
	readonly #requests = new Map<string, Set<string>>();
	readonly #locks = new Map<string, Promise<void>>();
	readonly #transport: TransportTally = {
		requests: 0,
		retries: 0,
		retriedRequests: 0,
		failures: 0,
		interrupted: 0,
		retriesBy: {},
		failuresBy: {},
	};

	constructor(options: JevCacheOptions) {
		this.#options = options;
		this.model = options.model ?? pinnedJevModel;
		if (isFloatingModel(this.model) && !options.allowFloatingModel)
			throw Error(
				`${this.model} floats between jev versions; pin a version or allow a floating model`,
			);
		this.questionsPerRequest =
			options.questionsPerRequest ?? questionsPerRequest;
	}

	/** What the fresh requests met so far: their retries and failures. */
	get transport(): TransportRecord {
		const counts = this.#transport;
		return {
			...counts,
			retriesBy: { ...counts.retriesBy },
			failuresBy: { ...counts.failuresBy },
		};
	}

	/**
	 * Per stage, one hash over the distinct requests (state and questions)
	 * asked so far, as the stages put them. Repetition and model are left
	 * out: a noise rerun of the same configuration sends the same prompts.
	 */
	promptHashes(): Record<string, string> {
		return Object.fromEntries(
			[...this.#requests]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([stage, hashes]) => [stage, hashOf([...hashes].sort())]),
		);
	}

	#recordPrompt(
		stage: string,
		repetition: number,
		state: EntryType,
		questions: Questions,
		spelling: Spelling,
	) {
		this.#options.onRequest?.({ stage, repetition, state, questions });
		const hashes = this.#requests.get(stage) ?? new Set();
		this.#requests.set(stage, hashes);
		hashes.add(hashOfText(requestText(spelling, questions)));
	}

	/**
	 * jev at `repetition` as a `JevAsk`: what `JevTransport.fromAsk`
	 * takes. Each request it answers appends one record to `calls`.
	 */
	ask(repetition: number, calls: CallRecord[] = []): JevAsk {
		return (request, { stage, signal }) => {
			const spelling = spell(request.state, request.questions);
			this.#recordPrompt(
				stage,
				repetition,
				request.state,
				request.questions,
				spelling,
			);
			return this.#answer(
				request,
				{ stage, signal, repetition, calls },
				spelling,
			);
		};
	}

	/**
	 * The stages' `ask` port at `repetition`, for the lab's arms, on the
	 * run's request budget (D4 on #1269): each request in chunks of
	 * `questionsPerRequest`, sent side by side as production's `Jev` sends
	 * them, each chunk holding one permit of the budget while it is answered
	 * and checked as production checks it. The first chunk that fails fails
	 * the request and interrupts the others: a chunk that brought no answer
	 * fails with a `ProviderFailure`, an unusable one with its
	 * `InvalidModelOutput`, and an interrupted chunk aborts its request.
	 * `salt` keeps a limit test's answers apart.
	 */
	port(
		repetition: number,
		calls: CallRecord[],
		options: {
			readonly questionsPerRequest?: number;
			readonly salt?: string;
		} = {},
	): Effect.Effect<Ask, never, RequestBudget> {
		const size = options.questionsPerRequest ?? this.questionsPerRequest;
		const context = {
			repetition,
			calls,
			...(options.salt === undefined ? {} : { salt: options.salt }),
		};
		return RequestBudget.useSync(
			(budget): Ask =>
				({ stage, state, questions }) => {
					const failure = (error: unknown) =>
						error instanceof InvalidModelOutput
							? error
							: new ProviderFailure({
									stage,
									message: messageOf(error),
									cause: error,
								});
					const chunked = Effect.try({
						try: () => {
							const entries = Object.entries(questions);
							if (entries.length === 0) return undefined;
							const spelling = spell(state, questions);
							this.#recordPrompt(
								stage,
								repetition,
								state,
								questions,
								spelling,
							);
							const chunks: (typeof entries)[] = [];
							for (let at = 0; at < entries.length; at += size)
								chunks.push(entries.slice(at, at + size));
							return { spelling, chunks };
						},
						catch: failure,
					});
					return Effect.flatMap(chunked, (request) =>
						request === undefined
							? Effect.succeed({})
							: Effect.map(
									Effect.forEach(
										request.chunks,
										(chunk) =>
											withPermit(
												budget,
												Effect.tryPromise({
													try: (signal) =>
														this.#chunk(
															state,
															chunk,
															{
																stage,
																signal,
																...context,
															},
															request.spelling,
														),
													catch: failure,
												}),
											),
										{ concurrency: "unbounded" },
									),
									(answered): Answers =>
										Object.fromEntries(
											answered.flatMap((chunk) =>
												Object.entries(chunk),
											),
										),
								),
					);
				},
		);
	}

	/** One chunk of a port's request, from the cache or else from jev, checked as production checks it. */
	async #chunk(
		state: JevRequest["state"],
		chunk: readonly (readonly [string, Question])[],
		context: AskContext,
		spelling: Spelling,
	): Promise<Answers> {
		const response = await this.#answer(
			{ model: this.model, state, questions: Object.fromEntries(chunk) },
			context,
			spelling,
		);
		const checked = checkedAnswers(
			context.stage,
			isFloatingModel(this.model) ? response.model : this.model,
			chunk,
			response,
		);
		if (checked instanceof InvalidModelOutput) throw checked;
		return checked;
	}

	/** The bucket of the spelled `state` at `repetition`: `hashOf({ model, state, repetition, salt })`. */
	#bucketPath(
		state: string,
		repetition: number,
		salt: string | undefined,
	): string {
		const key = hashOfText(
			canonicalObject([
				["model", JSON.stringify(this.model)],
				["state", state],
				["repetition", canonicalJson(repetition)],
				...(salt === undefined
					? []
					: [["salt", JSON.stringify(salt)] as const]),
			]),
		);
		return join(
			this.#options.cacheDirectory,
			"jev-questions",
			key.slice(0, 2),
			`${key}.json`,
		);
	}

	/** Runs `change` on the bucket at `path` alone; it returns the new bucket, or nothing to keep it. */
	async #update(
		path: string,
		change: (bucket: Bucket) => Bucket | undefined,
	) {
		const previous = this.#locks.get(path) ?? Promise.resolve();
		let release = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		const queued = previous.then(() => held);
		this.#locks.set(path, queued);
		await previous;
		try {
			const next = change((await readBucket(path)) ?? emptyBucket);
			if (next) await writeJson(path, next);
		} finally {
			release();
			if (this.#locks.get(path) === queued) this.#locks.delete(path);
		}
	}

	/** Adds a request's answers to the bucket, keeping any already there. */
	#store(
		path: string,
		questions: Questions,
		keys: ReadonlyMap<string, string>,
		answered: {
			readonly model: string;
			readonly answers: Answers;
			readonly usage: Sent["usage"];
			readonly latencyMs: number;
		},
	) {
		return this.#update(path, (bucket) => {
			const fresh = Object.keys(questions).filter(
				(id) =>
					!(spelledAt(keys, id) in bucket.answers) &&
					answered.answers[id] !== undefined,
			);
			if (fresh.length === 0) return undefined;
			const request = bucket.requests.length;
			const answers = { ...bucket.answers };
			for (const id of fresh) {
				const answer = answered.answers[id];
				if (answer) answers[spelledAt(keys, id)] = { answer, request };
			}
			return {
				requests: [
					...bucket.requests,
					{
						model: answered.model,
						questions: Object.keys(questions).length,
						usage: answered.usage,
						latencyMs: answered.latencyMs,
					},
				],
				answers,
			};
		});
	}

	/** `request`, whose state and questions `spelling` holds, from the cache or else from jev. */
	async #answer(
		request: JevRequest,
		context: AskContext,
		spelling: Spelling,
	): Promise<JevResponse> {
		const { stage, repetition, calls } = context;
		const { state, questions } = request;
		const count = Object.keys(questions).length;
		const project = this.#options.project;
		const chars = (asked: Questions) => requestText(spelling, asked).length;
		const cached = (
			model: string,
			answers: Answers,
			usage: Sent["usage"],
			latencyMs: number,
		): JevResponse => {
			if (project)
				this.projection.samples.push({
					stage,
					chars: chars(questions),
					inputTokens: usage.input_tokens,
				});
			calls.push({
				executor: "jev",
				stage,
				questions: count,
				inputTokens: usage.input_tokens,
				outputTokens: usage.output_tokens,
				latencyMs,
				cached: true,
			});
			return { model, answers, usage };
		};
		if (count === 0)
			return {
				model: this.model,
				answers: {},
				usage: { input_tokens: 0, output_tokens: 0 },
			};
		const bucketPath = this.#bucketPath(
			spelling.state,
			repetition,
			context.salt,
		);
		const { keys } = spelling;
		const bucket = (await readBucket(bucketPath)) ?? emptyBucket;
		const lookup = lookupIn(bucket, questions, keys);
		for (const model of lookup.models) this.resolvedModels.add(model);
		const missingCount = Object.keys(lookup.missing).length;
		if (missingCount === 0)
			return cached(
				lookup.models[0] ?? this.model,
				lookup.found,
				lookup.usage,
				lookup.latencyMs,
			);
		if (project) {
			const answers = await this.#projectMiss(
				context,
				spelling.state,
				keys,
				lookup.missing,
				chars(lookup.missing),
				project,
			);
			return {
				model: this.model,
				answers: { ...lookup.found, ...answers },
				usage: { input_tokens: 0, output_tokens: 0 },
			};
		}
		if (this.#options.offline || !this.#options.transport)
			throw Error(`jev cache miss in offline mode (${stage})`);
		const fresh = await this.#send(
			{ model: request.model, state, questions: lookup.missing },
			context,
			{ questions: missingCount, chars: chars(lookup.missing) },
		);
		await this.#store(bucketPath, lookup.missing, keys, fresh);
		return {
			model: fresh.model,
			answers: { ...lookup.found, ...fresh.answers },
			usage: fresh.usage,
		};
	}

	/**
	 * One fresh request, once `beforeSpend` and `reserve` let it go; its
	 * reservation is released after its last attempt.
	 */
	async #send(
		request: JevRequest,
		context: AskContext,
		size: { readonly questions: number; readonly chars: number },
	): Promise<Sent> {
		const transport = this.#options.transport;
		if (!transport)
			throw Error(`jev cache miss in offline mode (${context.stage})`);
		this.#options.beforeSpend?.();
		const release = this.#options.reserve?.({
			stage: context.stage,
			chars: size.chars,
		});
		try {
			return await this.#attempts(transport, request, context, size);
		} finally {
			release?.();
		}
	}

	/** A fresh request's attempts, retried on a retryable failure; checked before it is kept. */
	async #attempts(
		transport: JevAsk,
		request: JevRequest,
		context: AskContext,
		{
			questions,
			chars,
		}: { readonly questions: number; readonly chars: number },
	): Promise<Sent> {
		const { stage, signal, calls } = context;
		const counts = this.#transport;
		counts.requests++;
		const maxRetries = this.#options.maxRetries ?? 6;
		const delay = this.#options.retryDelay ?? defaultRetryDelay;
		const fail = (
			error: unknown,
			cause: string,
			retries: number,
			latencyMs: number,
			tokens = { input_tokens: 0, output_tokens: 0 },
		): never => {
			if (cause === "interrupted") counts.interrupted++;
			else {
				counts.failures++;
				tally(counts.failuresBy, cause);
			}
			calls.push({
				executor: "jev",
				stage,
				questions,
				inputTokens: tokens.input_tokens,
				outputTokens: tokens.output_tokens,
				latencyMs,
				cached: false,
				error: messageOf(error),
				...(retries > 0 ? { retries } : {}),
				chars,
			});
			throw error;
		};
		for (let attempt = 0; ; attempt++) {
			const started = performance.now();
			let response: JevResponse;
			try {
				response = await transport(request, { stage, signal });
			} catch (error) {
				const latencyMs = performance.now() - started;
				if (signal.aborted)
					return fail(error, "interrupted", attempt, latencyMs);
				if (!retryable(error) || attempt >= maxRetries)
					return fail(error, causeOf(error), attempt, latencyMs);
				if (attempt === 0) counts.retriedRequests++;
				counts.retries++;
				tally(counts.retriesBy, causeOf(error));
				await sleep(delay(attempt), signal);
				if (signal.aborted)
					return fail(error, "interrupted", attempt, latencyMs);
				continue;
			}
			const latencyMs = performance.now() - started;
			this.#options.onSpend?.(response.usage.input_tokens);
			this.resolvedModels.add(response.model);
			if (!isFloatingModel(this.model) && response.model !== this.model)
				return fail(
					Error(
						`Expected pinned ${this.model}, jev answered as ${response.model}`,
					),
					"invalid answer",
					attempt,
					latencyMs,
					response.usage,
				);
			// Only answers that fit their questions are kept in the cache.
			const answers = checkedAnswers(
				stage,
				response.model,
				Object.entries(request.questions),
				response,
			);
			if (answers instanceof Error)
				return fail(
					Error(answers.message),
					"invalid answer",
					attempt,
					latencyMs,
					response.usage,
				);
			calls.push({
				executor: "jev",
				stage,
				questions,
				inputTokens: response.usage.input_tokens,
				outputTokens: response.usage.output_tokens,
				latencyMs,
				cached: false,
				...(attempt > 0 ? { retries: attempt } : {}),
				chars,
			});
			return {
				model: response.model,
				answers,
				usage: {
					input_tokens: response.usage.input_tokens,
					output_tokens: response.usage.output_tokens,
				},
				latencyMs,
			};
		}
	}

	/**
	 * A projecting cache's miss: the same questions' answers and price at
	 * another repetition when cached, the projector's answers otherwise.
	 */
	async #projectMiss(
		context: AskContext,
		state: string,
		keys: ReadonlyMap<string, string>,
		missing: Questions,
		chars: number,
		project: Projector,
	): Promise<Answers> {
		const { stage, repetition, salt } = context;
		const projected = {
			stage,
			chars,
			questions: Object.keys(missing).length,
		};
		for (const other of projectedRepetitions) {
			if (other === repetition) continue;
			const bucket = await readBucket(
				this.#bucketPath(state, other, salt),
			);
			if (!bucket) continue;
			const lookup = lookupIn(bucket, missing, keys);
			if (Object.keys(lookup.missing).length > 0) continue;
			this.projection.requests.push({
				...projected,
				inputTokens: lookup.usage.input_tokens,
			});
			return lookup.found;
		}
		this.projection.requests.push(projected);
		return project({ stage, questions: missing });
	}
}
