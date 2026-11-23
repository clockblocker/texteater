import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import {
	applyKnowledgeChange,
	parseReadingKnowledge,
	selectKnowledge,
} from "../src/index.js";

export const hebrewNoun = {
	unitKind: "Reading",
	emojiDescription: "📚",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "ספר",
		coreFeatures: { abbr: null, gender: "Masc" },
	},
} as const satisfies Dumling.Reading<"he">;

export const hebrewVerb = {
	unitKind: "Reading",
	emojiDescription: "✍️",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "כתב",
		coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
	},
} as const satisfies Dumling.Reading<"he">;

const nounParadigm = {
	forms: [
		{ form: "ספר", features: { number: "Sing", definite: "Ind" } },
		{ form: "ספרים", features: { number: "Plur", definite: "Ind" } },
		{ form: "ספרי", features: { number: "Plur", definite: "Cons" } },
	],
} satisfies NonNullable<Dumrel.ReadingKnowledge["hebrewParadigm"]>;

test("a Hebrew paradigm is source-checked, stored atomically, corrected and retracted", () => {
	const contributed = applyKnowledgeChange({
		source: hebrewNoun,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "hebrewParadigm",
			value: nounParadigm,
		},
	});
	expect(contributed.success && contributed.value).toEqual({
		hebrewParadigm: nounParadigm,
	});
	if (!contributed.success) return;
	const corrected = applyKnowledgeChange({
		source: hebrewNoun,
		knowledge: contributed.value,
		change: {
			kind: "Correct",
			aspect: "hebrewParadigm",
			value: { forms: nounParadigm.forms.slice(0, 1) },
		},
	});
	expect(corrected.success && corrected.value).toEqual({
		hebrewParadigm: { forms: nounParadigm.forms.slice(0, 1) },
	});
	const retracted = applyKnowledgeChange({
		source: hebrewNoun,
		knowledge: contributed.value,
		change: { kind: "Retract", aspect: "hebrewParadigm" },
	});
	expect(retracted.success && retracted.value).toEqual({});
	expect(
		parseReadingKnowledge({
			source: hebrewNoun,
			knowledge: { hebrewParadigm: nounParadigm },
		}).success,
	).toBe(true);
});

test("Hebrew paradigms reject wrong languages, routes, invented feature cells and duplicates", () => {
	const bad = [
		{ forms: [{ form: "ספרים", features: { tense: "Past" } }] },
		{ forms: [{ form: "ספרים", features: {} }] },
		{
			forms: [
				{ form: "ספרים", features: { number: "Plur" } },
				{ form: "ספרים", features: { number: "Plur" } },
			],
		},
		{ forms: [{ form: "   ", features: { number: "Plur" } }] },
	];
	for (const value of bad) {
		expect(
			applyKnowledgeChange({
				source: hebrewNoun,
				knowledge: {},
				change: { kind: "Contribute", aspect: "hebrewParadigm", value },
			}).success,
		).toBe(false);
		expect(
			parseReadingKnowledge({
				source: hebrewNoun,
				knowledge: { hebrewParadigm: value },
			}).success,
		).toBe(false);
	}
	const german = {
		unitKind: "Reading",
		emojiDescription: "📚",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Buch",
			coreFeatures: { gender: "Neut" },
		},
	} as const satisfies Dumling.Reading<"de">;
	expect(
		parseReadingKnowledge({
			source: german,
			knowledge: { hebrewParadigm: nounParadigm },
		}).success,
	).toBe(false);
	expect(
		applyKnowledgeChange({
			source: german,
			knowledge: {},
			change: {
				kind: "Contribute",
				aspect: "hebrewParadigm",
				value: nounParadigm,
			},
		}).success,
	).toBe(false);
});

test("Hebrew paradigm cells follow adjective route vocabulary and reject finite definiteness", () => {
	const adjective = {
		unitKind: "Reading",
		emojiDescription: "👍",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "ADJ",
			canonicalForm: "טוב",
			coreFeatures: { abbr: null },
		},
	} as const;
	const parse = (
		source: Parameters<typeof parseReadingKnowledge>[0]["source"],
		features: unknown,
	) =>
		parseReadingKnowledge({
			source,
			knowledge: {
				hebrewParadigm: { forms: [{ form: "טוב", features }] },
			},
		}).success;
	expect(
		parse(adjective, { gender: "Masc", number: "Sing", definite: "Def" }),
	).toBe(true);
	expect(
		parse(adjective, { gender: "Masc", number: "Sing", definite: "Ind" }),
	).toBe(false);
	expect(parse(adjective, { gender: "Masc", number: "Dual" })).toBe(false);
	expect(
		parse(hebrewVerb, {
			tense: "Past",
			person: "3",
			gender: "Masc",
			number: "Sing",
			definite: "Def",
		}),
	).toBe(false);
	expect(
		parse(hebrewVerb, {
			verbForm: "Part",
			gender: "Masc",
			number: "Sing",
			definite: "Def",
		}),
	).toBe(true);
});

test("Hebrew Knowledge selection is language-owned and never requests German principal parts", () => {
	const selected = selectKnowledge({
		route: { language: "he", family: "Lexeme", kind: "NOUN" },
	});
	expect(selected.success && selected.value).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
		hebrewParadigm: null,
		valency: null,
	});
	const disabled = selectKnowledge({
		route: { language: "he", family: "Lexeme", kind: "NOUN" },
		settings: { hebrewParadigm: false },
	});
	expect(disabled.success && disabled.value).not.toHaveProperty(
		"hebrewParadigm",
	);
});
