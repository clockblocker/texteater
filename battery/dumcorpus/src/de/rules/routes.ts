import type * as Dumling from "dumling/types";
import type { SpecRoute } from "../../corpus-types.js";

type DeRoute<F extends Dumling.Family<"de">> = Extract<
	SpecRoute,
	{ language: "de"; family: F }
>;

/** German Lexeme routes, one per Kind. */
export const lexeme = (
	...kinds: Dumling.Kind<"de", "Lexeme">[]
): DeRoute<"Lexeme">[] =>
	kinds.map((kind) => ({ language: "de", family: "Lexeme", kind }));
/** German Locution routes, one per Kind. */
export const locution = (
	...kinds: Dumling.Kind<"de", "Locution">[]
): DeRoute<"Locution">[] =>
	kinds.map((kind) => ({ language: "de", family: "Locution", kind }));
export const everyLocution = locution(
	"VERB",
	"NOUN",
	"ADJ",
	"ADV",
	"ADP",
	"CCONJ",
	"SCONJ",
	"DET",
	"PRON",
	"NUM",
	"INTJ",
);
export const saying: SpecRoute[] = [
	{ language: "de", family: "Saying", kind: "Saying" },
];
export const everyMultiword = [...everyLocution, ...saying];
