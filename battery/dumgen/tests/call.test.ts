import { expect, test } from "bun:test";
import * as Clock from "effect/Clock";
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
function operations(permits: number, payloads = false) {
	const traces: OperationTrace[] = [];
	const budget = Effect.runSync(
		Effect.provide(RequestBudget, RequestBudget.layer(permits)),
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

/** A transport that answers only once its signal aborts, `settleMs` later. */
function hanging() {
	const aborted: string[] = [];
	const settled: string[] = [];
	const send = (stage: string) => (signal: AbortSignal) =>
		new Promise<never>((_, reject) =>
			signal.addEventListener("abort", () => {
				aborted.push(stage);
				setTimeout(() => {
					settled.push(stage);
					reject(Error(`${stage} aborted`));
				}, 20);
			}),
		);
	return { aborted, settled, send };
}

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

test("interrupting an operation aborts its calls in flight and waits until they settle; a queued call starts nothing", async () => {
	const { call, operation, traces } = operations(1);
	const transport = hanging();
	let queuedSent = false;
	const fiber = Effect.runFork(
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
	await tick();
	expect(transport.aborted).toEqual([]);
	await Effect.runPromise(Fiber.interrupt(fiber));
	const exit = await Effect.runPromise(Fiber.await(fiber));
	expect(Exit.isFailure(exit)).toBe(true);
	expect(transport.aborted).toEqual(["first"]);
	// The interruption returned only once the call had settled.
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
});

test("one budget serves jev and Luna together, and a call that queued records its wait", async () => {
	const { call, operation, traces } = operations(1);
	let inFlight = 0;
	let most = 0;
	const send = async () => {
		inFlight++;
		most = Math.max(most, inFlight);
		await tick(10);
		inFlight--;
		return "answer";
	};
	await Effect.runPromise(
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
	expect(most).toBe(1);
	const [trace] = traces;
	expect(trace?.calls.map(({ executor }) => executor)).toEqual([
		"jev",
		"luna",
	]);
	expect(trace?.waits).toEqual([{ call: 1, waitMs: expect.any(Number) }]);
	expect(trace?.waits[0]?.waitMs).toBeGreaterThan(5);
});

/** A transport whose answer takes `ms` of the test clock's time to arrive. */
const answersAfter =
	(clock: TestClock.TestClock, ms: number) => async (): Promise<string> => {
		await Effect.runPromise(clock.adjust(ms));
		return "answer";
	};

test("an operation's trace reads its times from Effect's Clock", async () => {
	const { call, operation, traces } = operations(1);
	const at = Date.UTC(2026, 9, 22, 12);
	await Effect.runPromise(
		Effect.scoped(
			Effect.gen(function* () {
				const clock = yield* TestClock.make();
				yield* clock.setTime(at);
				yield* operation(
					Effect.all(
						[
							call(exchange("judge", answersAfter(clock, 40))),
							call(exchange("route", answersAfter(clock, 25))),
						],
						{ concurrency: "unbounded" },
					),
				).pipe(Effect.provideService(Clock.Clock, clock));
			}),
		),
	);
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
});

test("anything a transport throws is one ProviderFailure, sent once; a refused check is an InvalidModelOutput", async () => {
	const { call, operation, traces } = operations(4);
	let sent = 0;
	const thrown = await Effect.runPromiseExit(
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
	expect(Exit.isFailure(thrown) && thrown.cause.reasons[0]).toMatchObject({
		error: expect.any(ProviderFailure),
	});
	const refused = await Effect.runPromiseExit(
		operation(
			call({
				...exchange("route", async () => "answer"),
				check: () =>
					new InvalidModelOutput({ stage: "route", message: "no" }),
			}),
		),
	);
	expect(Exit.isFailure(refused) && refused.cause.reasons[0]).toMatchObject({
		error: expect.any(InvalidModelOutput),
	});
	expect(traces.map(({ calls }) => calls[0]?.failure)).toEqual([
		{ tag: "ProviderFailure", message: "socket hang up" },
		{ tag: "InvalidModelOutput", message: "no" },
	]);
	// A refused answer still cost its tokens.
	expect(traces[1]?.calls[0]?.inputTokens).toBe(10);
});

test("dumgen.operation and dumgen.call spans name the operation and the call, and carry no payload", async () => {
	const spans: { name: string; parent?: string; attributes: unknown }[] = [];
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
	const { call, operation } = operations(2, true);
	await Effect.runPromise(
		operation(
			call(exchange("route", async () => ({ secret: "Der Hund" }))).pipe(
				Effect.provideService(CurrentSentence, 3),
			),
		).pipe(Effect.withTracer(tracer)),
	);
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
});
