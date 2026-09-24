import { expect, test } from "bun:test";
import type { OperationTrace } from "dumgen/types";
import * as Effect from "effect/Effect";
import {
	inspectionJson,
	inspectionPayloadChunks,
} from "../convex/model/inspection";
import {
	createInspectionCapture,
	inspected,
	inspectionStep,
	spanHops,
} from "../server/inspectionCapture";

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
		Effect.either(
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
	expect(result).toMatchObject({ _tag: "Left", left: { error: failure } });
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
		Effect.either(
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

test("steps hang under their action's root and a Dumgen operation under the root that ran it", async () => {
	const capture = createInspectionCapture();
	const configuration = { model: "test", settings: {} };
	const trace: OperationTrace = {
		version: 2,
		id: "operation",
		operation: "resolveGrammar",
		input: { text: "Banken" },
		startedAt: 1000,
		durationMs: 80,
		generationConfiguration: configuration,
		judgmentConfiguration: configuration,
		events: [],
		outcome: "Failure",
		calls: [0, 1].map((index) => ({
			id: `call-${index}`,
			operationId: "operation",
			executor: index === 0 ? "Luna" : "TypeSafe",
			dependsOn: [],
			fingerprint: "fingerprint",
			request: {
				stage: `stage-${index}`,
				route: "de",
				systemPrompt: "Prompt",
				input: {},
				outputSchema: {},
				configuration,
				signal: new AbortController().signal,
			},
			startedAt: 1010 + index * 10,
			durationMs: 40,
			output: { answer: index },
			transport: "Success",
			validation: index === 0 ? "Valid" : "Invalid",
		})),
	};
	await Effect.runPromise(
		inspected(
			Effect.sync(() => capture.operation(trace)).pipe(
				Effect.withSpan("dumgen.operation", {
					attributes: { "dumgen.operation.id": "operation" },
				}),
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
	expect(
		capture.steps.map((step) => [
			step.name,
			step.kind,
			step.startedAt,
			step.durationMs,
			step.parentId,
		]),
	).toEqual([
		["resolveGrammar", "Code", 1000, 80, root?.id],
		["stage-0", "LLM", 1010, 40, "operation"],
		["stage-1", "TypeSafe", 1020, 40, "operation"],
		["Resolve", "Code", expect.any(Number), expect.any(Number), root?.id],
		["Session", "Code", expect.any(Number), expect.any(Number), undefined],
	]);
	expect(capture.steps[2]?.status).toBe("Failure");
	expect(
		JSON.parse(capture.steps[1]?.payloadJson ?? "null").input.systemPrompt,
	).toBe("Prompt");
	expect(
		JSON.parse(capture.steps[1]?.payloadJson ?? "null").input.signal,
	).toBeUndefined();
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
			Effect.flatMap(Effect.runtime<never>(), (runtime) =>
				Effect.sync(() =>
					spanHops(runtime).failure(
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

test("a promise hop becomes a step under the runtime's span and rethrows its own error", async () => {
	const capture = createInspectionCapture();
	const failure = new Error("Mutation failed");
	const rejected = await Effect.runPromise(
		inspected(
			Effect.flatMap(Effect.runtime<never>(), (runtime) =>
				Effect.promise(() =>
					spanHops(runtime)
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
