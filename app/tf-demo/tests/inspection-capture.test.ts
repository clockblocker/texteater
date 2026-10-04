import { expect, test } from "bun:test";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import { inspectionPayloadChunks } from "../convex/model/inspection";
import {
	createInspectionCapture,
	dumgenTracing,
	inspected,
	inspectionStep,
	operationSteps,
	spanHops,
	withoutPayloads,
} from "../server/inspectionCapture";
import { inspectionJson } from "../server/inspectionPayload";

test("capture preserves repeated linguistic values and redacts credentials", () => {
	const lemma = { canonicalForm: "Bank" };
	const cyclic: Record<string, unknown> = { lemma };
	cyclic.self = cyclic;
	const result = JSON.parse(
		inspectionJson({
			input: lemma,
			output: lemma,
			cyclic,
			apiKey: "secret",
			headers: { authorization: "secret" },
		}),
	);
	expect(result.input).toEqual(result.output);
	expect(result.cyclic.self).toBe("[Circular reference]");
	expect(JSON.stringify(result)).not.toContain("secret");
});

test("failed code steps retain their input and error without changing the failure", async () => {
	const capture = createInspectionCapture();
	const failure = new Error("Dictionary conflict");
	const result = await Effect.runPromise(
		Effect.result(
			inspected(
				Effect.tryPromise(() => Promise.reject(failure)).pipe(
					Effect.withSpan(
						"Commit",
						inspectionStep("app/tf-demo", { reading: "Bank" }),
					),
				),
				capture,
			),
		),
	);
	expect(result).toMatchObject({
		_tag: "Failure",
		failure: { cause: failure },
	});
	expect(capture.steps[0]).toMatchObject({
		name: "Commit",
		owner: "app/tf-demo",
		status: "Failure",
		kind: "Code",
	});
	expect(capture.steps[0]?.parentId).toBeUndefined();
	expect(JSON.parse(capture.steps[0]?.payloadJson ?? "null")).toEqual({
		input: { reading: "Bank" },
		error: { name: "Error", message: "Dictionary conflict" },
	});
	await Effect.runPromise(
		Effect.result(
			inspected(
				Effect.fail("invalid").pipe(
					Effect.withSpan(
						"Prepare",
						inspectionStep("battery/dumdict"),
					),
				),
				capture,
			),
		),
	);
	await Effect.runPromise(
		Effect.exit(
			inspected(
				Effect.interrupt.pipe(
					Effect.withSpan("Wait", inspectionStep("app/tf-demo")),
				),
				capture,
			),
		),
	);
	expect(capture.steps.map((step) => step.status)).toEqual([
		"Failure",
		"Failure",
		"Interrupted",
	]);
});

test("steps hang under their action's root", async () => {
	const capture = createInspectionCapture();
	await Effect.runPromise(
		inspected(
			Effect.void.pipe(
				Effect.withSpan("Resolve", inspectionStep("app/tf-demo")),
				Effect.withSpan("Session", {
					...inspectionStep("app/tf-demo", { session: 1 }),
					root: true,
				}),
			),
			capture,
		),
	);
	const root = capture.steps.find((step) => step.name === "Session");
	expect(root?.parentId).toBeUndefined();
	expect(capture.steps.map((step) => [step.name, step.parentId])).toEqual([
		["Resolve", root?.id],
		["Session", undefined],
	]);
});

test("without the inspection Tracer, spans keep their inputs and outputs unserialized", async () => {
	let serialized = 0;
	const value = {
		toJSON() {
			serialized++;
			return "value";
		},
	};
	const capture = createInspectionCapture();
	const step = Effect.succeed(value).pipe(
		Effect.withSpan("Persist", {
			...inspectionStep("app/tf-demo", value),
			root: true,
		}),
	);
	await Effect.runPromise(inspected(step));
	expect(serialized).toBe(0);
	expect(capture.steps).toEqual([]);
	await Effect.runPromise(inspected(step, capture));
	expect(serialized).toBe(2);
	expect(JSON.parse(capture.steps[0]?.payloadJson ?? "null")).toEqual({
		input: "value",
		output: "value",
	});
});

