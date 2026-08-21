import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { hrefFor, type RouteNoteTarget } from "@/lib/navigation";
import { renderNote } from "@/notes";
import type {
	RouteNoteData,
	RouteNotePresentationCapabilities,
} from "@/notes/route";
import { NotFoundView } from "@/views/not-found-view";
import { api } from "../../convex/_generated/api";

export type RouteNote = RouteNoteData;
type PaginatedRouteNote = Extract<
	RouteNote,
	{ routeKind: "Surface" | "Lemma" }
>;

type RouteNotePaginationState = {
	readonly note: PaginatedRouteNote;
	readonly cursor: string;
	readonly isDone: boolean;
	readonly isLoading: boolean;
};

export function RouteNoteView({ target }: { target: RouteNoteTarget }) {
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
		renderNote(noteQuery.data, routeNoteCapabilities())
	) : (
		<PaginatedRouteNote initialNote={noteQuery.data} />
	);
}

export function resetRouteNotePagination(
	note: PaginatedRouteNote,
): RouteNotePaginationState {
	return {
		note,
		cursor: note.connections.continueCursor,
		isDone: note.connections.isDone,
		isLoading: false,
	};
}

function PaginatedRouteNote({
	initialNote,
}: {
	initialNote: PaginatedRouteNote;
}) {
	const convex = useConvex();
	const [pagination, setPagination] = useState(() =>
		resetRouteNotePagination(initialNote),
	);
	const [error, setError] = useState<string | null>(null);
	const revision = useRef(0);
	const { note, cursor, isDone, isLoading } = pagination;

	useEffect(() => {
		revision.current += 1;
		setPagination(resetRouteNotePagination(initialNote));
		setError(null);
	}, [initialNote]);

	async function loadMore() {
		if (isDone || isLoading) return;
		setPagination((current) => ({ ...current, isLoading: true }));
		setError(null);
		const requestedRevision = revision.current;
		try {
			const next = await convex.query(api.routeNotes.get, {
				routeKind: note.target.routeKind,
				id: note.target.id,
				contextCursor: cursor,
			});
			if (
				requestedRevision !== revision.current ||
				next?.kind !== "RouteNote" ||
				next.routeKind !== note.routeKind
			) {
				if (requestedRevision === revision.current) {
					setPagination((current) => ({
						...current,
						isDone: true,
						isLoading: false,
					}));
				}
				return;
			}
			setPagination((current) => ({
				note: mergeRouteNotePages(current.note, next),
				cursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
				isLoading: current.isLoading,
			}));
		} catch (cause) {
			const message = routePageFailureMessage(
				cause,
				requestedRevision,
				revision.current,
			);
			if (message) setError(message);
		} finally {
			if (requestedRevision === revision.current) {
				setPagination((current) => ({
					...current,
					isLoading: false,
				}));
			}
		}
	}

	return renderNote(
		note,
		routeNoteCapabilities({
			hasMore: !isDone,
			isLoading,
			error,
			loadMore,
		}),
	);
}

function routeNoteCapabilities(
	pagination: RouteNotePresentationCapabilities["pagination"] = {
		hasMore: false,
		isLoading: false,
		error: null,
		loadMore: null,
	},
): RouteNotePresentationCapabilities {
	return { pagination, hrefFor };
}

export function routePageFailureMessage(
	cause: unknown,
	requestedRevision: number,
	currentRevision: number,
): string | null {
	if (requestedRevision !== currentRevision) return null;
	return cause instanceof Error
		? cause.message
		: "Route connections could not be loaded.";
}

export function mergeRouteNotePages(
	current: PaginatedRouteNote,
	next: PaginatedRouteNote,
): PaginatedRouteNote {
	if (current.routeKind === "Surface" && next.routeKind === "Surface") {
		return {
			...current,
			connections: {
				occurrences: deduplicateBy(
					[
						...current.connections.occurrences,
						...next.connections.occurrences,
					],
					(value) => value.attestationId,
				),
				sameWrittenForm: deduplicateBy(
					[
						...current.connections.sameWrittenForm,
						...next.connections.sameWrittenForm,
					],
					(value) => value.surfaceId,
				),
				continueCursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
			},
		};
	}
	if (current.routeKind === "Lemma" && next.routeKind === "Lemma") {
		return {
			...current,
			connections: {
				surfaces: deduplicateBy(
					[
						...current.connections.surfaces,
						...next.connections.surfaces,
					],
					(value) => value.surfaceId,
				),
				readings: deduplicateBy(
					[
						...current.connections.readings,
						...next.connections.readings,
					],
					(value) => value.readingId,
				),
				sameWrittenForm: deduplicateBy(
					[
						...current.connections.sameWrittenForm,
						...next.connections.sameWrittenForm,
					],
					(value) => value.lemmaId,
				),
				continueCursor: next.connections.continueCursor,
				isDone: next.connections.isDone,
			},
		};
	}
	throw new Error("Route Note pages must describe the same target kind.");
}

function deduplicateBy<Value>(
	values: readonly Value[],
	key: (value: Value) => string,
): Value[] {
	const seen = new Set<string>();
	return values.filter((value) => {
		const identity = key(value);
		if (seen.has(identity)) return false;
		seen.add(identity);
		return true;
	});
}

function RouteNoteSkeleton() {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-5"
				role="status"
			>
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-28 w-full" />
			</div>
		</main>
	);
}
