import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";

export const GERMAN_HIGH_LEVEL_ROUTES = {
	Lexeme: [
		"ADJ",
		"ADP",
		"ADV",
		"AUX",
		"CCONJ",
		"DET",
		"INTJ",
		"NOUN",
		"NUM",
		"PART",
		"PRON",
		"PROPN",
		"PUNCT",
		"SCONJ",
		"SYM",
		"VERB",
		"X",
	],
	Phraseme: [
		"Aphorism",
		"Collocation",
		"DiscourseFormula",
		"Idiom",
		"Proverb",
	],
	Construction: ["Fusion", "PairedFrame"],
} as const satisfies {
	readonly [Family in Exclude<
		LemmaFamilyFor<"de">,
		"Morpheme"
	>]: readonly LemmaKindFor<"de", Family>[];
};

export type GermanHighLevelFamily = keyof typeof GERMAN_HIGH_LEVEL_ROUTES;
export type GermanHighLevelKind<Family extends GermanHighLevelFamily> =
	(typeof GERMAN_HIGH_LEVEL_ROUTES)[Family][number];

export function isGermanHighLevelRoute(
	family: string,
	kind: string,
): family is GermanHighLevelFamily {
	return (
		family in GERMAN_HIGH_LEVEL_ROUTES &&
		(
			GERMAN_HIGH_LEVEL_ROUTES[
				family as GermanHighLevelFamily
			] as readonly string[]
		).includes(kind)
	);
}
