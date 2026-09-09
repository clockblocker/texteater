import type {
	InflectionalFeaturesFor,
	LemmaFamilyFor,
	LemmaKindFor,
} from "dumling/types";
import type { ReactElement } from "react";

import type { WorkspaceTarget } from "@/workspace/sheet-workspace";
import type { NoteBlockLayout } from "../note-block-layout";
import type { NoteDataFor } from "../note-data";
import type { UnitReadingFamilyFor } from "../reading/reading-note-route";
import type { TargetLanguage } from "../target-language";

export type SurfaceNoteData = NoteDataFor<"Surface">;
type RawSurfaceAnalysis = SurfaceNoteData["analyses"][number];

type PresentedValue<Value> = Value | readonly Value[] | null;
type PresentedInflectionalFeatures<
	L extends TargetLanguage,
	F extends LemmaFamilyFor<L>,
	K extends LemmaKindFor<L, F>,
> = Readonly<{
	[Name in keyof InflectionalFeaturesFor<L, F, K>]-?: PresentedValue<
		InflectionalFeaturesFor<L, F, K>[Name]
	>;
}>;

export type SurfaceAnalysis<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends LemmaKindFor<L, F>,
> = Omit<RawSurfaceAnalysis, "presented"> & {
	readonly presented: Omit<
		RawSurfaceAnalysis["presented"],
		"language" | "lemma" | "inflectionalFeatures"
	> & {
		readonly language: L;
		readonly lemma: Omit<
			RawSurfaceAnalysis["presented"]["lemma"],
			"language" | "family" | "kind"
		> & {
			readonly language: L;
			readonly family: F;
			readonly kind: K;
		};
		readonly inflectionalFeatures: RawSurfaceAnalysis["presented"]["inflectionalFeatures"] &
			PresentedInflectionalFeatures<L, F, K>;
	};
};

export type SurfaceAnalysisFor<L extends TargetLanguage> = {
	[F in UnitReadingFamilyFor<L>]: {
		[K in LemmaKindFor<L, F>]: SurfaceAnalysis<L, F, K>;
	}[LemmaKindFor<L, F>];
}[UnitReadingFamilyFor<L>];

export type ConcreteSurfaceNoteData<L extends TargetLanguage> = Omit<
	SurfaceNoteData,
	"target" | "analyses"
> & {
	readonly target: SurfaceNoteData["target"] & { readonly language: L };
	readonly analyses: readonly SurfaceAnalysisFor<L>[];
};

export type SurfaceNotePresentationCapabilities = {
	readonly presentation?: "Card" | "Sheet";
	readonly activeAnalysisKey?: string;
	readonly blockLayout?: NoteBlockLayout;
	readonly follow: (target: WorkspaceTarget) => void;
};

export type SurfaceNoteRenderContext<L extends TargetLanguage> = {
	readonly noteData: ConcreteSurfaceNoteData<L>;
	readonly PresentationCapabilities: SurfaceNotePresentationCapabilities;
};

export type SurfaceNoteBlockRenderer<L extends TargetLanguage> = (
	context: SurfaceNoteRenderContext<L>,
) => ReactElement | null;

export type SurfaceAnalysisDescriptionRenderer<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends LemmaKindFor<L, F>,
> = (analysis: SurfaceAnalysis<L, F, K>) => ReactElement;

export type SurfaceAnalysisDescriptionRendererRegistry<
	L extends TargetLanguage,
> = Partial<{
	[F in UnitReadingFamilyFor<L>]: Partial<{
		[K in LemmaKindFor<L, F>]: SurfaceAnalysisDescriptionRenderer<L, F, K>;
	}>;
}>;

export function createDefaultSurfaceNoteCapabilities(): SurfaceNotePresentationCapabilities {
	return { follow: () => {} };
}
