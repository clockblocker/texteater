import type {
	InflectionalFeaturesFor,
	Lemma,
	LemmaFamilyFor,
	LemmaKindFor,
	Reading,
} from "dumling/types";
import type { ReactElement } from "react";

import type { SupportedTargetLanguage } from "../../../../shared/supported-target-language";
import type {
	ReadingPresentationCapabilities,
	RoutePresentationCapabilities,
	ShadowPresentationCapabilities,
	SurfacePresentationCapabilities,
} from "../note/capabilities";
import type { NoteDataFor } from "../note/data";
import type { NoteKind } from "../note/kind";

export type GrammaticalNoteKind = Exclude<NoteKind, "Surface">;
export type NoteFamilyFor<L extends SupportedTargetLanguage> = Extract<
	LemmaFamilyFor<L>,
	"Lexeme" | "Phraseme" | "Morpheme"
>;
export type NoteLemmaKindFor<
	L extends SupportedTargetLanguage,
	F extends NoteFamilyFor<L>,
> = LemmaKindFor<L, F>;

type CoordinateRefinement<
	L extends SupportedTargetLanguage,
	N extends GrammaticalNoteKind,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
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
	L extends SupportedTargetLanguage,
	N extends GrammaticalNoteKind,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
> = NoteDataFor<N> & CoordinateRefinement<L, N, F, K>;

export type ReadingRenderContext<
	L extends SupportedTargetLanguage,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
> = {
	readonly noteData: Omit<NoteDataFor<"Reading">, "reading"> & {
		readonly reading: Reading<L, F, K> &
			Omit<NoteDataFor<"Reading">["reading"], keyof Reading> & {
				readonly lemma: Reading<L, F, K>["lemma"] &
					Omit<
						NoteDataFor<"Reading">["reading"]["lemma"],
						keyof Lemma
					>;
			};
	};
	readonly RouteKey: {
		readonly language: L;
		readonly family: F;
		readonly kind: K;
		readonly noteKind: "Reading";
	};
	readonly PresentationCapabilities: ReadingPresentationCapabilities;
};

export type GrammaticalRenderContext<
	L extends SupportedTargetLanguage,
	N extends Exclude<GrammaticalNoteKind, "Reading">,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
> = {
	readonly noteData: GrammaticalNoteDataFor<L, N, F, K>;
	readonly RouteKey: {
		readonly language: L;
		readonly family: F;
		readonly kind: K;
		readonly noteKind: N;
	};
	readonly PresentationCapabilities: N extends "Shadow"
		? ShadowPresentationCapabilities
		: RoutePresentationCapabilities;
};

type PresentedValue<Value> = Value | readonly Value[] | null;
export type SurfaceAnalysis<
	L extends SupportedTargetLanguage,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
> = Omit<NoteDataFor<"Surface">["analyses"][number], "presented"> & {
	readonly presented: Omit<
		NoteDataFor<"Surface">["analyses"][number]["presented"],
		"language" | "lemma" | "inflectionalFeatures"
	> & {
		readonly language: L;
		readonly lemma: Omit<
			NoteDataFor<"Surface">["analyses"][number]["presented"]["lemma"],
			"language" | "family" | "kind"
		> & { readonly language: L; readonly family: F; readonly kind: K };
		readonly inflectionalFeatures: NoteDataFor<"Surface">["analyses"][number]["presented"]["inflectionalFeatures"] &
			Readonly<{
				[Name in keyof InflectionalFeaturesFor<
					L,
					F,
					K
				>]-?: PresentedValue<InflectionalFeaturesFor<L, F, K>[Name]>;
			}>;
	};
};
export type SurfaceAnalysisFor<L extends SupportedTargetLanguage> = {
	[F in NoteFamilyFor<L>]: {
		[K in NoteLemmaKindFor<L, F>]: SurfaceAnalysis<L, F, K>;
	}[NoteLemmaKindFor<L, F>];
}[NoteFamilyFor<L>];
export type ConcreteSurfaceNoteData<L extends SupportedTargetLanguage> = Omit<
	NoteDataFor<"Surface">,
	"target" | "analyses"
> & {
	readonly target: NoteDataFor<"Surface">["target"] & {
		readonly language: L;
	};
	readonly analyses: readonly SurfaceAnalysisFor<L>[];
};
export type SurfaceRenderContext<L extends SupportedTargetLanguage> = {
	readonly noteData: ConcreteSurfaceNoteData<L>;
	readonly PresentationCapabilities: SurfacePresentationCapabilities;
};

export type NotePresentationCapabilitiesFor<N extends NoteKind> =
	N extends "Reading"
		? ReadingPresentationCapabilities
		: N extends "Shadow"
			? ShadowPresentationCapabilities
			: N extends "Surface"
				? SurfacePresentationCapabilities
				: RoutePresentationCapabilities;

export type NoteBlockRenderer<
	L extends SupportedTargetLanguage = SupportedTargetLanguage,
	N extends NoteKind = NoteKind,
	F extends NoteFamilyFor<L> = NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F> = NoteLemmaKindFor<L, F>,
> = N extends "Surface"
	? (context: SurfaceRenderContext<L>) => ReactElement | null
	: N extends "Reading"
		? (context: ReadingRenderContext<L, F, K>) => ReactElement | null
		: N extends Exclude<GrammaticalNoteKind, "Reading">
			? (
					context: GrammaticalRenderContext<L, N, F, K>,
				) => ReactElement | null
			: never;

export type ReadingDefaultRenderer = <
	L extends SupportedTargetLanguage,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
>(
	context: ReadingRenderContext<L, F, K>,
) => ReactElement | null;
export type SurfaceAnalysisDescriptionRenderer<
	L extends SupportedTargetLanguage,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
> = (analysis: SurfaceAnalysis<L, F, K>) => ReactElement;
export type SurfaceAnalysisDescriptionRendererRegistry<
	L extends SupportedTargetLanguage,
> = Partial<{
	[F in NoteFamilyFor<L>]: Partial<{
		[K in NoteLemmaKindFor<L, F>]: SurfaceAnalysisDescriptionRenderer<
			L,
			F,
			K
		>;
	}>;
}>;
