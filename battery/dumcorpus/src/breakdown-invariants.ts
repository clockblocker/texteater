import { foldCase, zeroEndingCanonicalForm } from "dumling";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { BreakdownKnowledge } from "./corpus-types.js";
import { germanInterfixes } from "./inventories/de/interfixes.js";

/** One failed invariant, at a path inside the record file. */
export type BreakdownIssue = {
	readonly path: string;
	readonly message: string;
};

type Piece = { readonly letters: string; readonly target?: Dumrel.LinkTarget };
type Part = "constituents" | "morphemes";

const phrasemeFamilies: readonly Dumling.Family[] = ["Locution", "Saying"];

/**
 * The citation endings a language's verbs show as unlinked filler at the end
 * of their Constituents (ADR 0050): `verarzten` = `ver- + Arzt + en`.
 */
const citationEndings: Partial<Record<Dumling.Language, readonly string[]>> = {
	de: ["en", "n"],
};

/** Each language's closed Interfix set, where it has one (ADR 0050). */
const interfixes: Partial<Record<Dumling.Language, ReadonlySet<string>>> = {
	de: germanInterfixes,
};

/**
 * How a Morpheme Lemma's Canonical Form shows its position: a Prefix ends
 * in a hyphen (`ver-`), a Suffix or Ending starts with one (`-ung`, `-en`),
 * an Interfix has both (`-e-`), and a Root has none (`spann`). The zero
 * Ending is spelled by its own constant (ADR 0051).
 */
const morphemeSpellings: Readonly<
	Record<string, { pattern: RegExp; example: string }>
> = {
	Prefix: { pattern: /^[^-].*-$/u, example: "ver-" },
	Suffix: { pattern: /^-.*[^-]$/u, example: "-ung" },
	Suffixoid: { pattern: /^-.*[^-]$/u, example: "-mäßig" },
	Ending: { pattern: /^-.*[^-]$/u, example: "-en" },
	Interfix: { pattern: /^-.+-$/u, example: "-e-" },
	Root: { pattern: /^[^-](?:.*[^-])?$/u, example: "spann" },
};

/** Letters with umlauts and Hebrew final forms folded to their base letter. */
const letterFolds: Readonly<Record<string, string>> = {
	ä: "a",
	ö: "o",
	ü: "u",
	ך: "כ",
	ם: "מ",
	ן: "נ",
	ף: "פ",
	ץ: "צ",
};

/** Text as shown letters compare to a Canonical Form: case, umlaut and hyphens aside. */
function comparable(text: string, language: Dumling.Language): string {
	return foldCase(text, language)
		.replaceAll("-", "")
		.replace(/[äöüךםןףץ]/gu, (letter) => letterFolds[letter] ?? letter);
}

/**
 * Whether a word's shown letters fit their target (ADR 0050): the target's
 * Canonical Form, compared case-insensitively and with umlauts and Hebrew
 * final forms folded, or a truncation of it, which covers a dropped final -e
 * (`Schul`), a verb stem (`Fahr`) and a blend's part (`br`, `unch`). A digit
 * stands for a numeral.
 */
function lettersFit(
	letters: string,
	target: Dumrel.LinkTarget,
	language: Dumling.Language,
): boolean {
	if (/^\p{Nd}+$/u.test(letters)) return target.kind === "NUM";
	const shown = comparable(letters, language);
	const form = comparable(target.canonicalForm, language);
	return shown.length > 0 && (form.startsWith(shown) || form.endsWith(shown));
}

const hasLetters = (letters: string) => /[\p{L}\p{N}]/u.test(letters);

/** The letter offsets where one piece ends and the next begins. */
function boundaries(pieces: readonly Piece[]): Set<number> {
	const result = new Set<number>();
	let offset = 0;
	for (const piece of pieces) {
		offset += piece.letters.length;
		result.add(offset);
	}
	return result;
}

/**
 * Filler is unlinked (ADR 0050, ADR 0051). Spaces, hyphens, ellipses and
 * other punctuation may stand anywhere, but no two in a row. Filler with
 * letters stands only where the ADR allows it: a phraseme's placeholders and
 * idiom-only words, and the citation ending that closes a verb's
 * Constituents. A Morphemic Breakdown links every morpheme.
 */
function fillerIssues(
	reading: Dumling.Reading,
	part: Part,
	pieces: readonly Piece[],
	at: (index: number) => string,
): BreakdownIssue[] {
	const { language, family, kind } = reading.lemma;
	const issues: BreakdownIssue[] = [];
	for (const [index, piece] of pieces.entries()) {
		if (piece.target !== undefined) continue;
		if (index > 0 && pieces[index - 1]?.target === undefined)
			issues.push({
				path: at(index),
				message: "Join adjacent filler into one piece",
			});
		if (!hasLetters(piece.letters)) continue;
		if (part === "morphemes")
			issues.push({
				path: at(index),
				message:
					"A Morphemic Breakdown links every morpheme; only punctuation is filler",
			});
		else if (!phrasemeFamilies.includes(family)) {
			const ending =
				family === "Lexeme" &&
				kind === "VERB" &&
				index === pieces.length - 1 &&
				(citationEndings[language] ?? []).includes(piece.letters);
			if (!ending)
				issues.push({
					path: at(index),
					message:
						"A word's Constituents show only its citation ending, last, as filler with letters; link every other piece",
				});
		}
	}
	return issues;
}

