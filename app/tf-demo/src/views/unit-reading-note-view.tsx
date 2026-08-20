import { convexQuery } from "@convex-dev/react-query";
import {
	useQuery,
	useMutation as useReactQueryMutation,
} from "@tanstack/react-query";
import { useAction, useConvex } from "convex/react";
import type { KnowledgeSettings } from "dumrel";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { hrefFor, type UnitReadingNoteTarget } from "@/lib/navigation";
import {
	normalizeReadingDefinition,
	readingDefinitionChange,
} from "@/lib/reading-definition";
import { renderNote } from "@/notes";
import type {
	ReadingNoteData,
	ReadingNotePresentationCapabilities,
} from "@/notes/reading";
import { NotFoundView } from "@/views/not-found-view";
import { api } from "../../convex/_generated/api";

export type UnitReadingNote = ReadingNoteData;

type SourceContext = ReadingNoteData["sourceContexts"]["page"][number];

export type SourceContextPaginationState = {
	readonly firstPageKey: string;
	readonly additionalSourceContexts: readonly SourceContext[];
	readonly cursor: string;
	readonly isDone: boolean;
	readonly isLoading: boolean;
};

export function UnitReadingNoteView({
	target,
}: {
	target: UnitReadingNoteTarget;
}) {
	const visitorId = useAnonymousVisitorId();
	const noteQuery = useQuery({
		...convexQuery(api.presentation.getNote, { target }),
		gcTime: 10_000,
	});
	const settingsQuery = useQuery({
		...convexQuery(api.knowledgeSettings.get, { visitorId }),
		gcTime: 10_000,
	});

	if (noteQuery.isPending || settingsQuery.isPending) {
		return <ReadingNoteSkeleton />;
	}
	if (noteQuery.data?.kind !== "UnitReadingNote" || !settingsQuery.data) {
		return (
			<NotFoundView
				title="Reading note not found"
				description="This Unit Reading Note does not exist, was removed, or its Reading is not a supported Unit family."
			/>
		);
	}

	return (
		<ReadingNoteContainer
			key={noteQuery.data.target.readingId}
			note={noteQuery.data}
			knowledgeSettings={settingsQuery.data}
		/>
	);
}

function ReadingNoteContainer({
	note,
	knowledgeSettings,
}: {
	note: ReadingNoteData;
	knowledgeSettings: KnowledgeSettings;
}) {
	const convex = useConvex();
	const applyKnowledgeChangeAction = useAction(
		api.orchestration.applyReadingKnowledgeChange,
	);
	const definitionMutation = useReactQueryMutation({
		mutationFn: applyKnowledgeChangeAction,
	});
	const firstPageKey = sourceContextFirstPageKey(note);
	const firstPageCursor = note.sourceContexts.continueCursor;
	const firstPageIsDone = note.sourceContexts.isDone;
	const [pagination, setPagination] = useState(() =>
		resetSourceContextPagination(note),
	);
	const [sourceContextError, setSourceContextError] = useState<string | null>(
		null,
	);
	const paginationRevision = useRef(0);
	const currentPagination =
		pagination.firstPageKey === firstPageKey
			? pagination
			: resetSourceContextPagination(note);

	useEffect(() => {
		paginationRevision.current += 1;
		setPagination({
			firstPageKey,
			additionalSourceContexts: [],
			cursor: firstPageCursor,
			isDone: firstPageIsDone,
			isLoading: false,
		});
		setSourceContextError(null);
	}, [firstPageCursor, firstPageIsDone, firstPageKey]);

	async function loadMoreSourceContexts() {
		if (currentPagination.isDone || currentPagination.isLoading) return;
		setPagination((current) => ({ ...current, isLoading: true }));
		setSourceContextError(null);
		const requestedRevision = paginationRevision.current;
		try {
			const nextNote = await convex.query(api.presentation.getNote, {
				target: note.target,
				contextCursor: currentPagination.cursor,
			});
			if (
				requestedRevision !== paginationRevision.current ||
				nextNote?.kind !== "UnitReadingNote" ||
				nextNote.target.readingId !== note.target.readingId
			) {
				if (requestedRevision === paginationRevision.current) {
					setPagination((current) => ({
						...current,
						isDone: true,
						isLoading: false,
					}));
				}
				return;
			}
			setPagination((current) =>
				mergeSourceContextPage(current, nextNote),
			);
		} catch (cause) {
			const message = sourceContextPageFailureMessage(
				cause,
				requestedRevision,
				paginationRevision.current,
			);
			if (message) setSourceContextError(message);
		} finally {
			if (requestedRevision === paginationRevision.current) {
				setPagination((current) => ({
					...current,
					isLoading: false,
				}));
			}
		}
	}

	async function saveDefinition(definition: string | null) {
		const args = readingDefinitionMutationArgs(
			note,
			definition,
			crypto.randomUUID(),
		);
		if (args) await definitionMutation.mutateAsync(args);
	}

	const sourceContexts = deduplicateSourceContexts([
		...note.sourceContexts.page,
		...currentPagination.additionalSourceContexts,
	]);
	const capabilities: ReadingNotePresentationCapabilities = {
		knowledgeSettings,
		sourceContexts: {
			items: sourceContexts,
			hasMore: !currentPagination.isDone,
			isLoading: currentPagination.isLoading,
			error: sourceContextError,
			loadMore: currentPagination.isDone ? null : loadMoreSourceContexts,
		},
		definition: {
			isSaving: definitionMutation.isPending,
			error: definitionMutation.error
				? mutationMessage(definitionMutation.error)
				: null,
			save: saveDefinition,
		},
		hrefFor,
	};

	return renderNote(note, capabilities);
}

