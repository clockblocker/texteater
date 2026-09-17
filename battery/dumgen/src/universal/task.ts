import * as Effect from "effect/Effect";
import { DumgenFailure } from "./failure.js";
export function task<T>(
	stage: string,
	run: (signal: AbortSignal) => Promise<T>,
) {
	return Effect.async<T, DumgenFailure>((resume, signal) => {
		const pending = Promise.resolve()
			.then(() => run(signal))
			.then(
				(value) => resume(Effect.succeed(value)),
				(error) =>
					resume(
						Effect.fail(
							error instanceof DumgenFailure
								? (error as DumgenFailure)
								: new DumgenFailure(
										"InvalidModelOutput",
										stage,
										error instanceof Error
											? error.message
											: String(error),
									),
						),
					),
			);
		// Interruption aborts the transport, then waits for its trace finalizers.
		return Effect.promise(() => pending);
	});
}
