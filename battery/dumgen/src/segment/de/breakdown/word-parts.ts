/**
 * The open parts of a German word's chosen analysis (system ADR 0050): what
 * jev may settle about each word or phrase piece, and what code settles
 * unasked.
 *
 * - A compound's head takes the word's own Kind (a noun's head is a noun).
 * - A separable verb's first part whose Lexeme dumcorpus rules
 *   (`germanLexemePartTargets`) is pinned to it: `weh` in wehtun is ADJ weh.
 * - A base before a suffix with one base Kind takes it (#1241 round 3:
 *   `-ung` derives nouns from verbs, so `Gründ` is a verb's stem).
 * - A hyphenated word's part that dumcorpus authors only as a pronoun is a
 *   PRON (`dich` in a phrasal compound).
 * - A front phrase is a Locution part, its headword asked with its guide.
 * - Outside a verb, a particle-like first part that is also a preposition
 *   links to its ADP Lexeme, not to the verb Prefix (ADR 0054: `über` in
 *   `überhaupt`); nothing outside a verb separates.
 */
import {
	germanAdpositionEntry,
	germanLexemePartTargets,
	germanSeparableParticles,
} from "dumcorpus/inventories";
import type * as Dumrel from "dumrel/types";
import { allRoutes, checkedRouteKey, type RouteKey } from "../routes.js";
import { onlyPronoun } from "./forms.js";
import type { OpenPart } from "./targets.js";
import type { WordAnalysis } from "./word-analyses.js";
import { phraseFormGuide, phraseForms } from "./word-prompts.js";

/** The routes a part of a word may take. */
const wordPartRoutes: readonly RouteKey[] = [
	"Lexeme/NOUN",
	"Lexeme/VERB",
	"Lexeme/ADJ",
	"Lexeme/ADV",
	"Lexeme/ADP",
	"Lexeme/NUM",
	"Lexeme/PRON",
	"Lexeme/PROPN",
];

/** The Kinds whose compounds take their head's Kind: a proper name's head is a noun. */
const headRoutes: Readonly<Record<string, RouteKey>> = {
	NOUN: "Lexeme/NOUN",
	PROPN: "Lexeme/NOUN",
	VERB: "Lexeme/VERB",
	ADJ: "Lexeme/ADJ",
};

const locutionRoutes = allRoutes.filter((key) => key.startsWith("Locution/"));

/**
 * The first part of a verb cut into two words, pinned to the Lexeme
 * dumcorpus rules for it (ADR 0050, #1241): `weh` in wehtun is ADJ weh,
 * though its letters open wehen. The closed inventory decides, as it does
 * particle against Lexeme, so jev is not asked its route or headword.
 * Undefined for a part it doesn't list, or another analysis.
 */
function ruledVerbFirstPart(
	analysis: WordAnalysis,
	kind: string,
): OpenPart | undefined {
	const [first, ...rest] = analysis.pieces;
	if (
		kind !== "VERB" ||
		first?.role !== "Word" ||
		rest.length !== 1 ||
		rest[0]?.role !== "Word"
	)
		return undefined;
	const folded = first.letters.toLocaleLowerCase("de");
	const target = Object.hasOwn(germanLexemePartTargets, folded)
		? germanLexemePartTargets[folded]
		: undefined;
	if (target === undefined) return undefined;
	return {
		reads: first.letters,
		routes: [checkedRouteKey(`Lexeme/${target.kind}`)],
		forms: [target.canonicalForm],
	};
}

/** Whether a noun's analysis is two words, so its first may be a cranberry piece (ADR 0050). */
export const cranberryShaped = (analysis: WordAnalysis, kind: string) =>
	kind === "NOUN" &&
	analysis.pieces.length === 2 &&
	analysis.pieces.every(({ role }) => role === "Word");

/**
 * The open parts of `analysis` of a word of Kind `kind`, in order; its
 * first part may be a cranberry piece when `cranberry`.
 */
export function openWordParts(
	analysis: WordAnalysis,
	kind: string,
	cranberry: boolean,
): OpenPart[] {
	const { pieces } = analysis;
	const head = headRoutes[kind];
	const last = pieces.length - 1;
	const ruled = ruledVerbFirstPart(analysis, kind);
	const hyphenated = pieces.some(({ role }) => role === "Hyphen");
	return pieces.flatMap((piece, index): OpenPart[] => {
		if (index === 0 && ruled !== undefined) return [ruled];
		if (piece.role === "Phrase")
			return [
				{
					reads: piece.reads,
					routes: locutionRoutes,
					forms: phraseForms(piece.reads),
					formGuide: phraseFormGuide,
				},
			];
		if (piece.role !== "Word") return [];
		if (index === last && head !== undefined)
			return [{ reads: piece.letters, routes: [head] }];
		const next = pieces[index + 1];
		if (next?.role === "Suffix" && next.baseKind !== undefined)
			return [
				{
					reads: piece.letters,
					routes: [checkedRouteKey(`Lexeme/${next.baseKind}`)],
				},
			];
		if (hyphenated && onlyPronoun(piece.letters))
			return [{ reads: piece.letters, routes: ["Lexeme/PRON"] }];
		return [
			{
				reads: piece.letters,
				routes: wordPartRoutes,
				...(cranberry && index === 0 ? { cranberry: true } : {}),
			},
		];
	});
}

/**
 * The ADP Lexeme a word of Kind `kind` links its particle piece to, by
 * the piece's Prefix Canonical Form (`über-`): outside a verb, a true
 * separable particle that the ADP Case Table lists as a preposition is
 * that preposition (ADR 0054, the user, 2026-10-27). Undefined inside a
 * verb, for an inseparable prefix (`ver-`), or for a particle that is no
 * preposition (`weg-`), which keep their Prefix Morpheme.
 */
export function particleAdposition(
	prefix: string,
	kind: string,
): Dumrel.UnitShadow | undefined {
	const particle = prefix.endsWith("-") ? prefix.slice(0, -1) : prefix;
	if (
		kind === "VERB" ||
		!germanSeparableParticles.has(particle) ||
		germanAdpositionEntry({ family: "Lexeme", canonicalForm: particle }) ===
			null
	)
		return undefined;
	// Sound: German's Lexeme ADP route has a Unit Shadow shape.
	return {
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: particle,
	} as Dumrel.UnitShadow;
}
