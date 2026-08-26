import type { ReactElement } from "react";

import type { WorkspaceTarget } from "@/workspace/sheet-workspace";
import type { NoteDataFor } from "../note-data";

export type ShadowNoteData = NoteDataFor<"ShadowNote">;
export type ShadowNoteReferrer = ShadowNoteData["references"]["page"][number];

export type ShadowNotePresentationCapabilities = {
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
	readonly follow: (target: WorkspaceTarget) => void;
};

export type ShadowNoteRenderContext = {
	readonly note: ShadowNoteData;
	readonly capabilities: ShadowNotePresentationCapabilities;
};

export type ShadowNoteDefaultRenderer = (
	context: ShadowNoteRenderContext,
) => ReactElement | null;

export function createDefaultShadowNoteCapabilities(
	note: ShadowNoteData,
): ShadowNotePresentationCapabilities {
	return {
		references: {
			items: note.references.page,
			hasMore: false,
			isLoading: false,
			error: null,
			loadMore: null,
		},
		cleanup: {
			activeLocator: null,
			actionError: null,
			outcome: null,
			resolve: null,
		},
		follow: () => {},
	};
}
