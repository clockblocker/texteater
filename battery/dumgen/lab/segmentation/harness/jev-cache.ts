/**
 * The cached, retrying jev that segmentation evaluations and lab runs ask
 * through. It is a `JevAsk`, so `createDumgen` takes it as its transport
 * and an evaluation runs the production path; the lab's arms reach it
 * through `port`, the stages' `ask` port.
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
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EntryType, Question, Questions } from "@typesafe-ai/sdk";
import { canonicalJson, messageOf } from "common-utils";
import * as Effect from "effect/Effect";
import { z } from "zod";
import { checkedAnswers } from "../../../src/jev-call.js";
import type { Answer, Answers, Ask } from "../../../src/segment/ask.js";
import {
	isFloatingModel,
	type JevAsk,
	type JevRequest,
	type JevResponse,
	pinnedJevModel,
	questionsPerRequest,
} from "../../../src/segment/jev.js";
import { answerSchema, storedAs } from "../../stored-json.js";

/** One request as the ledger and the run record see it. */
export type CallRecord = {
	readonly executor: "jev" | "luna";
	readonly stage: string;
	readonly questions: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly latencyMs: number;
	readonly cached: boolean;
	readonly error?: string;
	/** Attempts past the first a fresh request took; absent when none. */
	readonly retries?: number;
};

/** A call as a run record keeps it. */
export const callRecordSchema = z.object({
	executor: z.enum(["jev", "luna"]),
	stage: z.string(),
	questions: z.number(),
	inputTokens: z.number(),
	outputTokens: z.number(),
	latencyMs: z.number(),
	cached: z.boolean(),
	error: z.string().optional(),
	retries: z.number().optional(),
}) satisfies z.ZodType<CallRecord>;

/**
 * What a run's fresh requests met on the way to jev, recorded beside its
 * accuracy: each retry and each request that brought no usable answer.
 * Causes are an HTTP status, `no status` (a timeout, a dropped connection,
 * an unreadable body) or `invalid answer` (another model, a missing answer).
 */
export type TransportRecord = {
	/** Fresh requests sent, each counted once however many attempts it took. */
	readonly requests: number;
	/** Attempts past each request's first. */
	readonly retries: number;
	/** Requests that needed at least one retry. */
	readonly retriedRequests: number;
	/** Requests that brought no usable answer after their last attempt. */
	readonly failures: number;
	/**
	 * Requests abandoned because their operation was interrupted, a
	 * sibling request's failure included; not failures of their own.
	 */
	readonly interrupted: number;
	readonly retriesBy: Readonly<Record<string, number>>;
	readonly failuresBy: Readonly<Record<string, number>>;
};

/** A transport record as the cache counts it up. */
type TransportTally = {
	requests: number;
	retries: number;
	retriedRequests: number;
	failures: number;
	interrupted: number;
	retriesBy: Record<string, number>;
	failuresBy: Record<string, number>;
};

/** A transport record as a run, its manifest or the ledger keeps it. */
export const transportRecordSchema = z.object({
	requests: z.number(),
	retries: z.number(),
	retriedRequests: z.number(),
	failures: z.number(),
	interrupted: z.number(),
	retriesBy: z.record(z.string(), z.number()),
	failuresBy: z.record(z.string(), z.number()),
}) satisfies z.ZodType<TransportRecord>;

/** One line for a run's output: requests, retries and failures by cause. */
export function transportText(record: TransportRecord): string {
	const causes = (counts: Readonly<Record<string, number>>) => {
		const listed = Object.entries(counts)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([cause, count]) => `${cause} ×${count}`);
		return listed.length > 0 ? ` (${listed.join(", ")})` : "";
	};
	return `jev transport: ${record.requests} fresh requests, ${record.retries} retries over ${record.retriedRequests} of them${causes(record.retriesBy)}, ${record.failures} failed${causes(record.failuresBy)}, ${record.interrupted} interrupted`;
}

