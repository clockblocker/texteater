import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";
import {
	type SupportedTargetLanguage,
	supportedTargetLanguageSchema,
} from "../../../shared/supported-target-language";
import { registeredNoteBlockMap } from "../note-block-renderer-registry-runtime";
import type { NoteDataFor } from "../note-data";

type AnyReadingNoteData = NoteDataFor<"Reading">;

export type UnitReadingFamilyFor<L extends SupportedTargetLanguage> = Extract<
	LemmaFamilyFor<L>,
	"Lexeme" | "Phraseme" | "Morpheme"
>;

export type UnitReadingKindFor<
	L extends SupportedTargetLanguage,
	F extends UnitReadingFamilyFor<L>,
> = LemmaKindFor<L, F>;

export type ReadingNoteRouteKey<
	L extends SupportedTargetLanguage = SupportedTargetLanguage,
	F extends UnitReadingFamilyFor<L> = UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F> = UnitReadingKindFor<L, F>,
> = {
	readonly language: L;
	readonly family: F;
	readonly kind: K;
};

export type ReadingNoteRouteFor<L extends SupportedTargetLanguage> = {
	[Family in UnitReadingFamilyFor<L>]: {
		[Kind in UnitReadingKindFor<L, Family>]: ReadingNoteRouteKey<
			L,
			Family,
			Kind
		>;
	}[UnitReadingKindFor<L, Family>];
}[UnitReadingFamilyFor<L>];

export type ReadingNoteRoute = {
	[Language in SupportedTargetLanguage]: ReadingNoteRouteFor<Language>;
}[SupportedTargetLanguage];

/**
 * Derives and validates the widened Convex route before applicability or
 * dispatch. Route derivation needs only Note data, not a future
 * `ResolvedOccurrenceFor` aggregate.
 */
export function readingNoteRouteFor(
	note: AnyReadingNoteData,
): ReadingNoteRoute | null {
	const lemma = note.reading.lemma;
	const language = supportedTargetLanguageSchema.safeParse(lemma.language);
	if (!language.success) return null;

	const route = {
		language: language.data,
		family: lemma.family,
		kind: lemma.kind,
	};
	if (
		registeredNoteBlockMap(
			route.language,
			"Reading",
			route.family,
			route.kind,
		) === null
	)
		return null;
	return route as ReadingNoteRoute;
}
