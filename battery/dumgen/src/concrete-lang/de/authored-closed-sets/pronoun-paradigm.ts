import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";

type Core = Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"];
export type PronounCell = Pick<Core, "case" | "gender" | "number">;
export type PronounForm = {
	readonly text: string;
	readonly ipa: string;
	readonly variants?: readonly string[];
};
export type PronounDescription = {
	readonly core: Partial<Core>;
	readonly emoji: string;
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
};
export type ReviewedPronoun = {
	readonly member: AuthoredMember;
	readonly variants: readonly string[];
};
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
	"gender[psor]": null,
	extPos: null,
	foreign: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
	referenceNumber: null,
};
const caseNames = {
	Nom: "Nominativ",
	Acc: "Akkusativ",
	Dat: "Dativ",
	Gen: "Genitiv",
};
const genderNames = { Masc: "Maskulinum", Neut: "Neutrum", Fem: "Femininum" };

/** Each occupied, reviewed table cell is an identity; null cells are intentionally absent.
 * ADR 0018, not LEO, determines this project's Lemma granularity.
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
	const coordinates = [
		coreFeatures.case && caseNames[coreFeatures.case],
		coreFeatures.number === "Sing"
			? "Singular"
			: coreFeatures.number === "Plur"
				? "Plural"
				: null,
		coreFeatures.gender && genderNames[coreFeatures.gender],
	]
		.filter(Boolean)
		.join(", ");
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
		variants: form.variants ?? [],
	};
}

export function pronounParadigm(
	table: PronounTable,
	description: PronounDescription,
): ReviewedPronoun[] {
	const result: ReviewedPronoun[] = [];
	for (const column of ["Masc", "Neut", "Fem", "Plur"] as const) {
		for (const [index, grammaticalCase] of (
			["Nom", "Acc", "Dat", "Gen"] as const
		).entries()) {
			const form = table[column][index];
			if (form)
				result.push(
					pronounMember(form, description, {
						case: grammaticalCase,
						gender: column === "Plur" ? null : column,
						number: column === "Plur" ? "Plur" : "Sing",
					}),
				);
		}
	}
	return result;
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
