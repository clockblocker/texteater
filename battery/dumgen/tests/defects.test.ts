import { expect, test } from "bun:test";
import { Cause, Effect, Exit } from "effect";
import { rejectJudgment } from "../src/testing.js";
import type { KnowledgeInput, OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { DumgenFailure } from "../src/universal/failure.js";
import { executeGeneration } from "../src/universal/model.js";
import { operation } from "../src/universal/trace.js";

const input = {
	encounter: {
		sentence: {
			id: "knowledge",
			language: "de",
			segments: [{ kind: "ResolvableText", text: "Bank" }],
		},
		target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
	},
	reading: {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		},
		emojiDescription: "💰",
	},
	request: { definition: null, translations: { en: null } },
} as const satisfies KnowledgeInput<"de">;

/** Model output whose text Dumgen's own check cannot read without throwing. */
const unreadableText = {
	get text(): string {
		throw new TypeError("Cannot read text");
	},
};

function defect(exit: Exit.Exit<unknown, unknown>): unknown {
	if (Exit.isSuccess(exit)) return undefined;
	const failure = Cause.failureOption(exit.cause);
	if (failure._tag === "Some") return undefined;
	return Cause.squash(exit.cause);
}

function generation(
	traces: OperationTrace[],
	validate: (output: unknown) => unknown,
	execute: () => Promise<{ output: unknown }> = async () => ({
		output: "generated",
	}),
) {
	const options = {
		judge: rejectJudgment,
		execute,
		onOperation: (trace: OperationTrace) => traces.push(trace),
	};
	return operation(options)("reading", {}, (scope) =>
		executeGeneration(
			options,
			scope,
			{
				stage: "reading",
				route: "de",
				input: {},
				systemPrompt: "Generate text",
				outputFormat: "text",
				configuration: { model: "luna", settings: {} },
			},
			validate,
			[],
		),
	);
}

test("a TypeError inside an operation is a defect, and its trace says Defect", async () => {
	const traces: OperationTrace[] = [];
	const exit = await Effect.runPromiseExit(
		operation({
			judge: rejectJudgment,
			execute: async () => ({ output: null }),
			onOperation: (trace) => traces.push(trace),
		})("reading", {}, () =>
			Effect.sync(() => {
				throw new TypeError("undefined is not a function");
			}),
		),
	);
	expect(defect(exit)).toBeInstanceOf(TypeError);
	expect(traces[0]).toMatchObject({
		outcome: "Failure",
		failure: { tag: "Defect", message: "undefined is not a function" },
	});
});

test("a TypeError in an output check after transport success is a defect; malformed output stays InvalidModelOutput", async () => {
	const traces: OperationTrace[] = [];
	const exit = await Effect.runPromiseExit(
		generation(traces, () => {
			throw new TypeError("validator bug");
		}),
	);
	expect(defect(exit)).toBeInstanceOf(TypeError);
	expect(traces[0]).toMatchObject({
		outcome: "Failure",
		failure: { tag: "Defect" },
		calls: [{ transport: "Success", validation: "Invalid" }],
	});
	const malformed = await Effect.runPromise(
		Effect.either(
			generation(traces, (output) => {
				throw new DumgenFailure(
					"InvalidModelOutput",
					"reading",
					`Unexpected ${String(output)}`,
				);
			}),
		),
	);
	expect(malformed).toMatchObject({
		_tag: "Left",
		left: { _tag: "InvalidModelOutput" },
	});
	const envelope = await Effect.runPromise(
		Effect.either(
			generation(
				traces,
				(output) => output,
				async () => ({}) as { output: unknown },
			),
		),
	);
	expect(envelope).toMatchObject({
		_tag: "Left",
		left: { _tag: "InvalidModelOutput" },
	});
});

test("NotImplemented and CatalogMiss raised inside an output check keep their tags", async () => {
	for (const tag of ["NotImplemented", "CatalogMiss"] as const) {
		const traces: OperationTrace[] = [];
		const result = await Effect.runPromise(
			Effect.either(
				generation(traces, () => {
					throw new DumgenFailure(tag, "reading", "Not here");
				}),
			),
		);
		expect(result).toMatchObject({ _tag: "Left", left: { _tag: tag } });
		expect(traces[0]?.failure?.tag).toBe(tag);
	}
});

test("a plain Error thrown by the executor is a ProviderFailure", async () => {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		Effect.either(
			generation(
				traces,
				(output) => output,
				async () => {
					throw new TypeError("fetch failed");
				},
			),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "ProviderFailure" },
	});
	expect(traces[0]?.calls[0]?.transport).toBe("Failure");
});

test("a TypeError in one Knowledge aspect fails the operation as a defect instead of appearing in failures", async () => {
	const traces: OperationTrace[] = [];
	const dumgen = createDumgen({
		execute: async (request) => ({
			output:
				(request.input as { aspect: string }).aspect === "definition"
					? unreadableText
					: { text: "bank" },
		}),
		judge: rejectJudgment,
		onOperation: (trace) => traces.push(trace),
	});
	const exit = await Effect.runPromiseExit(dumgen.produceKnowledge(input));
	expect(defect(exit)).toBeInstanceOf(TypeError);
	expect(traces[0]).toMatchObject({
		outcome: "Failure",
		failure: { tag: "Defect" },
	});
});

test("a DumgenFailure in one Knowledge aspect leaves its sibling's contribution in place", async () => {
	const dumgen = createDumgen({
		execute: async (request) => ({
			output:
				(request.input as { aspect: string }).aspect === "definition"
					? { text: 42 }
					: { text: "bank" },
		}),
		judge: rejectJudgment,
	});
	const result = await Effect.runPromise(dumgen.produceKnowledge(input));
	expect(result.changes).toMatchObject([{ aspect: "translations" }]);
	expect(result.failures).toMatchObject([
		{ aspect: "definition", code: "InvalidModelOutput" },
	]);
});

test("a defect after a delivered contribution fails the operation and delivers nothing more", async () => {
	const delivered: unknown[] = [];
	let releaseLate: () => void = () => {};
	const late = new Promise<void>((resolve) => (releaseLate = resolve));
	const dumgen = createDumgen({
		execute: async (request) => {
			const { aspect, language } = request.input as {
				aspect: string;
				language?: string;
			};
			if (aspect === "definition")
				return { output: { text: "Ein Geldinstitut." } };
			if (language === "en") {
				// Fails only once the definition has been delivered.
				while (!delivered.length)
					await new Promise((resolve) => setTimeout(resolve, 1));
				return { output: unreadableText };
			}
			await late;
			return { output: { text: "банк" } };
		},
		judge: rejectJudgment,
		onKnowledgeContribution: (changes) => {
			delivered.push(...changes);
			if (delivered.length === 1) setTimeout(releaseLate, 5);
		},
	});
	const exit = await Effect.runPromiseExit(
		dumgen.produceKnowledge({
			...input,
			request: { definition: null, translations: { en: null, ru: null } },
		}),
	);
	expect(defect(exit)).toBeInstanceOf(TypeError);
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect(delivered).toMatchObject([{ aspect: "definition" }]);
});
