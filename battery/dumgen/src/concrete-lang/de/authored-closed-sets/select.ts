import type * as Dumling from "dumling/types";
import { DumgenFailure } from "../../../universal/failure.js";
import { reviewedDeterminers } from "./determiner-paradigms.js";
import { authoredMembers } from "./inventory.js";
import { reviewedPronouns } from "./pronoun-paradigms.js";
import type { SurfaceCell } from "./stem-lemma.js";

export function sameValue(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (
		!left ||
		!right ||
		typeof left !== "object" ||
		typeof right !== "object"
	)
		return false;
	const a = Object.entries(left),
		b = Object.entries(right);
	return (
		a.length === b.length &&
		a.every(
			([key, value]) =>
				Object.hasOwn(right, key) &&
				sameValue(value, (right as Record<string, unknown>)[key]),
		)
	);
}
/**
 * Whether two feature values agree: equal, or a value set that contains the
 * other value. ihm's gender Masc, Neut agrees with er's Masc and es's Neut.
 */
export function agreeingValue(left: unknown, right: unknown): boolean {
	if (sameValue(left, right)) return true;
	if (Array.isArray(left) && typeof right === "string")
		return left.includes(right);
	if (Array.isArray(right) && typeof left === "string")
		return right.includes(left);
	return false;
}
export function authoredFor(lemma: Dumling.Lemma) {
	return authoredMembers.find((member) => sameValue(member.lemma, lemma));
}
/** Selects an exact authored article Reading, including its reviewed Knowledge. */
export function selectAuthoredArticle(reading: unknown) {
	return (
		authoredMembers.find(
			(member) =>
				member.lemma.kind === "DET" &&
				"pronType" in member.lemma.coreFeatures &&
				member.lemma.coreFeatures.pronType === "Art" &&
				sameValue(member.reading, reading),
		) ?? null
	);
}
export function closedRoute(lemma: {
	language: string;
	family: string;
	kind: string;
}): boolean {
	return (
		lemma.language === "de" &&
		lemma.family === "Lexeme" &&
		(lemma.kind === "AUX" || lemma.kind === "DET")
	);
}
type NavigableLemma =
	| Dumling.Lemma<"de", "Lexeme", "PRON">
	| Dumling.Lemma<"de", "Lexeme", "DET">;
type NavigableFeature =
	| keyof Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"]
	| keyof Dumling.Lemma<"de", "Lexeme", "DET">["coreFeatures"];

/** Whether a PRON or DET Lemma is a pillar's Paradigm Cell: it marks its cell in Core. */
export function isParadigmCell(lemma: Dumling.Lemma): boolean {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return ["case", "number", "gender"].some(
		(coordinate) => (core[coordinate] ?? null) !== null,
	);
}

function reviewedSource(source: NavigableLemma) {
	const member = authoredFor(source);
	if (!member || (source.kind !== "PRON" && source.kind !== "DET"))
		throw new DumgenFailure(
			"InvalidInput",
			"grammatical-navigation",
			"Source must be a reviewed authored member",
		);
	return member;
}

/**
 * Whether a cell marks a coordinate. Plural agreement has no gender, so a
 * plural cell's unmarked gender still counts as its gender.
 */
function marks(core: Readonly<Record<string, unknown>>, key: string): boolean {
	return (
		(core[key] ?? null) !== null ||
		(key === "gender" && core.number === "Plur")
	);
}

/**
 * Other Paradigm Cells of a reviewed pillar PRON or DET: cells of the same
 * Kind that differ only in the varied Core Features. Preserves every other
 * Core Feature, compares null literally, lets a value set match any value it
 * contains (er reaches ihm, whose gender is Masc, Neut), and returns only
 * reviewed alternatives. Both ends must mark every varied feature, so an invariant
 * member with unmarked case (man) is never reached by varying case, and
 * reaches nothing that way. A stem Lemma (dieser, mein) has no other cells,
 * so it returns none; its forms are its own Surfaces (selectFormAlternatives).
 */
export function selectGrammaticalAlternatives(input: {
	readonly source: NavigableLemma;
	readonly vary: readonly NavigableFeature[];
}): readonly Dumling.Reading<"de">[] {
	reviewedSource(input.source);
	if (
		input.vary.some((key) => !Object.hasOwn(input.source.coreFeatures, key))
	)
		throw new DumgenFailure(
			"InvalidInput",
			"grammatical-navigation",
			"Unknown feature coordinate",
		);
	const sourceCore: Readonly<Record<string, unknown>> =
		input.source.coreFeatures;
	if (
		!isParadigmCell(input.source) ||
		input.vary.some((key) => !marks(sourceCore, key))
	)
		return [];
	const varied = new Set<string>(input.vary);
	return authoredMembers
		.filter(
			(member) =>
				member.lemma.kind === input.source.kind &&
				isParadigmCell(member.lemma) &&
				!sameValue(member.lemma, input.source) &&
				input.vary.every((key) =>
					marks(member.lemma.coreFeatures, key),
				) &&
				Object.entries(input.source.coreFeatures).every(
					([key, value]) =>
						varied.has(key) ||
						agreeingValue(
							value,
							(
								member.lemma.coreFeatures as Record<
									string,
									unknown
								>
							)[key],
						),
				),
		)
		.map((member) => member.reading);
}

/** A reviewed spelling of a stem Lemma and the cell its Surface marks. */
export type AuthoredForm = {
	readonly spelled: string;
	readonly cell: SurfaceCell;
};
const cellCoordinates = ["case", "number", "gender"] as const;

/**
 * Other Surfaces of a reviewed stem PRON or DET: the Lemma's own spellings
 * whose cell differs from `cell` only in the varied coordinates. A stem's
 * forms stay inside its Lemma: diesem reaches dieser and dieses, never jenem.
 * A pillar has no such forms; its cells are Lemmas
 * (selectGrammaticalAlternatives).
 */
export function selectFormAlternatives(input: {
	readonly source: NavigableLemma;
	readonly cell: SurfaceCell;
	readonly vary: readonly (typeof cellCoordinates)[number][];
}): readonly AuthoredForm[] {
	const member = reviewedSource(input.source);
	const varied = new Set<string>(input.vary);
	const forms: AuthoredForm[] = [];
	for (const { spelled, cell } of [
		...reviewedDeterminers,
		...reviewedPronouns,
	].find((entry) => entry.member === member)?.spellings ?? [])
		if (
			cell &&
			cellCoordinates.every(
				(coordinate) =>
					varied.has(coordinate) ||
					cell[coordinate] === input.cell[coordinate],
			) &&
			!cellCoordinates.every(
				(coordinate) => cell[coordinate] === input.cell[coordinate],
			) &&
			!forms.some(
				(form) =>
					form.spelled === spelled && sameValue(form.cell, cell),
			)
		)
			forms.push({ spelled, cell });
	return forms;
}

export function authoredReading(reading: unknown) {
	return authoredMembers.find((member) => sameValue(member.reading, reading));
}
