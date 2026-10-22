import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import { checkPromptCitations, rules } from "dumcorpus";
import { authoredReading } from "dumcorpus/inventories";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import {
	accumulationPromptTexts,
	occurrenceTranslationPrompt,
} from "../../src/knowledge/de/accumulation-prompts.js";
import type {
	AccumulateTranslationsInput,
	TranslationAccumulation,
} from "../../src/knowledge/types.js";
import type { LunaAsk } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { liveOver } from "../live-over.js";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	knowledgeLunaInput,
} from "./support.js";

const noun = {
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Strauß",
	coreFeatures: { gender: "Masc" },
};

/** An accumulation input for the bouquet Reading in one Sentence. */
function bouquet(
	translations: AccumulateTranslationsInput["translations"],
): AccumulateTranslationsInput {
	const { reading, attestation, sentence } = knowledgeInput(
		noun,
		"💐",
		"Sie bekam einen Strauß zum Geburtstag.",
		["Strauß"],
	);
	return { language: "de", reading, attestation, sentence, translations };
}

/** Luna's answer: the Sentence's translation, then the equivalents. */
const writes = (...equivalents: string[]) => ({
	translationAccumulation: {
		sentence: "She got a bunch of flowers for her birthday.",
		equivalents,
	},
});

async function accumulateOnce(
	models: { readonly jev: JevAsk; readonly luna: LunaAsk },
	input: AccumulateTranslationsInput,
): Promise<{
	readonly result: TranslationAccumulation;
	readonly trace: OperationTrace | undefined;
}> {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		operations.knowledge.accumulateTranslations(input).pipe(
			Effect.provide(
				liveOver({
					...models,
					onOperation: (trace) => traces.push(trace),
				}),
			),
		),
	);
	return { result, trace: traces[0] };
}

const criteriaOf = (question: Question | undefined) =>
	question?.type === "choice" ? question.criteria : {};

test("jev sees the stored translations bare beside the marked Sentence, and its pick ends the language with no Luna call", async () => {
	const jev = knowledgeJev({ translation: "t1" });
	const luna = knowledgeLuna(writes("bouquet"));
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		bouquet({ en: ["bouquet", "bunch of flowers", "Bouquet "] }),
	);
	expect(result).toEqual({ changes: [], failures: [] });
	expect(luna.sent).toEqual([]);
	const [request] = jev.sent;
	expect(request?.stage).toBe("translationCoverage");
	expect(request?.state).toMatchObject({
		markedSentence:
			"Sie bekam einen <TARGET>Strauß</TARGET> zum Geburtstag.",
		language: "en",
		reading: { lemma: "Strauß", emojiDescription: "💐" },
	});
	// A stored translation shows once, however it is cased or spaced.
	expect(criteriaOf(request?.questions.translation)).toMatchObject({
		t0: "bouquet",
		t1: "bunch of flowers",
	});
	expect(Object.keys(criteriaOf(request?.questions.translation))).toEqual([
		"t0",
		"t1",
		"NoMatch",
	]);
	expect(trace?.events).toEqual([
		{
			name: "TranslationAccumulation",
			data: {
				language: "en",
				outcome: "Covered",
				by: "bunch of flowers",
			},
		},
	]);
});

test("after NoMatch Luna writes the occurrence's equivalents without the stored ones, and only the new ones are contributed", async () => {
	const jev = knowledgeJev({ translation: "NoMatch" });
	const luna = knowledgeLuna(writes("Bunch  of Flowers", "posy", "posy"));
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		bouquet({ en: ["bouquet", "bunch of flowers"] }),
	);
	expect(result).toEqual({
		changes: [
			{
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: ["posy"],
			},
		],
		failures: [],
	});
	const [request] = luna.sent;
	expect(request?.systemPrompt).toBe(occurrenceTranslationPrompt);
	const input = knowledgeLunaInput(request?.input);
	expect(input).toMatchObject({
		aspect: "translationAccumulation",
		language: "en",
		markedSentence:
			"Sie bekam einen <TARGET>Strauß</TARGET> zum Geburtstag.",
	});
	expect(JSON.stringify(request?.input)).not.toContain("bouquet");
	expect(trace?.events).toEqual([
		{
			name: "TranslationAccumulation",
			data: {
				language: "en",
				outcome: "Added",
				written: ["Bunch  of Flowers", "posy"],
				added: ["posy"],
			},
		},
	]);
});

