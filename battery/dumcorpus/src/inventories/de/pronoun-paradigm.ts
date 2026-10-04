import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import {
	type AuthoredSpelling,
	canonical,
	citationForm,
	licensed,
	type ReviewedMember,
	type StemDescription,
	stemMember,
	tableSpellings,
} from "./stem-lemma.js";

/** The kinds whose pillars are one Lemma per Paradigm Cell: the der-series and personal pronouns, and the articles. */
type PillarKind = "PRON" | "DET";
type Core<Kind extends PillarKind = "PRON"> = Dumling.Lemma<
	"de",
	"Lexeme",
	Kind
>["coreFeatures"];
export type PronounCell = Pick<Core, "case" | "gender" | "number">;
export type PronounForm = {
	readonly text: string;
	readonly ipa: string;
	/** Accepted alternative forms of the cell, Licensed Variants (eins beside eines). */
	readonly variants?: readonly string[];
};
export type PronounDescription = StemDescription<Core>;
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

/**
 * A pillar cell's form. Where its siblings' translations differ (mich меня,
 * mir мне), its own replace its paradigm's, and a remark is a sentence the
 * cell adds to its paradigm's definition (attributive dessen).
 */
export type PillarForm = PronounForm & {
	readonly en?: readonly string[];
	readonly ru?: readonly string[];
	readonly remark?: string;
};
/**
 * A pillar paradigm's shared Knowledge. Its definition may be written from
 * each cell's form and coordinates (Die Personalpronomenform „mich“ …). It
 * ends naming the cell, "Form: Dativ, Singular, Maskulinum.", unless
 * `namesCell` is false.
 */
export type PillarDescription<Kind extends PillarKind = "PRON"> = Omit<
	StemDescription<Core<Kind>>,
	"definition" | "en" | "ru"
> & {
	readonly definition:
		| string
		| ((text: string, cell: Partial<PronounCell>) => string);
	readonly namesCell?: boolean;
	/** The cells' translations, for each cell that has none of its own. */
	readonly en?: readonly string[];
	readonly ru?: readonly string[];
};
/**
 * A pillar's columns: the agreement columns, and Sing for a singular that
 * marks no gender (ich, du). Each holds its Nom, Acc, Dat and Gen cells.
 */
type PillarColumn = AgreementColumn | "Sing";
export type PillarTable = Readonly<
	Partial<
		Record<
			PillarColumn,
			readonly [
				PillarForm | null,
				PillarForm | null,
				PillarForm | null,
				PillarForm | null,
			]
		>
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
function pillarMember<Kind extends PillarKind>(
	kind: Kind,
	form: PillarForm,
	description: PillarDescription<Kind>,
	cell: Partial<PronounCell>,
): ReviewedMember {
	const coreFeatures = { ...emptyCore, ...description.core, ...cell };
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind,
		canonicalForm: form.text,
		coreFeatures,
	} as Dumling.Lemma<"de", "Lexeme", Kind>;
	const en = form.en ?? description.en;
	const ru = form.ru ?? description.ru;
	if (!en || !ru)
		throw Error(
			`${form.text}: a pillar cell needs translations, its own or its paradigm's`,
		);
	const coordinates = cellCoordinates(coreFeatures);
	const definition = [
		typeof description.definition === "string"
			? description.definition
			: description.definition(form.text, cell),
		form.remark,
		description.namesCell !== false && coordinates
			? `Form: ${coordinates}.`
			: undefined,
	]
		.filter(Boolean)
		.join(" ");
	return {
		member: {
			lemma,
			reading: {
				unitKind: "Reading",
				lemma,
				emojiDescription: description.emoji,
			} as Dumling.Reading<"de", "Lexeme", Kind>,
			knowledge: {
				definition,
				transcription: form.ipa,
				translations: { en: [...en], ru: [...ru] },
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
		},
		// The cell's own form is Canonical and its variants (eins beside
		// eines) Licensed.
		spellings: [
			{ spelled: form.text, spelling: canonical },
			...(form.variants ?? []).map((spelled) => ({
				spelled,
				spelling: licensed,
			})),
		],
	};
}

/** A pronoun pillar cell, or an invariant pronoun when no cell is given (man, etwas). */
export function pronounMember(
	form: PillarForm,
	description: PillarDescription,
	cell: Partial<PronounCell> = {},
): ReviewedMember {
	return pillarMember("PRON", form, description, cell);
}

/** A pillar paradigm: one Lemma per occupied cell. */
function pillarParadigm<Kind extends PillarKind>(
	kind: Kind,
	table: PillarTable,
	description: PillarDescription<Kind>,
): ReviewedMember[] {
	const result: ReviewedMember[] = [];
	for (const column of ["Masc", "Neut", "Fem", "Sing", "Plur"] as const) {
		for (const [index, grammaticalCase] of (
			["Nom", "Acc", "Dat", "Gen"] as const
		).entries()) {
			const form = table[column]?.[index];
			if (form)
				result.push(
					pillarMember(kind, form, description, {
						case: grammaticalCase,
						gender:
							column === "Plur" || column === "Sing"
								? null
								: column,
						number: column === "Plur" ? "Plur" : "Sing",
					}),
				);
		}
	}
	return result;
}

/** A pronoun pillar paradigm (der-series, personal, einer): one Lemma per occupied cell. */
export function pronounParadigm(
	table: PillarTable,
	description: PillarDescription,
): ReviewedMember[] {
	return pillarParadigm("PRON", table, description);
}

/** An article paradigm (der, ein): one DET Lemma per occupied cell. */
export function determinerParadigm(
	table: PillarTable,
	description: PillarDescription<"DET">,
): ReviewedMember[] {
	return pillarParadigm("DET", table, description);
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
): ReviewedMember {
	return pronounStemOf(options.citation ?? citationForm(table), description, [
		...tableSpellings(table),
		...(options.uninflected ?? []).map((spelled) => ({
			spelled,
			spelling: canonical,
		})),
	]);
}

/** A stem pronoun whose spellings are listed with their cells, for a paradigm the agreement table does not fit (jemand, wer, was). */
export function pronounStemOf(
	citation: PronounForm,
	description: PronounDescription,
	spellings: readonly AuthoredSpelling[],
): ReviewedMember {
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
): ReviewedMember {
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
