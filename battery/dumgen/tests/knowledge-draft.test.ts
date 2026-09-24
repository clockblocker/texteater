import { expect, test } from "bun:test";
import { Effect } from "effect";
import {
	draftKnowledge,
	knowledgeDraftFingerprint,
	translationFormClause,
} from "../src/concrete-lang/de/knowledge-production/draft.js";
import {
	draftTranslationOperationExperiment,
	reviewedAlternatives,
} from "../src/concrete-lang/de/knowledge-production/draft-translations/experiment.js";
import { choiceAnswers } from "../src/testing.js";
import type {
	DumgenOptions,
	KnowledgeInput,
	OperationTrace,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

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
/** Draft requests carry tagged text, so the prompt names the aspect. */
function draftAspect(request: { stage: string; systemPrompt: string }) {
	if (request.stage === "draftRelationCandidates") return "relations";
	if (request.systemPrompt.includes("IPA")) return "transcription";
	return request.systemPrompt.startsWith("Write a concise German definition")
		? "definition"
		: "translations";
}
function draftLanguage(request: { systemPrompt: string }) {
	return request.systemPrompt.match(/^Translate into (\w+)/)?.[1];
}

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
					const aspect = draftAspect(request);
					expect(request.outputFormat).toBe("text");
					expect(request.input).toStartWith(
						"<target_lemma>Bank</target_lemma>\n<marked_sentence><TARGET>Bank</TARGET></marked_sentence>",
					);
					calls.push(aspect);
					if (calls.length === 3) started.resolve();
					await release.promise;
					return {
						output:
							aspect === "definition"
								? "Ein Geldinstitut."
								: aspect === "relations"
									? "Geldinstitut\n Geldinstitut \n\nSparkasse"
									: "bank",
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
	expect(draft.relations?.candidates).toEqual(["Geldinstitut", "Sparkasse"]);
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
					if (draftAspect(request) === "definition")
						throw Error("offline");
					return { output: "bank" };
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

test("transcription drafts see only the headword while sense texts see the headword and marked sentence", async () => {
	const inputs: Record<string, unknown> = {};
	await Effect.runPromise(
		draftKnowledge(
			{
				execute: async (request) => {
					inputs[draftAspect(request)] = request.input;
					return { output: "x" };
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
	expect(inputs).toEqual({
		transcription: "<target_lemma>Bank</target_lemma>",
		definition:
			"<target_lemma>Bank</target_lemma>\n<marked_sentence><TARGET>Bank</TARGET></marked_sentence>",
	});
});

test("an empty draft reply leaves the aspect for fallback generation", async () => {
	const draft = await Effect.runPromise(
		draftKnowledge(
			{
				execute: async () => ({ output: "  \n" }),
				judge: unexpectedJudge,
			},
			{
				encounter: input.encounter,
				lemma: input.reading.lemma,
				request: { definition: null },
			},
		),
	);
	expect(draft.texts).toEqual([]);
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

test("draft and fallback translations both ask for the target-language dictionary form", async () => {
	const prompts: Record<string, string> = {};
	const execute: DumgenOptions["execute"] = async (request) => {
		if (request.stage === "draftKnowledge") {
			prompts[`draftKnowledge/${draftLanguage(request)}`] =
				request.systemPrompt;
			return { output: "bank" };
		}
		const state = request.input as { aspect?: string; language?: string };
		if (state.aspect === "translations")
			prompts[`${request.stage}/${state.language}`] =
				request.systemPrompt;
		return { output: { text: "bank" } };
	};
	await Effect.runPromise(
		draftKnowledge(
			{ execute, judge: unexpectedJudge },
			{
				encounter: input.encounter,
				lemma: input.reading.lemma,
				request: { translations: { en: null, ru: null } },
			},
		),
	);
	await Effect.runPromise(
		createDumgen({ execute, judge: unexpectedJudge }).produceKnowledge({
			...input,
			request: { translations: { ru: null } },
		}),
	);
	const keys = Object.keys(prompts).sort();
	expect(keys).toHaveLength(3);
	expect(keys.filter((key) => key.startsWith("draftKnowledge/"))).toEqual([
		"draftKnowledge/en",
		"draftKnowledge/ru",
	]);
	for (const key of keys)
		expect(prompts[key]).toContain(
			translationFormClause(key.endsWith("/en") ? "en" : "ru"),
		);
});

test("the draft translation corpus runs through draftKnowledge and its evaluator separates reviewed answers", async () => {
	const experiment = draftTranslationOperationExperiment({
		execute: async () => {
			throw Error("offline");
		},
		judge: unexpectedJudge,
	});
	const cases = Object.entries(experiment.corpus.cases);
	expect(cases).toHaveLength(24);
	expect(Object.keys(reviewedAlternatives).sort()).toEqual(
		cases.map(([id]) => id).sort(),
	);
	expect(experiment.evaluation.cases).toHaveLength(24);
	for (const [id, example] of cases) {
		const ideal = example.idealOutput.translations;
		const languages: string[] = [];
		const run = draftTranslationOperationExperiment({
			execute: async (request) => {
				const language = draftLanguage(request) as "en" | "ru";
				languages.push(language);
				return { output: ideal[language] ?? "" };
			},
			judge: unexpectedJudge,
		});
		const output = await run.run(example.input, {
			signal: new AbortController().signal,
			recordTrace: () => {},
		});
		expect(languages.sort(), id).toEqual(["en", "ru"]);
		const evaluate = (translations: typeof output.translations) =>
			run.evaluator({
				caseId: id,
				input: example.input,
				output: { translations },
				idealOutput: example.idealOutput,
			});
		expect(evaluate(output.translations), id).toMatchObject({
			contractPass: true,
			exactMatch: true,
		});
		const reviewed = reviewedAlternatives[id];
		for (const language of ["en", "ru"] as const) {
			for (const accepted of reviewed?.accepted[language] ?? [])
				expect(
					evaluate({ ...ideal, [language]: accepted }).contractPass,
					`${id} ${language} ${accepted}`,
				).toBe(true);
			for (const rejected of reviewed?.rejected[language] ?? [])
				expect(
					evaluate({ ...ideal, [language]: rejected }).contractPass,
					`${id} ${language} ${rejected}`,
				).toBe(false);
		}
		expect(evaluate({ ...ideal, en: "unreviewed wording" })).toMatchObject({
			contractPass: null,
			needsReview: true,
		});
		expect(evaluate({ ...ideal, ru: null }).contractPass).toBe(false);
	}
});
