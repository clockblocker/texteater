/**
 * What the cached jev (`jev-cache.ts`) takes and reports: its options, the
 * call and transport records a run keeps, what a projection pass saw, and
 * how a fresh request's failures are told apart, retried and counted.
 */
import type { EntryType, Questions } from "@typesafe-ai/sdk";
import { z } from "zod";
import type { Answers } from "../../../src/segment/ask.js";
import type { JevAsk } from "../../../src/segment/jev.js";

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
	/**
	 * A fresh jev request's characters as a projection measures them (the
	 * state and the questions sent): what the ledger's calibration reads.
	 */
	readonly chars?: number;
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
	chars: z.number().optional(),
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
export type TransportTally = {
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
	/**
	 * Called before every fresh request, after `beforeSpend`, with its stage
	 * and size; throw to refuse it. The release it returns is called once
	 * the request's last attempt is over, after `onSpend` counted its tokens.
	 */
	readonly reserve?: (request: {
		readonly stage: string;
		readonly chars: number;
	}) => () => void;
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
export type AskContext = {
	readonly stage: string;
	readonly signal: AbortSignal;
	readonly repetition: number;
	readonly calls: CallRecord[];
	/** Keeps a limit test's answers apart per chunk size (`limits.ts`). */
	readonly salt?: string;
};

export const defaultRetryDelay = (attempt: number) =>
	1000 * 2 ** attempt + Math.random() * 500;

/** An HTTP status the error carries, as the TypeSafe ask and SDK attach it. */
function statusOf(error: unknown): number | undefined {
	if (error && typeof error === "object" && "status" in error) {
		const { status } = error;
		return typeof status === "number" ? status : undefined;
	}
	return undefined;
}

export const causeOf = (error: unknown) => {
	const status = statusOf(error);
	return status === undefined ? "no status" : String(status);
};

export const retryable = (error: unknown) => {
	const status = statusOf(error);
	return (
		status === undefined ||
		status === 429 ||
		status === 529 ||
		status >= 500
	);
};

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
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

export const tally = (counts: Record<string, number>, key: string) => {
	counts[key] = (counts[key] ?? 0) + 1;
};
