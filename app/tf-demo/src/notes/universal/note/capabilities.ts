import type {
	NotePresentationContext,
	WorkspaceTarget,
} from "@/workspace/sheet-workspace";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { KnowledgePreferences } from "../../../../shared/knowledge-preferences";
import type { NoteDataFor } from "./data";

type SourceContext = NoteDataFor<"Reading">["sourceContexts"]["page"][number];
type ShadowNoteReferrer = NoteDataFor<"Shadow">["references"]["page"][number];

export type ReadingPresentationCapabilities = {
	readonly grammaticalAlternatives?: {
		readonly follow: (readingKey: string) => Promise<void>;
		readonly pending: boolean;
		readonly error: string | null;
	};
	readonly presentation?: "Card" | "Sheet";
	readonly knowledgeSettings: KnowledgePreferences;
	readonly sourceContexts: {
		readonly items: readonly SourceContext[];
		readonly hasMore: boolean;
		readonly isLoading: boolean;
		readonly error: string | null;
		readonly loadMore: (() => Promise<void>) | null;
	};
	readonly personalAnnotation: {
		readonly isSaving: boolean;
		readonly error: string | null;
		readonly save: ((text: string) => Promise<void>) | null;
	};
	/**
	 * Makes the Definition block read like a Sentence: its Segments select
	 * like the reader's. Only a Sheet offers this; a Card leaves it undefined.
	 */
	readonly definition?: DefinitionCapabilities;
	readonly follow: (
		target: WorkspaceTarget,
		presentationContext?: NotePresentationContext,
	) => void;
};

export type DefinitionCapabilities = {
	readonly selectedSegmentKey: string | null;
	readonly error: string | null;
	readonly selectSegment: (
		sentenceId: Id<"sentences">,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	) => Promise<void>;
};

export type RoutePresentationCapabilities = {
	readonly presentation?: "Card" | "Sheet";
	readonly activeAnalysisKey?: Id<"surfaces">;
	readonly pagination: {
		readonly hasMore: boolean;
		readonly isLoading: boolean;
		readonly error: string | null;
		readonly loadMore: (() => Promise<void>) | null;
	};
	readonly follow: (
		target: WorkspaceTarget,
		presentationContext?: NotePresentationContext,
	) => void;
};

export type SurfacePresentationCapabilities = {
	readonly presentation?: "Card" | "Sheet";
	readonly activeAnalysisKey?: Id<"surfaces">;
	readonly pagination?: RoutePresentationCapabilities["pagination"];
	readonly follow: (
		target: WorkspaceTarget,
		presentationContext?: NotePresentationContext,
	) => void;
};

export type ShadowPresentationCapabilities = {
	readonly presentation?: "Card" | "Sheet";
	readonly references: {
		readonly items: readonly ShadowNoteReferrer[];
		readonly hasMore: boolean;
		readonly isLoading: boolean;
		readonly error: string | null;
		readonly loadMore: (() => Promise<void>) | null;
	};
	readonly cleanup: {
		readonly activeLocator: string | null;
		readonly actionError: string | null;
		readonly outcome: string | null;
		readonly resolve: ((locatorKey: string) => Promise<void>) | null;
	};
	readonly follow: (
		target: WorkspaceTarget,
		presentationContext?: NotePresentationContext,
	) => void;
};
