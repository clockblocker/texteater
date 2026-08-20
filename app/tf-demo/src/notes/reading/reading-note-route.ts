import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";

import type { NoteBlockKindFor } from "../note-block-kind";
import type { NoteDataFor } from "../note-data";
import { type TargetLanguage, targetLanguageSchema } from "../target-language";
import { DE_READING_NOTE_BLOCK_MAP } from "./de/block-map";

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

export type ReadingNoteBlockMap<L extends TargetLanguage> = {
	[Family in UnitReadingFamilyFor<L>]: {
		[Kind in UnitReadingKindFor<L, Family>]: ReadonlySet<
			NoteBlockKindFor<"UnitReadingNote">
		>;
	};
};

type RuntimeReadingNoteBlockMap = Readonly<
	Record<
		string,
		Readonly<
			Record<string, ReadonlySet<NoteBlockKindFor<"UnitReadingNote">>>
		>
	>
>;

/** Narrows the widened Convex route once, before applicability or dispatch. */
export function narrowReadingNoteRoute(
	note: ReadingNoteData,
): ReadingNoteRoute | null {
	const lemma = note.reading.lemma;
	const language = targetLanguageSchema.safeParse(lemma.language);
	if (!language.success) return null;

	const mapForLanguage: RuntimeReadingNoteBlockMap =
		language.data === "de" ? DE_READING_NOTE_BLOCK_MAP : {};
	if (mapForLanguage[lemma.family]?.[lemma.kind] === undefined) {
		return null;
	}

	return {
		targetLanguage: language.data,
		family: lemma.family,
		kind: lemma.kind,
	} as ReadingNoteRoute;
}
