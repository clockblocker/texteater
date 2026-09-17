import { expect, test } from "bun:test";
import { Effect, Fiber } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import expectedOutcomes from "../src/concrete-lang/de/knowledge-production/evaluation/operation-outcomes.json";
import type { KnowledgeInput, OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { choiceAnswers } from "./execution-fixture.js";

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
	request: {
		definition: null,
		translations: { en: null },
		semanticRelations: { synonym: null },
	},
} as const satisfies KnowledgeInput<"de">;
test("independent text survives relation transport failure with attributable partial evidence", async () => {
	const traces: OperationTrace[] = [];
	const dumgen = createDumgen({
		execute: async (request) => {
			const state = request.input as { aspect?: string };
			return {
				output: state.aspect
					? {
							text:
								state.aspect === "definition"
									? "Ein Geldinstitut."
									: "bank",
						}
					: { candidates: ["Geldinstitut"] },
			};
		},
		judge: async () => {
			throw Error("offline");
		},
		onOperation: (trace) => traces.push(trace),
	});
	const result = await Effect.runPromise(dumgen.produceKnowledge(input));
	expect(result.changes).toHaveLength(2);
	expect(result.pendingRelations).toEqual([]);
	expect(result.failures).toMatchObject([
		{
			aspect: "semanticRelations",
			leaf: "synonym",
			code: "ProviderFailure",
		},
	]);
	expect(traces[0]?.outcome).toBe("Partial");
	expect(traces[0]?.calls.map((call) => call.executor)).toEqual([
		"Luna",
		"Luna",
		"Luna",
		"TypeSafe",
	]);
	expect(traces[0]?.calls[3]?.dependsOn).toEqual([
		traces[0]?.calls[2]?.id,
	] as string[]);
});
test("Kind and relation decisions reject cross-Family/None, retain valid siblings and expose uncertainty", async () => {
	const candidates = [
		"Geldinstitut",
		"Geld auf die Seite legen",
		"Wolke",
		"Sparkasse",
		"Unklar",
	];
	const dumgen = createDumgen({
		execute: async () => ({ output: { candidates } }),
		judge: async ({ questions }) =>
			choiceAnswers(
				questions,
				(id) =>
					({
						kind_0: "NOUN",
						relation_0: "synonym",
						kind_1: "OtherFamily",
						relation_1: "synonym",
						kind_2: "Unresolved",
						relation_2: "None",
						kind_3: "PROPN",
						relation_3: "synonym",
						kind_4: "NOUN",
						relation_4: "Unresolved",
					})[id as "kind_0"],
			),
	});
	const result = await Effect.runPromise(
		dumgen.produceKnowledge({
			...input,
			request: { semanticRelations: { synonym: null } },
		}),
	);
	expect(result.pendingRelations.map((item) => item.target)).toEqual([
		{
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Geldinstitut",
		},
		{
			language: "de",
			family: "Lexeme",
			kind: "PROPN",
			canonicalForm: "Sparkasse",
		},
	]);
	expect(result.failures).toMatchObject([
		{
			aspect: "semanticRelations",
			candidate: "Unklar",
			code: "Unresolved",
		},
	]);
	expect(result.changes).toEqual([]);
});
test("empty discovery and null base text are no contribution, never ReviewedEmpty", async () => {
	const dumgen = createDumgen({
		execute: async (request) => ({
			output:
				"aspect" in (request.input as object)
					? { text: null }
					: { candidates: [] },
		}),
		judge: async () => {
			throw Error("Unexpected judgment");
		},
	});
	expect(await Effect.runPromise(dumgen.produceKnowledge(input))).toEqual({
		changes: [],
		pendingRelations: [],
		failures: [],
	});
});
test("malformed text leaf is not salvaged and valid independent translation survives", async () => {
	const dumgen = createDumgen({
		execute: async (request) => ({
			output:
				(request.input as { aspect: string }).aspect === "definition"
					? { text: "A definition", extra: "invalid" }
					: { text: "bank" },
		}),
		judge: async () => {
			throw Error("Unexpected judgment");
		},
	});
	const result = await Effect.runPromise(
		dumgen.produceKnowledge({
			...input,
			request: { definition: null, translations: { en: null } },
		}),
	);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["bank"],
		},
	]);
	expect(result.failures).toMatchObject([
		{ aspect: "definition", code: "InvalidModelOutput" },
	]);
});
test("Closed missing leaves retain reviewed independent contributions without generation", async () => {
	const member = authoredMembers.find(
		(member) =>
			member.lemma.kind === "DET" &&
			member.knowledge.definition &&
			!member.knowledge.translations?.ru,
	);
	if (!member)
		throw Error(
			"Expected authored determiner with a missing Russian translation",
		);
	let calls = 0;
	const dumgen = createDumgen({
		execute: async () => {
			calls++;
			throw Error("Unexpected generation");
		},
		judge: async () => {
			calls++;
			throw Error("Unexpected judgment");
		},
	});
	const result = await Effect.runPromise(
		dumgen.produceKnowledge({
			encounter: {
				...input.encounter,
				target: {
					family: "Lexeme",
					kind: "DET",
					memberSegmentIndices: [0],
				},
			},
			reading: member.reading,
			request: { definition: null, translations: { ru: null } },
		} as KnowledgeInput<"de">),
	);
	expect(result.changes).toHaveLength(1);
	expect(result.failures).toMatchObject([
		{ aspect: "translations", leaf: "ru", code: "CatalogMiss" },
	]);
	expect(calls).toBe(0);
});
test("interruption retains evidence of completed independent work and starts no dependent judgments", async () => {
	const traces: OperationTrace[] = [];
	let judgeCalls = 0;
	let started: () => void = () => {};
	const entered = new Promise<void>((resolve) => (started = resolve));
	const dumgen = createDumgen({
		execute: async (request) => {
			if ((request.input as { aspect: string }).aspect === "definition")
				return { output: { text: "Ein Geldinstitut." } };
			started();
			await new Promise<void>((resolve) =>
				request.signal.addEventListener("abort", () => resolve(), {
					once: true,
				}),
			);
			request.signal.throwIfAborted();
			return { output: { candidates: [] } };
		},
		judge: async () => {
			judgeCalls++;
			throw Error("Unexpected judgment");
		},
		onOperation: (trace) => traces.push(trace),
	});
	const fiber = Effect.runFork(
		dumgen.produceKnowledge({
			...input,
			request: { definition: null, semanticRelations: { synonym: null } },
		}),
	);
	await entered;
	await Effect.runPromise(Fiber.interrupt(fiber));
	expect(judgeCalls).toBe(0);
	expect(traces[0]?.outcome).toBe("Interrupted");
	expect(
		traces[0]?.events.some(
			(event) =>
				event.kind === "KnowledgeContributions" &&
				(event.data as { changes: unknown[] }).changes.length === 1,
		),
	).toBe(true);
});

