import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";
import {
	cellCoordinates,
	type PronounForm,
	type PronounTable,
} from "./pronoun-paradigm.js";

type Core = Dumling.Lemma<"de", "Lexeme", "DET">["coreFeatures"];
type Cell = Pick<Core, "case" | "gender" | "number">;
export type DeterminerDescription = {
	readonly core: Partial<Core>;
	readonly emoji: string;
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
	/** Plural cells translate differently where the target language does: these, эти. */
	readonly plural?: {
		readonly en: readonly string[];
		readonly ru: readonly string[];
	};
};
export type ReviewedDeterminer = {
	readonly member: AuthoredMember;
	readonly variants: readonly string[];
};

const emptyCore: Core = {
	case: null,
	definite: null,
	extPos: null,
	foreign: null,
	gender: null,
	number: null,
	numType: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};

/** One Paradigm Cell of an attributive determiner is one Lemma (system ADR 0032). */
export function determinerMember(
	form: PronounForm,
	description: DeterminerDescription,
	cell: Partial<Cell> = {},
): ReviewedDeterminer {
	const coreFeatures: Core = { ...emptyCore, ...description.core, ...cell };
	const lemma: Dumling.Lemma<"de", "Lexeme", "DET"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm: form.text,
		coreFeatures,
	};
	const coordinates = cellCoordinates(coreFeatures);
	const translations =
		coreFeatures.number === "Plur" && description.plural
			? description.plural
			: description;
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
					en: [...translations.en],
					ru: [...translations.ru],
				},
			},
			coverage: {
				definition: "Authored",
				transcription: "Authored",
				translations: { en: "Authored", ru: "Authored" },
				semanticRelationTargetKind: "lemma",
				// Other cells of the paradigm are grammatical alternatives, not synonyms.
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

/** Each occupied cell becomes a Lemma; null cells do not exist in this paradigm. */
export function determinerParadigm(
	table: PronounTable,
	description: DeterminerDescription,
): ReviewedDeterminer[] {
	const result: ReviewedDeterminer[] = [];
	for (const column of ["Masc", "Neut", "Fem", "Plur"] as const)
		for (const [index, grammaticalCase] of (
			["Nom", "Acc", "Dat", "Gen"] as const
		).entries()) {
			const form = table[column][index];
			if (form)
				result.push(
					determinerMember(form, description, {
						case: grammaticalCase,
						gender: column === "Plur" ? null : column,
						number: column === "Plur" ? "Plur" : "Sing",
					}),
				);
		}
	return result;
}
