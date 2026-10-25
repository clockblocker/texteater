import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import { aufLemma, houseReading, onLemma, wartenReading } from "./fixtures.js";

const required = <const C extends unknown[]>(...complements: C) =>
	({ status: "Required", complements }) as const;
const optional = <const C extends unknown[]>(...complements: C) =>
	({ status: "Optional", complements }) as const;
const nom = { kind: "Case", governedCase: "Nom", referent: "Someone" } as const;
const acc = {
	kind: "Case",
	governedCase: "Acc",
	referent: "Something",
} as const;
const reflexiveAcc = { kind: "Reflexive", governedCase: "Acc" } as const;
const reflexiveDat = { kind: "Reflexive", governedCase: "Dat" } as const;
const anAcc = {
	kind: "Preposition",
	preposition: { ...aufLemma, canonicalForm: "an" },
	governedCase: "Acc",
	referent: "Either",
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

test("a German Reading's frame holds its lexical reflexive with its case (ADR 0052)", () => {
	const frame = [required(nom), required(reflexiveAcc), required(anAcc)];
	expect(
		parseReadingKnowledge({
			source: erinnernReading,
			knowledge: { valency: frame },
		}),
	).toEqual({ success: true, value: { valency: frame } });
	// `(sich) ausruhen`: one sense with and without the reflexive.
	expect(
		parses(erinnernReading, [required(nom), optional(reflexiveDat)]),
	).toBe(true);
	for (const invalid of [
		{ kind: "Reflexive" },
		{ kind: "Reflexive", governedCase: "Gen" },
		{ kind: "Reflexive", governedCase: "Nom" },
		{ ...reflexiveAcc, referent: "Someone" },
	])
		expect(parses(erinnernReading, [required(invalid)])).toBe(false);
});

test("a Reflexive is alone in its Slot, and a frame has at most one", () => {
	expect(parses(erinnernReading, [required(reflexiveAcc, acc)])).toBe(false);
	expect(
		parses(erinnernReading, [
			required(reflexiveAcc),
			optional(reflexiveDat),
		]),
	).toBe(false);
	expect(
		parses(erinnernReading, [
			required(reflexiveAcc),
			required(reflexiveAcc),
		]),
	).toBe(false);
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
		expect(parses(source, [required(reflexiveAcc)])).toBe(false);
	expect(parses(prideReading, [required({ kind: "Reflexive" })])).toBe(true);
	expect(parses(prideReading, [required(reflexiveAcc)])).toBe(false);
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
	expect(parses(samachReading, [required({ kind: "Reflexive" })])).toBe(
		false,
	);
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
	const frame = [required(nom), required(ausserDat)];
	expect(
		parseReadingKnowledge({
			source: ausserSeinReading,
			knowledge: { valency: frame },
		}),
	).toEqual({ success: true, value: { valency: frame } });
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
		expect(
			parses(ausserSeinReading, [required(nom), required(invalid)]),
		).toBe(false);
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
		parses(beBeside, [
			required({ kind: "Reflexive", preposition: beside }),
		]),
	).toBe(true);
	expect(
		parses(beBeside, [
			required({ kind: "Reflexive", preposition: { ...onLemma } }),
		]),
	).toBe(false);
});
