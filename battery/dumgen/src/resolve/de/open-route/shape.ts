/**
 * An open route's shape, the cases and genders its questions offer, and
 * the Attestation parts every shape shares, as Dumling's generated types
 * give them.
 */

import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";
import { fixedSpelling, type Member, type Target } from "../target.js";

export type AdpCase = "Acc" | "Dat" | "Gen";

/** A grammatical gender, as a German NOUN's Core Features take it. */
export type Gender = NonNullable<
	Dumling.Lemma<"de", "Lexeme", "NOUN">["coreFeatures"]["gender"]
>;

/** One piece of valency evidence a governor or an ADP attests. */
export type ValencyEvidence = Dumling.Attestation<
	"de",
	"Lexeme",
	"VERB"
>["valencyEvidence"][number];

export const cases = ["Nom", "Acc", "Dat", "Gen"] as const;
/**
 * A gender question's options are named by the article the gender takes,
 * never Neut, which jev read as a neutral fallback when unsure (#876).
 */
export const genderOfArticle: ReadonlyMap<string, Gender> = new Map([
	["der", "Masc"],
	["die", "Fem"],
	["das", "Neut"],
]);

/** The route's shape, as the questions and the Attestation need it. */
export function routeShape(target: Target) {
	const { family, kind } = target.route;
	const lexeme = family === "Lexeme";
	const locution = family === "Locution";
	const nounLike =
		(lexeme && (kind === "NOUN" || kind === "PROPN")) ||
		(locution && kind === "NOUN");
	const verbal = (lexeme || locution) && kind === "VERB";
	const adjectival = (lexeme || locution) && kind === "ADJ";
	const adverbial = (lexeme || locution) && kind === "ADV";
	const adposition = (lexeme || locution) && kind === "ADP";
	const governor =
		verbal || adjectival || ((lexeme || locution) && kind === "NOUN");
	return {
		lexeme,
		locution,
		nounLike,
		proper: lexeme && kind === "PROPN",
		verbal,
		adjectival,
		adverbial,
		adposition,
		agreeing:
			(lexeme && (kind === "NUM" || kind === "SYM")) ||
			(locution && (kind === "DET" || kind === "NUM" || kind === "PRON")),
		/** A head whose governed preposition is its valency evidence (ADR 0034). */
		governor,
		/**
		 * A head that may govern a preposition: a governor, or a routine
		 * formula's head word, whose preposition only leaves its Surface.
		 */
		governs: governor || kind === "INTJ",
		articleOwner:
			(lexeme && ["NOUN", "PROPN", "ADJ", "NUM"].includes(kind)) ||
			(locution && kind === "NOUN"),
		inflects: !(
			family === "Saying" ||
			family === "Foreign" ||
			["ADP", "CCONJ", "SCONJ", "INTJ", "PART"].includes(kind)
		),
		/** A route whose inflection a dictionary citation leaves empty. */
		citable: nounLike || verbal,
		coverage: locution || family === "Saying",
		foreign: family === "Foreign",
	};
}
export type Shape = ReturnType<typeof routeShape>;

export const fold = (text: string) => foldCase(text, "de");
export const spellingOf = (member: Member) =>
	fixedSpelling(member) ?? member.text;
