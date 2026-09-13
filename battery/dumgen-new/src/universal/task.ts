import { Effect } from "effect";
import { DumgenFailure } from "./failure.js";
export function task<T>(
	stage: string,
	run: (signal: AbortSignal) => Promise<T>,
) {
	return Effect.tryPromise({
		try: run,
		catch: (error) =>
			error instanceof DumgenFailure
				? (error as DumgenFailure)
				: new DumgenFailure(
						"InvalidModelOutput",
						stage,
						error instanceof Error ? error.message : String(error),
					),
	});
}