/**
 * Stand-in answers for questions the cache misses, so a projection pass can
 * go on to the requests that depend on them.
 */
export type Projector = (request: {
	readonly stage: string;
	readonly questions: Questions;
}) => Answers;

/** One request a projection pass found in the cache, for pricing the misses. */
type ProjectionSample = {
	readonly stage: string;
	/** Characters of the request (state and questions) as JSON. */
	readonly chars: number;
	readonly inputTokens: number;
};

/**
 * One request a projection pass would send: the questions the cache
 * misses. `inputTokens` is known when the same questions are cached at
 * another repetition; otherwise the request is priced by its size.
 */
type ProjectedRequest = {
	readonly stage: string;
	readonly chars: number;
	readonly questions: number;
	readonly inputTokens?: number;
};

export type Projection = {
	readonly samples: ProjectionSample[];
	readonly requests: ProjectedRequest[];
};

export function hashOf(value: unknown): string {
	return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/**
 * The bucket at `path`; undefined when it is missing or not JSON. A bucket
 * of another shape throws.
 */
async function readBucket(path: string): Promise<Bucket | undefined> {
	let value: unknown;
	try {
		value = JSON.parse(await readFile(path, "utf8"));
	} catch {
		return undefined;
	}
	return storedAs(bucketSchema, value, path);
}

/** Writes beside the target and renames, so no reader sees half a file. */
async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${randomUUID()}.tmp`;
	await writeFile(temporary, JSON.stringify(value));
	await rename(temporary, path);
}

/** A fresh request's answers as `#send` returns them, before they are kept. */
type Sent = {
	readonly model: string;
	readonly answers: Answers;
	readonly usage: {
		readonly input_tokens: number;
		readonly output_tokens: number;
	};
	readonly latencyMs: number;
};

/**
 * The cached answers of one model, state and repetition: each answer with
 * the request that brought it, and each request's size, tokens and latency.
 */
type Bucket = {
	readonly requests: readonly {
		readonly model: string;
		readonly questions: number;
		readonly usage: Sent["usage"];
		readonly latencyMs: number;
	}[];
	readonly answers: Readonly<
		Record<string, { readonly answer: Answer; readonly request: number }>
	>;
};

const bucketSchema = z.object({
	requests: z.array(
		z.object({
			model: z.string(),
			questions: z.number(),
			usage: z.object({
				input_tokens: z.number(),
				output_tokens: z.number(),
			}),
			latencyMs: z.number(),
		}),
	),
	answers: z.record(
		z.string(),
		z.object({ answer: answerSchema, request: z.number() }),
	),
}) satisfies z.ZodType<Bucket>;

const emptyBucket: Bucket = { requests: [], answers: {} };

/** A question's key in its bucket: its id and its content. */
const questionKey = (id: string, question: Question) =>
	hashOf({ id, question });

/** What the cache found for a request's questions. */
type Lookup = {
	readonly found: Record<string, Answer>;
	readonly missing: Questions;
	/** The tokens and latency the found answers cost when first asked. */
	readonly usage: { input_tokens: number; output_tokens: number };
	readonly latencyMs: number;
	readonly models: readonly string[];
};

export type JevCacheOptions = {
	readonly cacheDirectory: string;
	/** A pinned jev version; `pinnedJevModel` by default. */
	readonly model?: string;
	/** Allow an alias such as `jev-latest`, whose answers may come from any version. */
	readonly allowFloatingModel?: boolean;
	/** Asked on a miss: `createTypeSafeAsk` live, a fake in tests. */
	readonly transport?: JevAsk;
	/** Answer only from the cache; a miss throws. */
	readonly offline?: boolean;
	/** Retries of a fresh request after a retryable failure; six by default. */
	readonly maxRetries?: number;
	/** Milliseconds before retry `attempt` (from 0); exponential with jitter by default. */
	readonly retryDelay?: (attempt: number) => number;
	/** Questions per request the lab's `port` sends; production's by default. */
	readonly questionsPerRequest?: number;
	/** Called before every fresh request; throw to stop spending. */
	readonly beforeSpend?: () => void;
	/** Receives the input tokens of every fresh request. */
	readonly onSpend?: (inputTokens: number) => void;
	/** Project instead of asking: a miss is answered as `Projector` says and kept in `projection`. */
	readonly project?: Projector;
	/**
	 * Receives every request as the stages put it, before the cache looks
	 * it up: what a request diff compares (`request-diff.ts`).
	 */
	readonly onRequest?: (request: AskedRequest) => void;
};

/** One request at one repetition: as production chunked it through `ask`, whole through `port`. */
type AskedRequest = {
	readonly stage: string;
	readonly repetition: number;
	readonly state: EntryType;
	readonly questions: Questions;
};

/** Where a request goes in the cache, beside its body. */
type AskContext = {
	readonly stage: string;
	readonly signal: AbortSignal;
	readonly repetition: number;
	readonly calls: CallRecord[];
	/** Keeps a limit test's answers apart per chunk size (`limits.ts`). */
	readonly salt?: string;
};

const defaultRetryDelay = (attempt: number) =>
	1000 * 2 ** attempt + Math.random() * 500;

/** An HTTP status the error carries, as the TypeSafe ask and SDK attach it. */
function statusOf(error: unknown): number | undefined {
	if (error && typeof error === "object" && "status" in error) {
		const { status } = error;
		return typeof status === "number" ? status : undefined;
	}
	return undefined;
}

const causeOf = (error: unknown) => {
	const status = statusOf(error);
	return status === undefined ? "no status" : String(status);
};

const retryable = (error: unknown) => {
	const status = statusOf(error);
	return (
		status === undefined ||
		status === 429 ||
		status === 529 ||
		status >= 500
	);
};

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		if (signal.aborted) return resolve();
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener("abort", done);
	});
}

