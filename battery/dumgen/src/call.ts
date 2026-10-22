/**
 * Dumgen's call core: every model call of every operation goes through
 * `callModel`, which lifts the host's Promise transport into an Effect
 * (#551, #557, #558), and every operation runs under `runOperation`, which
 * gives its calls a `CallLog` and hands the host its trace (Dumgen ADR
 * 0009).
 *
 * - One `RequestBudget` serves jev and Luna together. A call holds one
 *   permit for its transport only; a call that had to wait for one
 *   records its wait.
 * - Anything the transport throws is a `ProviderFailure`; an answer the
 *   exchange's check refuses is an `InvalidModelOutput`. Nothing is retried
 *   (#445, #446).
 * - Interrupted while it waits for a permit, a call starts nothing and
 *   records nothing. Interrupted in flight, it aborts the transport's signal
 *   and waits until the transport settles, so every call that started has
 *   settled and been traced before its operation's trace is emitted.
 * - What an operation's trace keeps and where it goes are References with
 *   defaults: `TracePayloads` (off), `TraceSink` (none) and
 *   `CurrentSentence`, which places a call under the Sentence it serves.
 */
import { messageOf } from "common-utils";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Semaphore from "effect/Semaphore";
import { InvalidModelOutput, ProviderFailure } from "./errors.js";
import type {
	BudgetWait,
	CallFailure,
	CallTrace,
	OperationEvent,
	OperationTrace,
	ResolutionOutcome,
	SentenceOutcome,
} from "./operation-trace.js";

/** The requests one Dumgen keeps in flight, jev and Luna together. */
export class RequestBudget extends Context.Service<
	RequestBudget,
	{
		readonly permits: number;
		readonly semaphore: Semaphore.Semaphore;
		/** Calls holding or waiting for a permit, so a call knows it queued. */
		demand: number;
	}
>()("dumgen/RequestBudget") {
	/** A fresh budget of `permits`, a positive integer, each time it is built. */
	static readonly layer = (permits: number) =>
		Layer.sync(RequestBudget, () => {
			if (!Number.isInteger(permits) || permits < 1)
				throw Error("requestBudget is a positive integer");
			return {
				permits,
				semaphore: Semaphore.makeUnsafe(permits),
				demand: 0,
			};
		});
}

/**
 * What one running operation records: its calls by the order they were
 * sent, their waits, and the outcomes its value does not show.
 * `runOperation` provides a fresh one to each operation.
 */
export class CallLog extends Context.Service<
	CallLog,
	{
		/** Numbers a call as it is sent; a call that queued records its wait. */
		readonly sent: (waitMs: number | undefined) => number;
		/** A settled call's trace, in the slot its sending numbered. */
		readonly settled: (call: number, trace: CallTrace) => void;
		readonly sentence: (outcome: SentenceOutcome) => void;
		/** How a click came out; the last one recorded is traced. */
		readonly resolution: (outcome: ResolutionOutcome) => void;
		/** Something the operation decided that its value does not show. */
		readonly event: (event: OperationEvent) => void;
	}
>()("dumgen/CallLog") {}

/** The Sentence the calls serve, when the operation reads several. */
export const CurrentSentence = Context.Reference<number | undefined>(
	"dumgen/CurrentSentence",
	{ defaultValue: () => undefined },
);

/** Whether every call's request and answer stay in its trace; off by default. */
export const TracePayloads = Context.Reference<boolean>(
	"dumgen/TracePayloads",
	{ defaultValue: () => false },
);

/**
 * Receives each operation's trace once the operation exits; none by
 * default. An exception from it is the host's and becomes a Defect.
 */
export const TraceSink = Context.Reference<
	((trace: OperationTrace) => void) | undefined
>("dumgen/TraceSink", { defaultValue: () => undefined });

/**
 * The running operation's CallLog and CurrentSentence as a Context, for a
 * function that needs no services, such as a stage's `Ask`, to carry.
 */
export const callContext: Effect.Effect<
	Context.Context<CallLog>,
	never,
	CallLog
> = Effect.gen(function* () {
	const log = yield* CallLog;
	const sentence = yield* CurrentSentence;
	return Context.make(CallLog, log).pipe(
		Context.add(CurrentSentence, sentence),
	);
});

/** The tokens a call's answer reports; Luna's say what the prompt cache read and wrote. */
export type CallTokens = Pick<
	CallTrace,
	"inputTokens" | "outputTokens" | "cachedInputTokens" | "cacheWriteTokens"
>;

/** One model call as an operation sends and checks it. */
export type Exchange<Response, Output> = {
	readonly stage: string;
	readonly executor: CallTrace["executor"];
	/** What a payload keeps of the request. */
	readonly request: unknown;
	send(signal: AbortSignal): Promise<Response>;
	tokens(response: Response): CallTokens;
	/** The output, or why the response cannot be used. */
	check(response: Response): Output | InvalidModelOutput;
};

/** The tag and message of a call's or a Sentence's failure. */
export const callFailureOf = (
	failure: ProviderFailure | InvalidModelOutput,
): CallFailure => ({ tag: failure._tag, message: failure.message });

/** Why a settled call's Exit failed; a Defect leaves no tag. */
function failureOf(
	exit: Exit.Exit<unknown, ProviderFailure | InvalidModelOutput>,
	error: unknown,
): CallFailure | undefined {
	if (Exit.isSuccess(exit)) return undefined;
	const [failed] = exit.cause.reasons.filter(Cause.isFailReason);
	if (failed) return callFailureOf(failed.error);
	if (Cause.hasInterrupts(exit.cause))
		return {
			tag: "Interrupted",
			message:
				error === undefined
					? "The call was interrupted"
					: messageOf(error),
		};
	return undefined;
}

