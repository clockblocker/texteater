import { describe, expect } from "bun:test";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Scope from "effect/Scope";
import { TestClock } from "effect/testing";
import { makeKeyedLock, makeKeyedRunner } from "../../src/effect.js";
import { testEffect } from "../../src/effect-test.js";

describe("KeyedLock", () => {
	testEffect("serializes a single key in FIFO order with TestClock", () =>
		Effect.gen(function* () {
			const lock = yield* makeKeyedLock<string>();
			const events = yield* Ref.make<readonly string[]>([]);
			const record = (event: string) =>
				Ref.update(events, (current) => [...current, event]);
			const firstEntered = yield* Deferred.make<void>();

			const first = yield* lock
				.withLock(
					"key",
					record("first:start").pipe(
						Effect.andThen(
							Deferred.succeed(firstEntered, undefined),
						),
						Effect.andThen(Effect.sleep("50 millis")),
						Effect.andThen(record("first:end")),
					),
				)
				.pipe(Effect.forkChild);
			yield* Deferred.await(firstEntered);

			const second = yield* lock
				.withLock("key", record("second"))
				.pipe(Effect.forkChild);
			const third = yield* lock
				.withLock("key", record("third"))
				.pipe(Effect.forkChild);
			yield* Effect.yieldNow;
			expect(yield* Ref.get(events)).toEqual(["first:start"]);

			yield* TestClock.adjust("25 millis");
			expect(yield* Ref.get(events)).toEqual(["first:start"]);

			yield* TestClock.adjust("25 millis");
			yield* Fiber.joinAll([first, second, third]);
			expect(yield* Ref.get(events)).toEqual([
				"first:start",
				"first:end",
				"second",
				"third",
			]);
		}),
	);

	testEffect("runs holders of distinct keys concurrently", () =>
		Effect.gen(function* () {
			const lock = yield* makeKeyedLock<string>();
			const entered = yield* Queue.unbounded<string>();
			const hold = (key: string) =>
				lock.withLock(
					key,
					Queue.offer(entered, key).pipe(
						Effect.andThen(Effect.sleep("50 millis")),
					),
				);

			const holders = yield* Effect.forEach(["a", "b"], hold, {
				concurrency: "unbounded",
			}).pipe(Effect.forkChild);
			const both = new Set([
				yield* Queue.take(entered),
				yield* Queue.take(entered),
			]);
			expect(both).toEqual(new Set(["a", "b"]));

			// Advancing once by 50ms completes both keys because they run in parallel.
			yield* TestClock.adjust("50 millis");
			yield* Fiber.join(holders);
			expect(yield* lock.activeKeys).toEqual([]);
		}),
	);

	testEffect(
		"removes a key from activeKeys once all holders and waiters leave",
		() =>
			Effect.gen(function* () {
				const lock = yield* makeKeyedLock<string>();
				const entered = yield* Deferred.make<void>();
				const release = yield* Deferred.make<void>();

				const holder = yield* lock
					.withLock(
						"key",
						Deferred.succeed(entered, undefined).pipe(
							Effect.andThen(Deferred.await(release)),
						),
					)
					.pipe(Effect.forkChild);
				yield* Deferred.await(entered);

				const abandoned = yield* lock
					.withLock("key", Effect.void)
					.pipe(Effect.forkChild);
				const waiting = yield* lock
					.withLock("key", Effect.void)
					.pipe(Effect.forkChild);
				yield* Effect.yieldNow;
				expect(yield* lock.activeKeys).toEqual(["key"]);

				yield* Fiber.interrupt(abandoned);
				expect(yield* lock.activeKeys).toEqual(["key"]);

				yield* Deferred.succeed(release, undefined);
				yield* Fiber.joinAll([holder, waiting]);
				expect(yield* lock.activeKeys).toEqual([]);
			}),
	);

	testEffect("releases lock and cleans up map after failure or defect", () =>
		Effect.gen(function* () {
			const lock = yield* makeKeyedLock<string>();
			const failed = yield* lock
				.withLock("k", Effect.fail("boom"))
				.pipe(Effect.flip);
			expect(failed).toBe("boom");
			expect(yield* lock.activeKeys).toEqual([]);

			const diedExit = yield* Effect.exit(
				lock.withLock("k", Effect.die("crash")),
			);
			expect(Exit.isFailure(diedExit)).toBe(true);
			expect(yield* lock.activeKeys).toEqual([]);

			const next = yield* lock.withLock("k", Effect.succeed("ok"));
			expect(next).toBe("ok");
			expect(yield* lock.activeKeys).toEqual([]);
		}),
	);

	testEffect("runs the guarded effect in the caller's scope", () =>
		Effect.gen(function* () {
			const lock = yield* makeKeyedLock<string>();
			const finalized = yield* Ref.make(false);
			const callerScope = yield* Scope.make();

			yield* lock
				.withLock(
					"key",
					Effect.addFinalizer(() => Ref.set(finalized, true)),
				)
				.pipe(Scope.provide(callerScope));
			expect(yield* Ref.get(finalized)).toBe(false);

			yield* Scope.close(callerScope, Exit.void);
			expect(yield* Ref.get(finalized)).toBe(true);
		}),
	);
});

describe("KeyedRunner", () => {
	testEffect(
		"keeps each key's effects in run order without delaying distinct keys",
		() =>
			Effect.gen(function* () {
				const runner = yield* makeKeyedRunner<string>();
				const events = yield* Ref.make<readonly string[]>([]);
				const record = (event: string) =>
					Ref.update(events, (current) => [...current, event]);
				const otherRan = yield* Deferred.make<void>();
				const busyRan = yield* Deferred.make<void>();

				yield* runner.run(
					"busy",
					Effect.sleep("100 millis").pipe(
						Effect.andThen(record("busy:1")),
					),
				);
				yield* runner.run("busy", record("busy:2"));
				yield* runner.run(
					"busy",
					record("busy:3").pipe(
						Effect.andThen(Deferred.succeed(busyRan, undefined)),
						Effect.asVoid,
					),
				);
				yield* runner.run(
					"other",
					record("other").pipe(
						Effect.andThen(Deferred.succeed(otherRan, undefined)),
						Effect.asVoid,
					),
				);

				yield* Deferred.await(otherRan);
				expect(yield* Ref.get(events)).toEqual(["other"]);

				yield* TestClock.adjust("100 millis");
				yield* Deferred.await(busyRan);
				expect(yield* Ref.get(events)).toEqual([
					"other",
					"busy:1",
					"busy:2",
					"busy:3",
				]);
			}),
	);

	testEffect(
		"interrupts in-flight and queued fibers when its scope closes",
		() =>
			Effect.gen(function* () {
				const runnerScope = yield* Scope.make();
				const runner = yield* makeKeyedRunner<string>().pipe(
					Scope.provide(runnerScope),
				);
				const started = yield* Deferred.make<void>();
				const interrupted = yield* Ref.make(false);
				const secondRan = yield* Ref.make(false);

				yield* runner.run(
					"key",
					Deferred.succeed(started, undefined).pipe(
						Effect.andThen(Effect.never),
						Effect.onInterrupt(() => Ref.set(interrupted, true)),
						Effect.asVoid,
					),
				);
				yield* Deferred.await(started);
				yield* runner.run("key", Ref.set(secondRan, true));

				yield* Scope.close(runnerScope, Exit.void);
				expect(yield* Ref.get(interrupted)).toBe(true);
				expect(yield* Ref.get(secondRan)).toBe(false);
			}),
	);
});
