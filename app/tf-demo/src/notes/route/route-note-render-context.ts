import type { ReactElement } from "react";

import type { WorkspaceTarget } from "@/workspace/sheet-workspace";
import type { Id } from "../../../convex/_generated/dataModel";
import type { NoteBlockLayout } from "../note-block-layout";
import type { NoteDataFor } from "../note-data";

export type RouteNoteData =
	| NoteDataFor<"Lemma">
	| NoteDataFor<"Surface">
	| NoteDataFor<"Attestation">;

export type RouteNotePresentationCapabilities = {
	readonly presentation?: "Card" | "Sheet";
	readonly blockLayout?: NoteBlockLayout;
	readonly activeAnalysisKey?: Id<"surfaces">;
	readonly pagination: {
		readonly hasMore: boolean;
		readonly isLoading: boolean;
		readonly error: string | null;
		readonly loadMore: (() => Promise<void>) | null;
	};
	readonly follow: (target: WorkspaceTarget) => void;
};

export type RouteNoteRenderContext = {
	readonly note: RouteNoteData;
	readonly capabilities: RouteNotePresentationCapabilities;
};

export type RouteNoteDefaultRenderer = (
	context: RouteNoteRenderContext,
) => ReactElement | null;

export function createDefaultRouteNoteCapabilities(): RouteNotePresentationCapabilities {
	return {
		pagination: {
			hasMore: false,
			isLoading: false,
			error: null,
			loadMore: null,
		},
		follow: () => {},
	};
}
