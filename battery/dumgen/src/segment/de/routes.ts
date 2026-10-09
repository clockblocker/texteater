/**
 * The German routes a `segment.inUnits` unit can take, as option keys
 * (`Lexeme/VERB`) with the short descriptions the judge reads. AUX and PUNCT
 * are left out: an auxiliary always joins the verb it serves, and
 * punctuation is never scored. The Kinds are checked against Dumling's, and
 * a key becomes a Route only when it names one of these routes.
 */
import type * as Dumling from "dumling/types";
import type { Route } from "../segmented-sentence.js";

const lexemeKinds = [
	"ADJ",
	"ADP",
	"ADV",
	"CCONJ",
	"DET",
	"INTJ",
	"NOUN",
	"NUM",
	"PART",
	"PRON",
	"PROPN",
	"SCONJ",
	"SYM",
	"VERB",
] as const satisfies readonly Dumling.Kind<"de", "Lexeme">[];

const locutionKinds = [
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
] as const satisfies readonly Dumling.Kind<"de", "Locution">[];

type LexemeKind = (typeof lexemeKinds)[number];
type LocutionKind = (typeof locutionKinds)[number];

/** A German route's option key: its Family and Kind (`Lexeme/VERB`). */
export type RouteKey =
	| `Lexeme/${LexemeKind}`
	| `Locution/${LocutionKind}`
	| "Saying/Saying"
	| "Foreign/Foreign";

/** A unit's route key, or `Unresolved` for a unit no route took. */
export type UnitRouteKey = RouteKey | "Unresolved";

const routeDescriptions: Readonly<Record<RouteKey, string>> = {
	"Lexeme/ADJ":
		"Adjective, also comparative or used adverbially (singt laut), and every participle outside a perfect or passive (die gebratenen Zwiebeln, Die Tür ist geschlossen)",
	"Lexeme/ADP":
		"Preposition or postposition that no word governs (im Keller)",
	"Lexeme/ADV":
		"Adverb, including pronominal adverbs (darauf, davon), a split adverb (Da … von, Wo … hin) and interrogative or relative wo, wann, wie, warum",
	"Lexeme/CCONJ": "Coordinating conjunction (und, oder, aber, denn, sondern)",
	"Lexeme/DET":
		"Determiner that modifies a noun and is not der/die/das/ein (mein, dieser, kein, jeder, welcher)",
	"Lexeme/INTJ":
		"Interjection or one-word response or formula (ach, ja, nein, danke)",
	"Lexeme/NOUN":
		"Common noun, with the article that opens its phrase (der Hund, ein Haus, m in im Wald); substantivized adjectives and infinitives included",
	"Lexeme/NUM": "Numeral (drei, 12)",
	"Lexeme/PART":
		"Particle: nicht, zu before an infinitive, am before a superlative when not joined, answer particles",
	"Lexeme/PRON":
		"Pronoun standing for a noun phrase: personal, reflexive object, relative, demonstrative, interrogative, indefinite (man, etwas); never a nickname built from one",
	// Rule de/coined-name-substitute-is-propn.
	"Lexeme/PROPN":
		"Proper name, with the article that opens its phrase (die Schweiz, der Rhein), and a fixed name-substitute or nickname coined for one referent, even one built from a pronoun or a clause (Du-weißt-schon-wer)",
	"Lexeme/SCONJ": "Subordinating conjunction (dass, weil, ob, als, wenn)",
	"Lexeme/SYM": "Symbol such as %, €, §, +",
	"Lexeme/VERB":
		"One verb with its separable particle, required reflexive, auxiliaries, expletive es and governed preposition; modals and copulas included",
	"Locution/ADJ": "Fixed multiword expression acting as an adjective",
	"Locution/ADP":
		"Fixed multiword preposition or circumposition (um … willen)",
	"Locution/ADV":
		"Fixed multiword adverbial (zum Teil, auf keinen Fall, so oder so, ganz und gar)",
	"Locution/CCONJ":
		"Fixed correlative conjunction (entweder … oder, weder … noch, nicht nur … sondern auch)",
	"Locution/DET": "Fixed multiword determiner (was für ein)",
	"Locution/INTJ":
		"Fixed routine formula or exclamation (guten Morgen, tut mir leid, gern geschehen)",
	"Locution/NOUN": "Fixed multiword noun expression (weißer Rabe)",
	"Locution/NUM": "Fixed multiword numeral expression",
	"Locution/PRON": "Fixed multiword pronoun (was für einer)",
	"Locution/SCONJ":
		"Fixed multiword subordinator or correlator (um … zu, je … desto, so dass)",
	"Locution/VERB":
		"Idiom or collocation acting as a verb (den Faden verlieren, zur Verfügung stellen, Angst haben)",
	"Saying/Saying":
		"A complete proverb or quotation used as a saying (Morgenstund hat Gold im Mund)",
	"Foreign/Foreign":
		"A word or fixed phrase of another language that shows no German grammar here (very good, by the way)",
};

const lexemeKey = (kind: LexemeKind): RouteKey => `Lexeme/${kind}`;
const locutionKey = (kind: LocutionKind): RouteKey => `Locution/${kind}`;

export const singletonRoutes: readonly RouteKey[] = [
	...lexemeKinds.map(lexemeKey),
	"Foreign/Foreign",
];

export const allRoutes: readonly RouteKey[] = [
	...lexemeKinds.map(lexemeKey),
	...locutionKinds.map(locutionKey),
	"Saying/Saying",
	"Foreign/Foreign",
];

const routeKeys: ReadonlySet<string> = new Set(allRoutes);

/** Whether `key` names one of the German routes. */
const isRouteKey = (key: string): key is RouteKey => routeKeys.has(key);

/**
 * `key` as a route key. A key that arrives as a string, such as jev's route
 * Choice or a gold route's `keyOf`, is checked once here, and one that names
 * no German route throws, as in `routeForKey`.
 */
export function checkedRouteKey(key: string): RouteKey {
	if (!isRouteKey(key)) throw Error(`Not a German route key: ${key}`);
	return key;
}

const routes: ReadonlyMap<RouteKey, Route> = new Map<RouteKey, Route>([
	...lexemeKinds.map(
		(kind) =>
			[
				lexemeKey(kind),
				{ language: "de", family: "Lexeme", kind },
			] as const,
	),
	...locutionKinds.map(
		(kind) =>
			[
				locutionKey(kind),
				{ language: "de", family: "Locution", kind },
			] as const,
	),
	["Saying/Saying", { language: "de", family: "Saying", kind: "Saying" }],
	["Foreign/Foreign", { language: "de", family: "Foreign", kind: "Foreign" }],
]);

/**
 * The Route a key names, the inverse of `keyOf`; a key outside the German
 * routes throws.
 */
export function routeForKey(key: UnitRouteKey): Route | "Unresolved" {
	if (key === "Unresolved") return "Unresolved";
	const route = routes.get(key);
	if (!route) throw Error(`Not a German route key: ${key}`);
	return { ...route };
}

/**
 * The key of a route, a gold one with untyped Kinds included, so it may name
 * no German route; `checkedRouteKey` checks it.
 */
export function keyOf(
	route: { readonly family: string; readonly kind: string } | "Unresolved",
): string {
	return route === "Unresolved" ? route : `${route.family}/${route.kind}`;
}

/** Choice criteria over routes: described in the option, or named only. */
export function routeCriteria(
	keys: readonly RouteKey[],
	described: boolean,
): Record<string, string | null> {
	return Object.fromEntries(
		keys.map((key) => [key, described ? routeDescriptions[key] : null]),
	);
}