test("steps start on the wall clock when Effect's clock drifts from it", async () => {
	// An Effect clock three hours behind the wall clock that advances 250 ms
	// on every reading, as a long-lived executor's drifted span clock would.
	const wall = Effect.runSync(Clock.clockWith(Effect.succeed));
	let reading = 0n;
	const currentTimeNanosUnsafe = () =>
		BigInt(Date.now() - 3 * 60 * 60 * 1000) * 1_000_000n +
		250_000_000n * reading++;
	const drifted: Clock.Clock = {
		currentTimeMillisUnsafe: () =>
			Number(currentTimeNanosUnsafe() / 1_000_000n),
		currentTimeMillis: Effect.sync(() =>
			Number(currentTimeNanosUnsafe() / 1_000_000n),
		),
		currentTimeNanosUnsafe,
		currentTimeNanos: Effect.sync(currentTimeNanosUnsafe),
		monotonicTimeNanosUnsafe: () => wall.monotonicTimeNanosUnsafe(),
		monotonicTimeNanos: wall.monotonicTimeNanos,
		sleep: (duration) => wall.sleep(duration),
	};
	const capture = createInspectionCapture();
	const before = Date.now();
	await Effect.runPromise(
		inspected(
			Effect.void.pipe(
				Effect.withSpan("Persist", inspectionStep("app/tf-demo")),
				Effect.provideService(Clock.Clock, drifted),
			),
			capture,
		),
	);
	const after = Date.now();
	expect(capture.steps[0]?.startedAt).toBeGreaterThanOrEqual(before);
	expect(capture.steps[0]?.startedAt).toBeLessThanOrEqual(after);
	expect(capture.steps[0]?.durationMs).toBe(250);
});

test("large Unicode payloads survive chunking without truncation or broken surrogates", () => {
	const payload = `${"a".repeat(31_999)}🧗${"ב".repeat(150_000)}`;
	const chunks = inspectionPayloadChunks(payload);
	expect(chunks.length).toBeGreaterThan(2);
	expect(chunks.join("")).toBe(payload);
	for (const chunk of chunks) expect(chunk.isWellFormed()).toBe(true);
});

test("handled pipeline failures stay visible even when the action returns normally", async () => {
	const capture = createInspectionCapture();
	await Effect.runPromise(
		inspected(
			Effect.flatMap(Effect.context<never>(), (services) =>
				Effect.sync(() =>
					spanHops(services).failure(
						"Publication failed",
						"battery/dumdict",
						{ reading: "Bank" },
						new Error("Invalid plan"),
					),
				),
			).pipe(
				Effect.withSpan("Publish", {
					...inspectionStep("app/tf-demo"),
					root: true,
				}),
			),
			capture,
		),
	);
	expect(
		capture.steps.map((step) => [step.name, step.status, step.parentId]),
	).toEqual([
		["Publication failed", "Failure", capture.steps[1]?.id],
		["Publish", "Failure", undefined],
	]);
	expect(
		JSON.parse(capture.steps[0]?.payloadJson ?? "null").error.message,
	).toBe("Invalid plan");
});

test("a promise hop becomes a step under its services' span and rethrows its own error", async () => {
	const capture = createInspectionCapture();
	const failure = new Error("Mutation failed");
	const rejected = await Effect.runPromise(
		inspected(
			Effect.flatMap(Effect.context<never>(), (services) =>
				Effect.promise(() =>
					spanHops(services)
						.hop("Save", "app/tf-demo", { step: 1 }, () =>
							Promise.reject(failure),
						)
						.catch((error: unknown) => error),
				),
			).pipe(
				Effect.withSpan("Session", {
					...inspectionStep("app/tf-demo"),
					root: true,
				}),
			),
			capture,
		),
	);
	expect(rejected).toBe(failure);
	expect(
		capture.steps.map((step) => [step.name, step.status, step.parentId]),
	).toEqual([
		["Save", "Failure", capture.steps[1]?.id],
		["Session", "Success", undefined],
	]);
});

