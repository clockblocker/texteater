import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { NotFoundView } from "@/views/not-found-view";
import { usePaginatedNoteLoading } from "@/views/paginated-note-loading";
import { PlacedNote, PlacedNoteSkeleton } from "@/workspace/note-part";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { RouteNoteTarget } from "../../shared/navigation";

type RouteNote = NonNullable<FunctionReturnType<typeof api.routeNotes.get>>;
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
	const visitorId = useAnonymousVisitorId();
	const noteQuery = useQuery(
		convexQuery(api.routeNotes.get, {
			...routeNoteQueryArgs(target, activeAnalysisKey),
			visitorId,
		}),
	);
	if (noteQuery.isPending)
		return (
			<PlacedNoteSkeleton
				kind={target.kind}
				presentation={presentation}
			/>
		);
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
		<PlacedNote
			input={{
				noteData: noteQuery.data,
				capabilities: routeNoteCapabilities(follow, presentation),
			}}
		/>
	) : (
		<PaginatedRouteNote
			initialNote={noteQuery.data}
			presentation={presentation}
		/>
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
		async (cursor: string) => {
			const next = await convex.query(api.routeNotes.get, {
				target: {
					kind: "Surface",
					language: initialNote.target.language,
					normalizedSurface: initialNote.target.normalizedSurface,
					contextCursor: cursor,
				},
			});
			return next?.kind === "Surface"
				? {
						analyses: next.analyses,
						continueCursor: next.continueCursor,
						isDone: next.isDone,
					}
				: null;
		},
		[
			convex,
			initialNote.target.language,
			initialNote.target.normalizedSurface,
		],
	);
	const { note, pagination } = usePaginatedNoteLoading(
		initialNote,
		loadSurfacePage,
	);
	const capabilities = {
		presentation,
		activeAnalysisKey,
		pagination,
		follow,
	};
	return <PlacedNote input={{ noteData: note, capabilities }} />;
}

function PaginatedRouteNote({
	initialNote,
	presentation,
}: {
	initialNote: PaginatedRouteNote;
	presentation: "Card" | "Sheet";
}) {
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const loadRoutePage = useCallback(
		async (cursor: string) => {
			const next = await convex.query(api.routeNotes.get, {
				target: {
					kind: "Lemma",
					lemmaId: initialNote.target.lemmaId,
					contextCursor: cursor,
				},
			});
			return next?.kind === "Lemma" ? next.connections : null;
		},
		[convex, initialNote.target.lemmaId],
	);
	const { note, pagination } = usePaginatedNoteLoading(
		initialNote,
		loadRoutePage,
	);

	return (
		<PlacedNote
			input={{
				noteData: note,
				capabilities: routeNoteCapabilities(
					follow,
					presentation,
					pagination,
				),
			}}
		/>
	);
}

/** The `routeNotes.get` arguments a Route Note asks with, but for the Visitor. */
export function routeNoteQueryArgs(
	target: RouteNoteTarget,
	activeAnalysisKey?: Id<"surfaces">,
) {
	switch (target.kind) {
		case "Lemma":
			return {
				target: {
					kind: "Lemma" as const,
					lemmaId: target.lemmaId,
				},
			};
		case "Surface":
			return {
				target: {
					kind: "Surface" as const,
					language: target.language,
					normalizedSurface: target.normalizedSurface,
					...(activeAnalysisKey !== undefined
						? { activeAnalysisKey }
						: {}),
				},
			};
		case "Attestation":
			return {
				target: {
					kind: "Attestation" as const,
					attestationId: target.attestationId,
				},
			};
	}
}

function routeNoteCapabilities(
	follow: (
		target: import("@/workspace/workspace-subject").WorkspaceTarget,
	) => void,
	presentation: "Card" | "Sheet",
	pagination: {
		hasMore: boolean;
		isLoading: boolean;
		error: string | null;
		loadMore: (() => Promise<void>) | null;
	} = {
		hasMore: false,
		isLoading: false,
		error: null,
		loadMore: null,
	},
): {
	readonly presentation: "Card" | "Sheet";
	readonly pagination: typeof pagination;
	readonly follow: typeof follow;
} {
	return { presentation, pagination, follow };
}
