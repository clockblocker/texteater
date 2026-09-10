import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { RouteNoteTarget } from "@/lib/navigation";
import { renderNote, type SurfaceNotePresentationCapabilities } from "@/notes";
import { usePaginatedNoteLoading } from "@/notes/paginated-note-loading";
import type {
	RouteNoteData,
	RouteNotePresentationCapabilities,
} from "@/notes/route";
import { NotFoundView } from "@/views/not-found-view";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type RouteNote = RouteNoteData;
type PaginatedRouteNote = Extract<RouteNote, { kind: "Lemma" }>;
type PaginatedSurfaceNote = Extract<RouteNote, { kind: "Surface" }>;

export function RouteNoteView({
	target,
	presentation = "Sheet",
	activeAnalysisKey,
}: {
	target: RouteNoteTarget;
	presentation?: "Card" | "Sheet";
	activeAnalysisKey?: Id<"surfaces">;
}) {
	const { follow } = useWorkspaceInteraction();
	const noteQuery = useQuery({
		...convexQuery(
			api.routeNotes.get,
			routeNoteQueryArgs(target, activeAnalysisKey),
		),
		gcTime: 10_000,
	});
	if (noteQuery.isPending) return <RouteNoteSkeleton />;
	if (noteQuery.data?.kind !== target.kind) {
		return (
			<NotFoundView
				title={`${target.kind} Note not found`}
				description="This Note does not exist, was removed, or its target kind does not match the stored record."
			/>
		);
	}
	if (noteQuery.data.kind === "Surface") {
		return (
			<PaginatedSurfaceNote
				initialNote={noteQuery.data}
				presentation={presentation}
				activeAnalysisKey={activeAnalysisKey}
			/>
		);
	}
	return noteQuery.data.kind === "Attestation" ? (
		renderNote(noteQuery.data, routeNoteCapabilities(follow))
	) : (
		<PaginatedRouteNote initialNote={noteQuery.data} />
	);
}

function PaginatedSurfaceNote({
	initialNote,
	presentation,
	activeAnalysisKey,
}: {
	initialNote: PaginatedSurfaceNote;
	presentation: "Card" | "Sheet";
	activeAnalysisKey?: Id<"surfaces">;
}) {
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const loadSurfacePage = useCallback(
		async (cursor: string): Promise<PaginatedSurfaceNote | null> => {
			const next = await convex.query(api.routeNotes.get, {
				kind: "Surface",
				language: initialNote.target.language,
				normalizedSurface: initialNote.target.normalizedSurface,
				contextCursor: cursor,
			});
			return next?.kind === "Surface" ? next : null;
		},
		[
			convex,
			initialNote.target.language,
			initialNote.target.normalizedSurface,
		],
	);
	const pagination = usePaginatedNoteLoading(initialNote, loadSurfacePage);
	const capabilities: SurfaceNotePresentationCapabilities = {
		presentation,
		activeAnalysisKey,
		pagination: {
			hasMore: pagination.hasMore,
			isLoading: pagination.isLoading,
			error: pagination.error,
			loadMore: pagination.hasMore ? pagination.loadMore : null,
		},
		follow,
	};
	return renderNote(pagination.note, capabilities);
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
				kind: "Lemma",
				lemmaId: initialNote.target.lemmaId,
				contextCursor: cursor,
			});
			return next?.kind === "Lemma" ? next : null;
		},
		[convex, initialNote.target.lemmaId],
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

function routeNoteQueryArgs(
	target: RouteNoteTarget,
	activeAnalysisKey?: Id<"surfaces">,
) {
	switch (target.kind) {
		case "Lemma":
			return {
				kind: "Lemma" as const,
				lemmaId: target.lemmaId,
			};
		case "Surface":
			return {
				kind: "Surface" as const,
				language: target.language,
				normalizedSurface: target.normalizedSurface,
				...(activeAnalysisKey !== undefined
					? { activeAnalysisKey }
					: {}),
			};
		case "Attestation":
			return {
				kind: "Attestation" as const,
				attestationId: target.attestationId,
			};
	}
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
