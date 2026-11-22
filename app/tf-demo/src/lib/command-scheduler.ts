import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Semaphore from "effect/Semaphore";

/**
 * Concurrency policy for a scheduled client command:
 * - `parallel`: run immediately without coordination.
 * - `serial`: queue behind a per-key permit; interrupted waiters are skipped.
 * - `singleFlight`: deduplicate concurrent callers on the same key onto one
 *   shared run; the run is interrupted only when its last waiter leaves.
 * - `latest`: interrupt any in-flight run on the same key before starting the
 *   newest one; superseded callers settle as interrupted.
 */
export type CommandConcurrency<Input> =
	| { readonly mode: "parallel" }
	| {
			readonly mode: "serial" | "singleFlight" | "latest";
			readonly key: (input: Input) => string;
	  };

/** A settled command outcome, carrying either the value or its full Effect Cause. */
type SettledCommandResult<A, E> =
	| AsyncResult.Success<A, E>
	| AsyncResult.Failure<A, E>;

interface CommandRunOptions {
	/** Aborting interrupts the running command and any cancelable work inside it. */
	readonly signal?: AbortSignal | undefined;
}

interface CommandScheduler {
	readonly schedule: <Input, A, E, R>(
		registry: AtomRegistry.AtomRegistry,
		concurrency: CommandConcurrency<Input>,
		input: Input,
		effect: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E, R>;
}

/** Wraps a rejected Promise cause so command Effects keep a typed error channel. */
class CommandPromiseError extends Data.TaggedError("CommandPromiseError")<{
	readonly cause: unknown;
}> {}

/**
 * Lifts a Promise-returning operation (with fiber-managed `AbortSignal`) into a
 * command Effect with a typed error channel. `squashCommandFailure` unwraps the
 * original rejected cause at the React boundary.
 */
export function tryCommandPromise<A>(
	evaluate: (signal: AbortSignal) => Promise<A>,
): Effect.Effect<A, CommandPromiseError> {
	return Effect.tryPromise({
		try: evaluate,
		catch: (cause) => new CommandPromiseError({ cause }),
	});
}

/** One shared execution waited on by one or more callers. */
interface SharedRun {
	readonly result: Deferred.Deferred<unknown, unknown>;
	waiters: number;
	fiber: Fiber.Fiber<unknown, unknown> | undefined;
}

interface SerialLane {
	readonly semaphore: Semaphore.Semaphore;
	users: number;
}

interface LatestLane {
	token: number;
	active: SharedRun | undefined;
}

interface CommandSchedulerState {
	readonly serial: Map<string, SerialLane>;
	readonly singleFlight: Map<string, SharedRun>;
	readonly latest: Map<string, LatestLane>;
}

const startSharedRun = <A, E>(run: SharedRun, effect: Effect.Effect<A, E>) =>
	effect.pipe(
		Effect.interruptible,
		Effect.onExit((exit) => Deferred.done(run.result, exit)),
		Effect.ignoreCause,
		Effect.forkDetach({ startImmediately: true }),
		Effect.tap((fiber) =>
			Effect.sync(() => {
				run.fiber = fiber;
			}),
		),
		Effect.asVoid,
	);

const awaitSharedRun = <A, E>(
	run: SharedRun,
	restore: <X, XE, XR>(
		effect: Effect.Effect<X, XE, XR>,
	) => Effect.Effect<X, XE, XR>,
	abandon: Effect.Effect<void>,
): Effect.Effect<A, E> => {
	run.waiters++;
	return restore(Deferred.await(run.result as Deferred.Deferred<A, E>)).pipe(
		Effect.onInterrupt(() => (--run.waiters === 0 ? abandon : Effect.void)),
	);
};

const interruptSharedRun = (run: SharedRun) =>
	run.fiber === undefined ? Effect.void : Fiber.interrupt(run.fiber);

/**
 * Creates a keyed Effect command scheduler whose lane state is scoped per
 * `AtomRegistry`, so separate registries (such as isolated unit tests) never
 * leak concurrency state into one another.
 */
export function createCommandScheduler(): CommandScheduler {
	const registryStates = new WeakMap<
		AtomRegistry.AtomRegistry,
		CommandSchedulerState
	>();

	const stateFor = (
		registry: AtomRegistry.AtomRegistry,
	): CommandSchedulerState => {
		let state = registryStates.get(registry);
		if (state === undefined) {
			state = {
				serial: new Map(),
				singleFlight: new Map(),
				latest: new Map(),
			};
			registryStates.set(registry, state);
		}
		return state;
	};

	const serial = <A, E, R>(
		lanes: Map<string, SerialLane>,
		key: string,
		effect: Effect.Effect<A, E, R>,
	) =>
		Effect.acquireUseRelease(
			Effect.sync(() => {
				const lane = lanes.get(key) ?? {
					semaphore: Semaphore.makeUnsafe(1),
					users: 0,
				};
				lanes.set(key, lane);
				lane.users++;
				return lane;
			}),
			(lane) => lane.semaphore.withPermit(effect),
			(lane) =>
				Effect.sync(() => {
					if (--lane.users === 0) lanes.delete(key);
				}),
		);

	const singleFlight = <A, E, R>(
		flights: Map<string, SharedRun>,
		key: string,
		effect: Effect.Effect<A, E, R>,
	) =>
		Effect.uninterruptibleMask((restore) =>
			Effect.gen(function* () {
				let flight = flights.get(key);
				if (flight === undefined) {
					const started: SharedRun = {
						result: Deferred.makeUnsafe(),
						waiters: 0,
						fiber: undefined,
					};
					flight = started;
					flights.set(key, started);
					const context = yield* Effect.context<R>();
					yield* startSharedRun(
						started,
						effect.pipe(
							Effect.provide(context),
							Effect.ensuring(
								Effect.sync(() => {
									if (flights.get(key) === started) {
										flights.delete(key);
									}
								}),
							),
						),
					);
				}
				const joined = flight;
				return yield* awaitSharedRun<A, E>(
					joined,
					restore,
					Effect.suspend(() => {
						// Leave the map first so a caller arriving during interrupt starts fresh.
						if (flights.get(key) === joined) flights.delete(key);
						return interruptSharedRun(joined);
					}),
				);
			}),
		);

	const latest = <A, E, R>(
		lanes: Map<string, LatestLane>,
		key: string,
		effect: Effect.Effect<A, E, R>,
	) =>
		Effect.uninterruptibleMask((restore) =>
			Effect.gen(function* () {
				let lane = lanes.get(key);
				if (lane === undefined) {
					lane = { token: 0, active: undefined };
					lanes.set(key, lane);
				}
				const myToken = ++lane.token;
				if (lane.active !== undefined) {
					yield* interruptSharedRun(lane.active);
				}
				// Observe any external interrupt that arrived while the previous run wound down.
				yield* restore(Effect.void).pipe(
					Effect.onInterrupt(() =>
						Effect.sync(() => {
							if (
								lane.active === undefined &&
								lane.token === myToken
							) {
								lanes.delete(key);
							}
						}),
					),
				);
				if (lane.token !== myToken) {
					return yield* Effect.interrupt;
				}
				const current: SharedRun = {
					result: Deferred.makeUnsafe(),
					waiters: 0,
					fiber: undefined,
				};
				lane.active = current;
				const context = yield* Effect.context<R>();
				yield* startSharedRun(
					current,
					effect.pipe(
						Effect.provide(context),
						Effect.ensuring(
							Effect.sync(() => {
								if (lane.active === current) {
									lane.active = undefined;
								}
								if (
									lane.active === undefined &&
									lane.token === myToken
								) {
									lanes.delete(key);
								}
							}),
						),
					),
				);
				return yield* awaitSharedRun<A, E>(
					current,
					restore,
					Effect.suspend(() => {
						if (lane.active === current) {
							lane.active = undefined;
						}
						if (
							lane.active === undefined &&
							lane.token === myToken
						) {
							lanes.delete(key);
						}
						return interruptSharedRun(current);
					}),
				);
			}),
		);

	return {
		schedule: (registry, concurrency, input, effect) =>
			concurrency.mode === "parallel"
				? effect
				: Effect.suspend(() => {
						const key = concurrency.key(input);
						const state = stateFor(registry);
						switch (concurrency.mode) {
							case "serial":
								return serial(state.serial, key, effect);
							case "singleFlight":
								return singleFlight(
									state.singleFlight,
									key,
									effect,
								);
							case "latest":
								return latest(state.latest, key, effect);
						}
					}),
	};
}

/**
 * Runs a command Effect at the React/Promise boundary, returning a settled
 * `AsyncResult` instead of throwing. A pre-aborted signal settles immediately
 * as interrupted without starting the Effect.
 */
export function runCommandEffect<A, E>(
	effect: Effect.Effect<A, E>,
	options: CommandRunOptions = {},
): Promise<SettledCommandResult<A, E>> {
	if (options.signal?.aborted) {
		return Promise.resolve(AsyncResult.failure(Cause.interrupt()));
	}
	return Effect.runPromiseExit(
		effect,
		options.signal === undefined ? undefined : { signal: options.signal },
	).then(AsyncResult.fromExit);
}

export function isCommandInterrupted(
	result: SettledCommandResult<unknown, unknown>,
): boolean {
	return (
		AsyncResult.isFailure(result) && Cause.hasInterruptsOnly(result.cause)
	);
}

export function squashCommandFailure(result: {
	readonly cause: Cause.Cause<unknown>;
}): unknown {
	const squashed = Cause.squash(result.cause);
	return squashed instanceof CommandPromiseError ? squashed.cause : squashed;
}