test("all four retained Family corpora run through production Knowledge with complete traces", async () => {
	const { getExperiment } = await import("../src/development.js");
	const { knowledgeOperationExperiment } = await import(
		"../src/evaluation/knowledge-operation.js"
	);
	const { knowledgeFixture } = await import("./knowledge-fixture.js");
	let count = 0;
	for (const family of ["lexeme", "phraseme", "morpheme", "construction"]) {
		const definition = getExperiment(`knowledge-analysis/de/${family}`);
		for (const [id, example] of Object.entries(
			definition.promptSource.goldenCorpus?.cases ?? {},
		)) {
			const fixture = knowledgeFixture(example.idealOutput),
				traces: OperationTrace[] = [];
			const experiment = knowledgeOperationExperiment(definition, {
				...fixture,
				onOperation: (trace) => traces.push(trace),
			});
			if (Object.hasOwn(expectedOutcomes, id)) {
				await expect(
					experiment.run(example.input, {
						signal: new AbortController().signal,
						recordTrace: () => {},
					}),
				).rejects.toMatchObject({ _tag: "CatalogMiss" });
				expect(traces[0]?.calls).toHaveLength(0);
				count++;
				continue;
			}
			const output = (await experiment.run(example.input, {
				signal: new AbortController().signal,
				recordTrace: () => {},
			})) as { failures: unknown[] };
			expect(output.failures, id).toEqual([]);
			expect(traces[0]?.operation, id).toBe("produceKnowledge");
			count++;
		}
	}
	expect(count).toBe(70);
}, 30000);
