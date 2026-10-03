/**
 * Dumgen's call adapter: every model call of every operation goes through
 * `OperationScope.call`, which lifts the host's Promise transport into an
 * Effect (#551, #557, #558).
 *
 * - One request budget per Dumgen instance, shared by jev and Luna. A call
 *   holds one permit for its transport only; a call that had to wait for
 *   one records its wait.
 * - Anything the transport throws is a `ProviderFailure`; an answer the
 *   exchange's check refuses is an `InvalidModelOutput`. Nothing is retried
 *   (#445, #446).
 * - Interrupted while it waits for a permit, a call starts nothing and
 *   records nothing. Interrupted in flight, it aborts the transport's signal
 *   and waits until the transport settles, so every call that started has
 *   settled and been traced before its operation's trace is emitted.
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Semaphore from "effect/Semaphore";
import { InvalidModelOutput, ProviderFailure } from "./errors.js";
import type {
	BudgetWait,
	CallFailure,
	CallTrace,
	OperationTrace,
	ResolutionOutcome,
	SentenceOutcome,
} from "./operation-trace.js";

/** The requests one Dumgen instance keeps in flight, jev and Luna together. */
export type RequestBudget = {
	readonly permits: number;
	readonly semaphore: Semaphore.Semaphore;
	/** Calls holding or waiting for a permit, so a call knows it queued. */
	demand: number;
};

export function requestBudget(permits: number): RequestBudget {
	if (!Number.isInteger(permits) || permits < 1)
		throw Error("requestBudget is a positive integer");
	return { permits, semaphore: Semaphore.makeUnsafe(permits), demand: 0 };
}

/** The tokens a call's answer reports; Luna's say what the prompt cache read and wrote. */
export type CallTokens = Pick<
	CallTrace,
	"inputTokens" | "outputTokens" | "cachedInputTokens" | "cacheWriteTokens"
>;

/** One model call as an operation sends and checks it. */
export type Exchange<Response, Output> = {
	readonly stage: string;
	readonly sentence?: number;
	readonly executor: CallTrace["executor"];
	/** What a payload keeps of the request. */
	readonly request: unknown;
	send(signal: AbortSignal): Promise<Response>;
	tokens(response: Response): CallTokens;
	/** The output, or why the response cannot be used. */
	check(response: Response): Output | InvalidModelOutput;
};

/** One running operation: the calls it sends and the outcomes it records. */
export type OperationScope = {
	readonly call: <Response, Output>(
		exchange: Exchange<Response, Output>,
	) => Effect.Effect<Output, ProviderFailure | InvalidModelOutput>;
	readonly sentence: (outcome: SentenceOutcome) => void;
	/** How a click came out; the last one recorded is traced. */
	readonly resolution: (outcome: ResolutionOutcome) => void;
};

export type OperationOptions = {
	readonly budget: RequestBudget;
	readonly payloads: boolean;
	readonly onOperation?: (trace: OperationTrace) => void;
};

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

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

/**
 * Runs `body` as one operation under a `dumgen.operation` span and hands
 * `onOperation` its trace once it exits, however it exits. An exception
 * from `onOperation` is the host's and becomes a Defect.
 */
export function runOperation<A, E>(
	name: OperationTrace["operation"],
	options: OperationOptions,
	body: (scope: OperationScope) => Effect.Effect<A, E>,
): Effect.Effect<A, E> {
	return Effect.suspend(() => {
		const startedAt = Date.now();
		const start = performance.now();
		const record: CallRecord = { calls: [], waits: [], sent: 0 };
		const sentences: SentenceOutcome[] = [];
		let resolution: ResolutionOutcome | undefined;
		const scope: OperationScope = {
			call: (exchange) => call(options, record, exchange),
			sentence: (outcome) => {
				sentences.push(outcome);
			},
			resolution: (outcome) => {
				resolution = outcome;
			},
		};
		return body(scope).pipe(
			Effect.withSpan("dumgen.operation", {
				attributes: { "dumgen.operation": name },
			}),
			Effect.onExit(() =>
				Effect.sync(() =>
					options.onOperation?.({
						operation: name,
						startedAt,
						durationMs: performance.now() - start,
						// A slot stays empty only when a check threw (a Defect).
						calls: record.calls.filter(
							(trace) => trace !== undefined,
						),
						waits: [...record.waits],
						sentences: [...sentences],
						...(resolution ? { resolution } : {}),
					}),
				),
			),
		);
	});
}

/** An operation's calls by the order they were sent, and their waits. */
type CallRecord = {
	readonly calls: CallTrace[];
	readonly waits: BudgetWait[];
	sent: number;
};

/** One call: a permit, the transport, the check and its trace. */
function call<Response, Output>(
	options: OperationOptions,
	record: CallRecord,
	exchange: Exchange<Response, Output>,
): Effect.Effect<Output, ProviderFailure | InvalidModelOutput> {
	const { budget } = options;
	const { stage, sentence, executor } = exchange;
	return Effect.suspend(() => {
		const queued = budget.demand >= budget.permits;
		const queuedAt = performance.now();
		budget.demand++;
		const holding = Effect.uninterruptibleMask((restore) =>
			Effect.gen(function* () {
				const startedAt = Date.now();
				const start = performance.now();
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
							index = record.sent++;
							if (queued)
								record.waits.push({
									call: index,
									waitMs: start - queuedAt,
								});
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
				const failure = failureOf(
					exit,
					settled?.ok === false ? settled.error : undefined,
				);
				record.calls[index] = {
					stage,
					...(sentence === undefined ? {} : { sentence }),
					executor,
					...(settled?.ok
						? exchange.tokens(settled.response)
						: { inputTokens: 0, outputTokens: 0 }),
					startedAt,
					durationMs: performance.now() - start,
					...(failure ? { failure } : {}),
					...(options.payloads
						? {
								payload: {
									request: exchange.request,
									...(settled?.ok
										? { response: settled.response }
										: {}),
								},
							}
						: {}),
				};
				return yield* exit;
			}),
		);
		return budget.semaphore
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
