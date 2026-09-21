import { expect, test } from "bun:test";
import { Effect, Fiber } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import expectedOutcomes from "../src/concrete-lang/de/knowledge-production/evaluation/operation-outcomes.json";
import { knowledgeInputSchema } from "../src/schemas.js";
import type {
	KnowledgeInput,
	KnowledgeProduction,
	OperationTrace,
} from "../src/types.js";
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
test("independent text generation starts concurrently", async () => {
	const expectedCalls = 4;
	let enteredCalls = 0;
	let releaseCalls: () => void = () => {};
	const release = new Promise<void>((resolve) => (releaseCalls = resolve));
	let allEntered: () => void = () => {};
	const entered = new Promise<void>((resolve) => (allEntered = resolve));
	const dumgen = createDumgen({
		execute: async (request) => {
			enteredCalls++;
			if (enteredCalls === expectedCalls) allEntered();
			await release;
			const { aspect, language } = request.input as {
				aspect: string;
				language?: string;
			};
			return { output: { text: language ?? aspect } };
		},
		judge: async () => {
			throw Error("Unexpected judgment");
		},
	});
	const production = Effect.runPromise(
		dumgen.produceKnowledge({
			...input,
			request: {
				definition: null,
				transcription: null,
				translations: { en: null, ru: null },
			},
		}),
	);
	const startedTogether = await Promise.race([
		entered.then(() => true),
		new Promise<false>((resolve) => setTimeout(() => resolve(false), 25)),
	]);
	releaseCalls();
	await production;
	expect(startedTogether).toBe(true);
	expect(enteredCalls).toBe(expectedCalls);
});

test("validated text is emitted while a sibling is still pending, with only projected model context", async () => {
	const contributions: KnowledgeProduction["changes"][number][] = [];
	const slow = Promise.withResolvers<void>();
	const emitted = Promise.withResolvers<void>();
	const dumgen = createDumgen({
		execute: async (request) => {
			const state = request.input as { aspect: string };
			expect(request.input).not.toHaveProperty("encounter");
			expect(request.input).not.toHaveProperty("members");
			expect(request.input).toHaveProperty(
				"markedContext",
				"<TARGET>Bank</TARGET>",
			);
			if (state.aspect === "translations") {
				expect(request.systemPrompt).toContain(
					"Translate only the unit marked by <TARGET>",
				);
				await slow.promise;
				return { output: { text: "bank", unexpected: true } };
			}
			return { output: { text: "Ein Geldinstitut." } };
		},
		judge: async () => {
			throw Error("Unexpected judgment");
		},
		onKnowledgeContribution: (changes) => {
			contributions.push(...changes);
			emitted.resolve();
		},
	});
	let completed = false;
	const production = Effect.runPromise(
		dumgen.produceKnowledge({
			...input,
			request: { definition: null, translations: { en: null } },
		}),
	).then((result) => {
		completed = true;
		return result;
	});
	await emitted.promise;
	expect(completed).toBe(false);
	expect(contributions).toEqual([
		{
			kind: "Contribute",
			aspect: "definition",
			value: "Ein Geldinstitut.",
		},
	]);
	slow.resolve();
	const result = await production;
	expect(contributions).toEqual([...result.changes]);
	expect(result.failures).toMatchObject([
		{ aspect: "translations", code: "InvalidModelOutput" },
	]);
});
test.each(["DET", "PRON"] as const)(
	"incomplete authored %s retains stored contributions without generation",
	async (kind) => {
		const index = authoredMembers.findIndex(
			(member) => member.lemma.kind === kind,
		);
		const member = authoredMembers[index];
		if (!member) throw Error(`Missing authored ${kind}`);
		const translations = { ...member.knowledge.translations };
		delete translations.ru;
		const semanticRelations = { ...member.coverage.semanticRelations };
		delete semanticRelations.synonym;
		// Simulate a damaged catalog without depending on a real content gap.
		authoredMembers[index] = {
			...member,
			knowledge: { ...member.knowledge, translations },
			coverage: { ...member.coverage, semanticRelations },
		};
		let calls = 0;
		const unexpected = async (): Promise<never> => {
			calls++;
			throw Error("Unexpected provider call");
		};
		try {
			const result = await Effect.runPromise(
				createDumgen({
					execute: unexpected,
					judge: unexpected,
				}).produceKnowledge(
					knowledgeInputSchema.parse({
						encounter: {
							...input.encounter,
							target: {
								family: "Lexeme",
								kind,
								memberSegmentIndices: [0],
							},
						},
						reading: member.reading,
						request: {
							definition: null,
							translations: { ru: null },
							semanticRelations: { synonym: null },
						},
					}),
				),
			);
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]).toMatchObject({
				aspect: "definition",
				value: member.knowledge.definition,
			});
			expect(result.failures).toMatchObject([
				{ aspect: "translations", leaf: "ru", code: "CatalogMiss" },
				{
					aspect: "semanticRelations",
					leaf: "synonym",
					code: "CatalogMiss",
				},
			]);
			expect(calls).toBe(0);
		} finally {
			authoredMembers[index] = member;
		}
	},
);
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

test("all three retained Family corpora run through production Knowledge with complete traces", async () => {
	const { getExperiment } = await import("../src/development.js");
	const { knowledgeOperationExperiment } = await import(
		"../src/evaluation/knowledge-operation.js"
	);
	const { knowledgeFixture } = await import("./knowledge-fixture.js");
	let count = 0;
	for (const family of ["lexeme", "phraseme", "morpheme"]) {
		const definition = getExperiment(`knowledge-analysis/de/${family}`);
		for (const [id, example] of Object.entries(
			definition.source.goldenCorpus?.cases ?? {},
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
	expect(count).toBe(69);
}, 30000);
