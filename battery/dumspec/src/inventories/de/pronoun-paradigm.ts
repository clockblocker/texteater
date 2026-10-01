import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { defineAuthoredMember } from "./member.js";
import {
	type AuthoredSpelling,
	citationForm,
	type ReviewedMember,
	type StemDescription,
	stemMember,
	tableSpellings,
} from "./stem-lemma.js";

type Core = Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"];
export type PronounCell = Pick<Core, "case" | "gender" | "number">;
export type PronounForm = {
	readonly text: string;
	readonly ipa: string;
	readonly variants?: readonly string[];
};
export type PronounDescription = StemDescription<Core>;
export type ReviewedPronoun = ReviewedMember;
export type AgreementColumn = "Masc" | "Neut" | "Fem" | "Plur";
export type PronounTable = Readonly<
	Record<
		AgreementColumn,
		readonly [
			PronounForm | null,
			PronounForm | null,
			PronounForm | null,
			PronounForm | null,
		]
	>
>;

const emptyCore: Core = {
	case: null,
	gender: null,
	number: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};
const caseNames = {
	Nom: "Nominativ",
	Acc: "Akkusativ",
	Dat: "Dativ",
	Gen: "Genitiv",
};
const genderNames = { Masc: "Maskulinum", Neut: "Neutrum", Fem: "Femininum" };

/** The learner-facing German name of a Paradigm Cell, such as "Dativ, Singular, Maskulinum". */
function cellCoordinates(core: Partial<PronounCell>): string {
	return [
		core.case && caseNames[core.case],
		core.number === "Sing"
			? "Singular"
			: core.number === "Plur"
				? "Plural"
				: null,
		core.gender && genderNames[core.gender],
	]
		.filter(Boolean)
		.join(", ");
}

/** A pillar's occupied, reviewed table cell is an identity; null cells are intentionally absent.
 * System ADR 0044 and ADR 0032, not LEO, determine this project's Lemma granularity.
 * https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/index.xml?lang=de
 */
export function pronounMember(
	form: PronounForm,
	description: PronounDescription,
	cell: Partial<PronounCell> = {},
): ReviewedPronoun {
	const coreFeatures: Core = { ...emptyCore, ...description.core, ...cell };
	const lemma: Dumling.Lemma<"de", "Lexeme", "PRON"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm: form.text,
		coreFeatures,
	};
	const coordinates = cellCoordinates(coreFeatures);
	return {
		member: defineAuthoredMember({
			lemma,
			reading: {
				unitKind: "Reading",
				lemma,
				emojiDescription: description.emoji,
			},
			knowledge: {
				definition: `${description.definition}${coordinates ? ` Form: ${coordinates}.` : ""}`,
				transcription: form.ipa,
				translations: {
					en: [...description.en],
					ru: [...description.ru],
				},
			},
			coverage: {
				definition: "Authored",
				transcription: "Authored",
				translations: { en: "Authored", ru: "Authored" },
				semanticRelationTargetKind: "lemma",
				// No cross-paradigm semantic equivalence is inferred from shared endings.
				semanticRelations: {
					synonym: "ReviewedEmpty",
					nearSynonym: "ReviewedEmpty",
					antonym: "ReviewedEmpty",
					nearAntonym: "ReviewedEmpty",
				},
			},
		}),
		spellings: [form.text, ...(form.variants ?? [])].map((spelled) => ({
			spelled,
		})),
	};
}

/**
 * A pillar paradigm: one Lemma per occupied cell. A masculine and a neuter
 * cell spelled alike are one cell with gender null (einem, eines), since the
 * referent may choose only between cells that differ in who is meant (system
 * ADR 0044).
 */
export function pronounParadigm(
	table: PronounTable,
	description: PronounDescription,
): ReviewedPronoun[] {
	const result: ReviewedPronoun[] = [];
	const sharedByGender = (index: number) =>
		table.Masc[index] !== null &&
		table.Masc[index]?.text === table.Neut[index]?.text;
	for (const column of ["Masc", "Neut", "Fem", "Plur"] as const) {
		for (const [index, grammaticalCase] of (
			["Nom", "Acc", "Dat", "Gen"] as const
		).entries()) {
			const form = table[column][index];
			if (!form || (column === "Neut" && sharedByGender(index))) continue;
			const gender =
				column === "Plur" ||
				(column === "Masc" && sharedByGender(index))
					? null
					: column;
			result.push(
				pronounMember(form, description, {
					case: grammaticalCase,
					gender,
					number: column === "Plur" ? "Plur" : "Sing",
				}),
			);
		}
	}
	return result;
}

/**
 * A stem pronoun (dieser, keiner, meiner) is one Lemma whose Surfaces mark the
 * cell. It cites its Nom.Masc.Sg or, lacking one, its Nom.Plur cell unless a
 * citation is given; uninflected spellings realize it without a cell.
 */
export function pronounStem(
	table: PronounTable,
	description: PronounDescription,
	options: {
		readonly citation?: PronounForm;
		readonly uninflected?: readonly string[];
	} = {},
): ReviewedPronoun {
	return pronounStemOf(options.citation ?? citationForm(table), description, [
		...tableSpellings(table),
		...(options.uninflected ?? []).map((spelled) => ({ spelled })),
	]);
}

/** A stem pronoun whose spellings are listed with their cells, for a paradigm the agreement table does not fit (jemand, wer, was). */
export function pronounStemOf(
	citation: PronounForm,
	description: PronounDescription,
	spellings: readonly AuthoredSpelling[],
): ReviewedPronoun {
	return stemMember({
		kind: "PRON",
		route: {
			family: "Lexeme",
			coreFeatures: { ...emptyCore, ...description.core },
		},
		citation,
		description,
		spellings,
	});
}

/**
 * A PRON Locution (was für einer) is a stem too: one Lemma, with an empty
 * Core, whose Surfaces mark the cell (ADR 0039). It cites its Nom.Masc.Sg
 * cell.
 */
export function pronounLocution(
	table: PronounTable,
	description: StemDescription<Record<string, never>>,
	locutionType: Dumrel.LocutionType | null,
): ReviewedPronoun {
	return stemMember({
		kind: "PRON",
		route: { family: "Locution", locutionType },
		citation: citationForm(table),
		description,
		spellings: tableSpellings(table),
	});
}

export const form = (
	text: string,
	ipa: string,
	...variants: string[]
): PronounForm => ({ text, ipa, variants });

/** Strong endings are shared only by paradigms explicitly opting into this table.
 * Callers remove defective cells and supply any stem alternations themselves.
 */
export function strongPronoun(
	stem: string,
	ipa: string,
): Readonly<
	Record<
		AgreementColumn,
		readonly [PronounForm, PronounForm, PronounForm, PronounForm]
	>
> {
	const e = form(`${stem}e`, `${ipa}ə`),
		er = form(`${stem}er`, `${ipa}ɐ`),
		es = form(`${stem}es`, `${ipa}əs`),
		en = form(`${stem}en`, `${ipa}ən`),
		em = form(`${stem}em`, `${ipa}əm`);
	return {
		Masc: [er, en, em, es],
		Neut: [es, es, em, es],
		Fem: [e, e, er, er],
		Plur: [e, e, en, er],
	};
}
