import { expect } from "bun:test";
import { testEffect } from "common-utils/effect-test";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import { TestClock } from "effect/testing";
import {
	CurrentSentence,
	callModel,
	type Exchange,
	RequestBudget,
	runOperation,
	TracePayloads,
	TraceSink,
} from "../src/call.js";
import { InvalidModelOutput, ProviderFailure } from "../src/errors.js";
import type { OperationTrace } from "../src/operation-trace.js";

/**
 * Operations over a fresh budget of `permits`: each runs its body as
 * `segment.inUnits` and keeps the trace it reports.
 */
function makeOperations(permits: number, payloads = false) {
	return Effect.gen(function* () {
		const traces: OperationTrace[] = [];
		const budget = yield* Effect.provide(
			RequestBudget,
			RequestBudget.layer(permits),
		);
		const call = <T, O>(exchange: Exchange<T, O>) =>
			callModel(budget, exchange);
		const operation = <A, E>(
			body: Effect.Effect<A, E, Effect.Services<ReturnType<typeof call>>>,
		) =>
			runOperation("segment.inUnits", body).pipe(
				Effect.provideService(TraceSink, (trace) => traces.push(trace)),
				Effect.provideService(TracePayloads, payloads),
			);
		return { call, operation, traces };
	});
}

/** An exchange that answers through `send`, with ten input tokens per answer. */
const exchange = <T>(
	stage: string,
	send: (signal: AbortSignal) => Promise<T>,
	executor: "jev" | "luna" = "jev",
): Exchange<T, T> => ({
	stage,
	executor,
	request: { stage },
	send,
	tokens: () => ({ inputTokens: 10, outputTokens: 1 }),
	check: (response) => response,
});

/** A transport that answers only once its signal aborts and `allowSettle` releases it. */
function hanging() {
	const aborted: string[] = [];
	const settled: string[] = [];
	const started = Promise.withResolvers<void>();
	const abortObserved = Promise.withResolvers<void>();
	const releaseSettle = Promise.withResolvers<void>();
	const send = (stage: string) => (signal: AbortSignal) => {
		started.resolve();
		return new Promise<never>((_, reject) =>
			signal.addEventListener("abort", () => {
				aborted.push(stage);
				abortObserved.resolve();
				void releaseSettle.promise.then(() => {
					settled.push(stage);
					reject(Error(`${stage} aborted`));
				});
			}),
		);
	};
	return {
		aborted,
		settled,
		started: started.promise,
		abortObserved: abortObserved.promise,
		allowSettle: () => releaseSettle.resolve(),
		send,
	};
}

/** A transport gated on explicit test signals so virtual time can advance between start and answer. */
function gatedSend() {
	const started = Promise.withResolvers<void>();
	const answer = Promise.withResolvers<string>();
	const send = () => {
		started.resolve();
		return answer.promise;
	};
	return {
		send,
		started: started.promise,
		answer: (value: string) => answer.resolve(value),
	};
}

testEffect(
	"interrupting an operation aborts its calls in flight and waits until they settle; a queued call starts nothing",
	() =>
		Effect.gen(function* () {
			const { call, operation, traces } = yield* makeOperations(1);
			const transport = hanging();
			let queuedSent = false;
			const fiber = yield* Effect.forkChild(
				operation(
					Effect.all(
						[
							call(exchange("first", transport.send("first"))),
							call(
								exchange("queued", async () => {
									queuedSent = true;
									return "never";
								}),
							),
						],
						{ concurrency: "unbounded" },
					),
				),
			);
			yield* Effect.promise(() => transport.started);
			expect(transport.aborted).toEqual([]);

			const interrupting = yield* Effect.forkChild(
				Fiber.interrupt(fiber),
			);
			yield* Effect.promise(() => transport.abortObserved);
			expect(transport.aborted).toEqual(["first"]);
			// The interruption has not returned while the transport is still settling.
			expect(transport.settled).toEqual([]);
			expect(interrupting.pollUnsafe()).toBeUndefined();

			transport.allowSettle();
			yield* Fiber.join(interrupting);
			const exit = yield* Fiber.await(fiber);
			expect(Exit.isFailure(exit)).toBe(true);
			expect(transport.settled).toEqual(["first"]);
			expect(queuedSent).toBe(false);
			expect(traces).toHaveLength(1);
			expect(traces[0]?.calls).toEqual([
				expect.objectContaining({
					stage: "first",
					inputTokens: 0,
					failure: { tag: "Interrupted", message: "first aborted" },
				}),
			]);
			expect(traces[0]?.waits).toEqual([]);
		}),
);

