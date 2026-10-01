import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { PronounForm, PronounTable } from "./pronoun-paradigm.js";
import {
	type AuthoredSpelling,
	citationForm,
	type ReviewedMember,
	type StemDescription,
	stemMember,
	tableSpellings,
} from "./stem-lemma.js";

type Core = Dumling.Lemma<"de", "Lexeme", "DET">["coreFeatures"];
export type DeterminerDescription = StemDescription<Core>;
export type ReviewedDeterminer = ReviewedMember;

const emptyCore: Core = {
	case: null,
	gender: null,
	number: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};

/**
 * A stem determiner (dieser, mein, kein, viel) is one Lemma whose Surfaces
 * mark the cell (system ADR 0032). It cites its Nom.Masc.Sg or, lacking one,
 * its Nom.Plur cell unless a citation is given; uninflected spellings (viel
 * Geld, all die Jahre) realize it without a cell.
 */
export function determinerStem(
	table: PronounTable,
	description: DeterminerDescription,
	options: {
		readonly citation?: PronounForm;
		readonly uninflected?: readonly string[];
	} = {},
): ReviewedDeterminer {
	const spellings: AuthoredSpelling[] = [
		...tableSpellings(table),
		...(options.uninflected ?? []).map((spelled) => ({ spelled })),
	];
	return stemMember({
		kind: "DET",
		route: {
			family: "Lexeme",
			coreFeatures: { ...emptyCore, ...description.core },
		},
		citation: options.citation ?? citationForm(table),
		description,
		spellings,
	});
}

/**
 * A DET Locution (was für ein) is a stem too: one Lemma, with an empty Core,
 * whose Surfaces mark the cell (ADR 0039). It cites its Nom.Masc.Sg cell;
 * uninflected spellings realize it without a cell.
 */
export function determinerLocution(
	table: PronounTable,
	description: StemDescription<Record<string, never>>,
	locutionType: Dumrel.LocutionType | null,
	options: { readonly uninflected?: readonly string[] } = {},
): ReviewedDeterminer {
	return stemMember({
		kind: "DET",
		route: { family: "Locution", locutionType },
		citation: citationForm(table),
		description,
		spellings: [
			...tableSpellings(table),
			...(options.uninflected ?? []).map((spelled) => ({ spelled })),
		],
	});
}