export function resetSourceContextPagination(
	note: ReadingNoteData,
): SourceContextPaginationState {
	return {
		firstPageKey: sourceContextFirstPageKey(note),
		additionalSourceContexts: [],
		cursor: note.sourceContexts.continueCursor,
		isDone: note.sourceContexts.isDone,
		isLoading: false,
	};
}

export function mergeSourceContextPage(
	current: SourceContextPaginationState,
	nextNote: ReadingNoteData,
): SourceContextPaginationState {
	return {
		...current,
		additionalSourceContexts: deduplicateSourceContexts([
			...current.additionalSourceContexts,
			...nextNote.sourceContexts.page,
		]),
		cursor: nextNote.sourceContexts.continueCursor,
		isDone: nextNote.sourceContexts.isDone,
	};
}

export function deduplicateSourceContexts<
	SourceContextValue extends { readonly attestationId: string },
>(sourceContexts: readonly SourceContextValue[]): SourceContextValue[] {
	const seen = new Set<string>();
	return sourceContexts.filter(({ attestationId }) => {
		if (seen.has(attestationId)) return false;
		seen.add(attestationId);
		return true;
	});
}

export function sourceContextPageFailureMessage(
	cause: unknown,
	requestedRevision: number,
	currentRevision: number,
): string | null {
	if (requestedRevision !== currentRevision) return null;
	return cause instanceof Error
		? cause.message
		: "Source Contexts could not be loaded.";
}

export function readingDefinitionMutationArgs(
	note: ReadingNoteData,
	definition: string | null,
	knowledgeChangeKey: string,
) {
	const normalized = normalizeReadingDefinition(definition);
	const change = readingDefinitionChange(
		normalizeReadingDefinition(note.knowledge.definition ?? null),
		normalized,
	);
	if (!change) return null;
	return {
		knowledgeChangeKey,
		ownerReadingKey: note.reading.ownerKey,
		change,
	};
}

function sourceContextFirstPageKey(note: ReadingNoteData): string {
	return JSON.stringify([
		note.sourceContexts.page.map(({ attestationId }) => attestationId),
		note.sourceContexts.continueCursor,
		note.sourceContexts.isDone,
	]);
}

function ReadingNoteSkeleton() {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-3"
				role="status"
				aria-label="Loading Reading note"
			>
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-20 w-full" />
			</div>
		</main>
	);
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
