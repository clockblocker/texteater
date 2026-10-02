/**
 * The Hebrew prefix module that `fusion-table.ts` leaves to code: Hebrew
 * prefix stacks are an open pattern, so they are enumerated by grammar and
 * pruned by a word list instead of listed in a table (#645).
 */
import type { FusionComponent } from "../../../universal/fusion-table.js";
import {
	type HebrewWordList,
	normalizeHebrewWord,
	WordClass,
} from "./word-list.js";

/**
 * One piece of a reading of a written word. A prefix stands for its own
 * letter; the hidden article ה has no letters; the stem, or the whole word,
 * keeps its letters.
 */
export type HebrewPiece = {
	readonly span: string;
	readonly surface: string;
	readonly role: HebrewRole;
};

/** ו is CCONJ, ש SCONJ, ב כ ל מ ADP, ה the article (ADR 0035); the stem is the Host. */
type HebrewRole = Extract<
	FusionComponent["role"],
	"Conjunction" | "Subordinator" | "Adposition" | "Article" | "Host"
>;

/**
 * One way a written word splits: its prefix pieces, then the stem, never
 * empty. The unsplit word is one Host piece.
 */
export type HebrewReading = readonly HebrewPiece[];

const graphemes = new Intl.Segmenter("he", { granularity: "grapheme" });

const point = (code: number) => String.fromCharCode(code);
const shva = point(0x05b0);
const hataf = [point(0x05b1), point(0x05b2), point(0x05b3)];
const hiriq = point(0x05b4);
const tsere = point(0x05b5);
const segol = point(0x05b6);
const patah = point(0x05b7);
const qamats = [point(0x05b8), point(0x05c7)];
/** Every vowel point: the ones above, holam and qubuts. */
const vowels = new Set([
	shva,
	...hataf,
	hiriq,
	tsere,
	segol,
	patah,
	...qamats,
	point(0x05b9),
	point(0x05ba),
	point(0x05bb),
]);

const letterOf = (grapheme: string) => grapheme.normalize("NFD").charAt(0);
const vowelOf = (grapheme: string) =>
	[...grapheme.normalize("NFD")].find((mark) => vowels.has(mark));

/** Vowels each prefix letter takes as a prefix; any other vowel makes it a letter of the word. */
const prefixVowels: Readonly<Record<string, readonly string[]>> = {
	ו: [shva, hiriq, patah, segol, tsere, ...qamats],
	ש: [segol, patah],
	ב: [shva, ...hataf, hiriq, tsere, segol, patah, ...qamats],
	כ: [shva, ...hataf, hiriq, tsere, segol, patah, ...qamats],
	ל: [shva, ...hataf, hiriq, tsere, segol, patah, ...qamats],
	מ: [hiriq, tsere],
	ה: [patah, segol, ...qamats],
};

/** ב כ ל pointed with patah or qamats carry the article (בַּבַּיִת); any other vowel rules it out. */
const articleVowels = [patah, ...qamats];

type Prefix = { readonly letter: string; readonly role: HebrewRole };

/**
 * The prefix stacks the grammar allows: optional ו, then optional ש, then
 * one of ב כ ל (each may hide the article ה), מ (optionally with a written
 * ה), or ה alone.
 */
const stacks: readonly {
	readonly prefixes: readonly Prefix[];
	readonly hiddenArticle: boolean;
}[] = (() => {
	const conjunction: Prefix = { letter: "ו", role: "Conjunction" };
	const subordinator: Prefix = { letter: "ש", role: "Subordinator" };
	const article: Prefix = { letter: "ה", role: "Article" };
	const adposition = (letter: string): Prefix => ({
		letter,
		role: "Adposition",
	});
	const heads: readonly (readonly Prefix[])[] = [
		[],
		[adposition("ב")],
		[adposition("כ")],
		[adposition("ל")],
		[adposition("מ")],
		[adposition("מ"), article],
		[article],
	];
	const result: { prefixes: readonly Prefix[]; hiddenArticle: boolean }[] =
		[];
	for (const first of [[], [conjunction]])
		for (const second of [[], [subordinator]])
			for (const head of heads) {
				const prefixes = [...first, ...second, ...head];
				if (!prefixes.length) continue;
				result.push({ prefixes, hiddenArticle: false });
				if (
					head.length === 1 &&
					["ב", "כ", "ל"].includes(head[0]?.letter ?? "")
				)
					result.push({ prefixes, hiddenArticle: true });
			}
	return result;
})();

