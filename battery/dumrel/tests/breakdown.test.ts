import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChange, parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { houseLemma, prefixLemma } from "./fixtures.js";

const shadow = (
	family: Dumling.Family<"de">,
	kind: string,
	canonicalForm: string,
) => ({ language: "de", canonicalForm, family, kind }) as Dumrel.UnitShadow;

const entspannungReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Entspannung",
		coreFeatures: { gender: "Fem" },
	},
	emojiDescription: "🧘",
} as const satisfies Dumling.Reading<"de", "Lexeme", "NOUN">;
const fadenVerlierenReading = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Locution",
		kind: "VERB",
		canonicalForm: "den Faden verlieren",
		coreFeatures: {},
	},
	emojiDescription: "🧵",
} as const satisfies Dumling.Reading<"de", "Locution", "VERB">;

const constituents = [
	{ letters: "Entspann", target: shadow("Lexeme", "VERB", "entspannen") },
	{ letters: "ung", target: shadow("Morpheme", "Suffix", "-ung") },
];
const zeroEnding = {
	letters: "",
	target: shadow("Morpheme", "Ending", "∅"),
};
const morphemes = [
	{ letters: "ent", target: shadow("Morpheme", "Prefix", "ent-") },
	{ letters: "spann", target: shadow("Morpheme", "Root", "spann") },
	{ letters: "ung", target: shadow("Morpheme", "Suffix", "-ung") },
	zeroEnding,
];

const parse = (source: Dumling.Reading, knowledge: unknown) =>
	parseReadingKnowledge({ source, knowledge });

test("a word's Breakdown holds its Constituents and its Morphemic Breakdown", () => {
	expect(
		parse(entspannungReading, { breakdown: { constituents, morphemes } }),
	).toEqual({
		success: true,
		value: { breakdown: { constituents, morphemes } },
	});
	// A resolved part links to its Lemma.
	expect(
		parse(entspannungReading, {
			breakdown: {
				morphemes: [
					{
						letters: "ent",
						target: { ...prefixLemma, canonicalForm: "ent-" },
					},
					...morphemes.slice(1),
				],
			},
		}).success,
	).toBe(true);
	expect(parse(entspannungReading, { breakdown: {} }).success).toBe(false);
});

test("a phraseme's Constituents may group words and keep filler unlinked", () => {
	expect(
		parse(fadenVerlierenReading, {
			breakdown: {
				constituents: [
					{
						letters: "den Faden",
						target: shadow("Lexeme", "NOUN", "Faden"),
					},
					{ letters: " " },
					{
						letters: "verlieren",
						target: shadow("Lexeme", "VERB", "verlieren"),
					},
				],
			},
		}).success,
	).toBe(true);
	// A phraseme has no Morphemic Breakdown.
	expect(
		parse(fadenVerlierenReading, {
			breakdown: {
				morphemes: [
					{
						letters: "den Faden verlieren",
						target: shadow("Morpheme", "Root", "x"),
					},
				],
			},
		}).success,
	).toBe(false);
});

test("pieces spell the Canonical Form and link where each half allows", () => {
	for (const breakdown of [
		// The letters must spell `Entspannung`.
		{ constituents: constituents.slice(0, 1) },
		// Constituents hold no Ending.
		{ constituents: [...constituents, zeroEnding] },
		// Morphemes link to Morphemes only.
		{
			morphemes: [
				{
					letters: "Entspannung",
					target: shadow("Lexeme", "NOUN", "Haus"),
				},
			],
		},
		// Only the zero ending shows no letters.
		{
			morphemes: [
				...morphemes.slice(0, 3),
				{ letters: "", target: shadow("Morpheme", "Suffix", "-e") },
			],
		},
		{ morphemes: [...morphemes.slice(0, 3), { letters: "" }] },
		{
			morphemes: [
				...morphemes.slice(0, 2),
				{ letters: "ung", target: shadow("Morpheme", "Ending", "∅") },
			],
		},
		// Targets use the source Language.
		{
			constituents: [
				constituents[0],
				{
					letters: "ung",
					target: {
						...shadow("Morpheme", "Suffix", "-ung"),
						language: "en",
					},
				},
			],
		},
	])
		expect(parse(entspannungReading, { breakdown }).success).toBe(false);
});

test("a reflexive Reading's Breakdown spells its Canonical Form, the bare word", () => {
	const erinnernReading = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "erinnern",
			coreFeatures: { hasSepPrefix: null },
		},
		emojiDescription: "🪞🧠",
	} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
	// erinnern is a bottom word: its base innern died out.
	const word = {
		morphemes: [
			{ letters: "er", target: shadow("Morpheme", "Prefix", "er-") },
			{ letters: "inner", target: shadow("Morpheme", "Root", "inner") },
			{ letters: "n", target: shadow("Morpheme", "Ending", "-en") },
		],
	};
	expect(parse(erinnernReading, { breakdown: word })).toEqual({
		success: true,
		value: { breakdown: word },
	});
	// The reflexive fills the Reading's Reflexive Slot and is never a piece.
	expect(
		parse(erinnernReading, {
			breakdown: {
				morphemes: [{ letters: "sich " }, ...word.morphemes],
			},
		}).success,
	).toBe(false);
});

test("a Reading has a Source or Constituents, not both", () => {
	expect(
		parse(entspannungReading, {
			breakdown: { constituents },
			source: { target: houseLemma },
		}).success,
	).toBe(false);
	expect(
		parse(entspannungReading, {
			breakdown: { morphemes },
			source: { target: shadow("Lexeme", "VERB", "entspannen") },
		}).success,
	).toBe(true);
});

test("each half of a Breakdown changes on its own", () => {
	const contributed = applyKnowledgeChange({
		source: entspannungReading,
		knowledge: { breakdown: { morphemes } },
		change: {
			kind: "Contribute",
			aspect: "breakdown",
			part: "constituents",
			value: constituents,
		},
	});
	expect(contributed).toEqual({
		success: true,
		value: { breakdown: { morphemes, constituents } },
	});
	expect(
		applyKnowledgeChange({
			source: entspannungReading,
			knowledge: { breakdown: { constituents } },
			change: {
				kind: "Contribute",
				aspect: "breakdown",
				part: "constituents",
				value: [{ letters: "Entspannung" }],
			},
		}).success,
	).toBe(false);
	expect(
		applyKnowledgeChange({
			source: entspannungReading,
			knowledge: { breakdown: { constituents } },
			change: {
				kind: "Correct",
				aspect: "breakdown",
				part: "constituents",
				value: [{ letters: "Entspannung" }],
			},
		}),
	).toEqual({
		success: true,
		value: { breakdown: { constituents: [{ letters: "Entspannung" }] } },
	});
	expect(
		applyKnowledgeChange({
			source: entspannungReading,
			knowledge: { definition: "x", breakdown: { constituents } },
			change: {
				kind: "Retract",
				aspect: "breakdown",
				part: "constituents",
			},
		}),
	).toEqual({ success: true, value: { definition: "x" } });
});
