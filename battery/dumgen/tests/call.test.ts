import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import {
	type Exchange,
	type OperationOptions,
	requestBudget,
	runOperation,
} from "../src/call.js";
import { InvalidModelOutput, ProviderFailure } from "../src/errors.js";
import type { OperationTrace } from "../src/operation-trace.js";

/** Options for one operation over a fresh budget, keeping the traces it reports. */
function operationOptions(permits: number, payloads = false) {
	const traces: OperationTrace[] = [];
	const options: OperationOptions = {
		budget: requestBudget(permits),
		payloads,
		onOperation: (trace) => traces.push(trace),
	};
	return { options, traces };
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
	const { options, traces } = operationOptions(1);
	const transport = hanging();
	let queuedSent = false;
	const fiber = Effect.runFork(
		runOperation("segment.inUnits", options, (scope) =>
			Effect.all(
				[
					scope.call(exchange("first", transport.send("first"))),
					scope.call(
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
	const { options, traces } = operationOptions(1);
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
		runOperation("segment.inUnits", options, (scope) =>
			Effect.all(
				[
					scope.call(exchange("judge", send, "jev")),
					scope.call(exchange("write", send, "luna")),
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

test("anything a transport throws is one ProviderFailure, sent once; a refused check is an InvalidModelOutput", async () => {
	const { options, traces } = operationOptions(4);
	let sent = 0;
	const thrown = await Effect.runPromiseExit(
		runOperation("segment.inUnits", options, (scope) =>
			scope.call(
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
		runOperation("segment.inUnits", options, (scope) =>
			scope.call({
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
	const { options } = operationOptions(2, true);
	await Effect.runPromise(
		runOperation("segment.inUnits", options, (scope) =>
			scope.call({
				...exchange("route", async () => ({ secret: "Der Hund" })),
				sentence: 3,
			}),
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
