import { describe, expect } from "bun:test";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Logger from "effect/Logger";
import * as Scope from "effect/Scope";
import { TestClock } from "effect/testing";
import { makeDrainableWorker } from "../../src/effect.js";
import { testEffect } from "../../src/effect-test.js";

const captureErrorLogs = () => {
	const loggedErrors: unknown[] = [];
	const logger = Logger.make(({ logLevel, cause }) => {
		if (logLevel === "Error") loggedErrors.push(Cause.squash(cause));
	});
	return {
		loggedErrors,
		loggerLayer: Logger.layer([logger], { mergeWithExisting: false }),
	};
};

describe("DrainableWorker", () => {
	testEffect("drain resolves immediately when no items were enqueued", () =>
		Effect.gen(function* () {
			const worker = yield* makeDrainableWorker<string, never, never>(
				() => Effect.void,
			);
			yield* worker.drain;
		}),
	);

	testEffect(
		"logs failed, defective, or synchronously throwing items and keeps processing later items",
		() => {
			const { loggedErrors, loggerLayer } = captureErrorLogs();
			return Effect.gen(function* () {
				const processed: string[] = [];
				const workerFiber =
					yield* Deferred.make<Fiber.Fiber<unknown, unknown>>();
				const worker = yield* makeDrainableWorker((item: string) => {
					if (item === "throw") {
						throw new Error("sync throw");
					}
					return Effect.gen(function* () {
						yield* Deferred.succeed(
							workerFiber,
							yield* Effect.fiber,
						);
						if (item === "fail")
							return yield* Effect.fail("typed failure");
						if (item === "die") return yield* Effect.die("defect");
						if (item === "interrupt")
							return yield* Effect.interrupt;
						processed.push(item);
					});
				});

				yield* worker.enqueue("fail");
				yield* worker.enqueue("die");
				yield* worker.enqueue("throw");
				yield* worker.enqueue("interrupt");
				yield* worker.enqueue("ok");

				yield* Effect.raceFirst(
					worker.drain,
					Fiber.await(yield* Deferred.await(workerFiber)),
				);

				expect(processed).toEqual(["ok"]);
				expect(loggedErrors).toHaveLength(3);
				expect(loggedErrors[0]).toBe("typed failure");
				expect(loggedErrors[1]).toBe("defect");
				expect(loggedErrors[2]).toBeInstanceOf(Error);
				expect((loggedErrors[2] as Error).message).toBe("sync throw");
			}).pipe(Effect.provide(loggerLayer));
		},
	);

	testEffect(
		"stops quietly when its scope closes during an in-flight item and unblocks drain",
		() => {
			const { loggedErrors, loggerLayer } = captureErrorLogs();
			return Effect.gen(function* () {
				const scope = yield* Scope.make();
				const processed: string[] = [];
				const workerFiber =
					yield* Deferred.make<Fiber.Fiber<unknown, unknown>>();
				const worker = yield* makeDrainableWorker((item: string) =>
					Effect.gen(function* () {
						processed.push(item);
						yield* Deferred.succeed(
							workerFiber,
							yield* Effect.fiber,
						);
						return yield* Effect.never;
					}),
				).pipe(Scope.provide(scope));

				yield* worker.enqueue("block");
				yield* worker.enqueue("later");
				const fiber = yield* Deferred.await(workerFiber);
				yield* Scope.close(scope, Exit.void);

				expect(Exit.hasInterrupts(yield* Fiber.await(fiber))).toBe(
					true,
				);
				expect(processed).toEqual(["block"]);
				expect(loggedErrors).toEqual([]);

				yield* worker.enqueue("after close");
				const drained = yield* Effect.forkChild(worker.drain, {
					startImmediately: true,
				});
				expect(drained.pollUnsafe()).toEqual(Exit.void);
				expect(processed).toEqual(["block"]);
			}).pipe(Effect.provide(loggerLayer));
		},
	);

	testEffect(
		"drain waits for both in-flight work and items enqueued during active processing (TestClock)",
		() =>
			Effect.gen(function* () {
				const processed: string[] = [];
				const firstStarted = yield* Deferred.make<void>();
				const secondStarted = yield* Deferred.make<void>();

				const worker = yield* makeDrainableWorker((item: string) =>
					Effect.gen(function* () {
						if (item === "first") {
							yield* Deferred.succeed(firstStarted, undefined);
							yield* Effect.sleep("50 millis");
						}
						if (item === "second") {
							yield* Deferred.succeed(secondStarted, undefined);
							yield* Effect.sleep("30 millis");
						}
						processed.push(item);
					}),
				);

				yield* worker.enqueue("first");
				yield* Deferred.await(firstStarted);

				const drained = yield* Deferred.make<void>();
				yield* Effect.forkChild(
					worker.drain.pipe(
						Effect.tap(() => Deferred.succeed(drained, undefined)),
					),
				);

				yield* worker.enqueue("second");
				yield* TestClock.adjust("50 millis");
				yield* Deferred.await(secondStarted);

				// First item finished, but second item is still in flight.
				expect(processed).toEqual(["first"]);
				expect(yield* Deferred.isDone(drained)).toBe(false);

				yield* TestClock.adjust("30 millis");
				yield* Deferred.await(drained);

				expect(processed).toEqual(["first", "second"]);
			}),
	);
});
