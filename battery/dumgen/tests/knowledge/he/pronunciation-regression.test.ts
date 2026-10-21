import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../../../src/call.js";
import { produceHebrewKnowledge } from "../../../src/knowledge/he/produce.js";
import { defaultLunaConfiguration } from "../../../src/luna.js";
import { pinnedJevModel } from "../../../src/segment/jev.js";
import { knowledgeJev, knowledgeLuna } from "../support.js";

// Frozen real subscription output: knowledge-targeted-before-20261021T065833Z.
// The writer returned "katav" for כתב, silently accepted as IPA before this regression.
const lemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "כתב",
	coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
} as const;
const reading = { unitKind: "Reading", lemma, emojiDescription: "✍" } as const;
function checked<U extends Dumling.Unit>(value: U): U {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	return value;
}
const attestation = checked({
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma,
		normalizedSurface: "כתבה",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: {
			definite: null,
			gender: "Fem",
			mood: null,
			number: "Sing",
			person: "3",
			polarity: "Pos",
			tense: "Past",
			verbForm: null,
			voice: "Act",
		},
	},
	members: [{ attested: "כתבה", orthography: "Standard" }],
	realizationCoverage: "Full",
} as const satisfies Dumling.Attestation<"he">);
async function run(output: string) {
	const luna = knowledgeLuna({ transcription: output });
	return Effect.runPromise(
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
							segments: [{ text: "היא כתבה מכתב." }],
							target: [0],
						},
						origin: "New",
						request: { transcription: null },
					},
				),
		),
	);
}
test("real unstressed multisyllabic romanization is not published as IPA", async () => {
	const result = await run("katav");
	expect(result.changes).toEqual([]);
	expect(result.failures).toMatchObject([
		{ aspect: "transcription", code: "InvalidModelOutput" },
	]);
});
test("verb valency writer receives the resolved binyan and occurrence evidence", async () => {
	const luna = knowledgeLuna({ valency: [] });
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
							segments: [{ text: "היא כתבה מכתב." }],
							target: [0],
						},
						origin: "New",
						request: { valency: null },
					},
				),
		),
	);
	expect(luna.sent[0]?.input).toMatchObject({
		reading: { coreFeatures: { hebBinyan: "PAAL" } },
		markedSentence: "<TARGET>היא כתבה מכתב.</TARGET>",
	});
});
test("stressed IPA for the same real verb remains accepted", async () => {
	const result = await run("kaˈtav");
	expect(result.failures).toEqual([]);
	expect(result.changes).toMatchObject([
		{ aspect: "transcription", value: "kaˈtav" },
	]);
});
