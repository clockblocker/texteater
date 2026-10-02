import * as Cause from "effect/Cause";
import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberId from "effect/FiberId";
import * as Option from "effect/Option";
import type {
	CallTrace,
	DumgenOptions,
	OperationTrace,
	Task,
} from "../types.js";
import { DumgenFailure } from "./failure.js";
import { effectiveConfiguration } from "./model-configuration.js";

/**
 * The requests one Dumgen instance may have in flight. A request holds one
 * permit for its transport only; `demand` counts holders and waiters, so a
 * request knows whether it had to queue.
 */
export type RequestBudget = {
	readonly permits: number;
	readonly semaphore: Effect.Semaphore;
	demand: number;
};
export function requestBudget(options: DumgenOptions): RequestBudget {
	const permits = options.requestBudget ?? 16;
	return {
		permits,
		semaphore: Effect.unsafeMakeSemaphore(permits),
		demand: 0,
	};
}

/**
 * One operation's evidence: every call it starts records its CallTrace here,
 * and its steps record free-form events. Calls name their dependencies by the
 * IDs earlier calls returned.
 */
export type OperationScope = {
	readonly id: string;
	readonly calls: CallTrace[];
	readonly events: { kind: string; data: unknown }[];
	readonly budget: RequestBudget;
	sequence: number;
};
/** A finished call's output and the ID its dependents name. */
export type Called<T> = { readonly id: string; readonly output: T };

export function recordEvent(
	scope: OperationScope,
	kind: string,
	data: unknown,
) {
	scope.events.push({ kind, data });
}
export function judgmentConfiguration(options: DumgenOptions) {
	return {
		model: options.judgmentConfiguration?.model ?? "jev-latest",
		settings: {
			timeoutMs: options.judgmentConfiguration?.timeoutMs ?? 10_000,
			maxRetries: 0,
		},
	};
}
export async function fingerprint(value: unknown): Promise<string> {
	function canonical(input: unknown): unknown {
		if (Array.isArray(input)) return input.map(canonical);
		if (input && typeof input === "object")
			return Object.fromEntries(
				Object.entries(input)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, item]) => [key, canonical(item)]),
			);
		return input;
	}
	const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
	return Array.from(
		new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
		(byte) => byte.toString(16).padStart(2, "0"),
	).join("");
}

/** Emits a settled call's span from its CallTrace. */
export type CallSpan = (trace: CallTrace) => void;

/**
 * A `dumgen.call` span under the calling fiber's span. It is emitted from the
 * recorded CallTrace, so both share the call ID and timing; like every Dumgen
 * span it carries no payloads.
 */
const callSpan: Effect.Effect<CallSpan> = Effect.map(
	Effect.all([Effect.tracer, Effect.option(Effect.currentParentSpan)]),
	([tracer, parent]) =>
		(trace) => {
			if (trace.startedAt === undefined) return;
			const startTime = BigInt(trace.startedAt) * 1_000_000n;
			const span = tracer.span(
				"dumgen.call",
				parent,
				Context.empty(),
				[],
				startTime,
				"client",
			);
			for (const [key, value] of Object.entries({
				"dumgen.call.id": trace.id,
				"dumgen.operation.id": trace.operationId,
				"dumgen.stage": trace.request.stage,
				"dumgen.route": trace.request.route,
				"dumgen.executor": trace.executor,
				"dumgen.transport": trace.transport,
				"dumgen.validation": trace.validation,
			}))
				span.attribute(key, value);
			span.end(
				startTime + BigInt(Math.round(trace.durationMs * 1_000_000)),
				trace.transport === "Interrupted"
					? Exit.interrupt(FiberId.none)
					: trace.failure === undefined
						? Exit.void
						: Exit.fail(trace.failure),
			);
		},
);

