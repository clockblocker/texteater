/**
 * Who writes an open-route click's headword (#1326). Code writes it where
 * the route settles it: a member an authored table names (a PART, a
 * Lexeme ADP the ADP Case Table lists), or the one word of a class cited
 * as it is spelled (a conjunction, an adverb in its positive), once jev
 * judges the member no Typo or Shorthand and, where no table vouches for
 * the spelling, the form spelled as the dictionary spells it. Every other
 * click's headword is Luna's. On dev, code's headword equalled gold
 * wherever Luna's did on these routes (run 45eb267b: ADP 264 of 264,
 * CCONJ 210 of 210, ADV 426 of 427 for both); a SCONJ's (daß, judged
 * Canonical) and an INTJ's (Mann, Mist, LOL keep their capitals) were
 * not, so they stay Luna's.
 */

import { authoredMembers, germanAdpositionEntry } from "dumcorpus/inventories";
import type { LemmaCandidate } from "../../types.js";
import type { Written } from "../canonical-form.js";
import type { Target } from "../target.js";
import type { FirstRead } from "./first-request.js";
import { particlesSpelled } from "./particle.js";
import { inLowercase } from "./route-casing.js";
import { fold, spellingOf } from "./shape.js";

/** A headword code can write, and whether jev's answers let it stand. */
export type CodeHeadword = {
	/** The Canonical Form and the one member's word, both the headword. */
	readonly written: Written;
	readonly settles: (first: FirstRead) => boolean;
};

/** The member is written as the word it is, neither a Typo nor a Shorthand. */
const asWritten = (first: FirstRead) =>
	first.orthographies.every(
		(orthography) => orthography === "Standard" || orthography === "Fused",
	);

/**
 * The headword code writes for a one-member Lexeme on a route that
 * settles it, and when it stands; undefined where Luna writes it.
 */
export function codeHeadword(target: Target): CodeHeadword | undefined {
	const [lone, ...others] = target.members;
	const { family, kind } = target.route;
	if (!lone || others.length > 0 || family !== "Lexeme") return undefined;
	const spelled = spellingOf(lone);
	const headword = (
		canonicalForm: string,
		settles: CodeHeadword["settles"],
	) => ({
		written: { canonicalForm, members: [canonicalForm] },
		settles,
	});
	if (kind === "PART") {
		const [only, ...more] = particlesSpelled(spelled);
		return only && more.length === 0
			? headword(only.lemma.canonicalForm, asWritten)
			: undefined;
	}
	const lowercase = inLowercase(spelled);
	if (kind === "ADP")
		return germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm: lowercase,
		})
			? headword(lowercase, asWritten)
			: undefined;
	const cited = (first: FirstRead) =>
		asWritten(first) && first.spelling.kind === "Canonical";
	if (kind === "CCONJ") return headword(lowercase, cited);
	if (kind === "ADV")
		return headword(lowercase, (first) => {
			const degree =
				first.block === "adverbial"
					? first.inflection?.degree
					: undefined;
			return cited(first) && degree !== "Cmp" && degree !== "Sup";
		});
	return undefined;
}

/**
 * Whether the click's Lemma may already have a Reading for the judge: a
 * stored Lemma among the hints, or an authored one, of that headword. A
 * Lemma with neither gets its Emoji Description drafted beside jev.
 */
export function readingsMayExist(
	target: Target,
	canonicalForm: string,
	hints: readonly LemmaCandidate[],
): boolean {
	const { family, kind } = target.route;
	const same = (lemma: {
		readonly family: string;
		readonly kind: string;
		readonly canonicalForm: string;
	}) =>
		lemma.family === family &&
		lemma.kind === kind &&
		fold(lemma.canonicalForm) === fold(canonicalForm);
	return (
		hints.some(({ lemma }) => same(lemma)) ||
		authoredMembers.some(({ lemma }) => same(lemma))
	);
}
