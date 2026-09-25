import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";
import type { PronounForm, PronounTable } from "./pronoun-paradigm.js";

/** The case, number and agreement gender one Surface of a stem Lemma marks. */
export type SurfaceCell = {
	readonly case: "Nom" | "Acc" | "Dat" | "Gen";
	readonly number: "Sing" | "Plur";
	readonly gender: "Masc" | "Neut" | "Fem" | null;
};
/** A reviewed spelling; a stem Lemma's spellings name the cell they realize. */
export type AuthoredSpelling = {
	readonly spelled: string;
	readonly cell?: SurfaceCell;
};
/** One reviewed PRON or DET member with every spelling that realizes it. */
export type ReviewedMember = {
	readonly member: AuthoredMember;
	readonly spellings: readonly AuthoredSpelling[];
};
export type StemDescription<Core> = {
	readonly core: Partial<Core>;
	readonly emoji: string;
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
};

const cases = ["Nom", "Acc", "Dat", "Gen"] as const;

/** Every occupied cell's spellings, variants included, with the cell each realizes. */
export function tableSpellings(table: PronounTable): AuthoredSpelling[] {
	const spellings: AuthoredSpelling[] = [];
	for (const column of ["Masc", "Neut", "Fem", "Plur"] as const)
		for (const [index, grammaticalCase] of cases.entries()) {
			const form = table[column][index];
			if (!form) continue;
			const cell: SurfaceCell = {
				case: grammaticalCase,
				number: column === "Plur" ? "Plur" : "Sing",
				gender: column === "Plur" ? null : column,
			};
			for (const spelled of [form.text, ...(form.variants ?? [])])
				spellings.push({ spelled, cell });
		}
	return spellings;
}

/** A stem cites its Nom.Masc.Sg cell, or its Nom.Plur cell when it has none. */
export function citationForm(table: PronounTable): PronounForm {
	const cited = table.Masc[0] ?? table.Plur[0];
	if (!cited)
		throw Error("A stem paradigm needs a Nom.Masc.Sg or Nom.Plur cell");
	return cited;
}

/**
 * A word made of a stem and borrowed article endings is one Lemma with one
 * Reading (system ADR 0032). Its Core leaves case, number and gender null;
 * each spelling carries the cell its Surface marks.
 */
export function stemMember<Kind extends "PRON" | "DET">(input: {
	readonly kind: Kind;
	readonly coreFeatures: Dumling.Lemma<"de", "Lexeme", Kind>["coreFeatures"];
	readonly citation: PronounForm;
	readonly description: StemDescription<unknown>;
	readonly spellings: readonly AuthoredSpelling[];
}): ReviewedMember {
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: input.kind,
		canonicalForm: input.citation.text,
		coreFeatures: input.coreFeatures,
	} as Dumling.Lemma<"de">;
	const seen = new Set<string>();
	return {
		member: defineAuthoredMember({
			lemma,
			reading: {
				unitKind: "Reading",
				lemma,
				emojiDescription: input.description.emoji,
			} as Dumling.Reading<"de">,
			knowledge: {
				definition: input.description.definition,
				transcription: input.citation.ipa,
				translations: {
					en: [...input.description.en],
					ru: [...input.description.ru],
				},
			},
			coverage: {
				definition: "Authored",
				transcription: "Authored",
				translations: { en: "Authored", ru: "Authored" },
				semanticRelationTargetKind: "lemma",
				semanticRelations: {
					synonym: "ReviewedEmpty",
					nearSynonym: "ReviewedEmpty",
					antonym: "ReviewedEmpty",
					nearAntonym: "ReviewedEmpty",
				},
			},
		}),
		spellings: input.spellings.filter((spelling) => {
			const key = JSON.stringify(spelling);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		}),
	};
}
