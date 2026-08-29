import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { RouteNoteTarget } from "@/lib/navigation";
import { renderNote } from "@/notes";
import { usePaginatedNoteLoading } from "@/notes/paginated-note-loading";
import type {
	RouteNoteData,
	RouteNotePresentationCapabilities,
} from "@/notes/route";
import { NotFoundView } from "@/views/not-found-view";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

export type RouteNote = RouteNoteData;
type PaginatedRouteNote = Extract<
	RouteNote,
	{ routeKind: "Surface" | "Lemma" }
>;

export function RouteNoteView({ target }: { target: RouteNoteTarget }) {
	const { follow } = useWorkspaceInteraction();
	const noteQuery = useQuery({
		...convexQuery(api.routeNotes.get, {
			routeKind: target.routeKind,
			id: target.id,
		}),
		gcTime: 10_000,
	});
	if (noteQuery.isPending) return <RouteNoteSkeleton />;
	if (
		noteQuery.data?.kind !== "RouteNote" ||
		noteQuery.data.routeKind !== target.routeKind
	) {
		return (
			<NotFoundView
				title="Route Note not found"
				description="This Route Note does not exist, was removed, or its target kind does not match the stored record."
			/>
		);
	}
	return noteQuery.data.routeKind === "Attestation" ? (
		renderNote(noteQuery.data, routeNoteCapabilities(follow))
	) : (
		<PaginatedRouteNote initialNote={noteQuery.data} />
	);
}

function PaginatedRouteNote({
	initialNote,
}: {
	initialNote: PaginatedRouteNote;
}) {
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const loadRoutePage = useCallback(
		async (cursor: string): Promise<PaginatedRouteNote | null> => {
			const next = await convex.query(api.routeNotes.get, {
				routeKind: initialNote.target.routeKind,
				id: initialNote.target.id,
				contextCursor: cursor,
			});
			return next?.kind === "RouteNote" &&
				next.routeKind !== "Attestation"
				? next
				: null;
		},
		[convex, initialNote.target.id, initialNote.target.routeKind],
	);
	const pagination = usePaginatedNoteLoading(initialNote, loadRoutePage);

	return renderNote(
		pagination.note,
		routeNoteCapabilities(follow, {
			hasMore: pagination.hasMore,
			isLoading: pagination.isLoading,
			error: pagination.error,
			loadMore: pagination.hasMore ? pagination.loadMore : null,
		}),
	);
}

function routeNoteCapabilities(
	follow: RouteNotePresentationCapabilities["follow"],
	pagination: RouteNotePresentationCapabilities["pagination"] = {
		hasMore: false,
		isLoading: false,
		error: null,
		loadMore: null,
	},
): RouteNotePresentationCapabilities {
	return { pagination, follow };
}

function RouteNoteSkeleton() {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-5"
				role="status"
			>
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-28 w-full" />
			</div>
		</div>
	);
}
