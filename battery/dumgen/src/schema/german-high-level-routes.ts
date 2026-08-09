import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";

const LEXEME_KINDS_BEFORE_PUNCT = [
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
] as const;
const LEXEME_KINDS_AFTER_PUNCT = ["SCONJ", "SYM", "VERB", "X"] as const;

export const GERMAN_REACHABLE_HIGH_LEVEL_ROUTES = {
	Lexeme: [...LEXEME_KINDS_BEFORE_PUNCT, ...LEXEME_KINDS_AFTER_PUNCT],
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

export const GERMAN_HIGH_LEVEL_ROUTES = {
	...GERMAN_REACHABLE_HIGH_LEVEL_ROUTES,
	Lexeme: [
		...LEXEME_KINDS_BEFORE_PUNCT,
		"PUNCT",
		...LEXEME_KINDS_AFTER_PUNCT,
	],
} as const;

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
