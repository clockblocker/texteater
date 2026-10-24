/**
 * The Dumling Lemma routes tf-demo stores, as plain tables Convex validators
 * and storage-side parsers read.
 */
import type * as Dumling from "dumling/types";

const lexemeKindValues = [
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
] as const;
const morphemeKindValues = [
	"Circumfix",
	"Duplifix",
	"Infix",
	"Interfix",
	"Prefix",
	"Root",
	"Suffix",
	"Suffixoid",
] as const;
/** Root-and-pattern morphology is Semitic, so only Hebrew picks Transfix. */
const hebrewMorphemeKindValues = [...morphemeKindValues, "Transfix"] as const;
/** Only German picks the Ending, a word's inflectional ending (system ADR 0051). */
const germanMorphemeKindValues = [...morphemeKindValues, "Ending"] as const;

/**
 * Every Dumling Lemma route as language → Family → Kinds. A Kind name may
 * appear in two Families: Lexeme VERB and Locution VERB are different routes
 * (ADR 0039).
 */
export const lemmaRouteKinds = {
	de: {
		Lexeme: lexemeKindValues,
		Locution: [
			"ADJ",
			"ADP",
			"ADV",
			"CCONJ",
			"DET",
			"INTJ",
			"NOUN",
			"NUM",
			"PRON",
			"SCONJ",
			"VERB",
		],
		Saying: ["Saying"],
		Foreign: ["Foreign"],
		Morpheme: germanMorphemeKindValues,
	},
	en: {
		Lexeme: lexemeKindValues,
		Locution: ["ADP", "ADV", "INTJ", "NOUN", "SCONJ", "VERB"],
		Saying: ["Saying"],
		Foreign: ["Foreign"],
		Morpheme: morphemeKindValues,
	},
	he: {
		Lexeme: lexemeKindValues,
		Locution: ["ADV", "INTJ"],
		Saying: ["Saying"],
		Foreign: ["Foreign"],
		Morpheme: hebrewMorphemeKindValues,
	},
} as const;
type ListedRoutes = typeof lemmaRouteKinds;
type ListedRoute = {
	[L in keyof ListedRoutes]: {
		[F in keyof ListedRoutes[L]]: ListedRoutes[L][F] extends readonly string[]
			? `${L}/${F & string}/${ListedRoutes[L][F][number]}`
			: never;
	}[keyof ListedRoutes[L]];
}[keyof ListedRoutes];
type DumlingRoute = Dumling.UnitRoute extends infer Route
	? Route extends Dumling.UnitRoute
		? `${Route["language"]}/${Route["family"]}/${Route["kind"]}`
		: never
	: never;

/** Whether a language, Family and Kind name one Dumling Lemma route. */
export function isLemmaRoute(
	language: string,
	family: string,
	kind: string,
): boolean {
	if (!Object.hasOwn(lemmaRouteKinds, language)) return false;
	const families: Partial<Record<string, readonly string[]>> =
		lemmaRouteKinds[language as keyof ListedRoutes];
	return (
		Object.hasOwn(families, family) && !!families[family]?.includes(kind)
	);
}

export const familyValues = [
	"Lexeme",
	"Locution",
	"Saying",
	"Foreign",
	"Morpheme",
] as const;
export const kindValues = [
	...lexemeKindValues,
	...hebrewMorphemeKindValues,
	"Ending",
	"Saying",
	"Foreign",
] as const;

type SameMembers<A, B> = [A] extends [B]
	? [B] extends [A]
		? true
		: false
	: false;
// The tables list every Dumling route, and nothing else.
true satisfies SameMembers<ListedRoute, DumlingRoute>;