/** One model or judgment request, as its call sends and records it. */
export type Exchange<Request extends CallTrace["request"], Response, T> = {
	readonly executor: CallTrace["executor"];
	readonly dependsOn: readonly string[];
	/** What the CallTrace's fingerprint hashes. */
	readonly fingerprinted: unknown;
	/** The request as sent, carrying the transport's signal. */
	request(signal: AbortSignal): Request;
	send(request: Request): Promise<Response>;
	/** What the CallTrace keeps of a response. */
	evidence(response: Response): Pick<CallTrace, "output" | "metadata">;
	/** Output checks raise DumgenFailures; any other throw is a defect. */
	validate(response: Response): T;
};

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

/**
 * One model or judgment call as its own Effect. It holds a budget permit for
 * its transport only, and its timing starts once it holds one (#446); a
 * request that waited records RequestQueued. Interruption while queued
 * starts nothing and records nothing. Interruption in flight aborts the
 * transport's signal and waits until it settles, so every started call
 * records its CallTrace, and the `dumgen.call` span built from it, before
 * its operation's trace is emitted. Anything the executor throws is a
 * ProviderFailure.
 */
export function call<Request extends CallTrace["request"], Response, T>(
	options: DumgenOptions,
	scope: OperationScope,
	exchange: Exchange<Request, Response, T>,
): Effect.Effect<Called<T>, DumgenFailure> {
	const { budget } = scope;
	return Effect.uninterruptibleMask((restore) =>
		Effect.gen(function* () {
			const span = yield* callSpan;
			// Hashing runs alongside the queue: taking the permit is the call's
			// first wait, so requests queue in the order they were issued.
			const hashing = fingerprint(exchange.fingerprinted);
			hashing.catch(() => {});
			const queued = budget.demand >= budget.permits;
			const queuedAt = performance.now();
			budget.demand++;
			yield* restore(budget.semaphore.take(1)).pipe(
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						budget.demand--;
					}),
				),
			);
			let request: Request | undefined;
			let settled:
				| { readonly ok: true; readonly response: Response }
				| { readonly ok: false; readonly error: unknown }
				| undefined;
			const id = `${scope.id}:${++scope.sequence}`;
			const startedAt = Date.now();
			const start = performance.now();
			const sent = yield* Effect.exit(
				restore(
					Effect.async<void>((resume, signal) => {
						const pending = Promise.resolve()
							.then(async () => {
								// Interrupted before sending, for example by a sibling's
								// failure right after a permit came free: nothing starts.
								if (signal.aborted) return;
								if (queued)
									recordEvent(scope, "RequestQueued", {
										callId: id,
										waitMs: start - queuedAt,
									});
								const sending = exchange.request(signal);
								request = sending;
								try {
									settled = {
										ok: true,
										response: await exchange.send(sending),
									};
								} catch (error) {
									settled = { ok: false, error };
								}
							})
							.then(
								() => resume(Effect.void),
								(defect) => resume(Effect.die(defect)),
							);
						return Effect.promise(() => pending);
					}),
				),
			);
			// Nothing waits between the release and this call's result, so a
			// failure reaches its siblings before a queued one can start.
			const hashed = yield* Effect.exit(Effect.promise(() => hashing));
			budget.demand--;
			yield* budget.semaphore.release(1);
			if (!request)
				return yield* Exit.isFailure(sent)
					? Effect.failCause(sent.cause)
					: Effect.interrupt;
			if (Exit.isFailure(hashed))
				return yield* Effect.failCause(hashed.cause);
			const hash = hashed.value;
			let transport: CallTrace["transport"];
			let validation: CallTrace["validation"] = "NotRun";
			let failure: string | undefined;
			let result: Exit.Exit<Called<T>, DumgenFailure>;
			if (Exit.isFailure(sent)) {
				transport = "Interrupted";
				failure =
					settled?.ok === false
						? messageOf(settled.error)
						: "The request was interrupted";
				result = Exit.failCause(sent.cause);
			} else if (settled?.ok) {
				transport = "Success";
				validation = "Invalid";
				try {
					const output = exchange.validate(settled.response);
					validation = "Valid";
					result = Exit.succeed({ id, output });
				} catch (error) {
					failure = messageOf(error);
					result =
						error instanceof DumgenFailure
							? Exit.fail(error)
							: Exit.die(error);
				}
			} else {
				transport = "Failure";
				failure = messageOf(settled?.error);
				result = Exit.fail(
					new DumgenFailure(
						"ProviderFailure",
						request.stage,
						failure,
						request.route,
					),
				);
			}
			const trace: CallTrace = {
				id,
				operationId: scope.id,
				executor: exchange.executor,
				request,
				dependsOn: exchange.dependsOn,
				fingerprint: hash,
				transport,
				validation,
				...(settled?.ok ? exchange.evidence(settled.response) : {}),
				...(failure ? { failure } : {}),
				startedAt,
				durationMs: performance.now() - start,
			};
			scope.calls.push(trace);
			options.onModelExchange?.(trace);
			span(trace);
			return yield* result;
		}),
	);
}