/** The milliseconds between two readings of `Clock.monotonicTimeNanos`. */
const millisBetween = (from: bigint, to: bigint) =>
	Number(to - from) / 1_000_000;

/**
 * Runs `body` as one operation under a `dumgen.operation` span, with a
 * fresh `CallLog`, and hands `TraceSink` its trace once it exits, however
 * it exits. Its times, and its calls', come from Effect's `Clock`.
 */
export function runOperation<A, E, R>(
	name: OperationTrace["operation"],
	body: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Exclude<R, CallLog>> {
	return Effect.gen(function* () {
		const sink = yield* TraceSink;
		const startedAt = yield* Clock.currentTimeMillis;
		const start = yield* Clock.monotonicTimeNanos;
		const calls: CallTrace[] = [];
		const waits: BudgetWait[] = [];
		const sentences: SentenceOutcome[] = [];
		const events: OperationEvent[] = [];
		let sent = 0;
		let resolution: ResolutionOutcome | undefined;
		const log = CallLog.of({
			sent: (waitMs) => {
				const call = sent++;
				if (waitMs !== undefined) waits.push({ call, waitMs });
				return call;
			},
			settled: (call, trace) => {
				calls[call] = trace;
			},
			sentence: (outcome) => {
				sentences.push(outcome);
			},
			resolution: (outcome) => {
				resolution = outcome;
			},
			event: (event) => {
				events.push(event);
			},
		});
		return yield* body.pipe(
			Effect.provideService(CallLog, log),
			Effect.withSpan("dumgen.operation", {
				attributes: { "dumgen.operation": name },
			}),
			Effect.onExit(() =>
				Effect.flatMap(Clock.monotonicTimeNanos, (end) =>
					Effect.sync(() =>
						sink?.({
							operation: name,
							startedAt,
							durationMs: millisBetween(start, end),
							// A slot stays empty only when a check threw (a Defect).
							calls: calls.filter((trace) => trace !== undefined),
							waits: [...waits],
							sentences: [...sentences],
							...(resolution ? { resolution } : {}),
							...(events.length > 0
								? { events: [...events] }
								: {}),
						}),
					),
				),
			),
		);
	});
}

/**
 * One call: a permit of `budget`, the transport, the check and its trace in
 * the operation's `CallLog`, placed under the `CurrentSentence`.
 */
export function callModel<Response, Output>(
	budget: RequestBudget["Service"],
	exchange: Exchange<Response, Output>,
): Effect.Effect<Output, ProviderFailure | InvalidModelOutput, CallLog> {
	const { stage, executor } = exchange;
	return Effect.gen(function* () {
		const log = yield* CallLog;
		const sentence = yield* CurrentSentence;
		const payloads = yield* TracePayloads;
		const queuedAt = yield* Clock.monotonicTimeNanos;
		const queued = budget.demand >= budget.permits;
		budget.demand++;
		const holding = Effect.uninterruptibleMask((restore) =>
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
			Effect.gen(function* () {
				const startedAt = yield* Clock.currentTimeMillis;
				const start = yield* Clock.monotonicTimeNanos;
				let index: number | undefined;
				let settled:
					| { readonly ok: true; readonly response: Response }
					| { readonly ok: false; readonly error: unknown }
					| undefined;
				const transport = Effect.callback<Response, ProviderFailure>(
					(resume, signal) => {
						const pending = Promise.resolve().then(async () => {
							// Interrupted before it was sent, say by a sibling's
							// failure as the permit came free: nothing starts.
							if (signal.aborted) return;
							index = log.sent(
								queued
									? millisBetween(queuedAt, start)
									: undefined,
							);
							try {
								const response = await exchange.send(signal);
								settled = { ok: true, response };
								resume(Effect.succeed(response));
							} catch (error) {
								settled = { ok: false, error };
								resume(
									Effect.fail(
										new ProviderFailure({
											stage,
											message: messageOf(error),
											cause: error,
										}),
									),
								);
							}
						});
						pending.catch((defect) => resume(Effect.die(defect)));
						return Effect.promise(() => pending);
					},
				);
				const exit = yield* Effect.exit(
					restore(
						Effect.flatMap(transport, (response) => {
							const output = exchange.check(response);
							return output instanceof InvalidModelOutput
								? Effect.fail(output)
								: Effect.succeed(output);
						}).pipe(
							Effect.withSpan("dumgen.call", {
								kind: "client",
								attributes: {
									"dumgen.stage": stage,
									"dumgen.executor": executor,
									...(sentence === undefined
										? {}
										: { "dumgen.sentence": sentence }),
								},
							}),
						),
					),
				);
				if (index === undefined) return yield* exit;
				const end = yield* Clock.monotonicTimeNanos;
				const failure = failureOf(
					exit,
					settled?.ok === false ? settled.error : undefined,
				);
				log.settled(index, {
					stage,
					...(sentence === undefined ? {} : { sentence }),
					executor,
					...(settled?.ok
						? exchange.tokens(settled.response)
						: { inputTokens: 0, outputTokens: 0 }),
					startedAt,
					durationMs: millisBetween(start, end),
					...(failure ? { failure } : {}),
					...(payloads
						? {
								payload: {
									request: exchange.request,
									...(settled?.ok
										? { response: settled.response }
										: {}),
								},
							}
						: {}),
				});
				return yield* exit;
			}),
		);
		return yield* budget.semaphore
			.withPermits(1)(holding)
			.pipe(
				Effect.ensuring(
					Effect.sync(() => {
						budget.demand--;
					}),
				),
			);
	});
}
