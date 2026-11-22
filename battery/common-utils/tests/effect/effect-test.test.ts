import { describe, expect, test } from "bun:test";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";
import { testEffect, testLive } from "../../src/effect-test.js";

class TaggedFailure extends Data.TaggedError("TaggedFailure")<{
	readonly detail: string;
}> {}

class TestConfig extends Context.Service<
	TestConfig,
	{ readonly label: string }
>()("common-utils/tests/TestConfig") {}

describe("testEffect", () => {
	testEffect(
		"provides TestClock and advances virtual time with TestClock.adjust",
		() =>
			Effect.gen(function* () {
				let woke = false;
				const start = yield* Clock.currentTimeMillis;
				expect(start).toBe(0);

				const sleeper = yield* Effect.sleep("1 hour").pipe(
					Effect.tap(() =>
						Effect.sync(() => {
							woke = true;
						}),
					),
					Effect.forkChild,
				);

				yield* TestClock.adjust("30 minutes");
				expect(woke).toBe(false);

				yield* TestClock.adjust("30 minutes");
				yield* Fiber.join(sleeper);
				expect(woke).toBe(true);
				expect(yield* Clock.currentTimeMillis).toBe(3_600_000);
			}),
	);

	let finalizedOnSuccess = false;
	testEffect("closes Scope finalizers automatically on success", () =>
		Effect.gen(function* () {
			yield* Effect.addFinalizer(() =>
				Effect.sync(() => {
					finalizedOnSuccess = true;
				}),
			);
			expect(finalizedOnSuccess).toBe(false);
		}),
	);
	test("saw the Scope finalizer run after the preceding testEffect", () => {
		expect(finalizedOnSuccess).toBe(true);
	});

	let finalizedOnFailure = false;
	testEffect.failing(
		"propagates typed Effect.fail as a test failure and still runs Scope finalizers",
		() =>
			Effect.gen(function* () {
				yield* Effect.addFinalizer(() =>
					Effect.sync(() => {
						finalizedOnFailure = true;
					}),
				);
				return yield* new TaggedFailure({
					detail: "expected failure",
				});
			}),
	);
	test("saw the Scope finalizer run even after a failed testEffect", () => {
		expect(finalizedOnFailure).toBe(true);
	});

	const configured = testEffect.layer(
		Layer.succeed(TestConfig, { label: "bound-layer" }),
	);
	configured(
		"provides services from testEffect.layer alongside TestClock",
		() =>
			Effect.gen(function* () {
				const config = yield* TestConfig;
				expect(config.label).toBe("bound-layer");
				yield* TestClock.adjust("5 seconds");
				expect(yield* Clock.currentTimeMillis).toBe(5_000);
			}),
	);

	testEffect.each([
		{ input: 1, expected: 2 },
		{ input: 4, expected: 8 },
	])("supports parameterized testEffect.each (%p)", ({ input, expected }) =>
		Effect.sync(() => {
			expect(input * 2).toBe(expected);
		}),
	);
});

describe("testLive", () => {
	let liveFinalized = false;

	testLive("runs with the real live Clock and closes Scope finalizers", () =>
		Effect.gen(function* () {
			yield* Effect.addFinalizer(() =>
				Effect.sync(() => {
					liveFinalized = true;
				}),
			);
			const now = yield* Clock.currentTimeMillis;
			expect(now).toBeGreaterThan(1_700_000_000_000);
			// oxlint-disable-next-line textfresser/no-real-time-wait-in-tests -- verifies testLive uses the live clock
			yield* Effect.sleep("1 millis");
		}),
	);

	test("saw the Scope finalizer run after testLive", () => {
		expect(liveFinalized).toBe(true);
	});

	testLive.failing("propagates typed failures in testLive", () =>
		Effect.fail(new TaggedFailure({ detail: "live failure" })),
	);
});
