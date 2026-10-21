import { type Infer, v } from "convex/values";
import type { Route } from "dumgen";
import type * as Dumling from "dumling/types";
import type { SupportedTargetLanguage } from "../../shared/supported-target-language";
import { literalUnion } from "./literalUnion";

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

/**
 * Every Dumling Lemma route as language → Family → Kinds. A Kind name may
 * appear in two Families: Lexeme VERB and Locution VERB are different routes
 * (ADR 0039).
 */
const lemmaRouteKinds = {
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
		Morpheme: morphemeKindValues,
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

const familyValues = [
	"Lexeme",
	"Locution",
	"Saying",
	"Foreign",
	"Morpheme",
] as const;
const kindValues = [
	...lexemeKindValues,
	...hebrewMorphemeKindValues,
	"Saying",
	"Foreign",
] as const;

export const familyValidator = literalUnion(familyValues);
export const kindValidator = literalUnion(kindValues);

export type SameMembers<A, B> = [A] extends [B]
	? [B] extends [A]
		? true
		: false
	: false;
// The validators admit every Dumling Family, Kind and route, and nothing else.
true satisfies SameMembers<Infer<typeof familyValidator>, Dumling.Family>;
true satisfies SameMembers<Infer<typeof kindValidator>, Dumling.Kind>;
true satisfies SameMembers<ListedRoute, DumlingRoute>;
/**
 * Where a click on a stored unit routes (Dumgen ADR 0007): German, a Family
 * other than Morpheme, and one of its Kinds.
 */
function unitRoutesFor<
	L extends SupportedTargetLanguage,
	K extends readonly [string, ...string[]],
>(language: L, locutionKinds: K) {
	return v.union(
		v.object({
			language: v.literal(language),
			family: v.literal("Lexeme"),
			kind: literalUnion(lexemeKindValues),
		}),
		v.object({
			language: v.literal(language),
			family: v.literal("Locution"),
			kind: literalUnion(locutionKinds),
		}),
		v.object({
			language: v.literal(language),
			family: v.literal("Saying"),
			kind: v.literal("Saying"),
		}),
		v.object({
			language: v.literal(language),
			family: v.literal("Foreign"),
			kind: v.literal("Foreign"),
		}),
	);
}
export const unitRouteValidator = v.union(
	unitRoutesFor("de", lemmaRouteKinds.de.Locution),
	unitRoutesFor("he", lemmaRouteKinds.he.Locution),
);
// A stored route is exactly a Route `segment.inUnits` gives.
true satisfies SameMembers<
	Infer<typeof unitRouteValidator>,
	Route<SupportedTargetLanguage>
>;
