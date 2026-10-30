/**
 * German pronominal adverbs: `da`, `wo` or `hier` before a preposition, with
 * an `r` between `da` or `wo` and a vowel (`damit`, `darauf`, `wovon`,
 * `hierfür`), and the `dr-` shortening of a `dar-` one (`drauf`, Rule
 * de/dr-adverb-is-da-shorthand). One stands for its preposition and the
 * phrase it would head (Rule de/pronominal-adverb-stands-alone).
 */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import { type AdpCase, fold } from "./shape.js";

/** The preposition a pronominal adverb holds, and the cases it may take. */
export type HeldPreposition = {
	readonly preposition: string;
	readonly cases: readonly AdpCase[];
};

const pronominalAdverb = /^(dar|wor|dr|da|wo|hier)(\p{L}{2,})$/u;

/** The preposition `word` holds as a pronominal adverb, if it is one. */
export function heldPreposition(word: string): HeldPreposition | undefined {
	const [, adverb, preposition] = pronominalAdverb.exec(fold(word)) ?? [];
	if (adverb === undefined || preposition === undefined) return undefined;
	// da and wo take an r before a vowel and only there; dr always has it.
	const vowel = /^[aeiouäöü]/u.test(preposition);
	if (adverb !== "hier" && adverb.endsWith("r") !== vowel) return undefined;
	const entry = germanAdpositionEntry({
		family: "Lexeme",
		canonicalForm: preposition,
	});
	return entry
		? { preposition, cases: germanAdpositionAllowedCases(entry) }
		: undefined;
}
