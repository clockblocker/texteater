import { routeOf } from "../../src/index.js";
import type { RouteOf } from "../../src/route-of.js";
import type { LemmaRoute, Reading } from "../../src/types.js";

declare const reading: Reading<"de">;
// A Lemma's route stays correlated: each Family keeps its own Kinds.
const route = routeOf(reading.lemma);
const _lemmaRoute: LemmaRoute = route;
const { language, family, kind } = reading.lemma;
// @ts-expect-error A destructured rebuild loses which Family goes with which Kind.
const _rebuilt: LemmaRoute = { language, family, kind };
// The route carries no other field of the Lemma.
// @ts-expect-error routeOf drops canonicalForm.
routeOf(reading.lemma).canonicalForm;
type _Noun = RouteOf<Reading<"de", "Lexeme", "NOUN">["lemma"]>;
const _noun: _Noun = { language: "de", family: "Lexeme", kind: "NOUN" };
// @ts-expect-error A NOUN Lemma's route has kind NOUN.
const _wrongKind: _Noun = { language: "de", family: "Lexeme", kind: "VERB" };
if (route.family === "Lexeme" && route.kind === "NOUN") {
	// Narrowing the route narrows it to that route alone.
	const _nounRoute: { language: "de"; family: "Lexeme"; kind: "NOUN" } =
		route;
}