/**
 * Effect.gen turns a thrown DumgenFailure into a defect. Only a DumgenFailure
 * is an expected failure, so this restores it; any other defect stays one.
 */
export function expected<T, R>(
	effect: Effect.Effect<T, DumgenFailure, R>,
): Effect.Effect<T, DumgenFailure, R> {
	return Effect.catchAllCause(effect, (cause) => {
		const defects = Chunk.toReadonlyArray(Cause.defects(cause));
		const [first] = defects;
		return first instanceof DumgenFailure &&
			defects.every((defect) => defect instanceof DumgenFailure)
			? Effect.fail(first as DumgenFailure)
			: Effect.failCause(cause);
	});
}

/** A failure's DumgenFailure tag, Defect, or Interrupted. */
export function failureOf(
	cause: Cause.Cause<DumgenFailure>,
): NonNullable<OperationTrace["failure"]> {
	const failure = Cause.failureOption(cause);
	if (Option.isSome(failure))
		return { tag: failure.value._tag, message: failure.value.message };
	const defects = Chunk.toReadonlyArray(Cause.defects(cause));
	const [defect] = defects;
	if (
		defect instanceof DumgenFailure &&
		defects.every((item) => item instanceof DumgenFailure)
	)
		return { tag: defect._tag, message: defect.message };
	if (defect !== undefined)
		return {
			tag: "Defect",
			message: defect instanceof Error ? defect.message : String(defect),
		};
	return { tag: "Interrupted", message: "The operation was interrupted" };
}

/**
 * Each run of the returned Effect gets its own scope and a `dumgen.operation`
 * span carrying the operation ID. Its OperationTrace is emitted inside that
 * span, once the run has ended and every call it started has settled.
 */
export function operation(
	options: DumgenOptions,
	budget: RequestBudget = requestBudget(options),
) {
	return <T>(
		stage: string,
		input: unknown,
		run: (scope: OperationScope) => Effect.Effect<T, DumgenFailure>,
	): Task<T> =>
		Effect.suspend(() => {
			const scope: OperationScope = {
				id: crypto.randomUUID(),
				calls: [],
				events: [],
				budget,
				sequence: 0,
			};
			const startedAt = Date.now();
			const start = performance.now();
			return expected(Effect.suspend(() => run(scope))).pipe(
				Effect.onExit((exit) =>
					Effect.sync(() => {
						const output = Exit.isSuccess(exit)
							? exit.value
							: undefined;
						const failure = Exit.isFailure(exit)
							? failureOf(exit.cause)
							: undefined;
						options.onOperation?.({
							version: 2,
							id: scope.id,
							operation: stage,
							input,
							generationConfiguration:
								effectiveConfiguration(options),
							judgmentConfiguration:
								judgmentConfiguration(options),
							calls: scope.calls,
							events: scope.events,
							...(output === undefined ? {} : { output }),
							...(failure ? { failure } : {}),
							outcome: failure
								? failure.tag === "Interrupted"
									? "Interrupted"
									: "Failure"
								: output &&
										typeof output === "object" &&
										"failures" in output &&
										Array.isArray(output.failures) &&
										output.failures.length
									? "Partial"
									: "Success",
							startedAt,
							durationMs: performance.now() - start,
						});
					}),
				),
				Effect.withSpan("dumgen.operation", {
					attributes: {
						"dumgen.operation.id": scope.id,
						"dumgen.operation": stage,
					},
				}),
			);
		});
}
