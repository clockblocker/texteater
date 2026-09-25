import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChange } from "dumrel";
import { Effect, Fiber } from "effect";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import expectedOutcomes from "../src/concrete-lang/de/knowledge-production/evaluation/operation-outcomes.json";
import { markedContextEncounter } from "../src/evaluation/knowledge-operation.js";
import { knowledgeInputSchema } from "../src/schemas.js";
import { choiceAnswers } from "../src/testing.js";
import type {
	DumgenOptions,
	KnowledgeInput,
	KnowledgeProduction,
	OperationTrace,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

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

test("all retained Knowledge corpora run through production Knowledge with complete traces", async () => {
	const { getExperiment } = await import("../src/development.js");
	const { knowledgeOperationExperiment } = await import(
		"../src/evaluation/knowledge-operation.js"
	);
	const { knowledgeFixture } = await import("../src/testing.js");
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

const governor = {
	encounter: {
		sentence: {
			id: "government",
			language: "de",
			segments: [
				{ kind: "OpaqueText", text: "Er " },
				{ kind: "ResolvableText", text: "wartet" },
				{ kind: "OpaqueText", text: " auf den Bus." },
			],
		},
		target: { family: "Lexeme", kind: "VERB", memberSegmentIndices: [1] },
	},
	reading: {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "warten",
			coreFeatures: {
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		emojiDescription: "⏳",
	},
	request: { definition: null },
} as const satisfies KnowledgeInput<"de">;
const adposition = (
	canonicalForm: string,
	governedCase: "Acc" | "Dat" | null,
): Dumling.Lemma<"de", "Lexeme", "ADP"> => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {
		abbr: null,
		adpType: "Prep",
		extPos: null,
		foreign: null,
		governedCase,
		partType: null,
	},
});
const verb = (
	canonicalForm: string,
	lexicallyReflexive: "Yes" | null = null,
): Dumling.Lemma<"de", "Lexeme", "VERB"> => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix: null, lexicallyReflexive, verbType: null },
});
const angst: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Angst",
	coreFeatures: { gender: "Fem", hyph: null },
};
/** A new Reading's Knowledge run in `markedContext`, asking for its frame. */
const newReading = (
	markedContext: string,
	lemma: Dumling.Lemma<"de">,
	request: KnowledgeInput<"de">["request"] = { valency: null },
) =>
	({
		encounter: markedContextEncounter(markedContext, lemma),
		reading: { unitKind: "Reading", lemma, emojiDescription: "💬" },
		request,
	}) as KnowledgeInput<"de">;
type ModelRequest = Parameters<DumgenOptions["execute"]>[0];
/** A Knowledge call stubbed to propose `frame` and text for other aspects. */
const proposing = (frame: unknown, seen: ModelRequest[] = []) =>
	createDumgen({
		execute: async (request) => {
			seen.push(request);
			const { aspect } = request.input as { aspect?: string };
			return {
				output:
					aspect === "valency"
						? { valency: frame }
						: { text: "Text." },
			};
		},
		judge: async () => {
			throw Error("No judgment expected");
		},
	});
const nom = {
	status: "Required",
	complement: { kind: "Case", case: "Nom", referent: "Someone" },
} as const;
const prepositionSlot = (
	status: "Required" | "Optional",
	preposition: string,
	governedCase: "Acc" | "Dat",
	referent: "Someone" | "Something" | "Either",
) => ({
	status,
	complement: {
		kind: "Preposition" as const,
		preposition,
		case: governedCase,
		referent,
	},
});
/** The same Slot with its preposition resolved to the ADP Lemma. */
const stored = (
	slot: ReturnType<typeof prepositionSlot>,
	fixedCase: "Acc" | "Dat" | null = null,
) => ({
	...slot,
	complement: {
		...slot.complement,
		preposition: adposition(slot.complement.preposition, fixedCase),
	},
});

test("the Knowledge call that creates a Reading proposes its whole frame, and a free adjunct is no slot", async () => {
	const seen: ModelRequest[] = [];
	const auf = prepositionSlot("Optional", "auf", "Acc", "Either");
	const result = await Effect.runPromise(
		proposing([nom, auf], seen).produceKnowledge(
			newReading("Er <TARGET>wartet</TARGET> im Regen.", verb("warten")),
		),
	);
	expect(result).toEqual({
		changes: [
			{
				kind: "Contribute",
				aspect: "valency",
				value: [nom, stored(auf)],
			},
		],
		pendingRelations: [],
		failures: [],
	});
	expect(seen).toHaveLength(1);
	const [call] = seen;
	expect(call?.input).toMatchObject({
		aspect: "valency",
		markedContext: "Er <TARGET>wartet</TARGET> im Regen.",
	});
	expect(call?.input).not.toHaveProperty("encounter");
	for (const criterion of [
		"the subject included, in E-VALBU order",
		"Required",
		"Optional",
		"im Regen in Er wartet im Regen",
		"wohnen in/bei/auf",
		"no slot for sich in sich gewöhnen an",
		"separable prefix",
		"auf den Keks is wording",
	])
		expect(call?.systemPrompt).toContain(criterion);
	const schema = JSON.stringify(call?.outputSchema);
	expect(schema).toContain('"Nom"');
	expect(schema).toContain('"Preposition"');
});

