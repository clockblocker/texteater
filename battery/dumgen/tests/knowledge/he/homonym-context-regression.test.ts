import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../../../src/call.js";
import { produceHebrewKnowledge } from "../../../src/knowledge/he/produce.js";
import { hebrewKnowledgePrompts } from "../../../src/knowledge/he/prompts.js";
import { defaultLunaConfiguration } from "../../../src/luna.js";
import { pinnedJevModel } from "../../../src/segment/jev.js";
import { knowledgeJev, knowledgeLuna } from "../support.js";

const lemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "ספר",
	coreFeatures: { gender: "Masc", abbr: null },
} as const satisfies Dumling.Lemma<"he">;
const reading = { unitKind: "Reading", lemma, emojiDescription: "✂" } as const;
const attestation = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma,
		normalizedSurface: "ספר",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { number: "Sing", definite: "Ind" },
	},
	members: [{ attested: "ספר", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	valencyEvidence: [],
} as const satisfies Dumling.Attestation<"he">;

test("paradigm writer receives exact source context alongside the barber Reading", async () => {
	const luna = knowledgeLuna({ hebrewParadigm: null });
	await Effect.runPromise(
		runOperation(
			"knowledge.produce",
			{ budget: requestBudget(1), payloads: true },
			(scope) =>
				produceHebrewKnowledge(
					scope,
					{
						luna: {
							ask: luna.ask,
							configuration: defaultLunaConfiguration,
						},
						jev: { ask: knowledgeJev().ask, model: pinnedJevModel },
					},
					{
						language: "he",
						reading,
						attestation,
						sentence: {
							segments: [
								{ text: "ה" },
								{ text: "ספר" },
								{ text: " גזר את השיער." },
							],
							target: [0, 1],
						},
						origin: "New",
						request: { hebrewParadigm: null },
					},
				),
		),
	);
	expect(luna.sent[0]?.input).toMatchObject({
		aspect: "hebrewParadigm",
		reading: {
			lemma: "ספר",
			emojiDescription: "✂",
			coreFeatures: { gender: "Masc" },
		},
		markedSentence: "<TARGET>הספר</TARGET> גזר את השיער.",
	});
});

test("paradigm guidance separates observed homographs and absolute/construct cells", () => {
	const prompt = hebrewKnowledgePrompts.hebrewParadigm;
	for (const contrast of [
		"סַפָּר",
		"סַפָּרִים",
		"סֵפֶר",
		"סְפָרִים",
		"זָקָן",
		"זְקָנִים",
		"זָקֵן",
		"זְקֵנִים",
		"זְקַן",
		"זִקְנֵי",
		"בַּיִת",
		"בֵּית",
	])
		expect(prompt).toContain(contrast);
	expect(prompt).toContain("exact Reading");
	expect(prompt).toContain("not the most frequent homograph");
	expect(prompt).toContain("בַּיִת is Ind; בֵּית is Cons");
});

test("paradigm guidance requires an article-bearing definite cell and independently known construct vowels", () => {
	const prompt = hebrewKnowledgePrompts.hebrewParadigm;
	expect(prompt).toContain("סֵפֶר is Ind, not Def");
	expect(prompt).toContain("הַסֵּפֶר is Def");
	expect(prompt).toContain("סִפְרֵי is Cons");
	expect(prompt).toContain("not סְפָרֵי");
	expect(prompt).toContain(
		"Do not obtain construct vowels by replacing a plural ending",
	);
	expect(prompt).toContain("omit that cell");
	expect(prompt).toContain("standalone inflected head");
	expect(prompt).toContain("never a dangling or afterposed article");
	expect(prompt).toContain("does not include its following complement");
});

test("object-marker translation guidance uses a Russian function label, not a preposition", () => {
	const prompt = hebrewKnowledgePrompts.translations;
	expect(prompt).toContain("normally untranslated");
	expect(prompt).toContain("показатель определённого прямого дополнения");
	expect(prompt).toContain("not к or для");
	expect(prompt).toContain("אֵת");
	expect(prompt).toContain("אֶת");
});