/** Checks one linked piece's target against the half and the owner. */
function targetIssues(
	reading: Dumling.Reading,
	part: Part,
	piece: Piece & { target: Dumrel.LinkTarget },
	path: string,
): BreakdownIssue[] {
	const { language, family } = reading.lemma;
	const { target } = piece;
	const issues: BreakdownIssue[] = [];
	const phraseme = phrasemeFamilies.includes(family);
	if (
		part === "constituents" &&
		phraseme &&
		target.family !== "Lexeme" &&
		target.family !== "Locution"
	)
		issues.push({
			path: `${path}.target`,
			message: "A phraseme's parts are Lexemes or Locutions",
		});
	if (
		part === "constituents" &&
		!phraseme &&
		!lettersFit(piece.letters, target, language)
	)
		issues.push({
			path: `${path}.letters`,
			message: `${JSON.stringify(piece.letters)} doesn't spell ${JSON.stringify(target.canonicalForm)}, even with umlaut, case or a truncation tolerated`,
		});
	if (target.family !== "Morpheme") return issues;
	const spelling = morphemeSpellings[target.kind];
	if (
		spelling &&
		target.canonicalForm !== zeroEndingCanonicalForm &&
		!spelling.pattern.test(target.canonicalForm)
	)
		issues.push({
			path: `${path}.target.canonicalForm`,
			message: `A ${target.kind} Morpheme is spelled like ${spelling.example}`,
		});
	const closed = interfixes[language];
	if (
		target.kind === "Interfix" &&
		closed &&
		!closed.has(target.canonicalForm)
	)
		issues.push({
			path: `${path}.target.canonicalForm`,
			message: `${target.canonicalForm} is not in the closed Interfix set: ${[...closed].join(", ")}`,
		});
	return issues;
}

/** The separable particle a German VERB's hasSepPrefix names, if any. */
function sepPrefix(reading: Dumling.Reading): string | undefined {
	const core: Readonly<Record<string, unknown>> = reading.lemma.coreFeatures;
	const value = core.hasSepPrefix;
	return reading.lemma.family === "Lexeme" && typeof value === "string"
		? value
		: undefined;
}

/**
 * The record-level invariants of ADR 0050 and ADR 0051 that dumrel leaves to
 * gold, checked on Knowledge dumrel has already parsed: a phraseme has
 * Constituents; Constituents link at least two parts, since a formation with
 * one base has a Source; a phraseme's parts are Lexemes or Locutions; a
 * word's shown letters fit their targets; filler stands only where it may;
 * Morphemes are spelled by Kind and Interfixes come from the closed set; a
 * separable verb's particle is its first part; and with both halves, every
 * constituent ends where a morpheme does.
 */
export function breakdownInvariantIssues(
	reading: Dumling.Reading,
	knowledge: BreakdownKnowledge,
): BreakdownIssue[] {
	const { language, family } = reading.lemma;
	const issues: BreakdownIssue[] = [];
	const constituents = knowledge.breakdown?.constituents;
	const morphemes = knowledge.breakdown?.morphemes;
	if (phrasemeFamilies.includes(family) && constituents === undefined)
		issues.push({
			path: "knowledge",
			message: "A Locution or Saying breaks down into its Constituents",
		});
	for (const [part, pieces] of [
		["constituents", constituents],
		["morphemes", morphemes],
	] as const) {
		if (pieces === undefined) continue;
		const at = (index: number) => `knowledge.breakdown.${part}.${index}`;
		issues.push(...fillerIssues(reading, part, pieces, at));
		for (const [index, piece] of pieces.entries())
			if (piece.target !== undefined)
				issues.push(
					...targetIssues(
						reading,
						part,
						{ letters: piece.letters, target: piece.target },
						at(index),
					),
				);
	}
	if (constituents !== undefined) {
		const linked = constituents.filter(
			(piece) => piece.target !== undefined,
		);
		if (linked.length < 2)
			issues.push({
				path: "knowledge.breakdown.constituents",
				message:
					"Constituents link at least two parts; a formation with one base and nothing to cut has a Source",
			});
		const particle = sepPrefix(reading);
		const first = linked[0];
		if (
			particle !== undefined &&
			first !== undefined &&
			foldCase(first.letters, language) !== foldCase(particle, language)
		)
			issues.push({
				path: "knowledge.breakdown.constituents.0",
				message: `A separable verb's first part is its particle ${JSON.stringify(particle)}`,
			});
	}
	if (constituents !== undefined && morphemes !== undefined) {
		const cuts = boundaries(morphemes);
		if ([...boundaries(constituents)].some((cut) => !cuts.has(cut)))
			issues.push({
				path: "knowledge.breakdown.morphemes",
				message: "Every constituent ends where a morpheme ends",
			});
	}
	return issues;
}