testEffect(
	"one budget serves jev and Luna together, and a call that queued records its wait",
	() =>
		Effect.gen(function* () {
			const { call, operation, traces } = yield* makeOperations(1);
			let inFlight = 0;
			let most = 0;
			const firstStarted = Promise.withResolvers<void>();
			const releaseFirst = Promise.withResolvers<void>();
			let sentCount = 0;
			const send = async () => {
				const current = ++sentCount;
				inFlight++;
				most = Math.max(most, inFlight);
				if (current === 1) {
					firstStarted.resolve();
					await releaseFirst.promise;
				}
				inFlight--;
				return "answer";
			};
			const fiber = yield* Effect.forkChild(
				operation(
					Effect.all(
						[
							call(exchange("judge", send, "jev")),
							call(exchange("write", send, "luna")),
						],
						{ concurrency: "unbounded" },
					),
				),
			);
			yield* Effect.promise(() => firstStarted.promise);
			yield* Effect.yieldNow;
			yield* TestClock.adjust("10 millis");
			releaseFirst.resolve();
			yield* Fiber.join(fiber);

			expect(most).toBe(1);
			const [trace] = traces;
			expect(trace?.calls.map(({ executor }) => executor)).toEqual([
				"jev",
				"luna",
			]);
			expect(trace?.waits).toEqual([{ call: 1, waitMs: 10 }]);
		}),
);

testEffect("an operation's trace reads its times from Effect's Clock", () =>
	Effect.gen(function* () {
		const { call, operation, traces } = yield* makeOperations(1);
		const at = Date.UTC(2026, 9, 22, 12);
		yield* TestClock.setTime(at);
		const first = gatedSend();
		const second = gatedSend();
		const fiber = yield* Effect.forkChild(
			operation(
				Effect.all(
					[
						call(exchange("judge", first.send)),
						call(exchange("route", second.send)),
					],
					{ concurrency: "unbounded" },
				),
			),
		);
		yield* Effect.promise(() => first.started);
		yield* Effect.yieldNow;
		yield* TestClock.adjust(40);
		first.answer("answer");

		yield* Effect.promise(() => second.started);
		yield* TestClock.adjust(25);
		second.answer("answer");

		yield* Fiber.join(fiber);
		expect(traces).toEqual([
			expect.objectContaining({ startedAt: at, durationMs: 65 }),
		]);
		expect(
			traces[0]?.calls.map(({ startedAt, durationMs }) => ({
				startedAt,
				durationMs,
			})),
		).toEqual([
			{ startedAt: at, durationMs: 40 },
			{ startedAt: at + 40, durationMs: 25 },
		]);
		// The second call queued behind the first for the whole of its answer.
		expect(traces[0]?.waits).toEqual([{ call: 1, waitMs: 40 }]);
	}),
);

testEffect(
	"anything a transport throws is one ProviderFailure, sent once; a refused check is an InvalidModelOutput",
	() =>
		Effect.gen(function* () {
			const { call, operation, traces } = yield* makeOperations(4);
			let sent = 0;
			const thrown = yield* Effect.exit(
				operation(
					call(
						exchange("route", () => {
							sent++;
							throw Error("socket hang up");
						}),
					),
				),
			);
			expect(sent).toBe(1);
			expect(
				Exit.isFailure(thrown) && thrown.cause.reasons[0],
			).toMatchObject({
				error: expect.any(ProviderFailure),
			});
			const refused = yield* Effect.exit(
				operation(
					call({
						...exchange("route", async () => "answer"),
						check: () =>
							new InvalidModelOutput({
								stage: "route",
								message: "no",
							}),
					}),
				),
			);
			expect(
				Exit.isFailure(refused) && refused.cause.reasons[0],
			).toMatchObject({
				error: expect.any(InvalidModelOutput),
			});
			expect(traces.map(({ calls }) => calls[0]?.failure)).toEqual([
				{ tag: "ProviderFailure", message: "socket hang up" },
				{ tag: "InvalidModelOutput", message: "no" },
			]);
			// A refused answer still cost its tokens.
			expect(traces[1]?.calls[0]?.inputTokens).toBe(10);
		}),
);

testEffect(
	"dumgen.operation and dumgen.call spans name the operation and the call, and carry no payload",
	() =>
		Effect.gen(function* () {
			const spans: {
				name: string;
				parent?: string;
				attributes: unknown;
			}[] = [];
			const tracer = Tracer.make({
				span(options) {
					const span = new Tracer.NativeSpan(options);
					const end = span.end.bind(span);
					span.end = (endTime, exit) => {
						end(endTime, exit);
						spans.push({
							name: span.name,
							...(Option.isSome(span.parent) &&
							span.parent.value._tag === "Span"
								? { parent: span.parent.value.name }
								: {}),
							attributes: Object.fromEntries(span.attributes),
						});
					};
					return span;
				},
			});
			const { call, operation } = yield* makeOperations(2, true);
			yield* operation(
				call(
					exchange("route", async () => ({ secret: "Der Hund" })),
				).pipe(Effect.provideService(CurrentSentence, 3)),
			).pipe(Effect.withTracer(tracer));
			expect(spans).toEqual([
				{
					name: "dumgen.call",
					parent: "dumgen.operation",
					attributes: {
						"dumgen.stage": "route",
						"dumgen.executor": "jev",
						"dumgen.sentence": 3,
					},
				},
				{
					name: "dumgen.operation",
					attributes: { "dumgen.operation": "segment.inUnits" },
				},
			]);
			expect(JSON.stringify(spans)).not.toContain("Der Hund");
		}),
);
