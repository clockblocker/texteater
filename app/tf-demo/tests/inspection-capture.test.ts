import { expect, test } from "bun:test";
import type { OperationTrace } from "dumgen/types";
import * as Effect from "effect/Effect";
import {
	inspectionJson,
	inspectionPayloadChunks,
} from "../convex/model/inspection";
import { createInspectionCapture } from "../server/inspectionCapture";

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
	await expect(
		capture.promise("Commit", "app/tf-demo", { reading: "Bank" }, () =>
			Promise.reject(failure),
		),
	).rejects.toBe(failure);
	expect(capture.steps[0]).toMatchObject({
		status: "Failure",
		kind: "Code",
		parentId: capture.parentId,
	});
	expect(JSON.parse(capture.steps[0]?.payloadJson ?? "null")).toEqual({
		input: { reading: "Bank" },
		error: { name: "Error", message: "Dictionary conflict" },
	});
	const result = await Effect.runPromise(
		Effect.either(
			capture.effect(
				"Prepare",
				"battery/dumdict",
				{},
				Effect.fail("invalid"),
			),
		),
	);
	expect(result._tag).toBe("Left");
	expect(capture.steps[1]?.status).toBe("Failure");
});

test("parallel provider spans preserve start offsets, parents and invalid-output failures", () => {
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
	capture.operation(trace);
	expect(
		capture.steps.map((step) => [
			step.kind,
			step.startedAt,
			step.durationMs,
			step.parentId,
		]),
	).toEqual([
		["Code", 1000, 80, capture.parentId],
		["LLM", 1010, 40, "operation"],
		["TypeSafe", 1020, 40, "operation"],
	]);
	expect(capture.steps[2]?.status).toBe("Failure");
	expect(
		JSON.parse(capture.steps[1]?.payloadJson ?? "null").input.systemPrompt,
	).toBe("Prompt");
	expect(
		JSON.parse(capture.steps[1]?.payloadJson ?? "null").input.signal,
	).toBeUndefined();
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
	await capture.promise(
		"Publish",
		"app/tf-demo",
		{},
		async () => {
			capture.failure(
				"Publication failed",
				"battery/dumdict",
				{ reading: "Bank" },
				new Error("Invalid plan"),
			);
			return null;
		},
		true,
	);
	expect(capture.steps.map((step) => step.status)).toEqual([
		"Failure",
		"Failure",
	]);
	expect(
		JSON.parse(capture.steps[0]?.payloadJson ?? "null").error.message,
	).toBe("Invalid plan");
});
