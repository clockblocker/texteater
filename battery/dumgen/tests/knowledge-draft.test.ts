import { expect, test } from "bun:test";
import { Effect } from "effect";
import {
	draftKnowledge,
	knowledgeDraftFingerprint,
} from "../src/concrete-lang/de/knowledge-production/draft.js";
import type {
	DumgenOptions,
	KnowledgeInput,
	OperationTrace,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { choiceAnswers } from "./execution-fixture.js";

const input = {
	encounter: {
		sentence: {
			id: "draft",
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
		emojiDescription: "🏦",
	},
	request: { definition: null, translations: { en: null } },
} as const satisfies KnowledgeInput<"de">;
const unexpectedJudge: DumgenOptions["judge"] = async () => {
	throw Error("Unexpected judgment");
};

async function fixtureDraft() {
	return {
		sourceFingerprint: await knowledgeDraftFingerprint(
			input.encounter,
			input.reading.lemma,
		),
		texts: [
			{ aspect: "definition", text: "Ein Geldinstitut." },
			{ aspect: "translations", language: "en", text: "bank" },
		],
	};
}

test("text and relation drafts start concurrently, anchored on the Lemma and sentence, without publication", async () => {
	const started = Promise.withResolvers<void>();
	const release = Promise.withResolvers<void>();
	const calls: string[] = [];
	const traces: OperationTrace[] = [];
	let publications = 0;
	const pending = Effect.runPromise(
		draftKnowledge(
			{
				execute: async (request) => {
					const state = request.input as {
						aspect?: string;
						lemma?: { canonicalForm?: string };
						markedContext?: string;
						reading?: unknown;
					};
					expect(state.lemma?.canonicalForm).toBe("Bank");
					expect(state.reading).toBeUndefined();
					if (state.aspect !== "transcription")
						expect(state.markedContext).toContain("<TARGET>");
					calls.push(state.aspect ?? "relations");
					if (calls.length === 3) started.resolve();
					await release.promise;
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
				judge: unexpectedJudge,
				onKnowledgeContribution: () => publications++,
				onOperation: (trace) => traces.push(trace),
			},
			{
				encounter: input.encounter,
				lemma: input.reading.lemma,
				request: {
					...input.request,
					semanticRelations: { synonym: null },
				},
			},
		),
	);
	await started.promise;
	expect(calls.sort()).toEqual(["definition", "relations", "translations"]);
	expect(publications).toBe(0);
	release.resolve();
	const draft = await pending;
	expect(draft.texts).toHaveLength(2);
	expect(draft.relations?.candidates).toEqual(["Geldinstitut"]);
	expect(traces[0]?.calls).toHaveLength(3);
	expect(traces[0]?.calls.every((call) => call.dependsOn.length === 0)).toBe(
		true,
	);
});

test("complete drafts publish with zero review or regeneration calls", async () => {
	let calls = 0;
	let checks = 0;
	const dumgen = createDumgen({
		knowledgeDraft: await fixtureDraft(),
		execute: async () => {
			calls++;
			throw Error("Draft was unnecessarily regenerated");
		},
		judge: async () => {
			checks++;
			throw Error("Production must not review generated text");
		},
	});
	const result = await Effect.runPromise(dumgen.produceKnowledge(input));
	expect(result.failures).toEqual([]);
	expect(result.changes).toHaveLength(2);
	expect(calls).toBe(0);
	expect(checks).toBe(0);
});

test("missing draft leaves generate once without reviewing completed siblings", async () => {
	const generated: unknown[] = [];
	const result = await Effect.runPromise(
		createDumgen({
			knowledgeDraft: {
				...(await fixtureDraft()),
				texts: (await fixtureDraft()).texts.slice(0, 1),
			},
			execute: async (request) => {
				generated.push(request.input);
				return { output: { text: "financial institution" } };
			},
			judge: unexpectedJudge,
		}).produceKnowledge(input),
	);
	expect(generated).toHaveLength(1);
	expect(generated[0]).toMatchObject({
		aspect: "translations",
		language: "en",
	});
	expect(result.changes).toHaveLength(2);
	expect(result.failures).toEqual([]);
});

test("drafts from another occurrence cannot cross the source boundary", async () => {
	let generated = 0;
	const result = await Effect.runPromise(
		createDumgen({
			knowledgeDraft: {
				...(await fixtureDraft()),
				sourceFingerprint: "other occurrence",
			},
			execute: async () => {
				generated++;
				return { output: { text: "bank" } };
			},
			judge: unexpectedJudge,
		}).produceKnowledge(input),
	);
	expect(generated).toBe(2);
	expect(result.failures).toEqual([]);
});

test("draft failure preserves successful siblings and leaves fallback generation possible", async () => {
	const draft = await Effect.runPromise(
		draftKnowledge(
			{
				execute: async (request) => {
					if (
						(request.input as { aspect: string }).aspect ===
						"definition"
					)
						throw Error("offline");
					return { output: { text: "bank" } };
				},
				judge: unexpectedJudge,
			},
			{
				encounter: input.encounter,
				lemma: input.reading.lemma,
				request: input.request,
			},
		),
	);
	expect(draft.texts).toEqual([
		{ aspect: "translations", language: "en", text: "bank" },
	]);
});

test("unclassified relation candidates receive their first Kind and relation decisions", async () => {
	const result = await Effect.runPromise(
		createDumgen({
			knowledgeDraft: {
				...(await fixtureDraft()),
				relations: {
					requested: ["synonym"],
					candidates: ["Geldinstitut"],
				},
			},
			execute: async () => {
				throw Error("Candidate discovery repeated");
			},
			judge: async (request) =>
				choiceAnswers(request.questions, (name) =>
					name.startsWith("kind_") ? "NOUN" : "synonym",
				),
		}).produceKnowledge({
			...input,
			request: { semanticRelations: { synonym: null } },
		}),
	);
	expect(result.failures).toEqual([]);
	expect(result.pendingRelations).toHaveLength(1);
});

test("transcription drafts see only the Lemma while sense texts see the Lemma and marked context", async () => {
	const inputs: Record<string, unknown>[] = [];
	await Effect.runPromise(
		draftKnowledge(
			{
				execute: async (request) => {
					inputs.push(request.input as Record<string, unknown>);
					return { output: { text: "x" } };
				},
				judge: unexpectedJudge,
			},
			{
				encounter: input.encounter,
				lemma: input.reading.lemma,
				request: { transcription: null, definition: null },
			},
		),
	);
	const transcription = inputs.find(
		(item) => item.aspect === "transcription",
	);
	const definition = inputs.find((item) => item.aspect === "definition");
	expect(transcription).toEqual({
		lemma: input.reading.lemma,
		aspect: "transcription",
	});
	expect(definition).toMatchObject({
		lemma: input.reading.lemma,
		markedContext: "<TARGET>Bank</TARGET>",
	});
	expect(definition).not.toHaveProperty("reading");
});

test("drafts written for another Lemma are not reused", async () => {
	let generated = 0;
	const result = await Effect.runPromise(
		createDumgen({
			knowledgeDraft: {
				...(await fixtureDraft()),
				sourceFingerprint: await knowledgeDraftFingerprint(
					input.encounter,
					{ ...input.reading.lemma, canonicalForm: "Banke" },
				),
			},
			execute: async () => {
				generated++;
				return { output: { text: "bank" } };
			},
			judge: unexpectedJudge,
		}).produceKnowledge(input),
	);
	expect(generated).toBe(2);
	expect(result.failures).toEqual([]);
});
