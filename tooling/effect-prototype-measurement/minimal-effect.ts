import { Effect } from "effect";

export const execute = (): Promise<Readonly<{ readonly answer: 42 }>> =>
	Effect.runPromise(
		Effect.gen(function* () {
			const answer = yield* Effect.succeed(42 as const);
			return Object.freeze({ answer });
		}),
	);