const tally = (counts: Record<string, number>, key: string) => {
	counts[key] = (counts[key] ?? 0) + 1;
};

const never = new AbortController().signal;

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
	) {
		this.#options.onRequest?.({ stage, repetition, state, questions });
		const hashes = this.#requests.get(stage) ?? new Set();
		this.#requests.set(stage, hashes);
		hashes.add(hashOf({ state, questions }));
	}

	/**
	 * jev at `repetition` as a `JevAsk`: what `createDumgen` takes. Each
	 * request it answers appends one record to `calls`.
	 */
	ask(repetition: number, calls: CallRecord[] = []): JevAsk {
		return (request, { stage, signal }) => {
			this.#recordPrompt(
				stage,
				repetition,
				request.state,
				request.questions,
			);
			return this.#answer(request, {
				stage,
				signal,
				repetition,
				calls,
			});
		};
	}

	/**
	 * The stages' `ask` port at `repetition`, for the lab's arms: each
	 * request in chunks of `questionsPerRequest`, as production sends it,
	 * every chunk checked as production checks it. A failed request rejects
	 * with its error. `salt` keeps a limit test's answers apart.
	 */
	port(
		repetition: number,
		calls: CallRecord[],
		options: {
			readonly questionsPerRequest?: number;
			readonly salt?: string;
		} = {},
	): Ask {
		const size = options.questionsPerRequest ?? this.questionsPerRequest;
		return ({ stage, state, questions }) =>
			Effect.promise(async () => {
				const entries = Object.entries(questions);
				if (entries.length === 0) return {};
				this.#recordPrompt(stage, repetition, state, questions);
				const chunks: (typeof entries)[] = [];
				for (let at = 0; at < entries.length; at += size)
					chunks.push(entries.slice(at, at + size));
				const answered = await Promise.all(
					chunks.map(async (chunk) => {
						const response = await this.#answer(
							{
								model: this.model,
								state,
								questions: Object.fromEntries(chunk),
							},
							{
								stage,
								signal: never,
								repetition,
								calls,
								...(options.salt === undefined
									? {}
									: { salt: options.salt }),
							},
						);
						const checked = checkedAnswers(
							stage,
							isFloatingModel(this.model)
								? response.model
								: this.model,
							chunk,
							response,
						);
						if (checked instanceof Error)
							throw Error(checked.message);
						return checked;
					}),
				);
				return Object.fromEntries(
					answered.flatMap((chunk) => Object.entries(chunk)),
				);
			});
	}

	#bucketPath(
		state: EntryType,
		repetition: number,
		salt: string | undefined,
	): string {
		const key = hashOf({
			model: this.model,
			state,
			repetition,
			...(salt === undefined ? {} : { salt }),
		});
		return join(
			this.#options.cacheDirectory,
			"jev-questions",
			key.slice(0, 2),
			`${key}.json`,
		);
	}

	/** The bucket's answers to `questions`, and the questions it lacks. */
	#lookup(bucket: Bucket, questions: Questions): Lookup {
		const found: Record<string, Answer> = {};
		const missing: Record<string, Question> = {};
		const byRequest = new Map<number, number>();
		for (const [id, question] of Object.entries(questions)) {
			const cached = bucket.answers[questionKey(id, question)];
			if (!cached) {
				missing[id] = question;
				continue;
			}
			found[id] = cached.answer;
			byRequest.set(
				cached.request,
				(byRequest.get(cached.request) ?? 0) + 1,
			);
		}
		const usage = { input_tokens: 0, output_tokens: 0 };
		let latencyMs = 0;
		const models = new Set<string>();
		for (const [index, count] of byRequest) {
			const request = bucket.requests[index];
			if (!request) continue;
			// A request's whole question set costs what it cost; part of it
			// costs its share.
			const share =
				count >= request.questions ? 1 : count / request.questions;
			usage.input_tokens += Math.round(
				request.usage.input_tokens * share,
			);
			usage.output_tokens += Math.round(
				request.usage.output_tokens * share,
			);
			latencyMs = Math.max(latencyMs, request.latencyMs);
			models.add(request.model);
		}
		return { found, missing, usage, latencyMs, models: [...models] };
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
		answered: {
			readonly model: string;
			readonly answers: Answers;
			readonly usage: Sent["usage"];
			readonly latencyMs: number;
		},
	) {
		return this.#update(path, (bucket) => {
			const fresh = Object.entries(questions).filter(
				([id, question]) =>
					!(questionKey(id, question) in bucket.answers) &&
					answered.answers[id] !== undefined,
			);
			if (fresh.length === 0) return undefined;
			const request = bucket.requests.length;
			const answers = { ...bucket.answers };
			for (const [id, question] of fresh) {
				const answer = answered.answers[id];
				if (answer)
					answers[questionKey(id, question)] = { answer, request };
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

	async #answer(
		request: JevRequest,
		context: AskContext,
	): Promise<JevResponse> {
		const { stage, repetition, calls } = context;
		const { state, questions } = request;
		const count = Object.keys(questions).length;
		const project = this.#options.project;
		const chars = (asked: Questions) =>
			canonicalJson({ state, questions: asked }).length;
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
		const bucketPath = this.#bucketPath(state, repetition, context.salt);
		const bucket = (await readBucket(bucketPath)) ?? emptyBucket;
		const lookup = this.#lookup(bucket, questions);
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
				state,
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
			missingCount,
		);
		await this.#store(bucketPath, lookup.missing, fresh);
		return {
			model: fresh.model,
			answers: { ...lookup.found, ...fresh.answers },
			usage: fresh.usage,
		};
	}

	/** One fresh request, retried on a retryable failure; checked before it is kept. */
	async #send(
		request: JevRequest,
		context: AskContext,
		questions: number,
	): Promise<Sent> {
		const { stage, signal, calls } = context;
		const transport = this.#options.transport;
		if (!transport)
			throw Error(`jev cache miss in offline mode (${stage})`);
		this.#options.beforeSpend?.();
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
		state: EntryType,
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
			const lookup = this.#lookup(bucket, missing);
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