/** What the stem must allow after the last prefix. */
function stemAllows(
	classes: number,
	last: HebrewRole,
	hiddenArticle: boolean,
): boolean {
	if (hiddenArticle) return (classes & WordClass.TakesHiddenArticle) !== 0;
	if (last === "Article") return (classes & WordClass.TakesArticle) !== 0;
	if (last === "Adposition")
		return (classes & WordClass.TakesPreposition) !== 0;
	return true;
}

/**
 * Every reading of a written Hebrew word that survives the grammar, its vowel
 * points and the word list (#645): the unsplit word when the list knows it,
 * and each prefix stack whose stem the list knows as a word that may follow
 * that prefix. No reading cuts into a word the list knows as a function word
 * (בגלל, כבר). An empty result means the list knows no reading; the word
 * stays whole.
 */
export function hebrewReadings(
	word: string,
	words: HebrewWordList,
): readonly HebrewReading[] {
	const letters = [...graphemes.segment(word)].map(({ segment }) => segment);
	const classesFrom = (start: number) =>
		words.classesOf(normalizeHebrewWord(letters.slice(start).join("")));
	const functionWordFrom = (start: number) =>
		((classesFrom(start) ?? 0) & WordClass.FunctionWord) !== 0;
	const readings: HebrewReading[] = [];
	if (classesFrom(0) !== undefined)
		readings.push([{ span: word, surface: word, role: "Host" }]);
	for (const { prefixes, hiddenArticle } of stacks) {
		const count = prefixes.length;
		if (letters.length - count < 2) continue;
		const written = letters.slice(0, count);
		const fits = written.every((grapheme, position) => {
			const letter = prefixes[position]?.letter ?? "";
			if (letterOf(grapheme) !== letter) return false;
			// Vowel points decide where they can, before the word list.
			const vowel = vowelOf(grapheme);
			if (vowel === undefined) return true;
			if (!prefixVowels[letter]?.includes(vowel)) return false;
			return position === count - 1 && ["ב", "כ", "ל"].includes(letter)
				? articleVowels.includes(vowel) === hiddenArticle
				: true;
		});
		if (!fits) continue;
		const classes = classesFrom(count);
		const last = prefixes[count - 1]?.role ?? "Host";
		if (classes === undefined || !stemAllows(classes, last, hiddenArticle))
			continue;
		let cutsFunctionWord = false;
		for (let start = 0; start < count; start += 1)
			if (functionWordFrom(start)) cutsFunctionWord = true;
		if (cutsFunctionWord) continue;
		const stem = letters.slice(count).join("");
		readings.push([
			...written.map((span, position) => ({
				span,
				surface: prefixes[position]?.letter ?? "",
				role: prefixes[position]?.role ?? "Adposition",
			})),
			...(hiddenArticle
				? [{ span: "", surface: "ה", role: "Article" as const }]
				: []),
			{ span: stem, surface: stem, role: "Host" },
		]);
	}
	return readings;
}

/** The Segment texts a reading cuts its word into; a hidden article has none. */
export function readingSpans(reading: HebrewReading): readonly string[] {
	return reading.map(({ span }) => span).filter(Boolean);
}

/**
 * The cut every reading shares when they differ only in a hidden article
 * (ובבית is ו, ב, בית with or without ה), or undefined.
 */
export function sharedCut(
	readings: readonly HebrewReading[],
): readonly string[] | undefined {
	const [first, ...others] = readings.map(readingSpans);
	if (!first || first.length < 2) return undefined;
	const key = first.join("\u0000");
	return others.every((spans) => spans.join("\u0000") === key)
		? first
		: undefined;
}

/** A reading as the learner-facing text one Choice candidate shows. */
export function describeReading(reading: HebrewReading): string {
	if (reading.length === 1) return `${reading[0]?.span}: one word, no prefix`;
	const meaning: Readonly<Record<string, string>> = {
		ו: "and",
		ש: "that, which",
		ב: "in, at, with",
		כ: "like, as",
		ל: "to, for",
		מ: "from",
		ה: "the",
	};
	const pieces = reading.map((piece) =>
		piece.role === "Host"
			? piece.span
			: piece.span
				? `${piece.span} (${meaning[piece.surface] ?? piece.surface})`
				: `unwritten ה (the)`,
	);
	return pieces.join(" + ");
}