test("when Luna writes only stored translations, nothing is added", async () => {
	const jev = knowledgeJev({ translation: "NoMatch" });
	const luna = knowledgeLuna(writes("BOUQUET"));
	const { result, trace } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		bouquet({ en: ["bouquet"] }),
	);
	expect(result).toEqual({ changes: [], failures: [] });
	expect(trace?.events).toEqual([
		{
			name: "TranslationAccumulation",
			data: {
				language: "en",
				outcome: "Contained",
				written: ["BOUQUET"],
			},
		},
	]);
});

test("each language with a stored set is judged on its own; one with none is left to Knowledge Production", async () => {
	const jev = knowledgeJev((_, question) =>
		Object.values(criteriaOf(question)).includes("букет")
			? "t0"
			: "NoMatch",
	);
	const luna = knowledgeLuna(writes("posy"));
	const { result } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		bouquet({ en: ["bouquet"], ru: ["букет"] }),
	);
	expect(jev.sent.map(({ state }) => state.language)).toEqual(["en", "ru"]);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["posy"],
		},
	]);
	const none = knowledgeJev();
	const { result: empty } = await accumulateOnce(
		{ jev: none.ask, luna: luna.ask },
		bouquet({ en: [] }),
	);
	expect(empty).toEqual({ changes: [], failures: [] });
	expect(none.sent).toEqual([]);
});

test("a language whose call fails is a failure value and adds nothing; its sibling still lands", async () => {
	const jev = knowledgeJev({ translation: "NoMatch" });
	const luna = knowledgeLuna({
		translationAccumulation: (input) =>
			input.language === "ru"
				? { sentence: "…", equivalents: "букет" }
				: { sentence: "…", equivalents: ["posy"] },
	});
	const { result } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		bouquet({ en: ["bouquet"], ru: ["цветы"] }),
	);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["posy"],
		},
	]);
	expect(result.failures).toEqual([
		expect.objectContaining({
			aspect: "translations",
			leaf: "ru",
			code: "InvalidModelOutput",
		}),
	]);
	const down = knowledgeJev({}, { fail: () => true });
	const { result: failed } = await accumulateOnce(
		{ jev: down.ask, luna: luna.ask },
		bouquet({ en: ["bouquet"] }),
	);
	expect(failed.failures).toEqual([
		expect.objectContaining({ leaf: "en", code: "ProviderFailure" }),
	]);
});

test("an authored Reading accumulates over its authored translations (ADR 0047)", async () => {
	const { reading, attestation, sentence } = knowledgeInput(
		{
			family: "Lexeme",
			kind: "ADP",
			canonicalForm: "durch",
			coreFeatures: {},
		},
		"🚪",
		"Durch den Regen wurde es kalt.",
		["Durch"],
	);
	const authored = authoredReading(reading)?.knowledge.translations;
	expect(authored?.en).toEqual(["through"]);
	const jev = knowledgeJev({ translation: "NoMatch" });
	const luna = knowledgeLuna({
		translationAccumulation: {
			sentence: "It got cold because of the rain.",
			equivalents: ["because of"],
		},
	});
	const { result } = await accumulateOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			language: "de",
			reading,
			attestation,
			sentence,
			translations: { en: authored?.en ?? [] },
		},
	);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["because of"],
		},
	]);
});

test("bad input is a Defect, raised before anything is asked", async () => {
	const jev = knowledgeJev();
	const luna = knowledgeLuna({});
	const exit = await Effect.runPromiseExit(
		operations.knowledge
			.accumulateTranslations(bouquet({ fr: ["bouquet"] } as never))
			.pipe(Effect.provide(liveOver({ jev: jev.ask, luna: luna.ask }))),
	);
	expect(Exit.isFailure(exit)).toBe(true);
	expect(jev.sent).toEqual([]);
});

test("every accumulation prompt paragraph cites the Rules it states at their current hashes (ADR 0037, #695)", () => {
	const prompts = accumulationPromptTexts();
	expect(prompts.length).toBeGreaterThan(5);
	expect(checkPromptCitations(prompts, rules)).toEqual([]);
});
