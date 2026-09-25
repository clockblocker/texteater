import type * as Dumling from "dumling/types";
import { DumgenFailure } from "../../../universal/failure.js";
import { authoredMembers } from "./inventory.js";

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

/**
 * Other Paradigm Cells of a reviewed PRON or DET: members of the same Kind that
 * differ only in the varied Core Features. Preserves every other Core Feature,
 * compares null literally, and returns only reviewed alternatives.
 */
export function selectGrammaticalAlternatives(input: {
	readonly source: NavigableLemma;
	readonly vary: readonly NavigableFeature[];
}): readonly Dumling.Reading<"de">[] {
	const source = authoredFor(input.source);
	if (
		!source ||
		(input.source.kind !== "PRON" && input.source.kind !== "DET")
	)
		throw new DumgenFailure(
			"InvalidInput",
			"grammatical-navigation",
			"Source must be a reviewed authored member",
		);
	if (
		input.vary.some((key) => !Object.hasOwn(input.source.coreFeatures, key))
	)
		throw new DumgenFailure(
			"InvalidInput",
			"grammatical-navigation",
			"Unknown feature coordinate",
		);
	const varied = new Set<string>(input.vary);
	return authoredMembers
		.filter(
			(member) =>
				member.lemma.kind === input.source.kind &&
				!sameValue(member.lemma, input.source) &&
				Object.entries(input.source.coreFeatures).every(
					([key, value]) =>
						varied.has(key) ||
						sameValue(
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

export function authoredReading(reading: unknown) {
	return authoredMembers.find((member) => sameValue(member.reading, reading));
}
