import type * as Dumling from "dumling/types";
import {
	type PillarForm,
	type PronounDescription,
	type PronounTable,
	pronounStem,
} from "./pronoun-paradigm.js";
import type { ReviewedMember } from "./stem-lemma.js";

type Core = Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"];
export const absent = [null, null, null, null] as const;
export const description = (
	pronType: Core["pronType"],
	emoji: string,
	definition: string,
	en: string[],
	ru: string[],
): PronounDescription => ({ core: { pronType }, emoji, definition, en, ru });
// A pillar's forms cannot be derived from another paradigm (system ADR 0032).
// Pillars are one Lemma per cell: the personal and der-series tables
// (pronouns-personal.ts, pronouns-der-series.ts) and einer. Every add() is a
// stem with borrowed endings: one Lemma whose Surfaces mark the cell.
export const stemAdder =
	(reviewed: ReviewedMember[]) =>
	(
		table: PronounTable,
		meaning: PronounDescription,
		options?: Parameters<typeof pronounStem>[2],
	) =>
		reviewed.push(pronounStem(table, meaning, options));
export const plural = (table: PronounTable) => {
	const cited = table.Plur[0];
	if (!cited) throw Error("A plural Canonical Form needs a Nom.Plur cell");
	return { canonicalForm: cited };
};

/** A pillar cell with its Russian translation and, where it differs from its paradigm's, its English one. */
export const cell = (
	text: string,
	ipa: string,
	ru: readonly string[],
	en?: readonly string[],
	remark?: string,
): PillarForm => ({
	text,
	ipa,
	ru,
	...(en ? { en } : {}),
	...(remark ? { remark } : {}),
});
