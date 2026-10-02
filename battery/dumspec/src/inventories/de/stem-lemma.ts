import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";
import type { PronounForm, PronounTable } from "./pronoun-paradigm.js";

/**
 * The case, number and agreement gender one Surface of a stem Lemma marks.
 * Number is null only for a paradigm that never marks it (wer, was), and
 * gender is null where the Lemma fixes it in Core (wer, was) or has none.
 */
export type SurfaceCell = {
	readonly case: "Nom" | "Acc" | "Dat" | "Gen";
	readonly number: "Sing" | "Plur" | null;
	readonly gender: "Masc" | "Neut" | "Fem" | null;
};
/** How a Surface is spelled: Canonical, or a Variant with its tags (ADR 0041). */
export type SurfaceSpelling = Dumling.Surface<"de">["spelling"];
/** The spelling of a form's main spelling (Rule de/variant-and-historical-status). */
export const canonical: SurfaceSpelling = { kind: "Canonical" };
/**
 * A reviewed spelling; a stem Lemma's spellings name the cell they realize.
 * `spelling` is the Surface's spelling where gold or a Rule fixes it, and a
 * form's main spelling is Canonical. A table's other spellings of a cell
 * (eins beside eines, genitive jeden beside jedes) have none until a ruling
 * says whether each is a Variant and with which tags.
 */
export type AuthoredSpelling = {
	readonly spelled: string;
	readonly cell?: SurfaceCell;
	readonly spelling?: SurfaceSpelling;
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
	/** Direct synonym claims only; the rest is projected (ADR 0012). */
	readonly synonyms?: readonly Dumling.Lemma<"de">[];
};

const cases = ["Nom", "Acc", "Dat", "Gen"] as const;

/**
 * Every occupied cell's spellings, variants included, with the cell each
 * realizes. A cell's own form is Canonical; its variants carry no spelling.
 */
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
			spellings.push({ spelled: form.text, cell, spelling: canonical });
			for (const spelled of form.variants ?? [])
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
 * The route a stem Lemma takes. A Lexeme names its Core Features. A Locution
 * (was für ein) has an empty Core and names its Locution Type, or null when
 * it has none (ADR 0039).
 */
export type StemRoute<Kind extends "PRON" | "DET"> =
	| {
			readonly family: "Lexeme";
			readonly coreFeatures: Dumling.Lemma<
				"de",
				"Lexeme",
				Kind
			>["coreFeatures"];
	  }
	| {
			readonly family: "Locution";
			readonly locutionType: Dumrel.LocutionType | null;
	  };

/**
 * A word made of a stem and borrowed article endings is one Lemma with one
 * Reading (system ADR 0032). Its Core leaves case, number and gender null;
 * each spelling carries the cell its Surface marks.
 */
export function stemMember<Kind extends "PRON" | "DET">(input: {
	readonly kind: Kind;
	readonly route: StemRoute<Kind>;
	readonly citation: PronounForm;
	readonly description: StemDescription<unknown>;
	readonly spellings: readonly AuthoredSpelling[];
}): ReviewedMember {
	const { route } = input;
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: route.family,
		kind: input.kind,
		canonicalForm: input.citation.text,
		coreFeatures: route.family === "Lexeme" ? route.coreFeatures : {},
	} as Dumling.Lemma<"de", StemRoute<Kind>["family"]>;
	const seen = new Set<string>();
	const synonym = input.description.synonyms?.length
		? [...input.description.synonyms]
		: undefined;
	// A Locution with no Locution Type records that as a reviewed decision.
	const locutionType =
		route.family === "Locution"
			? route.locutionType
				? {
						knowledge: { locutionType: route.locutionType },
						coverage: { locutionType: "Authored" },
					}
				: { knowledge: {}, coverage: { locutionType: "ReviewedEmpty" } }
			: { knowledge: {}, coverage: {} };
	return {
		member: defineAuthoredMember({
			lemma,
			reading: {
				unitKind: "Reading",
				lemma,
				emojiDescription: input.description.emoji,
			} as Dumling.Reading<"de", StemRoute<Kind>["family"]>,
			knowledge: {
				definition: input.description.definition,
				transcription: input.citation.ipa,
				translations: {
					en: [...input.description.en],
					ru: [...input.description.ru],
				},
				...(synonym ? { semanticRelations: { synonym } } : {}),
				...locutionType.knowledge,
			},
			coverage: {
				definition: "Authored",
				transcription: "Authored",
				translations: { en: "Authored", ru: "Authored" },
				semanticRelationTargetKind: "lemma",
				semanticRelations: {
					synonym: synonym ? "Authored" : "ReviewedEmpty",
					nearSynonym: "ReviewedEmpty",
					antonym: "ReviewedEmpty",
					nearAntonym: "ReviewedEmpty",
				},
				...locutionType.coverage,
			},
		}),
		// The first of a spelling and cell wins, so a cell's own form keeps
		// its Canonical spelling over a variant spelled alike.
		spellings: input.spellings.filter(({ spelled, cell }) => {
			const key = JSON.stringify([spelled, cell ?? null]);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		}),
	};
}
