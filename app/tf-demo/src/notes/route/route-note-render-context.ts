import type { ReactElement } from "react";

import { hrefFor, type NavigationTarget } from "@/lib/navigation";
import type { NoteDataFor } from "../note-data";

export type RouteNoteData = NoteDataFor<"RouteNote">;

export type RouteNotePresentationCapabilities = {
	readonly pagination: {
		readonly hasMore: boolean;
		readonly isLoading: boolean;
		readonly error: string | null;
		readonly loadMore: (() => Promise<void>) | null;
	};
	readonly hrefFor: (target: NavigationTarget) => string;
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
		hrefFor,
	};
}
