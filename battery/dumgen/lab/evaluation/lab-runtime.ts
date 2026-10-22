/**
 * The runtime an evaluation runs on (Dumgen ADR 0009, D4 on #1269): one
 * `ManagedRuntime` per evaluate run, holding a request budget of 12 that
 * every attempt of the run shares, the cache fill's and the cases'
 * alike. Each attempt builds `DumgenCore` over its own cached transports
 * on that budget, so a run keeps at most 12 model calls in flight however
 * many attempts run at once. The segmentation lab already runs 12 cases
 * at a time.
 *
 * Every Effect an evaluation runs goes through `runtime.runPromise(effect,
 * { signal })` with the run's signal, so aborting the run interrupts its
 * attempts, and an interrupted call aborts its transport.
 */
import { messageOf } from "common-utils";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { RequestBudget } from "../../src/call.js";

/** The model calls one evaluate run keeps in flight, jev and Luna together. */
export const labRequestBudget = 12;

const LabLive = RequestBudget.layer(labRequestBudget);

export type LabRuntime = ManagedRuntime.ManagedRuntime<RequestBudget, never>;

/** A fresh runtime over `LabLive`: its own budget of `labRequestBudget`. */
export const makeLabRuntime = (): LabRuntime => ManagedRuntime.make(LabLive);

/**
 * `body` on `runtime`, or on a fresh lab runtime that is disposed once
 * `body` settles: a caller that passes none, such as a test, still runs
 * the whole run on one budget.
 */
export async function onLabRuntime<A>(
	runtime: LabRuntime | undefined,
	body: (runtime: LabRuntime) => Promise<A>,
): Promise<A> {
	if (runtime) return body(runtime);
	const own = makeLabRuntime();
	try {
		return await body(own);
	} finally {
		await own.dispose();
	}
}

/**
 * An Effect of a lab attempt: it needs the run's budget and nothing else,
 * and fails with an operation's `ProviderFailure` or `InvalidModelOutput`,
 * or an `Error` of the lab's own, such as a Luna request held for a batch.
 */
export type LabEffect<A> = Effect.Effect<A, Error, RequestBudget>;

/**
 * Runs `effect` on `runtime`, interrupted when `signal` aborts. It
 * rejects as `Effect.runPromise` does: with the failure, or the Defect.
 */
export const runOn = <A, E>(
	runtime: LabRuntime,
	effect: Effect.Effect<A, E, RequestBudget>,
	signal: AbortSignal | undefined,
): Promise<A> => runtime.runPromise(effect, { signal });

/**
 * Every item's attempt, `concurrency` at a time. A failed attempt, a
 * Defect included, is left for the run to record.
 */
export const everyAttempt = <T>(
	items: readonly T[],
	attempt: (item: T) => LabEffect<unknown>,
	concurrency: number,
): Effect.Effect<void, never, RequestBudget> =>
	Effect.forEach(items, (item) => Effect.exit(attempt(item)), {
		concurrency: Math.max(1, concurrency),
		discard: true,
	});

/**
 * `effect`'s value, or `{ failure }` with the message its rejection from
 * `Effect.runPromise` would carry: a request run's outcome.
 */
export const outcomeOf = <A>(
	effect: LabEffect<A>,
): Effect.Effect<A | { readonly failure: string }, never, RequestBudget> =>
	Effect.catchCause(effect, (cause) =>
		Effect.succeed({ failure: messageOf(Cause.squash(cause)) }),
	);
