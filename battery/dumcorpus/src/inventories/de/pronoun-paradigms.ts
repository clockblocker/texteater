import { description } from "./pronoun-authoring.js";
import {
	form,
	pronounLocution,
	pronounStemOf,
	strongPronoun,
} from "./pronoun-paradigm.js";
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

// was für einer is a Locution PRON with an empty Core and no Locution Type
// (de/was-fuer, ADR 0039; ruled on #741). Plural standalone welche, but
// attributive bare was für. The standalone genitive is rare (echo questions
// after a genitive verb: "Er bedarf eines Anwalts. Was für eines?") but
// exists, so the Closed Route invariant keeps it.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-was_fuer.xml?lang=de
{
	const t = strongPronoun("was für ein", "vas fyːɐ̯ ˈaɪ̯n");
	reviewed.push(
		pronounLocution(
			{
				Masc: t.Masc,
				Neut: [
					form("was für eines", "vas fyːɐ̯ ˈaɪ̯nəs", "was für eins"),
					form("was für eines", "vas fyːɐ̯ ˈaɪ̯nəs", "was für eins"),
					t.Neut[2],
					t.Neut[3],
				],
				Fem: t.Fem,
				Plur: [
					form("was für welche", "vas fyːɐ̯ ˈvɛlçə"),
					form("was für welche", "vas fyːɐ̯ ˈvɛlçə"),
					form("was für welchen", "vas fyːɐ̯ ˈvɛlçən"),
					form("was für welcher", "vas fyːɐ̯ ˈvɛlçɐ"),
				],
			},
			{
				core: {},
				emoji: "❓",
				definition:
					"Fragt nach der Art oder Beschaffenheit einer Person oder Sache.",
				en: ["what kind; what sort"],
				ru: ["что за; какого рода"],
			},
			null,
		),
	);
}

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
