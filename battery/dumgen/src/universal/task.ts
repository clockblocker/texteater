import * as Effect from "effect/Effect";
import { DumgenFailure } from "./failure.js";
export function task<T>(run: (signal: AbortSignal) => Promise<T>) {
	return Effect.async<T, DumgenFailure>((resume, signal) => {
		const pending = Promise.resolve()
			.then(() => run(signal))
			.then(
				(value) => resume(Effect.succeed(value)),
				// Only a DumgenFailure is an expected failure; anything else is
				// a bug in Dumgen and surfaces as a defect.
				(error) =>
					resume(
						error instanceof DumgenFailure
							? Effect.fail(error as DumgenFailure)
							: Effect.die(error),
					),
			);
		// Interruption aborts the transport, then waits for its trace finalizers.
		return Effect.promise(() => pending);
	});
}

/**
 * Waits for every sibling job, so none records a call after the operation's
 * trace is emitted, then rejects with the first job's error.
 */
export async function settleAll<T>(jobs: readonly Promise<T>[]): Promise<T[]> {
	const settled = await Promise.allSettled(jobs);
	const rejected = settled.find((result) => result.status === "rejected");
	if (rejected) throw rejected.reason;
	return settled.map((result) => (result as PromiseFulfilledResult<T>).value);
}
