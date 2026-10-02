import type { SegmentedSentence } from "../../../types.js";
import { isGovernablePreposition } from "../governable-prepositions.js";

/**
 * A member takes its word's lexical casing, never its place in the sentence,
 * and so does the Canonical Form (ADR 0002, #638): sentence-initial Wegen,
 * Alle and Wer are wegen, alle and wer. A noun keeps its capital and formal
 * Sie its own. A casing error in the source (Unter mid-sentence, katze)
 * stays a Typo member and never reaches the Canonical Form. This is the one
 * place the rule lives; the prompts do not repeat it.
 */

/** Word classes whose words are lowercase wherever they stand. */
const closedKinds: ReadonlySet<string> = new Set([
	"ADP",
	"AUX",
	"CCONJ",
	"DET",
	"PART",
	"PRON",
	"SCONJ",
]);

const lower = (text: string) => text.toLocaleLowerCase("de");
const upper = (text: string) => text.toLocaleUpperCase("de");

/** Only the first letter is a capital: Wegen, not UNO or IV. */
export function capitalizedInitial(text: string): boolean {
	const [first = "", ...rest] = text;
	return first !== lower(first) && rest.join("") === lower(rest.join(""));
}

function lowercaseInitial(text: string): boolean {
	const [first = ""] = text;
	return first !== upper(first);
}

/**
 * Whether a Segment opens a sentence, where German capitalizes any word:
 * nothing but opening quotes or brackets before it, or a sentence end or
 * colon.
 */
export function opensSentence(
	sentence: SegmentedSentence,
	index: number,
): boolean {
	for (let position = index - 1; position >= 0; position--) {
		const segment = sentence.segments[position];
		if (!segment || segment.kind === "Whitespace") continue;
		if (segment.kind === "ResolvableText") return false;
		const text = segment.text.trim();
		if (!text) continue;
		if (/[.!?:…]$/u.test(text)) return true;
		if (!/^[„“”"«»‚‘’'([{–—-]+$/u.test(text)) return false;
	}
	return true;
}

export type LexicalCasing = {
	readonly mode: "LowerInitial" | "UpperInitial" | "Keep";
	/** Set when the position cannot explain the casing: a casing error. */
	readonly orthography?: "Standard" | "Typo";
};

/**
 * What lexical casing makes of one member of a Lexeme, or undefined where it
 * leaves the judged normalization alone: an article or a piece the fusion
 * table spells, a generated correction, a name's registered styling, and a
 * capital an open-class word keeps mid-sentence (Berliner Luft).
 */
export function lexicalCasing(args: {
	readonly kind: string;
	readonly sentence: SegmentedSentence;
	readonly segmentIndex: number;
	readonly text: string;
	/** The judged orthography. */
	readonly orthography: string;
	/** Formal address: Sie, Ihnen, Ihr. */
	readonly formal: boolean;
	/**
	 * A noun's own word, a lowercase function word beside it (its governed
	 * preposition), or a member the rule leaves alone (a suspended compound's
	 * parts).
	 */
	readonly role: "Head" | "Function" | "Other";
	/**
	 * The unit's first word. A later word of a closed-class unit may keep a
	 * noun's capital (auf Grund, zu Gunsten).
	 */
	readonly first: boolean;
}): LexicalCasing | undefined {
	const { kind, text, orthography, role } = args;
	if (kind === "PROPN" || role === "Other") return undefined;
	if (kind === "NOUN" && role === "Head") {
		// All lowercase: pH-Wert keeps its styling.
		if (lowercaseInitial(text) && text === lower(text))
			return { mode: "UpperInitial", orthography: "Typo" };
		return capitalizedInitial(text) ? { mode: "Keep" } : undefined;
	}
	if (args.formal) {
		if (lowercaseInitial(text))
			return { mode: "UpperInitial", orthography: "Typo" };
		return { mode: "Keep" };
	}
	if (!capitalizedInitial(text)) return undefined;
	if (opensSentence(args.sentence, args.segmentIndex))
		return {
			mode: "LowerInitial",
			...(orthography === "Typo" ? { orthography: "Standard" } : {}),
		};
	if ((closedKinds.has(kind) && args.first) || role === "Function")
		return { mode: "LowerInitial", orthography: "Typo" };
	return orthography === "Typo" ? { mode: "LowerInitial" } : undefined;
}

/**
 * The Canonical Form candidate in lexical casing: a word other than a noun
 * or a name loses a capital its sentence-initial position gave it, and a
 * closed-class word any capital of its initial (mid-sentence Unter is a
 * casing Typo of unter).
 */
export function lexicalCandidate(args: {
	readonly kind: string;
	readonly sentence: SegmentedSentence;
	readonly firstSegmentIndex: number | undefined;
	readonly members: readonly string[];
}): readonly string[] {
	const [first, ...rest] = args.members;
	if (
		first === undefined ||
		args.firstSegmentIndex === undefined ||
		args.kind === "NOUN" ||
		args.kind === "PROPN" ||
		!capitalizedInitial(first) ||
		!(
			closedKinds.has(args.kind) ||
			opensSentence(args.sentence, args.firstSegmentIndex)
		)
	)
		return args.members;
	return [lowerInitial(first), ...rest];
}

export function lowerInitial(text: string): string {
	return lower(text.slice(0, 1)) + text.slice(1);
}

/**
 * The role of each member of a common noun for its casing: the governed
 * preposition is a function word, the one other word the head. Several other
 * words (a suspended compound) are left to the judgment.
 */
export function nounMemberRoles(
	members: readonly string[],
	settled: (position: number) => boolean,
): ("Head" | "Function" | "Other")[] {
	const roles = members.map((text, position) =>
		settled(position)
			? ("Other" as const)
			: isGovernablePreposition(lower(text))
				? ("Function" as const)
				: ("Head" as const),
	);
	return roles.filter((role) => role === "Head").length > 1
		? roles.map((role) => (role === "Head" ? "Other" : role))
		: roles;
}
