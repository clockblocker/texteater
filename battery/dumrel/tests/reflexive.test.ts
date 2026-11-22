import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import { aufLemma, houseReading, onLemma, wartenReading } from "./fixtures.js";

const nom = { kind: "Case", governedCase: "Nom" } as const;
const reflexiveAcc = { kind: "Reflexive", governedCase: "Acc" } as const;
const reflexiveDat = { kind: "Reflexive", governedCase: "Dat" } as const;
const anAcc = {
	kind: "Preposition",
	preposition: { ...aufLemma, canonicalForm: "an" },
	governedCase: "Acc",
} as const;

/** `erinnern` 🪞🧠 'remember': `sich erinnern an`, the Lemma's word bare. */
const erinnernReading = {
	...wartenReading,
	lemma: { ...wartenReading.lemma, canonicalForm: "erinnern" },
	emojiDescription: "🪞🧠",
} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;

const prideReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "en",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "pride",
		coreFeatures: { abbr: null, extPos: null, phrasal: null },
	},
	emojiDescription: "🪞🦚",
} as const satisfies Dumling.Reading<"en", "Lexeme", "VERB">;

const parses = (source: Dumling.Reading, valency: unknown) =>
	parseReadingKnowledge({ source, knowledge: { valency } } as never).success;

test("a German Reading's pattern holds its lexical reflexive with its case (ADR 0052)", () => {
	const patterns = [[nom, reflexiveAcc, anAcc]];
	expect(
		parseReadingKnowledge({
			source: erinnernReading,
			knowledge: { valency: patterns },
		}),
	).toEqual({ success: true, value: { valency: patterns } });
	// `(sich) ausruhen`: one sense with and without the reflexive across patterns.
	expect(parses(erinnernReading, [[nom], [nom, reflexiveDat]])).toBe(true);
	for (const invalid of [
		{ kind: "Reflexive" },
		{ kind: "Reflexive", governedCase: "Gen" },
		{ kind: "Reflexive", governedCase: "Nom" },
		{ ...reflexiveAcc, referent: "Someone" },
	])
		expect(parses(erinnernReading, [[invalid]])).toBe(false);
});

test("a pattern has at most one Reflexive", () => {
	expect(parses(erinnernReading, [[reflexiveAcc, reflexiveDat]])).toBe(false);
	expect(parses(erinnernReading, [[reflexiveAcc, reflexiveAcc]])).toBe(false);
});

test("only verbs take a Reflexive, caseless outside German", () => {
	const stolzReading = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "ADJ",
			canonicalForm: "stolz",
			coreFeatures: { comparable: "Yes" },
		},
		emojiDescription: "🦚",
	} as const satisfies Dumling.Reading<"de", "Lexeme", "ADJ">;
	for (const source of [stolzReading, houseReading])
		expect(parses(source, [[reflexiveAcc]])).toBe(false);
	expect(parses(prideReading, [[{ kind: "Reflexive" }]])).toBe(true);
	expect(parses(prideReading, [[reflexiveAcc]])).toBe(false);
	const samachReading = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "סמך",
			coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
		},
		emojiDescription: "🤝",
	} as const satisfies Dumling.Reading<"he", "Lexeme", "VERB">;
	expect(parses(samachReading, [[{ kind: "Reflexive" }]])).toBe(false);
});

/** `außer sich sein` 🪞🤯: the reflexive is the object of the phrase's `außer`. */
const ausserSeinReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Locution",
		kind: "VERB",
		canonicalForm: "außer sein",
		coreFeatures: {},
	},
	emojiDescription: "🪞🤯",
} as const satisfies Dumling.Reading<"de", "Locution", "VERB">;
const ausserDat = {
	kind: "Reflexive",
	governedCase: "Dat",
	preposition: { ...aufLemma, canonicalForm: "außer" },
} as const;

test("a Reflexive inside a fixed phrase names the preposition it follows (ADR 0052)", () => {
	const patterns = [[nom, ausserDat]];
	expect(
		parseReadingKnowledge({
			source: ausserSeinReading,
			knowledge: { valency: patterns },
		}),
	).toEqual({ success: true, value: { valency: patterns } });
	for (const invalid of [
		// The phrase holds its preposition: `sein` has no `zu`.
		{ ...ausserDat, preposition: { ...aufLemma, canonicalForm: "zu" } },
		{ ...ausserDat, preposition: onLemma },
		{
			...ausserDat,
			preposition: { ...ausserDat.preposition, kind: "ADV" },
		},
		{ ...ausserDat, referent: "Someone" },
	])
		expect(parses(ausserSeinReading, [[nom, invalid]])).toBe(false);
});

test("an English Reflexive names the preposition it follows, with no case", () => {
	const beBeside = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "en",
			family: "Locution",
			kind: "VERB",
			canonicalForm: "be beside",
			coreFeatures: {},
		},
		emojiDescription: "🪞🤯",
	} as const satisfies Dumling.Reading<"en", "Locution", "VERB">;
	const beside = { ...onLemma, canonicalForm: "beside" };
	expect(
		parses(beBeside, [[{ kind: "Reflexive", preposition: beside }]]),
	).toBe(true);
	expect(
		parses(beBeside, [
			[{ kind: "Reflexive", preposition: { ...onLemma } }],
		]),
	).toBe(false);
});
