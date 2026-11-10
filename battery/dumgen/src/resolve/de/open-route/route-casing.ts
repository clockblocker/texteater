/**
 * The casing a route gives its words (#1326). A German dictionary writes
 * a verb's forms, an adverb, a conjunction and a particle in lowercase,
 * so on those Lexeme routes the Canonical Form and every word of the
 * Surface are lowercase, wherever they stand: a sentence-initial «Darf»
 * is the Surface «darf». This is the route's casing, never the position's
 * (ADR 0002, #639). On dev, gold writes no capital on these routes. Every
 * other route keeps the casing Luna writes: an ADJ may keep its capital
 * (Berliner), an INTJ too (Mann, LOL), and an ADP spelled apart has a
 * noun in it (auf Grund).
 */
import type { Route } from "../../../segment/segmented-sentence.js";

const lowercaseKinds: ReadonlySet<string> = new Set([
	"VERB",
	"ADV",
	"CCONJ",
	"SCONJ",
	"PART",
]);

/** Whether a route's words are lowercase wherever they stand. */
export const lowercaseRoute = (route: Route): boolean =>
	route.family === "Lexeme" && lowercaseKinds.has(route.kind);

/** A word in lowercase, as a German dictionary writes it. */
export const inLowercase = (word: string): string =>
	word.toLocaleLowerCase("de");
