/**
 * The questions of German `segment.inConstituents`'s sense check
 * (`word-senses.ts`), written by code from each contender's shape: a
 * compound is a kind of its head, a derivation what its suffix makes of its
 * base (dumcorpus's affix inventory glosses the common suffixes). Two
 * words of a Kind that forms no compound with a head, an adverb or a
 * conjunction, were written together, and a dictionary's split decides
 * them however far their sense drifted (ADR 0054; #1241 round 9). The
 * absolute question asks whether one analysis gives the sense; the
 * relative one (#1241 round 7) which of the splits does.
 *
 * Their wording names no Breakdown case (#693).
 */
import { germanSuffixes } from "dumcorpus/inventories";
import { withoutUmlaut } from "./forms.js";
import {
	headedKinds,
	type WordAnalysis,
	type WordPiece,
} from "./word-analyses.js";

const capitalized = (text: string) =>
	text.charAt(0).toLocaleUpperCase("de") + text.slice(1);

/** Refined sense glosses for suffixes whose inventory wording is too narrow or too loose for Jev's sense check. */
const refinedSuffixSenses: Readonly<Record<string, string>> = {
	er: "a person, inhabitant, vehicle, tool or instrument that performs or comes from {base}",
	bar: "having the quality of, or able to be done as, {base} names",
	voll: "full of {base} (an abstract quality or substance filling something, NOT 'full up to' a physical edge or object)",
};

/** What a suffix makes of its base, using refined glosses where needed, else the inventory. */
function suffixSense(suffix: WordPiece, base: string): string {
	const key = suffix.letters.toLocaleLowerCase("de");
	const sense =
		refinedSuffixSenses[key] ??
		germanSuffixes.find(({ spelled }) => spelled === key)?.sense;
	return (
		sense ?? "something whose sense comes from what {base} names"
	).replaceAll("{base}", base);
}

/** The words two pieces were written together from, after "a dictionary's word formation split(s) it". */
const writtenTogether = (first: string, second: string) =>
	`into the two words ${first} and ${second}, each a word of its own, written together as one word, however far its sense has drifted from theirs`;

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
		if (!headedKinds.has(kind))
			return `Does a dictionary's word formation split it ${writtenTogether(first.letters, second.letters)}? Answer no when its letters only happen to contain them.`;
		return `Does it mean ${second.letters}, in a way ${first.letters} tells apart? Answer no when it does not mean ${second.letters} at all.`;
	}
	if (first?.role === "Word" && second?.role === "Suffix" && !third)
		return `Was it made from ${first.letters}- with the suffix -${second.letters}, so that it is ${suffixSense(second, `${first.letters}-`)}? Answer no if this sense is an unrelated homonym or a loanword whose modern German sense does not come from ${first.letters}-.`;
	if (first?.role === "Prefix" && second?.role === "Word" && !third) {
		const plain = withoutUmlaut(second.letters);
		const shown =
			plain !== second.letters
				? `${second.letters} (${plain})`
				: second.letters;
		return first.canonicalForm === "ge-" && kind === "NOUN"
			? made(
					`${shown} with the prefix ${first.letters}-`,
					`a collective, action, sound or result formed from ${shown}`,
				)
			: made(
					`${shown} with the prefix ${first.letters}-`,
					`formed from ${shown} with ${first.letters}- (even if its meaning became specialized)`,
				);
	}
	if (first?.role === "Prefix" && second?.role === "Word")
		return made(
			`${second.letters} with the prefix ${first.letters}- and the verb ending`,
			`to make, give, become or treat with ${second.letters}`,
		);
	return made(analysis.label, "something whose sense comes from theirs");
}

/** Gender consistency reminder for noun sense questions. */
const genderCue = (kind: string) =>
	kind === "NOUN"
		? " Check both the meaning and the grammatical gender of the article: a compound takes its head's gender, -ung nouns are always feminine (die), and agentive/person -er nouns are masculine (der) — an unrelated neuter or feminine homonym is not that derivation."
		: "";

/** Whether an analysis gives the sense `emoji` names of `cited` (`das Rentier`). */
export const senseQuestion = (
	analysis: WordAnalysis,
	cited: string,
	emoji: string,
	kind: string,
) =>
	`Think of ${cited} in the sense ${emoji}.${genderCue(kind)} ${testOf(analysis, kind)}`;

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
		if (!headedKinds.has(kind))
			return `a dictionary's word formation splits it ${writtenTogether(first.letters, second.letters)}`;
		return `it means ${second.letters}, in a way ${first.letters} tells apart`;
	}
	if (first?.role === "Word" && second?.role === "Suffix" && !third)
		return made(
			`${first.letters}- with the suffix -${second.letters}`,
			suffixSense(second, `${first.letters}-`),
		);
	if (first?.role === "Prefix" && second?.role === "Word" && !third) {
		const plain = withoutUmlaut(second.letters);
		const shown =
			plain !== second.letters
				? `${second.letters} (${plain})`
				: second.letters;
		return first.canonicalForm === "ge-" && kind === "NOUN"
			? made(
					`${shown} with the prefix ${first.letters}-`,
					`a collective, action, sound or result formed from ${shown}`,
				)
			: made(
					`${shown} with the prefix ${first.letters}-`,
					`formed from ${shown} with ${first.letters}- (even if its meaning became specialized)`,
				);
	}
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
	`Think of ${cited} in the sense ${emoji}. Check both the meaning and the article's grammatical gender (a compound takes its head's gender; -ung nouns are feminine die; agentive -er nouns are masculine der). Which of these splits gives that sense: which one was it made from?`;

/** Exported refined suffix glosses for the #693 disjointness test. */
export const refinedSuffixGlosses = (): readonly string[] =>
	Object.values(refinedSuffixSenses);

/** A contender's option in the sense question: its analysis and its claim. */
export const senseOption = (analysis: WordAnalysis, kind: string) =>
	`${analysis.label}: ${claimOf(analysis, kind)}`;

/** The sense question's `none`. */
export const noSenseOption =
	"None of these: its letters only happen to contain those parts, and it was made from none of them";
