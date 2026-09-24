import { expect, test } from "bun:test";
import { Effect, Exit, Option, Tracer } from "effect";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { intakeFixture } from "./intake-fixture.js";

type Recorded = {
	readonly name: string;
	readonly spanId: string;
	readonly parentId: string | undefined;
	readonly attributes: Map<string, unknown>;
	readonly startTime: bigint;
	endTime?: bigint;
	exit?: Exit.Exit<unknown, unknown>;
};

function recordingTracer() {
	const spans: Recorded[] = [];
	let sequence = 0;
	const tracer = Tracer.make({
		span(name, parent, context, links, startTime, kind) {
			const recorded: Recorded = {
				name,
				spanId: `span-${++sequence}`,
				parentId: Option.getOrUndefined(parent)?.spanId,
				attributes: new Map(),
				startTime,
			};
			spans.push(recorded);
			const span: Tracer.Span = {
				_tag: "Span",
				name,
				spanId: recorded.spanId,
				traceId: "trace",
				parent,
				context,
				links,
				sampled: true,
				kind,
				get status(): Tracer.SpanStatus {
					return recorded.exit && recorded.endTime !== undefined
						? {
								_tag: "Ended",
								startTime,
								endTime: recorded.endTime,
								exit: recorded.exit,
							}
						: { _tag: "Started", startTime };
				},
				attributes: recorded.attributes,
				attribute: (key, value) => recorded.attributes.set(key, value),
				event: () => {},
				addLinks: () => {},
				end: (endTime, exit) => {
					recorded.endTime = endTime;
					recorded.exit = exit;
				},
			};
			return span;
		},
		context: (f) => f(),
	});
	return { spans, tracer };
}

const nanos = (milliseconds: number) =>
	BigInt(Math.round(milliseconds * 1_000_000));

test("an operation opens one span with its ID and each call one span sharing its CallTrace's ID and timing", async () => {
	const { spans, tracer } = recordingTracer();
	const traces: OperationTrace[] = [];
	const intake = intakeFixture({
		items: [
			{ decision: "Accepted", language: "de", stitchedText: "Eins." },
			{ decision: "Accepted", language: "de", stitchedText: "Zwei." },
		],
	});
	const dumgen = createDumgen({
		...intake,
		onOperation: (trace) => traces.push(trace),
	});
	await Effect.runPromise(
		dumgen
			.segment({ sourceSentences: ["Eins.", "Zwei."] })
			.pipe(Effect.withSpan("host"), Effect.withTracer(tracer)),
	);
	const [trace] = traces;
	if (!trace) throw new Error("Expected an OperationTrace.");
	const host = spans.find((span) => span.name === "host");
	const operations = spans.filter((span) => span.name === "dumgen.operation");
	expect(operations).toHaveLength(1);
	const [operation] = operations;
	expect(operation?.parentId).toBe(host?.spanId);
	expect(Object.fromEntries(operation?.attributes ?? [])).toEqual({
		"dumgen.operation.id": trace.id,
		"dumgen.operation": "segment",
	});

	const calls = spans.filter((span) => span.name === "dumgen.call");
	expect(calls).toHaveLength(trace.calls.length);
	expect(trace.calls.length).toBeGreaterThan(0);
	for (const callTrace of trace.calls) {
		const span = calls.find(
			(call) => call.attributes.get("dumgen.call.id") === callTrace.id,
		);
		expect(span?.parentId).toBe(operation?.spanId);
		expect(Object.fromEntries(span?.attributes ?? [])).toEqual({
			"dumgen.call.id": callTrace.id,
			"dumgen.operation.id": trace.id,
			"dumgen.stage": callTrace.request.stage,
			"dumgen.route": callTrace.request.route,
			"dumgen.executor": "TypeSafe",
			"dumgen.transport": "Success",
			"dumgen.validation": "Valid",
		});
		expect(span?.startTime).toBe(
			BigInt(callTrace.startedAt ?? 0) * 1_000_000n,
		);
		expect((span?.endTime ?? 0n) - (span?.startTime ?? 0n)).toBe(
			nanos(callTrace.durationMs),
		);
		expect(span?.exit && Exit.isSuccess(span.exit)).toBe(true);
	}
});

test("a failed call's span fails and the calls it interrupts end interrupted", async () => {
	const { spans, tracer } = recordingTracer();
	const dumgen = createDumgen({
		judge: async (request, options) => {
			const { sourceText } = request.state as { sourceText: string };
			if (sourceText === "Eins.") throw Error("offline");
			return new Promise<never>((_resolve, reject) =>
				options?.signal?.addEventListener("abort", () =>
					reject(Error("Canceled")),
				),
			);
		},
		execute: async () => {
			throw Error("Unexpected stitching");
		},
	});
	await Effect.runPromise(
		Effect.either(
			dumgen
				.segment({ sourceSentences: ["Eins.", "Zwei."] })
				.pipe(Effect.withTracer(tracer)),
		),
	);
	const calls = spans.filter((span) => span.name === "dumgen.call");
	expect(
		calls.map((call) => call.attributes.get("dumgen.transport")).sort(),
	).toEqual(["Failure", "Interrupted"]);
	for (const call of calls) {
		const exit = call.exit;
		if (!exit || Exit.isSuccess(exit))
			throw new Error("Expected a failure.");
		expect(call.attributes.get("dumgen.transport") === "Interrupted").toBe(
			Exit.isInterrupted(exit),
		);
	}
	const [operation] = spans.filter(
		(span) => span.name === "dumgen.operation",
	);
	expect(operation?.exit && Exit.isFailure(operation.exit)).toBe(true);
});
