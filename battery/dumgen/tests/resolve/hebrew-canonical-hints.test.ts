import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../../src/call.js";
import { defaultLunaConfiguration, type LunaAsk } from "../../src/luna.js";
import { resolveHebrewGrammar } from "../../src/resolve/he/grammar.js";
import type { LemmaCandidate } from "../../src/resolve/types.js";
import type {
	SegmentedSentence,
	Unit,
} from "../../src/segment/segmented-sentence.js";

const unit: Unit<"he"> = {
	segments: [0, 1],
	route: { language: "he", family: "Lexeme", kind: "NOUN" },
};
const sentence: SegmentedSentence<"he"> = {
	text: "הַסֵּפֶר ליד הבית",
	segments: [
		{ kind: "ResolvableText", text: "הַ" },
		{ kind: "ResolvableText", text: "סֵּפֶר" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "ליד" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "הבית" },
	],
	units: [unit],
};
const candidate = (
	canonicalForm: string,
	foundUnder: readonly string[],
): LemmaCandidate<"he"> => ({
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { abbr: null, gender: "Masc" },
	},
	foundUnder,
});

test("Hebrew grammatical hints belong to the target host, not another noun or its article", async () => {
	let hints: unknown;
	const ask: LunaAsk = async (request) => {
		hints = (request.input as { lemmaHints: unknown }).lemmaHints;
		return { output: { surface: null, emojiDescription: null } };
	};
	await Effect.runPromise(
		runOperation(
			"resolve.grammar",
			{ budget: requestBudget(1), payloads: false },
			(scope) =>
				resolveHebrewGrammar(
					scope,
					{
						jev: {
							model: "test",
							ask: async () => {
								throw Error("unexpected judge");
							},
						},
						luna: { ask, configuration: defaultLunaConfiguration },
					},
					{
						language: "he",
						sentence,
						unit,
						neighbours: {},
						lemmaCandidates: [
							candidate("ספר", ["ספר"]),
							candidate("סופר", ["סֵּפֶר"]),
							candidate("בית", ["הבית"]),
							candidate("ממשלה", ["הַ"]),
						],
					},
				),
		),
	);
	expect(hints).toEqual([
		{ canonicalForm: "ספר", coreFeatures: { abbr: null, gender: "Masc" } },
		{ canonicalForm: "סופר", coreFeatures: { abbr: null, gender: "Masc" } },
	]);
});
