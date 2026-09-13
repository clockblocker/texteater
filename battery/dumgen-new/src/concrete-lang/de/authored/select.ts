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
/** Preserves all unvaried Core Features, compares null literally, and returns only reviewed alternatives. */
export function selectGrammaticalAlternatives(input: {
	readonly source: Dumling.Lemma<"de", "Lexeme", "PRON">;
	readonly vary: readonly (keyof Dumling.Lemma<
		"de",
		"Lexeme",
		"PRON"
	>["coreFeatures"])[];
}): readonly Dumling.Reading<"de">[] {
	const source = authoredFor(input.source);
	if (!source)
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
	const varied = new Set(input.vary);
	return authoredMembers
		.filter(
			(member) =>
				member.lemma.kind === "PRON" &&
				!sameValue(member.lemma, input.source) &&
				Object.entries(input.source.coreFeatures).every(
					([key, value]) =>
						varied.has(
							key as keyof typeof input.source.coreFeatures,
						) ||
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
