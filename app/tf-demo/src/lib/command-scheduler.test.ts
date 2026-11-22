import { describe, expect, test } from "bun:test";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as TestClock from "effect/testing/TestClock";
import {
	type CommandConcurrency,
	createCommandScheduler,
	isCommandInterrupted,
	runCommandEffect,
	squashCommandFailure,
	tryCommandPromise,
} from "./command-scheduler";

const start = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.forkDetach(effect, { startImmediately: true });

describe("createCommandScheduler", () => {
	test("parallel runs overlapping commands concurrently", async () => {
		await Effect.runPromise(
			Effect.gen(function* () {
				const scheduler = createCommandScheduler();
				const registry = AtomRegistry.make();
				const release = Latch.makeUnsafe();
				const started: string[] = [];
				const concurrency: CommandConcurrency<string> = {
					mode: "parallel",
				};

				const run = (label: string) =>
					scheduler.schedule(
						registry,
						concurrency,
						label,
						Effect.sync(() => {
							started.push(label);
						}).pipe(
							Effect.andThen(release.await),
							Effect.as(label),
						),
					);

				const first = yield* start(run("a"));
				const second = yield* start(run("b"));
				expect(started).toEqual(["a", "b"]);

				release.openUnsafe();
				expect(yield* Fiber.join(first)).toBe("a");
				expect(yield* Fiber.join(second)).toBe("b");
				registry.dispose();
			}),
		);
	});

	test("serial orders same-key commands, runs distinct keys concurrently, and skips interrupted waiters", async () => {
		await Effect.runPromise(
			Effect.gen(function* () {
				const scheduler = createCommandScheduler();
				const registry = AtomRegistry.make();
				const firstStarted = Latch.makeUnsafe();
				const firstGate = Latch.makeUnsafe();
				const events: string[] = [];
				const concurrency: CommandConcurrency<{
					readonly lane: string;
					readonly name: string;
				}> = {
					mode: "serial",
					key: (input) => input.lane,
				};

				const first = yield* start(
					scheduler.schedule(
						registry,
						concurrency,
						{ lane: "a", name: "first" },
						Effect.sync(() => {
							events.push("first:start");
							firstStarted.openUnsafe();
						}).pipe(
							Effect.andThen(firstGate.await),
							Effect.tap(() =>
								Effect.sync(() => {
									events.push("first:end");
								}),
							),
						),
					),
				);
				yield* firstStarted.await;

				const abandoned = yield* start(
					scheduler.schedule(
						registry,
						concurrency,
						{ lane: "a", name: "abandoned" },
						Effect.sync(() => {
							events.push("abandoned:start");
						}),
					),
				);
				const third = yield* start(
					scheduler.schedule(
						registry,
						concurrency,
						{ lane: "a", name: "third" },
						Effect.sync(() => {
							events.push("third:start");
						}),
					),
				);
				const otherLane = yield* start(
					scheduler.schedule(
						registry,
						concurrency,
						{ lane: "b", name: "other" },
						Effect.sync(() => {
							events.push("other:start");
						}),
					),
				);

				yield* Fiber.interrupt(abandoned);
				yield* Fiber.join(otherLane);
				expect(events).toEqual(["first:start", "other:start"]);

				firstGate.openUnsafe();
				yield* Fiber.join(first);
				yield* Fiber.join(third);
				expect(events).toEqual([
					"first:start",
					"other:start",
					"first:end",
					"third:start",
				]);
				registry.dispose();
			}),
		);
	});

	test("singleFlight deduplicates concurrent callers on the same key and isolates separate registries", async () => {
		await Effect.runPromise(
			Effect.gen(function* () {
				const scheduler = createCommandScheduler();
				const registryA = AtomRegistry.make();
				const registryB = AtomRegistry.make();
				const gate = Latch.makeUnsafe();
				const started: string[] = [];
				const concurrency: CommandConcurrency<string> = {
					mode: "singleFlight",
					key: (key) => key,
				};

				const run = (
					registry: AtomRegistry.AtomRegistry,
					key: string,
					tag: string,
				) =>
					scheduler.schedule(
						registry,
						concurrency,
						key,
						Effect.sync(() => {
							started.push(tag);
						}).pipe(Effect.andThen(gate.await), Effect.as(tag)),
					);

				const first = yield* start(run(registryA, "submit", "a-1"));
				const duplicate = yield* start(run(registryA, "submit", "a-2"));
				const isolated = yield* start(run(registryB, "submit", "b-1"));

				expect(started).toEqual(["a-1", "b-1"]);

				gate.openUnsafe();
				expect(yield* Fiber.join(first)).toBe("a-1");
				expect(yield* Fiber.join(duplicate)).toBe("a-1");
				expect(yield* Fiber.join(isolated)).toBe("b-1");

				registryA.dispose();
				registryB.dispose();
			}),
		);
	});

	test("singleFlight interrupts the shared run and aborts its AbortSignal only when the last waiter leaves", async () => {
		const scheduler = createCommandScheduler();
		const registry = AtomRegistry.make();
		const started = Deferred.makeUnsafe<void>();
		let executions = 0;
		let aborted = false;

		const run = () =>
			scheduler.schedule(
				registry,
				{ mode: "singleFlight", key: () => "upload" },
				undefined,
				tryCommandPromise(
					(signal) =>
						new Promise<string>((_resolve, reject) => {
							executions++;
							Deferred.doneUnsafe(started, Exit.void);
							signal.addEventListener("abort", () => {
								aborted = true;
								reject(new Error("aborted"));
							});
						}),
				),
			);

		const firstAbort = new AbortController();
		const secondAbort = new AbortController();
		const firstPromise = runCommandEffect(run(), {
			signal: firstAbort.signal,
		});
		const secondPromise = runCommandEffect(run(), {
			signal: secondAbort.signal,
		});

		await Effect.runPromise(Deferred.await(started));
		firstAbort.abort();
		const firstResult = await firstPromise;
		expect(isCommandInterrupted(firstResult)).toBe(true);
		expect(executions).toBe(1);
		expect(aborted).toBe(false);

		secondAbort.abort();
		const secondResult = await secondPromise;
		expect(isCommandInterrupted(secondResult)).toBe(true);
		expect(aborted).toBe(true);
		registry.dispose();
	});

	test("singleFlight propagates a failure to all waiters and recovers cleanly on retry", async () => {
		const scheduler = createCommandScheduler();
		const registry = AtomRegistry.make();
		const gate = Latch.makeUnsafe();
		const boom = new Error("transient failure");
		let attempt = 0;

		const invoke = () =>
			runCommandEffect(
				scheduler.schedule(
					registry,
					{ mode: "singleFlight", key: () => "action" },
					undefined,
					Effect.suspend(() => {
						attempt++;
						if (attempt === 1) {
							return gate.await.pipe(
								Effect.andThen(Effect.fail(boom)),
							);
						}
						return Effect.succeed("recovered");
					}),
				),
			);

		const first = invoke();
		const second = invoke();
		gate.openUnsafe();

		const [firstResult, secondResult] = await Promise.all([first, second]);
		expect(AsyncResult.isFailure(firstResult)).toBe(true);
		expect(AsyncResult.isFailure(secondResult)).toBe(true);
		if (AsyncResult.isFailure(firstResult)) {
			expect(squashCommandFailure(firstResult)).toBe(boom);
		}
		if (AsyncResult.isFailure(secondResult)) {
			expect(squashCommandFailure(secondResult)).toBe(boom);
		}
		expect(attempt).toBe(1);

		const retryResult = await invoke();
		expect(AsyncResult.isSuccess(retryResult)).toBe(true);
		if (AsyncResult.isSuccess(retryResult)) {
			expect(retryResult.value).toBe("recovered");
		}
		expect(attempt).toBe(2);
		registry.dispose();
	});

	test("latest supersedes an in-flight run, aborts its signal, and marks the superseded caller interrupted", async () => {
		const scheduler = createCommandScheduler();
		const registry = AtomRegistry.make();
		const firstStarted = Deferred.makeUnsafe<void>();
		const events: string[] = [];
		let firstAborted = false;

		const firstPromise = runCommandEffect(
			scheduler.schedule(
				registry,
				{ mode: "latest", key: () => "selection" },
				"A",
				Effect.gen(function* () {
					events.push("A:start");
					yield* tryCommandPromise(
						(signal) =>
							new Promise<string>((_resolve, reject) => {
								Deferred.doneUnsafe(firstStarted, Exit.void);
								signal.addEventListener("abort", () => {
									firstAborted = true;
									events.push("A:aborted");
									reject(new Error("aborted"));
								});
							}),
					);
					events.push("A:presented");
					return "A";
				}),
			),
		);

		await Effect.runPromise(Deferred.await(firstStarted));

		const secondResult = await runCommandEffect(
			scheduler.schedule(
				registry,
				{ mode: "latest", key: () => "selection" },
				"B",
				Effect.sync(() => {
					events.push("B:presented");
					return "B";
				}),
			),
		);

		const firstResult = await firstPromise;
		expect(firstAborted).toBe(true);
		expect(isCommandInterrupted(firstResult)).toBe(true);
		expect(AsyncResult.isSuccess(secondResult)).toBe(true);
		if (AsyncResult.isSuccess(secondResult)) {
			expect(secondResult.value).toBe("B");
		}
		expect(events).toEqual(["A:start", "A:aborted", "B:presented"]);
		registry.dispose();
	});

	test("latest cancels TestClock timers on superseded work and recovers after errors", async () => {
		await Effect.runPromise(
			Effect.gen(function* () {
				const scheduler = createCommandScheduler();
				const registry = AtomRegistry.make();
				const completed: string[] = [];
				const concurrency: CommandConcurrency<string> = {
					mode: "latest",
					key: () => "lane",
				};

				const first = yield* start(
					scheduler.schedule(
						registry,
						concurrency,
						"first",
						Effect.sleep(300).pipe(
							Effect.tap(() =>
								Effect.sync(() => {
									completed.push("first");
								}),
							),
						),
					),
				);

				yield* TestClock.adjust(100);

				const second = yield* start(
					scheduler.schedule(
						registry,
						concurrency,
						"second",
						Effect.sleep(300).pipe(
							Effect.tap(() =>
								Effect.sync(() => {
									completed.push("second");
								}),
							),
						),
					),
				);

				yield* TestClock.adjust(250);
				expect(completed).toEqual([]);

				yield* TestClock.adjust(50);
				expect(completed).toEqual(["second"]);

				const firstExit = yield* Fiber.await(first);
				const secondExit = yield* Fiber.await(second);
				expect(
					isCommandInterrupted(AsyncResult.fromExit(firstExit)),
				).toBe(true);
				expect(Exit.isSuccess(secondExit)).toBe(true);

				// Failure leaves the lane clean for the next command.
				const failedExit = yield* Effect.exit(
					scheduler.schedule(
						registry,
						concurrency,
						"broken",
						Effect.fail("boom"),
					),
				);
				expect(Exit.isFailure(failedExit)).toBe(true);

				const recovered = yield* scheduler.schedule(
					registry,
					concurrency,
					"ok",
					Effect.succeed("recovered"),
				);
				expect(recovered).toBe("recovered");
				registry.dispose();
			}).pipe(Effect.provide(TestClock.layer())),
		);
	});

	test("runCommandEffect skips execution when given a pre-aborted AbortSignal", async () => {
		let executed = false;
		const controller = new AbortController();
		controller.abort();

		const outcome = await runCommandEffect(
			Effect.sync(() => {
				executed = true;
				return "done";
			}),
			{ signal: controller.signal },
		);

		expect(executed).toBe(false);
		expect(isCommandInterrupted(outcome)).toBe(true);
	});
});
