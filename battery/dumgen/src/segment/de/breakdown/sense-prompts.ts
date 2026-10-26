/**
 * The questions of German `segment.inConstituents`'s sense check
 * (`word-senses.ts`), written by code from each contender's shape: a
 * compound is a kind of its head, a derivation what its suffix makes of its
 * base (dumcorpus's affix inventory glosses the common suffixes). The
 * absolute question asks whether one analysis gives the sense; the
 * relative one (#1241 round 7) which of the splits does.
 *
 * Their wording names no Breakdown case (#693).
 */
import { germanSuffixes } from "dumcorpus/inventories";
import type { WordAnalysis, WordPiece } from "./word-analyses.js";

const capitalized = (text: string) =>
	text.charAt(0).toLocaleUpperCase("de") + text.slice(1);

/** What a suffix makes of its base, from the inventory, else a plain gloss. */
function suffixSense(suffix: WordPiece, base: string): string {
	const sense = germanSuffixes.find(
		({ spelled }) => spelled === suffix.letters.toLocaleLowerCase("de"),
	)?.sense;
	return (
		sense ?? "something whose sense comes from what {base} names"
	).replaceAll("{base}", base);
}

/** The question an analysis's sense must pass, by its shape, after "Think of … in the sense …". */
function testOf(analysis: WordAnalysis, kind: string): string {
	const [first, second, third] = analysis.pieces;
	const made = (from: string, sense: string) =>
		`Was it made from ${from}, so that it is ${sense}? Answer no when its letters only happen to contain them.`;
	if (first?.role === "Word" && second?.role === "Word" && !third) {
		if (kind === "NOUN") {
			const head = capitalized(second.letters);
			return `Is it a ${head}, a kind of ${head} that ${first.letters} tells apart? Answer no when it is no ${head} at all.`;
		}
		return `Does it mean ${second.letters}, in a way ${first.letters} tells apart? Answer no when it does not mean ${second.letters} at all.`;
	}
	if (first?.role === "Word" && second?.role === "Suffix" && !third)
		return made(
			`${first.letters}- with the suffix -${second.letters}`,
			suffixSense(second, `${first.letters}-`),
		);
	if (first?.role === "Prefix" && second?.role === "Word" && !third)
		return made(
			`${second.letters} with the prefix ${first.letters}-`,
			`still a kind of ${second.letters}, changed by the prefix`,
		);
	if (first?.role === "Prefix" && second?.role === "Word")
		return made(
			`${second.letters} with the prefix ${first.letters}- and the verb ending`,
			`to make, give, become or treat with ${second.letters}`,
		);
	return made(analysis.label, "something whose sense comes from theirs");
}

/** Whether an analysis gives the sense `emoji` names of `cited` (`das Rentier`). */
export const senseQuestion = (
	analysis: WordAnalysis,
	cited: string,
	emoji: string,
	kind: string,
) => `Think of ${cited} in the sense ${emoji}. ${testOf(analysis, kind)}`;

/** The claim an option makes about an analysis's sense, by its shape. */
function claimOf(analysis: WordAnalysis, kind: string): string {
	const [first, second, third] = analysis.pieces;
	const made = (from: string, sense: string) =>
		`it was made from ${from}, so that it is ${sense}`;
	if (first?.role === "Word" && second?.role === "Word" && !third) {
		if (kind === "NOUN") {
			const head = capitalized(second.letters);
			return `it is a ${head}, a kind of ${head} that ${first.letters} tells apart`;
		}
		return `it means ${second.letters}, in a way ${first.letters} tells apart`;
	}
	if (first?.role === "Word" && second?.role === "Suffix" && !third)
		return made(
			`${first.letters}- with the suffix -${second.letters}`,
			suffixSense(second, `${first.letters}-`),
		);
	if (first?.role === "Prefix" && second?.role === "Word" && !third)
		return made(
			`${second.letters} with the prefix ${first.letters}-`,
			`still a kind of ${second.letters}, changed by the prefix`,
		);
	if (first?.role === "Prefix" && second?.role === "Word")
		return `it was made from ${second.letters} with the prefix ${first.letters}- and the verb ending, so that it means to make, give, become or treat with ${second.letters}`;
	return made("these parts", "something whose sense comes from theirs");
}

/** The word as the sense question names it: a noun with its article (`das Rentier`). */
export function citedWord(word: string, gender: unknown): string {
	const articles: Readonly<Record<string, string>> = {
		Masc: "der",
		Fem: "die",
		Neut: "das",
	};
	const genders =
		typeof gender === "string"
			? [gender]
			: typeof gender === "object" &&
					gender !== null &&
					"mixed" in gender &&
					Array.isArray(gender.mixed)
				? gender.mixed
				: [];
	const named = genders.flatMap((one) =>
		typeof one === "string" && one in articles ? [articles[one]] : [],
	);
	return named.length > 0 ? `${named.join("/")} ${word}` : word;
}

/** The sense question: which split gives the sense `emoji` names of `cited` (`das Rentier`). */
export const senseInstructions = (cited: string, emoji: string) =>
	`Think of ${cited} in the sense ${emoji}. Which of these splits gives that sense: which one was it made from?`;

/** A contender's option in the sense question: its analysis and its claim. */
export const senseOption = (analysis: WordAnalysis, kind: string) =>
	`${analysis.label}: ${claimOf(analysis, kind)}`;

/** The sense question's `none`. */
export const noSenseOption =
	"None of these: its letters only happen to contain those parts, and it was made from none of them";
