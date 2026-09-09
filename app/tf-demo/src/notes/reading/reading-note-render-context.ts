import type { Lemma, Reading } from "dumling/types";
import { DEFAULT_KNOWLEDGE_SETTINGS, type KnowledgeSettings } from "dumrel";
import type { ReactElement } from "react";

import type { WorkspaceTarget } from "@/workspace/sheet-workspace";
import type { NoteDataFor } from "../note-data";
import type { TargetLanguage } from "../target-language";
import type { ReadingBlockLayout } from "./reading-block-plan";
import type {
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";
import { narrowReadingNoteRoute } from "./reading-note-route";
import { availableBlocksFor } from "./system-block-catalog";

type AnyReadingNoteData = NoteDataFor<"UnitReadingNote">;
type SourceContext = AnyReadingNoteData["sourceContexts"]["page"][number];

type ConcreteReadingNoteData<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
> = Omit<AnyReadingNoteData, "reading"> & {
	readonly reading: Reading<L, F, K> &
		Omit<AnyReadingNoteData["reading"], keyof Reading> & {
			readonly lemma: Reading<L, F, K>["lemma"] &
				Omit<AnyReadingNoteData["reading"]["lemma"], keyof Lemma>;
		};
};

export type ReadingNotePresentationCapabilities = {
	readonly presentation?: "Card" | "Sheet";
	readonly blockLayout: ReadingBlockLayout;
	readonly knowledgeSettings: KnowledgeSettings;
	readonly sourceContexts: {
		readonly items: readonly SourceContext[];
		readonly hasMore: boolean;
		readonly isLoading: boolean;
		readonly error: string | null;
		readonly loadMore: (() => Promise<void>) | null;
	};
	readonly definition: {
		readonly isSaving: boolean;
		readonly error: string | null;
		readonly save: ((definition: string | null) => Promise<void>) | null;
	};
	readonly follow: (target: WorkspaceTarget) => void;
};

export type ReadingNoteRenderContext<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
> =
	F extends UnitReadingFamilyFor<L>
		? K extends UnitReadingKindFor<L, F>
			? {
					readonly noteData: ConcreteReadingNoteData<L, F, K>;
					readonly RouteKey: ReadingNoteRouteKey<L, F, K>;
					readonly PresentationCapabilities: ReadingNotePresentationCapabilities;
				}
			: never
		: never;

export type ReadingNoteBlockRenderer<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
> = (context: ReadingNoteRenderContext<L, F, K>) => ReactElement | null;

export type ReadingNoteDefaultRenderer = <
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	context: ReadingNoteRenderContext<L, F, K>,
) => ReactElement | null;

export function createDefaultReadingNoteCapabilities(
	note: AnyReadingNoteData,
): ReadingNotePresentationCapabilities {
	const route = narrowReadingNoteRoute(note);
	if (!route) {
		const lemma = note.reading.lemma;
		throw new Error(
			`Unsupported Reading route: ${lemma.language}/${lemma.family}/${lemma.kind}.`,
		);
	}

	return {
		blockLayout: {
			order: availableBlocksFor(route),
			hidden: new Set(),
		},
		knowledgeSettings: DEFAULT_KNOWLEDGE_SETTINGS,
		sourceContexts: {
			items: note.sourceContexts.page,
			hasMore: !note.sourceContexts.isDone,
			isLoading: false,
			error: null,
			loadMore: null,
		},
		definition: {
			isSaving: false,
			error: null,
			save: null,
		},
		follow: () => {},
	};
}