test("a lexical reflexive gets no slot and a Required preposition keeps its status", async () => {
	const an = prepositionSlot("Required", "an", "Acc", "Either");
	const result = await Effect.runPromise(
		proposing([nom, an]).produceKnowledge(
			newReading(
				"Ich habe mich an die Kälte <TARGET>gewöhnt</TARGET>.",
				verb("sich gewöhnen", "Yes"),
			),
		),
	);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "valency", value: [nom, stored(an)] },
	]);
});

test("a noun's frame is offered and keeps only governed prepositions", async () => {
	const seen: ModelRequest[] = [];
	const vor = prepositionSlot("Optional", "vor", "Dat", "Either");
	const result = await Effect.runPromise(
		proposing(
			[
				{
					status: "Optional",
					complement: {
						kind: "Case",
						case: "Gen",
						referent: "Someone",
					},
				},
				vor,
			],
			seen,
		).produceKnowledge(
			newReading(
				"Er blieb aus <TARGET>Angst</TARGET> vor Hunden zu Hause.",
				angst,
			),
		),
	);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "valency", value: [stored(vor)] },
	]);
	expect(result.failures).toEqual([]);
	expect(seen[0]?.systemPrompt).toContain("it has no subject slot");
	expect(JSON.stringify(seen[0]?.outputSchema)).not.toContain('"Nom"');
});

test("Dumrel drops the invalid Slots of a proposed frame and keeps the rest of the run", async () => {
	const traces: OperationTrace[] = [];
	const auf = prepositionSlot("Optional", "auf", "Acc", "Either");
	const invalid = [
		prepositionSlot("Optional", "für", "Dat", "Something"),
		{ ...nom, status: "Optional" },
		prepositionSlot("Optional", "wegen", "Dat", "Something"),
		{ status: "Maybe", complement: nom.complement },
		"auf",
	];
	const dumgen = createDumgen({
		execute: async (request) => ({
			output:
				(request.input as { aspect: string }).aspect === "valency"
					? { valency: [nom, ...invalid, auf] }
					: { text: "Auf etwas harren." },
		}),
		judge: async () => {
			throw Error("No judgment expected");
		},
		onOperation: (trace) => traces.push(trace),
	});
	const result = await Effect.runPromise(
		dumgen.produceKnowledge(
			newReading("Er <TARGET>wartet</TARGET>.", verb("warten"), {
				definition: null,
				valency: null,
			}),
		),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "definition",
			value: "Auf etwas harren.",
		},
		{ kind: "Contribute", aspect: "valency", value: [nom, stored(auf)] },
	]);
	const dropped = traces[0]?.events.find(
		(event) => event.kind === "DroppedValencySlots",
	)?.data as { dropped: { slot: unknown }[] };
	expect(dropped.dropped.map(({ slot }) => slot)).toEqual(invalid);

	const malformed = await Effect.runPromise(
		proposing({ slots: [] }).produceKnowledge(
			newReading("Er <TARGET>wartet</TARGET>.", verb("warten"), {
				definition: null,
				valency: null,
			}),
		),
	);
	expect(malformed.changes).toEqual([
		{ kind: "Contribute", aspect: "definition", value: "Text." },
	]);
	expect(malformed.failures).toMatchObject([
		{ aspect: "valency", code: "InvalidModelOutput" },
	]);
});

