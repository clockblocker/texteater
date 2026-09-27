import { expect, test } from "bun:test";
import { findSpecRecord, loadSpecRecords } from "dumspec";
import { Effect } from "effect";
import { segmentEnglish } from "../src/concrete-lang/en/segmentation/segment.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";

const unused = createDumgen({
	judge: async () => {
		throw Error("Must not judge");
	},
	execute: async () => {
		throw Error("Must not generate");
	},
});

const records = loadSpecRecords();
const pieces = (text: string) => segmentEnglish(text).segments;

test("English segmentation cuts fused words as the dumspec gold does", async () => {
	for (const id of [
		"en/ill-call-when-i-arrive",
		"en/the-king-of-englands-hat-blew-off",
		"en/i-dont-know-yet",
	]) {
		const record = findSpecRecord(records, id);
		if (!record) throw Error(`Missing Spec Record ${id}`);
		const gold = record.segments.map(({ kind, text }) => ({ kind, text }));
		expect(
			segmentEnglish(record.sentence).segments.map(({ kind, text }) => ({
				kind,
				text,
			})),
			id,
		).toEqual(gold);
		// Intake's trusted path cuts the same Segments.
		const trusted = await Effect.runPromise(
			unused.segmentSentence({
				language: "en",
				stitchedText: record.sentence,
			}),
		);
		expect(
			trusted.segments.map(({ kind, text }) => ({ kind, text })),
			id,
		).toEqual(gold);
	}
});

test("English fusions, clitics, possessives and abbreviations split by the table", () => {
	expect(pieces("I can't.")).toEqual([
		{ kind: "ResolvableText", text: "I" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "ca", surface: "can" },
		{ kind: "ResolvableText", text: "n't", surface: "not" },
		{ kind: "Punctuation", text: "." },
	]);
	expect(pieces("Won't")).toEqual([
		{ kind: "ResolvableText", text: "Wo", surface: "will" },
		{ kind: "ResolvableText", text: "n't", surface: "not" },
	]);
	expect(pieces("gonna")).toEqual([
		{ kind: "ResolvableText", text: "gon", surface: "going" },
		{ kind: "ResolvableText", text: "na", surface: "to" },
	]);
	// A typographic apostrophe finds the same fusion.
	expect(pieces("can’t")).toEqual([
		{ kind: "ResolvableText", text: "ca", surface: "can" },
		{ kind: "ResolvableText", text: "n’t", surface: "not" },
	]);
	// let's is a fusion (us), not a host with the verb or possessive 's.
	expect(pieces("Let's")).toEqual([
		{ kind: "ResolvableText", text: "Let", surface: "let" },
		{ kind: "ResolvableText", text: "'s", surface: "us" },
	]);
	// A plural possessive splits off its apostrophe, which stands for 's.
	expect(pieces("the boys' room")).toEqual([
		{ kind: "ResolvableText", text: "the" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "boys" },
		{ kind: "ResolvableText", text: "'" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "room" },
	]);
	expect(
		segmentEnglish("the boys' room").trace.map(({ rule }) => rule),
	).toContain("attached-clitic");
	// A dropped letter is no possessive, so the word stays whole.
	expect(pieces("goin'")).toEqual([
		{ kind: "ResolvableText", text: "goin'" },
	]);
	// An ambiguous clitic keeps its letters; the sentence decides its reading.
	expect(pieces("it's")).toEqual([
		{ kind: "ResolvableText", text: "it" },
		{ kind: "ResolvableText", text: "'s" },
	]);
	// A typographic apostrophe stays in the host it belongs to.
	expect(pieces("O’Neil’s").map(({ text }) => text)).toEqual([
		"O’Neil",
		"’s",
	]);
	expect(pieces("Mr. Smith, e.g. St. Paul")).toEqual([
		{ kind: "ResolvableText", text: "Mr." },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Smith" },
		{ kind: "Punctuation", text: "," },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "e.g." },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "St." },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Paul" },
	]);
	expect(segmentEnglish("Mr. Smith").trace[0]?.rule).toBe(
		"recognized-abbreviation",
	);
});

const texts = (text: string) =>
	segmentEnglish(text).segments.map(({ text }) => text);

test("No. is an abbreviation only before a numeral; a reply No. stays a word", () => {
	expect(texts("No.")).toEqual(["No", "."]);
	expect(texts("I said no.")).toEqual(["I", " ", "said", " ", "no", "."]);
	expect(texts("The answer is NO.")).toEqual([
		"The",
		" ",
		"answer",
		" ",
		"is",
		" ",
		"NO",
		".",
	]);
	expect(texts("No. I won't.")[0]).toBe("No");
	expect(texts("See No. 5.")).toEqual(["See", " ", "No.", " ", "5", "."]);
	expect(texts("See No.5")).toEqual(["See", " ", "No.", "5"]);
	expect(texts("no. 12")).toEqual(["no.", " ", "12"]);
});

test("English abbreviations match in any case, as the old list did", () => {
	for (const [text, expected] of [
		["mr. Smith", ["mr.", " ", "Smith"]],
		["MR. SMITH", ["MR.", " ", "SMITH"]],
		[
			"apples, pears, ETC.",
			["apples", ",", " ", "pears", ",", " ", "ETC."],
		],
		["dr. Who vs. Daleks", ["dr.", " ", "Who", " ", "vs.", " ", "Daleks"]],
		["ST. Paul", ["ST.", " ", "Paul"]],
	] as const)
		expect(texts(text), text).toEqual([...expected]);
});

test("an English Encounter holding a whole fused word is rejected", () => {
	const encounter = (text: string) => ({
		sentence: {
			id: "whole",
			language: "en",
			segments: [
				{ kind: "ResolvableText", text: "We" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text },
			],
		},
		target: { family: "Lexeme", kind: "PRON", memberSegmentIndices: [0] },
	});
	for (const whole of ["can't", "don't", "England's"])
		expect(() => validateEncounter(encounter(whole)), whole).toThrow(
			"whole fused word",
		);
	expect(() => validateEncounter(encounter("can"))).not.toThrow();
});
