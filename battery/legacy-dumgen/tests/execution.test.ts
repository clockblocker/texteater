import { expect, test } from "bun:test";
import { Effect } from "effect";
import {
	choice,
	type SystemOneResult,
	type TypeSafeExecutor,
} from "promptsmith/typesafe";
import type { DumgenOptions, OperationTrace } from "../src/types.js";
import { DumgenFailure } from "../src/universal/failure.js";
import { judgmentCaller } from "../src/universal/judgment.js";
import { executeGeneration } from "../src/universal/model.js";
import { operation, recordEvent } from "../src/universal/trace.js";

const judge: TypeSafeExecutor = async (request, options) => {
	expect(options?.retry?.maxRetries).toBe(0);
	return {
		model: "jev-reported",
		usage: { input_tokens: 12, output_tokens: 3 },
		answers: Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => {
				if (question.type !== "choice")
					throw Error("Only Choice fixtures");
				const keys = Object.keys(question.criteria);
				return [
					id,
					{
						type: "choice",
						choice: keys[0],
						confidence: 0.01,
						probabilities: Object.fromEntries(
							keys.map((key, i) => [key, i === 0 ? 1 : 0]),
						),
					},
				];
			}),
		),
	} as SystemOneResult<typeof request.questions>;
};
function fixture() {
	const traces: OperationTrace[] = [];
	const options: DumgenOptions = {
		judge,
		execute: async () => ({
			output: "generated",
			metadata: {
				model: "luna-reported",
				usage: { input_tokens: 7, output_tokens: 2 },
			},
		}),
		onOperation: (trace) => traces.push(trace),
	};
	return { options, traces };
}

test("complete operations retain both executors, dependencies, low confidence and all raw metadata", async () => {
	const { options, traces } = fixture();
	const run = operation(options)(
		"recognition",
		{ text: "example" },
		(scope) =>
			Effect.gen(function* () {
				const { id, output: answer } = yield* judgmentCaller(options)(
					"reading",
					"de",
					{ candidates: ["existing"] },
					{
						selection: choice("Which Reading fits?", {
							NoMatch: null,
							existing: null,
							Unresolved: null,
						}),
					},
					scope,
					[],
				);
				expect(answer.answers.selection.choice).toBe("NoMatch");
				const { output } = yield* executeGeneration(
					options,
					scope,
					{
						stage: "reading",
						route: "de",
						input: "example",
						systemPrompt: "Generate text",
						outputSchema: { type: "string" },
						configuration: {
							model: "luna-configured",
							settings: {},
						},
					},
					(raw) => {
						if (typeof raw !== "string")
							throw Error("Expected string");
						return raw;
					},
					[id],
				);
				recordEvent(scope, "CollisionFold", { existing: output });
				return output;
			}),
	);
	expect(await Effect.runPromise(run)).toBe("generated");
	const trace = traces[0];
	expect(trace?.outcome).toBe("Success");
	expect(trace?.startedAt).toBeGreaterThan(0);
	for (const call of trace?.calls ?? []) {
		expect(call.startedAt).toBeGreaterThanOrEqual(trace?.startedAt ?? 0);
		expect(call.durationMs).toBeGreaterThanOrEqual(0);
	}
	expect(trace?.calls.map((call) => call.executor)).toEqual([
		"TypeSafe",
		"Luna",
	]);
	expect<unknown>(trace?.calls[1]?.dependsOn).toEqual([trace?.calls[0]?.id]);
	expect(trace?.calls[0]?.output).toMatchObject({
		model: "jev-reported",
		usage: { input_tokens: 12 },
	});
	expect(trace?.calls[1]?.metadata).toMatchObject({ model: "luna-reported" });
	expect(trace?.events).toHaveLength(1);
	expect(
		trace?.calls.every((call) => /^[a-f0-9]{64}$/.test(call.fingerprint)),
	).toBe(true);
});

test("provider success and invalid output remain distinct from the final operation outcome", async () => {
	const { options, traces } = fixture();
	const run = operation(options)("grammar", {}, (scope) =>
		Effect.gen(function* () {
			yield* judgmentCaller(options)(
				"grammar",
				"de",
				{},
				{ form: choice("Form?", { Fin: null, Inf: null }) },
				scope,
				[],
			);
			throw new DumgenFailure(
				"Unresolved",
				"grammar",
				"Contradictory applicable features",
			);
		}),
	);
	expect((await Effect.runPromise(Effect.either(run)))._tag).toBe("Left");
	expect(traces[0]).toMatchObject({
		outcome: "Failure",
		failure: { tag: "Unresolved" },
		calls: [{ transport: "Success", validation: "Valid" }],
	});
	const malformed = {
		...options,
		judge: (async () => ({ answers: {} })) as unknown as TypeSafeExecutor,
	};
	await Effect.runPromise(
		Effect.either(
			operation(malformed)("grammar", {}, (scope) =>
				judgmentCaller(malformed)(
					"grammar",
					"de",
					{},
					{ form: choice("Form?", { Fin: null, Inf: null }) },
					scope,
					[],
				),
			),
		),
	);
	expect(traces[1]).toMatchObject({
		outcome: "Failure",
		failure: { tag: "InvalidModelOutput" },
		calls: [{ transport: "Success", validation: "Invalid" }],
	});
});

test("cancellation interrupts the Effect and prevents dependent generation", async () => {
	const { options, traces } = fixture();
	let generationCalls = 0;
	let entered!: () => void;
	const started = new Promise<void>((resolve) => {
		entered = resolve;
	});
	const blocking: DumgenOptions = {
		...options,
		judge: (_request, requestOptions) =>
			new Promise((_resolve, reject) => {
				entered();
				requestOptions?.signal?.addEventListener(
					"abort",
					() => reject(Error("Canceled")),
					{ once: true },
				);
			}),
		execute: async () => {
			generationCalls++;
			return { output: "bad" };
		},
	};
	const controller = new AbortController();
	const run = operation(blocking)("reading", {}, (scope) =>
		Effect.gen(function* () {
			const { id } = yield* judgmentCaller(blocking)(
				"reading",
				"de",
				{},
				{ fit: choice("Fits?", { Yes: null, No: null }) },
				scope,
				[],
			);
			return yield* executeGeneration(
				blocking,
				scope,
				{
					stage: "reading",
					route: "de",
					input: {},
					systemPrompt: "Never",
					outputSchema: {},
					configuration: { model: "luna", settings: {} },
				},
				(output) => output,
				[id],
			);
		}),
	);
	const result = Effect.runPromiseExit(run, { signal: controller.signal });
	await started;
	controller.abort();
	expect((await result)._tag).toBe("Failure");
	await Promise.resolve();
	expect(generationCalls).toBe(0);
	expect(traces[0]?.outcome).toBe("Interrupted");
});
