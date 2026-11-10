/**
 * The German noun phrase's paradigm as cells: a case, a number and, in the
 * singular, a gender (#1339). Each piece of evidence a phrase holds allows
 * a set of cells, and the phrase's cells are what all of them allow
 * together: a determiner's authored cells (den is Acc.Masc.Sing or
 * Dat.Plur), the cases a preposition governs, and the cells an attributive
 * ending fits in any declension (-em is only Dat.Sing, Masc or Neut).
 * Read one way the cells narrow a case question; read the other way they
 * turn jev's number and gender into a case (den with a plural noun is only
 * Dat), or its case into a number (des is only singular).
 */

import {
	authoredRealizations,
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import { cases, fold, type Gender } from "./shape.js";

export type SurfaceCase = (typeof cases)[number];

/** One cell of the paradigm; a plural cell marks no gender. */
export type PhraseCell = {
	readonly case: SurfaceCase;
	readonly number: "Sing" | "Plur";
	readonly gender: Gender | null;
};

const genders: readonly Gender[] = ["Masc", "Fem", "Neut"];

/** Every cell, in catalog order: the cells nothing narrows. */
export const everyCell: readonly PhraseCell[] = cases.flatMap(
	(grammaticalCase) => [
		...genders.map(
			(gender): PhraseCell => ({
				case: grammaticalCase,
				number: "Sing",
				gender,
			}),
		),
		{ case: grammaticalCase, number: "Plur", gender: null },
	],
);

/** The cells whose value of each feature `wanted` sets is that value. */
function cellsWith(wanted: {
	readonly case?: unknown;
	readonly number?: unknown;
	readonly gender?: unknown;
}): readonly PhraseCell[] {
	return everyCell.filter(
		(cell) =>
			(typeof wanted.case !== "string" || cell.case === wanted.case) &&
			(typeof wanted.number !== "string" ||
				cell.number === wanted.number) &&
			(cell.gender === null ||
				typeof wanted.gender !== "string" ||
				cell.gender === wanted.gender),
	);
}

/** The cells of `cells` that `allowed` also holds, in catalog order. */
export function bothAllow(
	cells: readonly PhraseCell[],
	allowed: readonly PhraseCell[],
): readonly PhraseCell[] {
	return cells.filter((cell) =>
		allowed.some((other) => sameCell(cell, other)),
	);
}

const sameCell = (left: PhraseCell, right: PhraseCell) =>
	left.case === right.case &&
	left.number === right.number &&
	left.gender === right.gender;

/** The cases among `cells`, in catalog order. */
export function casesOf(cells: readonly PhraseCell[]): readonly SurfaceCase[] {
	return cases.filter((grammaticalCase) =>
		cells.some((cell) => cell.case === grammaticalCase),
	);
}

/** The cells of the cases among `cells`, every number and gender: what a coordinated phrase shares. */
export function casesOnly(cells: readonly PhraseCell[]): readonly PhraseCell[] {
	const shared = casesOf(cells);
	return everyCell.filter((cell) => shared.includes(cell.case));
}

/**
 * The cases `cells` leave for a head of `number` and `gender`; a gender
 * that is none or mixed leaves every gender.
 */
export function casesFor(
	cells: readonly PhraseCell[],
	number: string,
	gender: unknown,
): readonly SurfaceCase[] {
	return casesOf(
		cells.filter(
			(cell) =>
				cell.number === number &&
				(cell.gender === null ||
					typeof gender !== "string" ||
					cell.gender === gender),
		),
	);
}

/**
 * The cells a determiner spelled `word` (folded) takes in any of its
 * authored cells, or undefined when it is none or a cell leaves the case
 * open (etwas).
 */
export function determinerCells(
	word: string,
): readonly PhraseCell[] | undefined {
	const authored = authoredRealizations.filter(
		({ member, spelled }) =>
			member.lemma.kind === "DET" && fold(spelled) === word,
	);
	if (authored.length === 0) return undefined;
	const found: PhraseCell[] = [];
	for (const { member, inflection } of authored) {
		const values: Readonly<Record<string, unknown>> = {
			...member.lemma.coreFeatures,
			...inflection,
		};
		if (typeof values.case !== "string") return undefined;
		found.push(...cellsWith(values));
	}
	return bothAllow(everyCell, found);
}

/** The cells of the cases a preposition spelled `word` governs, by the ADP Case Table. */
export function prepositionCells(
	word: string,
): readonly PhraseCell[] | undefined {
	const entry = germanAdpositionEntry({
		family: "Lexeme",
		canonicalForm: word,
	});
	if (!entry) return undefined;
	const allowed: readonly string[] = germanAdpositionAllowedCases(entry);
	return everyCell.filter((cell) => allowed.includes(cell.case));
}

const sing = (grammaticalCase: SurfaceCase, ...of: readonly Gender[]) =>
	of.map(
		(gender): PhraseCell => ({
			case: grammaticalCase,
			number: "Sing",
			gender,
		}),
	);
const plur = (...of: readonly SurfaceCase[]) =>
	of.map(
		(grammaticalCase): PhraseCell => ({
			case: grammaticalCase,
			number: "Plur",
			gender: null,
		}),
	);

/**
 * The cells an attributive ADJ's ending fits in the strong, mixed and weak
 * declensions together, so no determiner need be known: -em only
 * Dat.Sing.Masc/Neut, -es only Nom/Acc.Sing.Neut, -e no Acc.Sing.Masc and
 * no Dat or Gen, -en no Nom.Sing and no Acc.Sing.Fem/Neut. -er is left
 * alone: a comparative's -er and an invariable place adjective (Leipziger)
 * end in it too.
 */
export function endingCells(text: string): readonly PhraseCell[] | undefined {
	const word = fold(text);
	if (word.endsWith("em")) return sing("Dat", "Masc", "Neut");
	if (word.endsWith("es"))
		return [...sing("Nom", "Neut"), ...sing("Acc", "Neut")];
	if (word.endsWith("e"))
		return bothAllow(everyCell, [
			...sing("Nom", ...genders),
			...sing("Acc", "Fem", "Neut"),
			...plur("Nom", "Acc"),
		]);
	if (word.endsWith("en"))
		return bothAllow(everyCell, [
			...sing("Acc", "Masc"),
			...sing("Dat", ...genders),
			...sing("Gen", ...genders),
			...plur(...cases),
		]);
	return undefined;
}
