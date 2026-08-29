import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";

import type { NoteDataFor } from "../note-data";
import { type TargetLanguage, targetLanguageSchema } from "../target-language";
import { availableBlocksFor } from "./system-block-catalog";

type ReadingNoteData = NoteDataFor<"UnitReadingNote">;

export type UnitReadingFamilyFor<L extends TargetLanguage> = Extract<
	LemmaFamilyFor<L>,
	"Lexeme" | "Phraseme" | "Morpheme"
>;

export type UnitReadingKindFor<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
> = LemmaKindFor<L, F>;

export type ReadingNoteRouteKey<
	L extends TargetLanguage = TargetLanguage,
	F extends UnitReadingFamilyFor<L> = UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F> = UnitReadingKindFor<L, F>,
> = {
	readonly targetLanguage: L;
	readonly family: F;
	readonly kind: K;
};

export type ReadingNoteRouteFor<L extends TargetLanguage> = {
	[Family in UnitReadingFamilyFor<L>]: {
		[Kind in UnitReadingKindFor<L, Family>]: ReadingNoteRouteKey<
			L,
			Family,
			Kind
		>;
	}[UnitReadingKindFor<L, Family>];
}[UnitReadingFamilyFor<L>];

export type ReadingNoteRoute = {
	[Language in TargetLanguage]: ReadingNoteRouteFor<Language>;
}[TargetLanguage];

/** Narrows the widened Convex route once, before applicability or dispatch. */
export function narrowReadingNoteRoute(
	note: ReadingNoteData,
): ReadingNoteRoute | null {
	const lemma = note.reading.lemma;
	const language = targetLanguageSchema.safeParse(lemma.language);
	if (!language.success) return null;

	const route = {
		targetLanguage: language.data,
		family: lemma.family,
		kind: lemma.kind,
	};
	if (availableBlocksFor(route) === null) return null;
	return route as ReadingNoteRoute;
}