test("an OperationTrace renders as its operation, its calls and its budget waits (#885)", () => {
	const trace = {
		operation: "segment.inUnits",
		startedAt: 1_000,
		durationMs: 90,
		calls: [
			{
				stage: "segments",
				sentence: 0,
				executor: "jev",
				inputTokens: 20,
				outputTokens: 1,
				startedAt: 1_000,
				durationMs: 40,
				payload: { request: { q: 1 }, response: { a: 1 } },
			},
			{
				stage: "segments",
				sentence: 1,
				executor: "jev",
				inputTokens: 0,
				outputTokens: 0,
				startedAt: 1_050,
				durationMs: 30,
				failure: { tag: "ProviderFailure", message: "jev is down" },
				payload: { request: { q: 2 } },
			},
		],
		waits: [{ call: 1, waitMs: 10 }],
		sentences: [
			{ sentence: 0, outcome: "Segmented" },
			{
				sentence: 1,
				outcome: "Failed",
				failure: { tag: "ProviderFailure", message: "jev is down" },
			},
		],
	} as const;
	const steps = operationSteps(trace, "root");
	const [operation, ...rows] = steps;
	expect(operation).toMatchObject({
		parentId: "root",
		name: "segment.inUnits",
		status: "Partial",
		startedAt: 1_000,
		durationMs: 90,
	});
	expect(
		rows.map(({ parentId, name, kind, status, startedAt, durationMs }) => ({
			parentId,
			name,
			kind,
			status,
			startedAt,
			durationMs,
		})),
	).toEqual([
		{
			parentId: operation?.id,
			name: "segments · Sentence 0",
			kind: "TypeSafe",
			status: "Success",
			startedAt: 1_000,
			durationMs: 40,
		},
		{
			parentId: operation?.id,
			name: "Wait for the request budget",
			kind: "Code",
			status: "Success",
			startedAt: 1_040,
			durationMs: 10,
		},
		{
			parentId: operation?.id,
			name: "segments · Sentence 1",
			kind: "TypeSafe",
			status: "Failure",
			startedAt: 1_050,
			durationMs: 30,
		},
	]);
	expect(JSON.parse(rows[0]?.payloadJson ?? "null")).toMatchObject({
		input: { q: 1 },
		output: { a: 1 },
		tokens: { input: 20, output: 1 },
	});
	expect(JSON.parse(rows[2]?.payloadJson ?? "null")).toMatchObject({
		input: { q: 2 },
		budgetWaitMs: 10,
		failure: { tag: "ProviderFailure" },
	});
	expect(JSON.stringify(withoutPayloads(trace))).not.toContain("payload");
});

test("Dumgen keeps payloads only under DEV inspection (#885)", () => {
	expect(dumgenTracing(undefined).tracePayloads).toBe(false);
	expect(dumgenTracing(createInspectionCapture()).tracePayloads).toBe(true);
});

test("a click that came out is a successful operation, its dropped guessed call shown as interrupted", () => {
	const call = {
		executor: "luna",
		inputTokens: 0,
		outputTokens: 0,
		startedAt: 1_000,
		durationMs: 20,
	} as const;
	const trace = {
		operation: "resolve.grammar",
		startedAt: 1_000,
		durationMs: 60,
		calls: [
			{
				...call,
				stage: "canonical",
				failure: { tag: "Interrupted", message: "aborted" },
			},
			{ ...call, stage: "grammar", executor: "jev" },
			{ ...call, stage: "canonical" },
		],
		waits: [],
		sentences: [],
		resolution: { outcome: "Resolved" },
	} as const;
	const [operation, ...rows] = operationSteps(trace, "root");
	expect(operation?.status).toBe("Success");
	expect(rows.map(({ status }) => status)).toEqual([
		"Interrupted",
		"Success",
		"Success",
	]);
	const { resolution: _resolution, ...failedClick } = trace;
	expect(operationSteps(failedClick, "root")[0]?.status).toBe("Interrupted");
});
