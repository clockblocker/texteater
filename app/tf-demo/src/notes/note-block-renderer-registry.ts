import type { LemmaKindFor } from "dumling/types";
import type { ReactElement } from "react";

import type { NoteBlockKind } from "./note-block-kind";
import type { NoteDataFor } from "./note-data";
import type { NoteKind } from "./note-kind";
import type {
	ReadingNoteBlockRenderer,
	ReadingNotePresentationCapabilities,
} from "./reading";
import type {
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
} from "./reading/reading-note-route";
import type { RouteNotePresentationCapabilities } from "./route";
import type { ShadowNotePresentationCapabilities } from "./shadow";
import type {
	SurfaceNoteBlockRenderer,
	SurfaceNotePresentationCapabilities,
} from "./surface";
import type { TargetLanguage } from "./target-language";

export type GrammaticalNoteKind = Exclude<NoteKind, "Surface">;

export type NoteFamilyFor<
	L extends TargetLanguage,
	N extends GrammaticalNoteKind,
> = N extends GrammaticalNoteKind ? UnitReadingFamilyFor<L> : never;

export type NoteLemmaKindFor<
	L extends TargetLanguage,
	N extends GrammaticalNoteKind,
	F extends NoteFamilyFor<L, N>,
> = LemmaKindFor<L, F>;

type CoordinateRefinement<
	L extends TargetLanguage,
	N extends GrammaticalNoteKind,
	F extends NoteFamilyFor<L, N>,
	K extends NoteLemmaKindFor<L, N, F>,
> = N extends "Reading"
	? {
			readonly reading: {
				readonly lemma: {
					readonly language: L;
					readonly family: F;
					readonly kind: K;
				};
			};
		}
	: N extends "Lemma"
		? {
				readonly presented: {
					readonly language: L;
					readonly family: F;
					readonly kind: K;
				};
			}
		: N extends "Attestation"
			? {
					readonly presented: {
						readonly surface: {
							readonly language: L;
							readonly lemma: {
								readonly language: L;
								readonly family: F;
								readonly kind: K;
							};
						};
					};
				}
			: {
					readonly descriptor: {
						readonly language: L;
						readonly family: F;
						readonly kind: K;
					};
				};

export type GrammaticalNoteDataFor<
	L extends TargetLanguage,
	N extends GrammaticalNoteKind,
	F extends NoteFamilyFor<L, N>,
	K extends NoteLemmaKindFor<L, N, F>,
> = NoteDataFor<N> & CoordinateRefinement<L, N, F, K>;

export type NotePresentationCapabilitiesFor<N extends NoteKind> =
	N extends "Reading"
		? ReadingNotePresentationCapabilities
		: N extends "Shadow"
			? ShadowNotePresentationCapabilities
			: N extends "Surface"
				? SurfaceNotePresentationCapabilities
				: RouteNotePresentationCapabilities;

export type GrammaticalNoteRenderContext<
	L extends TargetLanguage,
	N extends GrammaticalNoteKind,
	F extends NoteFamilyFor<L, N>,
	K extends NoteLemmaKindFor<L, N, F>,
> = {
	readonly noteData: GrammaticalNoteDataFor<L, N, F, K>;
	readonly RouteKey: ReadingNoteRouteKey<L, F, K> & { readonly noteKind: N };
	readonly PresentationCapabilities: NotePresentationCapabilitiesFor<N>;
};

export type NoteBlockRenderer<
	L extends TargetLanguage = TargetLanguage,
	N extends NoteKind = NoteKind,
	F extends UnitReadingFamilyFor<L> = UnitReadingFamilyFor<L>,
	K extends LemmaKindFor<L, F> = LemmaKindFor<L, F>,
> = N extends "Surface"
	? SurfaceNoteBlockRenderer<L>
	: N extends "Reading"
		? F extends UnitReadingFamilyFor<L>
			? K extends LemmaKindFor<L, F>
				? ReadingNoteBlockRenderer<L, F, K>
				: never
			: never
		: N extends GrammaticalNoteKind
			? F extends NoteFamilyFor<L, N>
				? K extends NoteLemmaKindFor<L, N, F>
					? (
							context: GrammaticalNoteRenderContext<L, N, F, K>,
						) => ReactElement | null
					: never
				: never
			: never;

type BlockRendererMap<
	L extends TargetLanguage,
	N extends NoteKind,
	F extends UnitReadingFamilyFor<L>,
	K extends LemmaKindFor<L, F>,
> = Partial<Record<NoteBlockKind, NoteBlockRenderer<L, N, F, K>>>;

type GrammaticalNoteKindRegistry<
	L extends TargetLanguage,
	N extends GrammaticalNoteKind,
> = Partial<{
	[F in NoteFamilyFor<L, N>]: Partial<{
		[K in NoteLemmaKindFor<L, N, F>]: BlockRendererMap<L, N, F, K>;
	}>;
}>;

type NoteKindRegistry<
	L extends TargetLanguage,
	N extends NoteKind,
> = N extends "Surface"
	? Partial<Record<NoteBlockKind, SurfaceNoteBlockRenderer<L>>>
	: N extends GrammaticalNoteKind
		? GrammaticalNoteKindRegistry<L, N>
		: never;

type LanguageRegistry<L extends TargetLanguage> = {
	[N in NoteKind]: NoteKindRegistry<L, N>;
};

export type NoteBlockRendererRegistry<
	L extends TargetLanguage | never = never,
	N extends NoteKind | never = never,
	F extends L extends TargetLanguage
		? UnitReadingFamilyFor<L>
		: never = never,
	K extends string | never = never,
> = [L] extends [never]
	? { [Language in TargetLanguage]: LanguageRegistry<Language> }
	: L extends TargetLanguage
		? [N] extends [never]
			? LanguageRegistry<L>
			: N extends NoteKind
				? [F] extends [never]
					? NoteKindRegistry<L, N>
					: N extends GrammaticalNoteKind
						? F extends NoteFamilyFor<L, N>
							? [K] extends [never]
								? Partial<{
										[K2 in NoteLemmaKindFor<
											L,
											N,
											F
										>]: BlockRendererMap<L, N, F, K2>;
									}>
								: K extends NoteLemmaKindFor<L, N, F>
									? BlockRendererMap<L, N, F, K>
									: never
							: never
						: never
				: never
		: never;
