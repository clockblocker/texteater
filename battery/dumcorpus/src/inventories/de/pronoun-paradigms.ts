import { description } from "./pronoun-authoring.js";
import { form, pronounStemOf } from "./pronoun-paradigm.js";
import { derSeriesPronouns } from "./pronouns-der-series.js";
import { indefinitePronouns } from "./pronouns-indefinite.js";
import { personalPronouns } from "./pronouns-personal.js";
import { possessivePronouns } from "./pronouns-possessive.js";
import { quantifierPronouns } from "./pronouns-quantifiers.js";
import { whPronouns } from "./pronouns-wh.js";
import {
	canonical,
	type ReviewedMember,
	type SurfaceCell,
} from "./stem-lemma.js";

export { referentialEs } from "./pronouns-personal.js";

// The order is the authoring order the generated Syncretisms follow.
const reviewed: ReviewedMember[] = [
	...personalPronouns,
	...derSeriesPronouns,
	...whPronouns,
	...quantifierPronouns,
	...indefinitePronouns,
	...possessivePronouns,
];

// jedermann has one form for Nom, Acc and Dat and a genitive jedermanns, the
// noun's -s on its own stem. Its forms derive from another paradigm, so it is
// a stem (system ADR 0032).
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jedermann3.html?lang=de
{
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: "Sing",
		gender: null,
	});
	reviewed.push(
		pronounStemOf(
			form("jedermann", "ˈjeːdɐman"),
			description(
				"Tot",
				"🌐",
				"Bezeichnet jeden Menschen ohne Ausnahme.",
				["everyone; everybody"],
				["каждый; все"],
			),
			[
				{
					spelled: "jedermann",
					cell: cell("Nom"),
					spelling: canonical,
				},
				{
					spelled: "jedermann",
					cell: cell("Acc"),
					spelling: canonical,
				},
				{
					spelled: "jedermann",
					cell: cell("Dat"),
					spelling: canonical,
				},
				{
					spelled: "jedermanns",
					cell: cell("Gen"),
					spelling: canonical,
				},
			],
		),
	);
}

/** Reviewed coverage matrix, including exact identities and their alternate realizations. */
export const reviewedPronouns: readonly ReviewedMember[] = reviewed;
