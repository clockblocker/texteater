import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { parseKnowledgeChange } from "dumrel";
import { InvalidModelOutput } from "../../../src/errors.js";
import { knownHebrewParadigm } from "../../../src/knowledge/he/paradigm.js";

const noun = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "מלך",
		coreFeatures: { abbr: null, gender: "Masc" },
	},
	emojiDescription: "👑",
} as const satisfies Dumling.Reading<"he">;

const absolute = {
	form: "מֶלֶךְ",
	features: { number: "Sing", definite: "Ind" },
} as const;

test("duplicate cells use Dumrel normalized uniqueness without losing pointed siblings", () => {
	const plural = {
		form: "מְלָכִים",
		features: { number: "Plur", definite: "Ind" },
	} as const;
	for (const duplicate of [
		absolute,
		{
			form: ` ${absolute.form.normalize("NFD")} `,
			features: { definite: "Ind", number: "Sing" },
		},
	]) {
		const proposal = { forms: [absolute, duplicate, plural] };
		const before = JSON.stringify({ noun, proposal });
		const result = knownHebrewParadigm(noun, proposal);
		expect(result).not.toBeInstanceOf(InvalidModelOutput);
		if (result instanceof InvalidModelOutput) throw result;
		expect(result.value.forms).toEqual([absolute, plural]);
		expect(result.omitted).toEqual([1]);
		expect(
			parseKnowledgeChange({
				source: noun,
				change: {
					kind: "Contribute",
					aspect: "hebrewParadigm",
					value: result.value,
				},
			}).success,
		).toBe(true);
		expect(JSON.stringify({ noun, proposal })).toBe(before);
	}
});

test("Hebrew sparse validation refuses malformed envelopes rather than inventing wrappers", () => {
	for (const output of [
		[absolute],
		{ forms: [] },
		{ forms: [absolute], confidence: 1 },
		{ forms: Array.from({ length: 101 }, () => absolute) },
	])
		expect(knownHebrewParadigm(noun, output)).toBeInstanceOf(
			InvalidModelOutput,
		);
});

test("Hebrew sparse validation refuses an all-invalid proposal", () => {
	for (const features of [
		{},
		{ number: null },
		{ number: "Unknown" },
		{ number: ["Sing", "Plur"] },
		{ number: "Sing", gender: "Masc" },
		{ number: "Sing", tense: "Past" },
	])
		expect(
			knownHebrewParadigm(noun, {
				forms: [{ form: "מֶלֶךְ", features }],
			}),
		).toBeInstanceOf(InvalidModelOutput);
});

test("single-word noun cells omit dangling articles and construct complements", () => {
	const result = knownHebrewParadigm(noun, {
		forms: [
			absolute,
			{ form: "מֶלֶךְ הַ", features: { number: "Sing", definite: "Cons" } },
			{
				form: "מֶלֶךְ ישראל",
				features: { number: "Sing", definite: "Cons" },
			},
		],
	});
	expect(result).not.toBeInstanceOf(InvalidModelOutput);
	if (result instanceof InvalidModelOutput) throw result;
	expect(result.value.forms).toEqual([absolute]);
	expect(result.omitted).toEqual([1, 2]);
});

test("article-bearing noun conflict omits both assertions without choosing the false Ind label", () => {
	const definite = {
		form: "הַמֶּלֶךְ",
		features: { number: "Sing", definite: "Def" },
	} as const;
	const falseInd = {
		...definite,
		features: { number: "Sing", definite: "Ind" },
	};
	const plural = {
		form: "מְלָכִים",
		features: { number: "Plur", definite: "Ind" },
	} as const;
	for (const conflict of [
		[falseInd, definite],
		[definite, falseInd],
	]) {
		const proposal = { forms: [...conflict, plural] };
		const before = JSON.stringify({ noun, proposal });
		const result = knownHebrewParadigm(noun, proposal);
		expect(result).not.toBeInstanceOf(InvalidModelOutput);
		if (result instanceof InvalidModelOutput) throw result;
		expect(result.value.forms).toEqual([plural]);
		expect(result.omitted.toSorted()).toEqual([0, 1]);
		expect(JSON.stringify({ noun, proposal })).toBe(before);
	}
});

test("noun state-conflict omission is lexical-independent and order-independent", () => {
	const result = knownHebrewParadigm(noun, {
		forms: [
			{ form: "מֶלֶךְ", features: { number: "Sing", definite: "Def" } },
			{ form: "מֶלֶךְ", features: { number: ["Sing"] } },
			absolute,
			{ form: "הַמֶּלֶךְ", features: { number: "Sing", definite: "Def" } },
		],
	});
	expect(result).not.toBeInstanceOf(InvalidModelOutput);
	if (result instanceof InvalidModelOutput) throw result;
	expect(result.value.forms).toEqual([
		{ form: "הַמֶּלֶךְ", features: { number: "Sing", definite: "Def" } },
	]);
	expect(result.omitted.toSorted()).toEqual([0, 1, 2]);
});