test("a sentence Contributes the governed preposition a proposed frame omits", async () => {
	const bei = prepositionSlot("Optional", "bei", "Dat", "Someone");
	const fuer = prepositionSlot("Optional", "für", "Acc", "Either");
	const bedanken = newReading(
		"Sie <TARGET>bedankt</TARGET> sich für die Hilfe.",
		verb("sich bedanken", "Yes"),
	);
	const attestedGovernment = [{ preposition: "für", case: "Acc" as const }];
	const omitted = await Effect.runPromise(
		proposing([nom, bei]).produceKnowledge({
			...bedanken,
			attestedGovernment,
		}),
	);
	expect(omitted.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "valency",
			value: [nom, stored(bei, "Dat")],
		},
		{ kind: "Contribute", aspect: "valency", value: [stored(fuer, "Acc")] },
	]);
	let knowledge = {};
	for (const change of omitted.changes) {
		const applied = applyKnowledgeChange({
			source: bedanken.reading,
			knowledge,
			change,
		});
		if (!applied.success) throw applied.error;
		knowledge = applied.value;
	}
	expect(knowledge).toEqual({
		valency: [nom, stored(bei, "Dat"), stored(fuer, "Acc")],
	});

	const proposed = prepositionSlot("Optional", "für", "Acc", "Something");
	const covered = await Effect.runPromise(
		proposing([nom, bei, proposed]).produceKnowledge({
			...bedanken,
			attestedGovernment,
		}),
	);
	expect(covered.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "valency",
			value: [nom, stored(bei, "Dat"), stored(proposed, "Acc")],
		},
	]);
});

test("government a later sentence attests is Contributed as Optional Slots without a model call, resolves to ADP Lemmas, keeps fixed cases and publishes only at the end", async () => {
	const incremental: unknown[] = [];
	const aspects: unknown[] = [];
	const result = await Effect.runPromise(
		createDumgen({
			execute: async (request) => {
				aspects.push((request.input as { aspect?: string }).aspect);
				return { output: { text: "Auf etwas harren." } };
			},
			judge: async () => {
				throw Error("No judgment expected");
			},
			onKnowledgeContribution: (changes) =>
				incremental.push(...changes.map((change) => change.aspect)),
		}).produceKnowledge({
			...governor,
			attestedGovernment: [
				{ preposition: "auf", case: "Acc" },
				{ preposition: "für", case: "Dat" },
				{ preposition: "auf", case: "Acc" },
			],
		}),
	);
	expect(aspects).toEqual(["definition"]);
	expect(result.failures).toEqual([]);
	expect(
		result.changes.find((change) => change.aspect === "valency"),
	).toEqual({
		kind: "Contribute",
		aspect: "valency",
		value: [
			stored(prepositionSlot("Optional", "auf", "Acc", "Either")),
			stored(prepositionSlot("Optional", "für", "Acc", "Either"), "Acc"),
		],
	});
	expect(incremental).toEqual(["definition"]);
});

test("no attested government is no contribution, and an unlisted preposition is an attributable failure", async () => {
	const run = (
		attestedGovernment: KnowledgeInput<"de">["attestedGovernment"],
	) =>
		Effect.runPromise(
			createDumgen({
				execute: async () => {
					throw Error("No generation expected");
				},
				judge: async () => {
					throw Error("No judgment expected");
				},
			}).produceKnowledge({
				...governor,
				request: {},
				attestedGovernment,
			}),
		);
	expect(await run([])).toEqual({
		changes: [],
		pendingRelations: [],
		failures: [],
	});
	const invalid = await run([{ preposition: "wegen", case: "Gen" }]);
	expect(invalid.changes).toEqual([]);
	expect(invalid.failures).toMatchObject([
		{ aspect: "valency", code: "InvalidInput" },
	]);
});

test("the valency corpus runs through production Knowledge and its evaluator ignores only referents and order", async () => {
	const { valencyOperationExperiment, evaluateValencyFrame } = await import(
		"../src/concrete-lang/de/knowledge-production/valency/experiment.js"
	);
	const { knowledgeFixture } = await import("../src/testing.js");
	const offline = valencyOperationExperiment({
		execute: async () => {
			throw Error("offline");
		},
		judge: async () => {
			throw Error("offline");
		},
	});
	const cases = Object.entries(offline.corpus.cases);
	expect(cases).toHaveLength(8);
	expect(offline.evaluation.cases).toHaveLength(8);
	for (const [id, example] of cases) {
		const output = await valencyOperationExperiment(
			knowledgeFixture(example.idealOutput),
		).run(example.input, {
			signal: new AbortController().signal,
			recordTrace: () => {},
		});
		expect(output, id).toEqual(example.idealOutput);
	}
	const ideal = [nom, prepositionSlot("Optional", "auf", "Acc", "Either")];
	expect(evaluateValencyFrame(ideal, ideal)).toEqual({
		contractPass: true,
		referentPass: true,
		exactMatch: true,
	});
	expect(
		evaluateValencyFrame(
			[prepositionSlot("Optional", "auf", "Acc", "Something"), nom],
			ideal,
		),
	).toEqual({ contractPass: true, referentPass: false, exactMatch: false });
	expect(
		evaluateValencyFrame(
			[nom, prepositionSlot("Required", "auf", "Acc", "Either")],
			ideal,
		).contractPass,
	).toBe(false);
	expect(evaluateValencyFrame([nom], ideal).contractPass).toBe(false);
});
