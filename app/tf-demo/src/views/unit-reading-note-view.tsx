import { convexQuery } from "@convex-dev/react-query";
import {
	useQuery,
	useMutation as useReactQueryMutation,
} from "@tanstack/react-query";
import { useAction, useConvex } from "convex/react";
import type { KnowledgeSettings } from "dumrel";
import { useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { UnitReadingNoteTarget } from "@/lib/navigation";
import {
	normalizeReadingDefinition,
	readingDefinitionChange,
} from "@/lib/reading-definition";
import { renderNote } from "@/notes";
import { usePaginatedNoteLoading } from "@/notes/paginated-note-loading";
import type {
	ReadingNoteData,
	ReadingNotePresentationCapabilities,
} from "@/notes/reading";
import { NotFoundView } from "@/views/not-found-view";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

export type UnitReadingNote = ReadingNoteData;

export function UnitReadingNoteView({
	target,
}: {
	target: UnitReadingNoteTarget;
}) {
	const visitorId = useAnonymousVisitorId();
	const noteQuery = useQuery({
		...convexQuery(api.readingNotes.get, {
			readingId: target.readingId,
		}),
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
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const applyKnowledgeChangeAction = useAction(
		api.orchestration.applyReadingKnowledgeChange,
	);
	const definitionMutation = useReactQueryMutation({
		mutationFn: applyKnowledgeChangeAction,
	});
	const loadSourceContextPage = useCallback(
		async (cursor: string): Promise<ReadingNoteData | null> => {
			const next = await convex.query(api.readingNotes.get, {
				readingId: note.target.readingId,
				contextCursor: cursor,
			});
			return next?.kind === "UnitReadingNote" ? next : null;
		},
		[convex, note.target.readingId],
	);
	const pagination = usePaginatedNoteLoading(note, loadSourceContextPage);

	async function saveDefinition(definition: string | null) {
		const args = readingDefinitionMutationArgs(
			note,
			definition,
			crypto.randomUUID(),
		);
		if (args) await definitionMutation.mutateAsync(args);
	}

	const capabilities: ReadingNotePresentationCapabilities = {
		knowledgeSettings,
		sourceContexts: {
			items: pagination.note.sourceContexts.page,
			hasMore: pagination.hasMore,
			isLoading: pagination.isLoading,
			error: pagination.error,
			loadMore: pagination.hasMore ? pagination.loadMore : null,
		},
		definition: {
			isSaving: definitionMutation.isPending,
			error: definitionMutation.error
				? mutationMessage(definitionMutation.error)
				: null,
			save: saveDefinition,
		},
		follow,
	};

	return renderNote(pagination.note, capabilities);
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

function ReadingNoteSkeleton() {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-3"
				role="status"
				aria-label="Loading Reading note"
			>
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-20 w-full" />
			</div>
		</div>
	);
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
